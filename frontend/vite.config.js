import path from 'path'
import {fileURLToPath} from 'url'
import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '#minpath': path.resolve(__dirname, 'node_modules/vfile/lib/minpath.browser.js'),
      '#minproc': path.resolve(__dirname, 'node_modules/vfile/lib/minproc.browser.js'),
      '#minurl': path.resolve(__dirname, 'node_modules/vfile/lib/minurl.browser.js'),
    },
  },
})
