import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm', 'cjs'],  // CJS output was missing — fixed in v2.1
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  dts: true,
  skipNodeModulesBundle: true,
  target: 'node18',
  treeshake: false,
  platform: 'node',
});
