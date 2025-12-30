// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    vue(),
    // 2. 配置插件
    dts({
      outDir: 'dist',
      // 确保只为源码生成类型
      include: ['src/**/*.js', 'src/**/*.vue'],
      // 自动尝试生成 vue 文件的类型定义
      // 确保生成的 .d.ts 文件路径清晰
      insertTypesEntry: true,
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ImageEditor',
      fileName: 'image-editor'
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue'
        },
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'index.css';
          return assetInfo.name;
        },
        exports: 'named'
      }
    },
    cssCodeSplit: false
  },
  server: {
    proxy: {
      '/prod-api': {
        // target: 'http://10.93.83.151:8080', // 张
        target: 'http://10.93.83.147:8080', // 俞
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/prod-api/, '')
      }
    }
  }
})