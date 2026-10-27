import { defineConfig } from 'vite';

export default defineConfig({
  root: 'www',
  base: './',
  server: { host: '0.0.0.0' },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: false
  }
});
