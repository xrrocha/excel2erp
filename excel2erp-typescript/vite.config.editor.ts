import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  plugins: [viteSingleFile()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'editor.html'),
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: ['.', 'tests/fixtures'],
    },
  },
  // Serve demo fixtures as static assets for logo preview
  publicDir: 'tests/fixtures/demo/assets',
});
