import fs from "fs";
import exif from "exif-parser";

/**
 * Extract EXIF metadata (date, orientation, resolution)
 */
export default function getExif(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = exif.create(buffer);
    const result = parser.parse();

    return { success: true, data: result.tags };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
