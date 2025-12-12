<template>
  <div class="layout-container">
    <NavBar class="layout-header" />
    
    <div class="layout-body">
      <LeftSidebar class="layout-sidebar" />
      
      <ToolPanel class="layout-panel" />
      
      <Workspace class="layout-workspace" />
    </div>
  </div>
</template>

<script setup>
import { provide } from 'vue';
import { useCanvas } from '../../composables/useCanvas';
import NavBar from './NavBar.vue';
import LeftSidebar from './LeftSidebar.vue';
import ToolPanel from '../panels/ToolPanel.vue';
import Workspace from '../Workspace.vue';

// === 核心修复：在这里初始化 Canvas 逻辑 ===
const {
  init, 
  addImage, 
  toggleDrawing, 
  exportMask, 
  replaceActiveImage, 
  setCropBoxSize,
  canvas, 
  addText,
  startCrop, 
  confirmCrop, 
  cancelCrop, 
  rotateActive, 
  flipActive,
  undo,
  redo,
  saveHistory 
} = useCanvas();

// 组装 API 对象
// 2. 组装 API 对象
const api = {
  canvas, 
  init,
  addImage,
  toggleDrawing,
  exportMask,
  replaceActiveImage,
  setCropBoxSize,
  startCrop, 
  confirmCrop, 
  cancelCrop, 
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
  }
};

// === 向下分发 ===
// 这样 ToolPanel 和 Workspace 都能接收到了
provide('canvasAPI', api);
</script>

<style scoped>
.layout-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.layout-header {
  height: 50px;
  flex-shrink: 0;
  z-index: 20;
}

.layout-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.layout-sidebar {
  width: 72px; /* 稍微宽一点适配图标 */
  flex-shrink: 0;
  z-index: 10;
}

.layout-panel {
  width: 280px;
  flex-shrink: 0;
  z-index: 10;
}

.layout-workspace {
  flex: 1;
  background-color: #f0f2f5;
  position: relative;
  min-width: 0; /* 防止 flex 子元素溢出 */
}
</style>