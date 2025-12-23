<template>
  <div class="image-editor-sdk-container">
    <NavBar :textMap="textMap" class="layout-header" />

    <div class="layout-body">
      <LeftSidebar class="layout-sidebar" />

      <ToolPanel class="layout-panel" />

      <Workspace :imageUrl="imageUrl" class="layout-workspace" />
    </div>
    <LoadingOverlay />
  </div>
</template>

<script setup>
import { provide, ref, watch } from 'vue';
import { useCanvas } from '../../composables/useCanvas';
import NavBar from './NavBar.vue';
import LeftSidebar from './LeftSidebar.vue';
import ToolPanel from '../panels/ToolPanel.vue';
import Workspace from '../Workspace.vue';
import LoadingOverlay from '@/components/common/LoadingOverlay.vue';
const sdkContainer = ref(null);

// === 1. 定义组件接口 (Props & Emits) ===
const props = defineProps({
  // 初始图片链接
  imageUrl: {
    type: String,
    default: 'https://wallpaperm.cmcm.com/21f96d39cffd296c2dd2f0cf9cf65c9b.jpg'
  },
  // 文本映射表
  textMap: {
    type: Object,
    default: () => ({
      upload: '打开图片',
      save: '保存',
      title: '大秘美图'
    })
  },
  // 全局配置（如 AI 后端地址）
  config: {
    type: Object,
    default: () => ({
      aiBaseUrl: 'http://localhost:3000/ai', // 默认值
    })
  }
});

const emit = defineEmits(['save']); // 定义保存事件

// === 2. Provide 配置给子组件 ===
// 这样 AdjustRembg.vue 等组件可以通过 inject('editorConfig') 获取配置
provide('editorConfig', props.config);

// === 3. 初始化 Canvas 逻辑 ===
const {
  init,
  initImage,
  addImage,
  toggleDrawing,
  exportMask,
  replaceActiveImage,
  canvas,
  zoom,
  zoomIn,
  zoomOut,
  zoomReset,
  zoomToRect,
  addText,
  rotateActive,
  flipActive,
  undo,
  redo,
  saveHistory
} = useCanvas();

// === 4. 监听图片变化 ===
watch(() => props.imageUrl, (newUrl) => {
  if (newUrl && canvas.value) {
    initImage(newUrl);
  }
});

// 封装初始化方法，以便在 Canvas 准备好后加载初始图片
const handleInit = (id, width, height) => {
  init(id, width, height); // 调用原始 init

  // 如果有传入图片，延迟加载
  if (props.imageUrl) {
    setTimeout(() => {
      initImage(props.imageUrl);
    }, 100);
  }
};

// 【新增】还原到初始状态的方法
const handleReset = () => {
  // 确保有初始图片 URL 且 initImage 方法可用
  if (props.imageUrl && initImage) {
    // 调用 useCanvas 的 initImage 方法，传入初始 URL
    // 这会清空画布、重置历史记录并加载初始图片
    initImage(props.imageUrl);
  }
};

// 保存图片
const handleExport = () => {
  // 1. 取消选中状态
  canvas.value?.discardActiveObject();
  canvas.value?.renderAll();

  // 2. 获取 Base64
  const dataURL = canvas.value?.toDataURL({ format: 'png' });

  // 3. 抛出事件给父组件
  emit('save', dataURL);
};

// === 5. 组装 API 对象 ===
const api = {
  canvas,
  init: handleInit,
  zoom,
  zoomIn,
  zoomOut,
  zoomReset,
  zoomToRect,
  initImage,
  addImage,
  toggleDrawing,
  exportMask,
  replaceActiveImage,
  rotateActive,
  flipActive,
  undo,
  redo,
  saveHistory,
  addText: (text) => addText(text),
  exportImg: () => canvas.value?.toDataURL({ format: 'png' }),
  getActiveImgSrc: () => canvas.value?.getActiveObject()?.getSrc(),
  clearPaths: () => {
    const paths = canvas.value?.getObjects().filter(o => o.type === 'path');
    canvas.value?.remove(...paths);
  },
  save: handleExport,
  reset: handleReset
};

// === 向下分发 ===
provide('canvasAPI', api);
defineExpose({
  save: handleExport,
  undo,
  redo,
  canvas: canvas
})
</script>

<style scoped>
/* 修改类名，避免过于通用的 layout-container */
.image-editor-sdk-container {
  display: flex;
  flex-direction: column;
  /* 改为 100% 以适应父容器，而不是强制全屏 */
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: #fff;
  position: relative;
}

.layout-header {
  height: 50px;
  flex-shrink: 0;
  z-index: 20;
  border-bottom: 1px solid #e4e7ed;
  /* 确保有边界 */
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.layout-sidebar {
  width: 72px;
  flex-shrink: 0;
  z-index: 10;
}

.layout-panel {
  width: 300px;
  flex-shrink: 0;
  z-index: 10;
}

.layout-workspace {
  flex: 1;
  background-color: #f0f2f5;
  position: relative;
  min-width: 0;
}
</style>