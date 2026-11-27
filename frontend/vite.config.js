import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages এ সাব-ডিরেক্টরি পাথ সংক্রান্ত সমস্যা এড়াতে রিলেটিভ বেস পাথ ব্যবহার
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('html5-qrcode') || id.includes('jsbarcode')) return 'vendor-scanner';
          if (id.includes('@tanstack')) return 'vendor-virtual';
          if (
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            /[\\/]react[\\/]/.test(id)
          ) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true
  }
});
