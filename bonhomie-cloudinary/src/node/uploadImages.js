import uploadImage from './uploadImage.js';

/**
 * Upload multiple images in parallel.
 *
 * Returns a unified result where each entry indicates individual success or
 * failure — a single failed upload does NOT abort the others.
 *
 * @param {string[]} files
 * @param {object} options  Same options as uploadImage()
 * @returns {Promise<{ success: boolean; data: Array<{ file: string; success: boolean; data?: object; error?: string }> }>}
 */
export default async function uploadImages(files, options = {}) {
  const results = await Promise.all(
    files.map(async (filePath) => {
      const res = await uploadImage(filePath, options);
      return { file: filePath, ...res };
    })
  );

  const allSucceeded = results.every((r) => r.success);

  return {
    success: allSucceeded,
    data: results,
  };
}
