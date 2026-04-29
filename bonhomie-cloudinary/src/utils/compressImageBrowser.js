/**
 * Compress image in browser using canvas.
 *
 * Returns { success: false } if the browser cannot serialize the canvas
 * (e.g. tainted canvas from cross-origin images, out-of-memory, or
 * canvas.toBlob returning null). The caller should fall back to the
 * original file in that case.
 */
export default function compressImageBrowser(
  file,
  maxWidth = 2000,
  maxHeight = 2000
) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      let { width, height } = img;

      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      // Use Math.round — assigning floats to canvas.width/height silently
      // truncates, producing off-by-one pixel dimensions.
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          // toBlob can return null if the canvas is tainted by a cross-origin
          // image, if the browser runs out of memory, or if the format is
          // unsupported. Treat null as a compression failure and fall back to
          // the original file in the caller.
          if (!blob) {
            resolve({ success: false, error: 'canvas.toBlob returned null' });
            return;
          }

          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });

          resolve({ success: true, file: compressedFile });
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => resolve({ success: false, error: 'Image load failed' });
    reader.onerror = () => resolve({ success: false, error: 'FileReader failed' });
    reader.readAsDataURL(file);
  });
}
