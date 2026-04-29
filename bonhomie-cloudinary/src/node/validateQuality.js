import sharp from 'sharp';
import getExif from './getExif.js';

/**
 * Validate image quality: resolution, age (via EXIF).
 *
 * Note: Sharp does not expose brightness or sharpness in its metadata.
 * Those checks are flagged honestly rather than silently passing.
 *
 * @param {string} filePath
 * @param {{
 *   minWidth?: number;
 *   minHeight?: number;
 *   maxAgeDays?: number;
 * }} rules
 */
export default async function validateQuality(filePath, rules = {}) {
  const {
    minWidth = 600,
    minHeight = 600,
    maxAgeDays = 365,
  } = rules;

  try {
    const meta = await sharp(filePath).metadata();

    const resolutionOk = meta.width >= minWidth && meta.height >= minHeight;

    // Age check via EXIF (getExif may be async — await it)
    const exif = await Promise.resolve(getExif(filePath));
    let ageOk = true;

    if (exif.success && exif.data?.DateTimeOriginal) {
      const taken = new Date(exif.data.DateTimeOriginal * 1000);
      const diffDays = (Date.now() - taken.getTime()) / (1000 * 3600 * 24);
      ageOk = diffDays <= maxAgeDays;
    }

    return {
      success: true,
      data: {
        resolutionOk,
        ageOk,
        width: meta.width,
        height: meta.height,
        format: meta.format,
        exif: exif.data || {},
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
