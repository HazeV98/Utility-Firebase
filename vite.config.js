import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png', 'codici.json', 'contatti.json'],
      manifest: {
        short_name: "Utility",
        name: "Utility Firebase",
        start_url: "/",
        background_color: "#f4f7f6",
        display: "standalone",
        scope: "/",
        theme_color: "#0056b3",
        icons: [
          {
            src: "icon-512.png",
            type: "image/png",
            sizes: "192x192 512x512",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
