import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/** Local API: `cd ../backend && pip install -r requirements.txt && uvicorn main:app --port 8000` */
const backendTarget = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

export default defineConfig(() => {
  return {
    /** Always load `.env*` from this folder (fixes monorepo `npm run build -w` cwd). */
    envDir: path.resolve(__dirname),
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: Number(process.env.VITE_DEV_PORT) || 3000,
      strictPort: false,
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          /** video-info can take 15–60s; explicit ms avoids ECONNRESET with some http-proxy defaults */
          timeout: 180_000,
          proxyTimeout: 180_000,
        },
      },
    },
  };
});
