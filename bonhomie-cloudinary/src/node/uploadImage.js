import { v2 as cloudinaryV2 } from 'cloudinary';
import generateSignature from './generateSignature.js';

/**
 * Create a bound Cloudinary uploader for a specific account.
 *
 * Calling cloudinaryV2.config() inside an upload function is unsafe in
 * concurrent scenarios — a second call can overwrite credentials while a
 * previous upload is mid-flight. This factory captures credentials once at
 * construction time and passes them explicitly to each upload call, keeping
 * the global config stable.
 *
 * @param {{ cloud_name: string; api_key: string; api_secret: string }} credentials
 */
export function createCloudinaryClient(credentials) {
  const { cloud_name, api_key, api_secret } = credentials;

  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      '[bonhomie-cloudinary] createCloudinaryClient: cloud_name, api_key, and api_secret are required.'
    );
  }

  // Configure once at construction — not on every upload call.
  cloudinaryV2.config({ cloud_name, api_key, api_secret });

  return {
    upload: (filePath, options = {}) =>
      uploadImage(filePath, { cloud_name, api_key, api_secret, ...options }),
  };
}

/**
 * Upload a single image to Cloudinary.
 *
 * Prefer createCloudinaryClient() for multi-account or concurrent usage.
 * This function re-sets the global config on every call; fine for
 * single-account apps but not safe under true concurrency.
 */
export default async function uploadImage(filePath, options = {}) {
  const {
    cloud_name,
    api_key,
    api_secret,
    folder = 'uploads',
    public_id,
    useSigned = false,
    transformation = {},
    tags = [],
    resource_type = 'image',
  } = options;

  try {
    cloudinaryV2.config({ cloud_name, api_key, api_secret });

    let uploadOptions = {
      folder,
      public_id,
      tags,
      resource_type,
      transformation,
    };

    if (useSigned) {
      const timestamp = Math.floor(Date.now() / 1000);
      const signatureParams = { timestamp, folder, public_id, ...transformation };
      const sigResult = generateSignature(signatureParams, api_secret);
      if (!sigResult.success) throw new Error(sigResult.error);
      uploadOptions = {
        ...uploadOptions,
        timestamp,
        signature: sigResult.signature,
        api_key,
      };
    }

    const result = await cloudinaryV2.uploader.upload(filePath, uploadOptions);

    return {
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        size: result.bytes,
        format: result.format,
        folder: result.folder,
        etag: result.etag,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
