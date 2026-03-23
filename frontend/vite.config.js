import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND = `http://localhost:${process.env.BACKEND_PORT || 3001}`;

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_PORT) || 3000,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/uploads': { target: BACKEND, changeOrigin: true },
    },
  },
});
