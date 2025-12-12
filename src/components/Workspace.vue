<template>
  <div class="workspace-container">
    <div class="canvas-center" ref="canvasContainer">
      <canvas id="c"></canvas>
    </div>
    
    <div class="zoom-controls">
      <el-button size="small" circle :icon="Minus" />
      <span class="zoom-text">100%</span>
      <el-button size="small" circle :icon="Plus" />
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref } from 'vue';
import { Plus, Minus } from '@element-plus/icons-vue';

const DEFAULT_IMG_URL = 'src/assets/image/01.jpg';

// === 核心修复：接收注入 ===
const canvasAPI = inject('canvasAPI');
const canvasContainer = ref(null);

onMounted(() => {
  // 等 DOM 渲染好 <canvas id="c"> 后，通知父组件初始化 Fabric
  if (canvasAPI && canvasAPI.init) {
    const width = canvasContainer.value.clientWidth || 1900;
    const height = canvasContainer.value.clientHeight || 1000;
    // 传递容器元素给 canvasAPI.init
    canvasAPI.init('c', width, height);
    setTimeout(() => {
      canvasAPI.initImage(DEFAULT_IMG_URL);
    }, 100);
  } else {
    console.error('CanvasAPI not found. Make sure EditorLayout provides it.');
  }
});
</script>

<style scoped>
.workspace-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: #f0f2f5;
}

.canvas-center {
  /* 给画布一个阴影，让它看起来像一张纸 */
  box-shadow: 0 0 20px rgba(0,0,0,0.1);
  width: 90%;
  height: 90%;
  /* 居中显示 */
  display: flex;
  justify-content: center;
  align-items: center;

}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 5px 10px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.zoom-text { 
  font-size: 12px; 
  color: #666; 
  width: 40px; 
  text-align: center;
}
</style>