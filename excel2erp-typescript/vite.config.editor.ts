import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
      output: {
        entryFileNames: 'editor.js',
        chunkFileNames: 'editor-[name].js',
        assetFileNames: 'editor-[name].[ext]',
      },
    },
  },
  server: {
    port: 5174,
    fs: {
      allow: ['.'],
    },
  },
  publicDir: false,
});
