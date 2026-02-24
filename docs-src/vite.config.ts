import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  root: __dirname,
  base: '/nicomview/',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../docs'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        usage: resolve(__dirname, 'usage.html'),
        'plugin-dev': resolve(__dirname, 'plugin-dev.html'),
        tts: resolve(__dirname, 'tts.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      }
    },
  },
})
