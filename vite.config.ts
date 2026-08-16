import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@react-pdf')) return 'react-pdf';
          // three.js and its React bindings/physics were falling through into
          // the default chunk uncategorised (their ids don't match a generic
          // "react" substring check the way @react-three/* does — 'three'
          // itself has no "react" in its path). That made the main chunk 2.1MB
          // unminified and was the single biggest contributor to the VPS build
          // OOM-ing/hanging: one huge chunk means one huge minify pass held in
          // memory at once. Splitting it out shrinks the peak, independent of
          // whatever heap ceiling the build is given.
          if (id.includes('/three/') || id.includes('three-stdlib') || id.includes('@react-three')) return 'three-vendor';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('react') || id.includes('react-dom')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
});
