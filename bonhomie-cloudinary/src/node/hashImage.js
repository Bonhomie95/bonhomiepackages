import fs from 'fs';
import crypto from 'crypto';
import { imageHash } from 'image-hash';

/**
 * SHA-256 hash of file
 */
export function hashSHA256(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    return { success: true, hash };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Perceptual hash for duplicate detection
 */
export async function hashPHash(filePath) {
  try {
    return new Promise((resolve, reject) => {
      imageHash(filePath, 16, true, (err, data) => {
        if (err) reject({ success: false, error: err.message });
        else resolve({ success: true, hash: data });
      });
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
}
