import crypto from 'crypto';

/**
 * Generate a secure Cloudinary upload signature
 */
export default function generateSignature(paramsToSign, apiSecret) {
  try {
    const sorted = Object.keys(paramsToSign)
      .sort()
      .map((key) => `${key}=${paramsToSign[key]}`)
      .join('&');

    const signature = crypto
      .createHash('sha256')
      .update(sorted + apiSecret)
      .digest('hex');

    return { success: true, signature };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
