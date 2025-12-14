## 使用方法

1. 安装
   npm install your-image-editor-pkg

2. 引入样式
   import 'your-image-editor-pkg/dist/style.css';

3. 在 Vue 中使用
   <template>
   <ImageEditor
   :image-url="currentImage"
   :config="{ aiBaseUrl: 'https://my-api.com' }"
   @save="onSave"
   />
   </template>

<script setup>
import { ImageEditor } from 'your-image-editor-pkg';

const onSave = (dataUrl) => {
  console.log('图片已保存', dataUrl);
}
</script>
