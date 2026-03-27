import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
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
          timeout: 0,
          proxyTimeout: 0,
        },
      },
    },
  };
});
