import { useCallback, useState } from 'react';
import compressImageBrowser from '../utils/compressImageBrowser';
import getExifBrowser from '../utils/getExifBrowser';
import hashBrowser from '../utils/hashBrowser';
import validateDimensions from '../utils/validateDimensions';
import buildThumbnailUrl from '../utils/buildThumbnailUrl';

export default function useCloudinaryUpload(config = {}) {
  const {
    uploadUrl,
    maxWidth = 2000,
    maxHeight = 2000,
    minWidth = 600,
    minHeight = 600,
    maxFiles = 10,
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
    autoCompress = true,
    maxAgeDays = 365,
  } = config;

  const [images, setImages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);

  const upload = useCallback(
    async (files) => {
      const arr = Array.from(files);
      const workingFiles = [];

      if (images.length + arr.length > maxFiles) {
        setErrors((e) => [...e, 'Too many files']);
        return;
      }

      for (const file of arr) {
        if (!allowedTypes.includes(file.type)) {
          setErrors((e) => [...e, `Invalid file type: ${file.type}`]);
          continue;
        }

        const dims = await validateDimensions(file, minWidth, minHeight);
        if (!dims.success) {
          setErrors((e) => [...e, dims.error]);
          continue;
        }

        const exif = await getExifBrowser(file);
        const hashResult = await hashBrowser(file);

        if (images.some((img) => img.hash === hashResult.hash)) {
          setErrors((e) => [...e, 'Duplicate image skipped']);
          continue;
        }

        let finalFile = file;
        if (autoCompress) {
          const compressed = await compressImageBrowser(file, maxWidth, maxHeight);
          // compressed.success is false if canvas.toBlob returned null (tainted
          // canvas, out-of-memory, etc.) — fall back to the original file.
          if (compressed.success) finalFile = compressed.file;
        }

        workingFiles.push({ file: finalFile, hash: hashResult.hash, exif });
      }

      if (workingFiles.length === 0) return;

      setUploading(true);
      setProgress(0);

      const uploaded = [];

      for (let i = 0; i < workingFiles.length; i++) {
        const { file, hash, exif } = workingFiles[i];

        const formData = new FormData();
        formData.append('file', file);

        let json;
        try {
          const res = await fetch(uploadUrl, { method: 'POST', body: formData });

          if (!res.ok) {
            setErrors((e) => [...e, `Upload failed: HTTP ${res.status}`]);
            setProgress(Math.round(((i + 1) / workingFiles.length) * 100));
            continue;
          }

          json = await res.json();
        } catch (err) {
          // Network failure or non-JSON response
          setErrors((e) => [...e, `Upload error: ${err.message}`]);
          setProgress(Math.round(((i + 1) / workingFiles.length) * 100));
          continue;
        }

        if (json.success) {
          const warnings = [];
          if (exif.success && exif.data?.DateTimeOriginal) {
            const taken = new Date(exif.data.DateTimeOriginal * 1000);
            const diffDays = (Date.now() - taken.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > maxAgeDays) warnings.push('Old photo');
          }

          const thumb =
            json.data.thumbnail ||
            buildThumbnailUrl(json.data.url, { width: 400, height: 400 });

          uploaded.push({
            url: json.data.url,
            thumbnail: thumb,
            publicId: json.data.publicId,
            width: json.data.width,
            height: json.data.height,
            hash,
            exif: exif.data || null,
            warnings,
          });
        } else {
          setErrors((e) => [...e, json.error || 'Upload error']);
        }

        setProgress(Math.round(((i + 1) / workingFiles.length) * 100));
      }

      setImages((prev) => [...prev, ...uploaded]);
      setUploading(false);
    },
    [
      images,
      uploadUrl,
      allowedTypes,
      autoCompress,
      maxWidth,
      maxHeight,
      minWidth,
      minHeight,
      maxFiles,
      maxAgeDays,
    ]
  );

  const removeImage = useCallback((publicId) => {
    setImages((prev) => prev.filter((img) => img.publicId !== publicId));
  }, []);

  const reorderImages = useCallback((newOrder) => {
    setImages(newOrder);
  }, []);

  return { images, progress, uploading, errors, upload, removeImage, reorderImages };
}
