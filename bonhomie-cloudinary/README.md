# @bonhomie/cloudinary-super-uploader

<p align="center">
  <img src="https://img.shields.io/npm/v/@bonhomie/cloudinary-super-uploader?color=blue&label=npm%20version" />
  <img src="https://img.shields.io/npm/dm/@bonhomie/cloudinary-super-uploader?color=orange&label=downloads" />
  <img src="https://img.shields.io/bundlephobia/min/@bonhomie/cloudinary-super-uploader?color=yellow&label=minified%20size" />
  <img src="https://img.shields.io/github/license/bonhomie/cloudinary-super-uploader?color=green&label=license" />
</p>

<p align="center">
  ✨ A complete Cloudinary image upload toolkit for React + Node.<br />
  Drag & drop uploader, browser compression, EXIF checks, duplicate detection,<br />
  progress tracking, and backend helpers — all in one package.
</p>

---

## ✅ Features

### React (Frontend)

- Drag & drop uploader + click-to-upload
- Live progress bar
- Thumbnail grid with drag-to-reorder
- Browser-side compression (canvas)
- **SHA-256** duplicate detection (deduplicates within the session)
- EXIF checks — warns on old photos
- Toast-style inline error messages
- Works with any upload endpoint (recommended: your Node backend)

### Node.js (Backend)

- Upload single or multiple images to Cloudinary
- Sharp-based compression with metadata stripping
- EXIF metadata extraction
- SHA-256 hashing + perceptual pHash for duplicate detection
- Quality validation (resolution + EXIF date)

### Browser Utilities

- Canvas-based image compression
- Browser-side EXIF extraction
- Minimum dimension validation
- SHA-256 hash for duplicate detection
- Thumbnail URL builder using Cloudinary transformations

---

## 📥 Installation

```bash
npm install @bonhomie/cloudinary-super-uploader
# or
yarn add @bonhomie/cloudinary-super-uploader
```

The Node.js backend helpers (`uploadImage`, `compressImageNode`, etc.) depend on `sharp` and `cloudinary`, which are **optional** dependencies. They are only installed when needed and are not bundled into the browser build.

```bash
# Only needed for the Node.js side:
npm install sharp cloudinary image-hash
```

---

## 🎨 Usage — React Component

```jsx
import { CloudinaryUploader } from "@bonhomie/cloudinary-super-uploader";

export default function App() {
  return (
    <div style={{ maxWidth: 600, margin: "40px auto" }}>
      <h1>Upload property photos</h1>
      <CloudinaryUploader
        uploadUrl="/api/upload"
        maxWidth={2000}
        maxHeight={2000}
        minWidth={600}
        minHeight={600}
        maxFiles={10}
        allowedTypes={["image/jpeg", "image/png", "image/webp"]}
        autoCompress={true}
        maxAgeDays={365}
      />
    </div>
  );
}
```

The component will: validate dimensions, compress large images in-browser, read EXIF + SHA-256 hash, skip duplicates, and POST each file to `uploadUrl` as `file` in `FormData`.

Expected JSON response shape from your backend:

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "publicId": "folder/image-id",
    "width": 1200,
    "height": 800,
    "thumbnail": "https://res.cloudinary.com/.../c_fill,w_400,h_400/image.jpg"
  }
}
```

---

## 🪝 Usage — React Hook (Custom UI)

```jsx
import { useCloudinaryUpload } from "@bonhomie/cloudinary-super-uploader";

export default function CustomUploader() {
  const {
    images,
    progress,
    uploading,
    errors,
    upload,
    removeImage,
    reorderImages,
  } = useCloudinaryUpload({
    uploadUrl: "/api/upload",
    maxWidth: 2000,
    maxHeight: 2000,
    minWidth: 600,
    minHeight: 600,
    maxFiles: 10,
    maxAgeDays: 365,
  });

  return (
    <div>
      <input type="file" multiple accept="image/*" onChange={(e) => upload(e.target.files)} />

      {uploading && (
        <div style={{ width: `${progress}%`, height: 4, background: "blue" }} />
      )}

      {errors.map((err, i) => (
        <p key={i} style={{ color: "red" }}>{err}</p>
      ))}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {images.map((img) => (
          <div key={img.publicId} style={{ position: "relative" }}>
            <img src={img.thumbnail || img.url} alt="" />
            <button onClick={() => removeImage(img.publicId)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🖥 Usage — Node.js Backend

### Single upload

```js
import express from "express";
import multer from "multer";
import { uploadImage } from "@bonhomie/cloudinary-super-uploader/node";

const upload = multer({ dest: "temp/" });
const router = express.Router();

router.post("/upload", upload.single("file"), async (req, res) => {
  const result = await uploadImage(req.file.path, {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    folder: "uploads",
    tags: ["app-upload"],
  });
  res.json(result);
});
```

### Multiple uploads

```js
import { uploadImages } from "@bonhomie/cloudinary-super-uploader/node";

router.post("/upload-many", upload.array("files"), async (req, res) => {
  const filePaths = req.files.map((f) => f.path);
  const result = await uploadImages(filePaths, {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    folder: "multi",
  });
  res.json(result);
});
```

### Concurrent multi-account usage

Use `createCloudinaryClient` when handling multiple Cloudinary accounts to avoid race conditions with the global config:

```js
import { createCloudinaryClient } from "@bonhomie/cloudinary-super-uploader/node";

const client = createCloudinaryClient({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const result = await client.upload(filePath, { folder: "secure" });
```

---

## 🧰 Browser Utilities

```js
import {
  buildThumbnailUrl,
  compressImageBrowser,
  getExifBrowser,
  hashBrowser,
  validateDimensions,
} from "@bonhomie/cloudinary-super-uploader";

// Build a Cloudinary thumbnail URL from an existing URL
const thumb = buildThumbnailUrl(cloudinaryUrl, { width: 400, height: 400, crop: "fill" });

// Validate minimum dimensions
const dims = await validateDimensions(file, 600, 600);

// Compress before upload
const compressed = await compressImageBrowser(file, 2000, 2000);

// Extract EXIF metadata
const exif = await getExifBrowser(file);

// SHA-256 hash for duplicate detection
const hash = await hashBrowser(file);
```

---

## 🖥 Node Utilities

```js
import {
  compressImageNode,
  getExif,
  hashSHA256,
  hashPHash,
  validateQuality,
} from "@bonhomie/cloudinary-super-uploader/node";

const compressed = await compressImageNode("input.jpg", "output.jpg", {
  quality: 80,
  maxWidth: 2000,
  maxHeight: 2000,
});

const exif = getExif("output.jpg");
const sha = hashSHA256("output.jpg");
const pHash = await hashPHash("output.jpg");

const quality = await validateQuality("output.jpg", {
  minWidth: 600,
  minHeight: 600,
  maxAgeDays: 365,
});
```

---

## ⚙️ Hook Options

| Option         | Default       | Description                              |
| -------------- | ------------- | ---------------------------------------- |
| `uploadUrl`    | **required**  | Backend endpoint that receives `file`    |
| `maxWidth`     | `2000`        | Resize limit before upload (browser)     |
| `maxHeight`    | `2000`        | Resize limit before upload (browser)     |
| `minWidth`     | `600`         | Minimum allowed width                    |
| `minHeight`    | `600`         | Minimum allowed height                   |
| `maxFiles`     | `10`          | Max files per session                    |
| `autoCompress` | `true`        | Enable browser canvas compression        |
| `allowedTypes` | jpeg/png/webp | MIME types accepted                      |
| `maxAgeDays`   | `365`         | Warn when EXIF date is older than N days |

---

## 🔐 Signed Uploads

```js
import { generateSignature } from "@bonhomie/cloudinary-super-uploader/node";

const params = {
  folder: "secure",
  timestamp: Math.floor(Date.now() / 1000),
};

const { signature } = generateSignature(params, process.env.CLOUDINARY_API_SECRET);
// Send signature, timestamp, and api_key to your frontend
```

---

## 📄 License

MIT — free for personal & commercial use.

## 🧑‍💻 Author

Built by **Bonhomie** · Full-stack Web & Mobile Developer.  
If this package helps you, a ⭐ on GitHub would mean a lot.
