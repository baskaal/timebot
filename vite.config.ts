import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'renderer',
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    fs: { allow: ['..'] },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
