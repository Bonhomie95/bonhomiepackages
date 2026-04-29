/**
 * Validate minimum width & height
 */
export default function validateDimensions(
  file,
  minWidth = 600,
  minHeight = 600
) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      if (img.width < minWidth || img.height < minHeight) {
        resolve({
          success: false,
          error: `Image too small: ${img.width}x${img.height} (min ${minWidth}x${minHeight})`,
        });
      } else {
        resolve({ success: true, width: img.width, height: img.height });
      }
    };

    img.onerror = () => resolve({ success: false, error: 'Invalid image' });

    reader.readAsDataURL(file);
  });
}
