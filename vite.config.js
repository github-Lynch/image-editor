import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    lib: {
      // 指定入口为 index.js
      entry: resolve(__dirname, 'src/index.js'),
      name: 'ImageEditor',
      fileName: 'image-editor'
    },
    rollupOptions: {
      // 关键：确保外部化处理那些你不想打包进库的依赖
      // vue 是必须排除的，fabric 建议打包进去(如果不希望用户自己装)
      // 如果你希望用户自己装 fabric，也加到这里
      external: ['vue'],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: 'Vue'
        },
        // 建议导出 CSS 文件名固定
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'index.css';
          return assetInfo.name;
        },
        exports: 'named'
      }
    },
    // 将 CSS 提取为一个单独的文件 (dist/style.css)
    cssCodeSplit: false
  }
})