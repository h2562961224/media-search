import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv';
import { vitePluginForArco } from '@arco-plugins/vite-react'

dotenv.config({ path: '../.env' });

const PORT = process.env.PORT || 5000;

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    vitePluginForArco(),
  ],
  build: {
    outDir: '../dist/client'
  },
  server: {
    proxy: {
      '/api': `http://localhost:${PORT}`,
    },
  },
})
