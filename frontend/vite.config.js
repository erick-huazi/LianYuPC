import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron/simple'
import { resolve } from 'path'

/** 仅 electron:dev / electron:build 时启用；普通 npm run dev 走浏览器，无需下载 Electron */
const enableElectron = process.env.ELECTRON_DEV === '1' || process.env.ELECTRON_BUILD === '1'
const electronApiOrigin = process.env.VITE_LIANYU_API_ORIGIN || 'http://localhost:8080'
const certFingerprint = process.env.VITE_LIANYU_CERT_FINGERPRINT || ''

export default defineConfig({
  // Electron 用 file:// 加载，必须相对路径且不能带 crossorigin
  base: './',
  build: {
    modulePreload: false,
    // file:// 下 Vite 懒加载路由无法 preload 分包 CSS，合并为单文件
    cssCodeSplit: false,
  },
  define: enableElectron
    ? {
        'process.env.LIANYU_API_ORIGIN': JSON.stringify(electronApiOrigin),
        'process.env.VITE_LIANYU_API_ORIGIN': JSON.stringify(electronApiOrigin),
        'process.env.LIANYU_CERT_FINGERPRINT': JSON.stringify(certFingerprint),
      }
    : undefined,
  envDir: '.',
  plugins: [
    vue(),
    {
      name: 'strip-crossorigin-for-electron',
      transformIndexHtml(html) {
        return html.replace(/\s+crossorigin/g, '')
      },
    },
    ...(enableElectron
      ? [
          electron({
            main: {
              entry: 'electron/main.js',
              vite: {
                define: {
                  'process.env.LIANYU_API_ORIGIN': JSON.stringify(electronApiOrigin),
                  'process.env.VITE_LIANYU_API_ORIGIN': JSON.stringify(electronApiOrigin),
                  'process.env.LIANYU_CERT_FINGERPRINT': JSON.stringify(certFingerprint),
                },
              },
            },
            preload: {
              input: 'electron/preload.js',
              vite: {
                build: {
                  rollupOptions: {
                    output: {
                      format: 'cjs',
                      entryFileNames: 'preload.cjs',
                    },
                  },
                },
              },
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    // Expose Vite dev server for Docker Nginx gateway.
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`
      }
    }
  }
})
