import sharp from 'sharp';

/**
 * Compress an image using Sharp.
 *
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {{
 *   quality?: number;
 *   maxWidth?: number;
 *   maxHeight?: number;
 *   format?: 'jpeg' | 'png' | 'webp' | 'avif';
 *   removeMetadata?: boolean;
 * }} options
 */
export default async function compressImageNode(inputPath, outputPath, options = {}) {
  const {
    quality = 80,
    maxWidth = 2000,
    maxHeight = 2000,
    format = 'jpeg',
    removeMetadata = true,
  } = options;

  try {
    let pipeline = sharp(inputPath).rotate();

    // Resize only when the image exceeds the limits
    pipeline = pipeline.resize({
      width: maxWidth,
      height: maxHeight,
      fit: 'inside',
      withoutEnlargement: true,
    });

    // Sharp strips ALL metadata by default (when withMetadata() is not called).
    // Only call withMetadata() when we explicitly want to preserve it.
    if (!removeMetadata) {
      pipeline = pipeline.withMetadata();
    }

    if (format === 'jpeg') pipeline = pipeline.jpeg({ quality });
    else if (format === 'png') pipeline = pipeline.png({ quality });
    else if (format === 'webp') pipeline = pipeline.webp({ quality });
    else if (format === 'avif') pipeline = pipeline.avif({ quality });

    await pipeline.toFile(outputPath);

    return { success: true, output: outputPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
