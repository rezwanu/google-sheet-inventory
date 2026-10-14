import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages এ সাব-ডিরেক্টরি পাথ সংক্রান্ত সমস্যা এড়াতে রিলেটিভ বেস পাথ ব্যবহার
  base: './',
  server: {
    port: 3000,
    open: true
  }
});

