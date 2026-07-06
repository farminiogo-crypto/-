import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// أثناء التطوير: أي طلب /api يُمرَّر للخادم على المنفذ 4000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
});
