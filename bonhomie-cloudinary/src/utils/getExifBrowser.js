import exif from 'exif-parser';

/**
 * Extract EXIF metadata in browser
 */
export default function getExifBrowser(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target.result;
        const parser = exif.create(buffer);
        const result = parser.parse();

        resolve({ success: true, data: result.tags });
      } catch (err) {
        resolve({ success: false, error: err.message });
      }
    };

    reader.onerror = () =>
      resolve({ success: false, error: 'EXIF read failed' });
    reader.readAsArrayBuffer(file);
  });
}
