import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'renderer',
  base: './',
  plugins: [tailwindcss(), react()],
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
