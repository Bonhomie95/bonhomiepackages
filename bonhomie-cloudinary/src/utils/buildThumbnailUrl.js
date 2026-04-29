export default function buildThumbnailUrl(url, options = {}) {
  if (!url || typeof url !== "string") return url;

  const {
    width = 400,
    height = 400,
    crop = "fill",
    quality = "auto",
    format = "auto",
  } = options;

  if (!url.includes("/upload/")) return url;

  const transform = `c_${crop},w_${width},h_${height},q_${quality},f_${format}`;
  return url.replace("/upload/", `/upload/${transform}/`);
}
