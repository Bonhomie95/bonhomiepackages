// tsup.config.js
import { defineConfig } from 'tsup';

export default defineConfig([
  // Browser / React side
  {
    entry: { index: 'src/index.js' },
    format: ['esm', 'cjs'],
    minify: true,
    platform: 'browser',
    clean: true,
    external: ['react'],
  },
  // Node side
  {
    entry: { 'node/index': 'src/node/index.js' },
    format: ['esm', 'cjs'],
    minify: true,
    platform: 'node',
    external: [
      'cloudinary',
      'sharp',
      'image-hash',   // <-- this is the one causing the crash
      'exif-parser',
      'file-type',    // <-- its broken transitive dep
    ],
  },
]);