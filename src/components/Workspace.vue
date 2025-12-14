<template>
  <div class="workspace-container">
    <div class="canvas-center" ref="canvasContainer">
      <canvas id="c"></canvas>
    </div>

    <div class="zoom-controls">
      <button class="ie-btn ie-btn-circle" title="缩小" @click="handleZoomOut">
        <svg viewBox="0 0 1024 1024" width="16" height="16">
          <path d="M128 544h768a32 32 0 1 0 0-64H128a32 32 0 1 0 0 64z" fill="currentColor" />
        </svg>
      </button>

      <span class="zoom-text" @click="handleReset" title="点击重置为100%">
        {{ zoomPercentage }}%
      </span>

      <button class="ie-btn ie-btn-circle" title="放大" @click="handleZoomIn">
        <svg viewBox="0 0 1024 1024" width="16" height="16">
          <path
            d="M480 480H160a32 32 0 0 0 0 64h320v320a32 32 0 0 0 64 0V544h320a32 32 0 0 0 0-64H544V160a32 32 0 0 0-64 0v320z"
            fill="currentColor" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { onMounted, inject, ref, computed } from 'vue';

const props = defineProps({
  // 初始图片链接
  imageUrl: {
    type: String,
    default: ''
  },
});

const canvasAPI = inject('canvasAPI');
const canvasContainer = ref(null);

// 计算属性：显示百分比
const zoomPercentage = computed(() => {
  // 确保 zoom 存在，否则默认为 1 (100%)
  return canvasAPI?.zoom?.value ? Math.round(canvasAPI.zoom.value * 100) : 100;
});

// 操作处理
const handleZoomIn = () => canvasAPI?.zoomIn && canvasAPI.zoomIn();
const handleZoomOut = () => canvasAPI?.zoomOut && canvasAPI.zoomOut();
const handleReset = () => canvasAPI?.zoomReset && canvasAPI.zoomReset();

onMounted(() => {
  if (canvasAPI && canvasAPI.init) {
    const width = canvasContainer.value.clientWidth || 1900;
    const height = canvasContainer.value.clientHeight || 1000;

    // 初始化画布
    canvasAPI.init('c', width, height);

    // 延迟加载默认图片
    setTimeout(() => {
      canvasAPI.initImage(props.imageUrl);
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
  overflow: hidden;
  /* 防止画布放大时撑破容器 */
}

.canvas-center {
  /* 给画布一个阴影，让它看起来像一张纸 */
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  width: 90%;
  height: 90%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 8px 12px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.zoom-text {
  font-size: 13px;
  color: #606266;
  min-width: 45px;
  text-align: center;
  user-select: none;
  font-variant-numeric: tabular-nums;
  /* 防止数字变化时宽度抖动 */
  cursor: pointer;
  transition: color 0.2s;
}

.zoom-text:hover {
  color: #409eff;
}
</style>