import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths, so the build works from any subpath (GitHub Pages
  // serves it at /melodream/). Routing is hash-based, so no server rewrites.
  base: './',
});
