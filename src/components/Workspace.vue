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
import { onMounted, inject, ref, computed, onUnmounted } from 'vue';

const props = defineProps({
  imageUrl: {
    type: String,
    default: ''
  },
});

const canvasAPI = inject('canvasAPI');
const canvasContainer = ref(null);

// 计算属性：只负责显示
// 它依赖 canvasAPI.zoom.value，只要 zoom.value 变了，这里自动变
const zoomPercentage = computed(() => {
  return canvasAPI?.zoom?.value ? Math.round(canvasAPI.zoom.value * 100) : 100;
});

// 操作处理
const handleZoomIn = () => canvasAPI?.zoomIn && canvasAPI.zoomIn();
const handleZoomOut = () => canvasAPI?.zoomOut && canvasAPI.zoomOut();
const handleReset = () => canvasAPI?.zoomReset && canvasAPI.zoomReset();

// 定义更新函数，方便挂载和卸载
const updateZoomState = () => {
  const fabricCanvas = canvasAPI?.canvas?.value;
  if (fabricCanvas && canvasAPI.zoom) {
    // 读取当前画布真实的 zoom 值，同步给响应式数据
    canvasAPI.zoom.value = fabricCanvas.getZoom();
  }
};

onMounted(() => {
  if (canvasAPI && canvasAPI.init) {
    const width = canvasContainer.value.clientWidth || 1900;
    const height = canvasContainer.value.clientHeight || 1000;

    // 1. 初始化画布
    canvasAPI.init('c', width, height);

    // 2. 获取 Fabric 实例
    // 注意：这里假设 canvasAPI.canvas 是一个 ref
    const fabricCanvas = canvasAPI.canvas.value;

    if (fabricCanvas) {
      // 3. 【核心修复】监听我们在 useCanvasCrop 中发射的 'zoom:change' 事件
      // 同时也监听原生的 'zoom' 事件（如果有缩放滚轮逻辑）
      fabricCanvas.on('zoom:change', updateZoomState);

      // 如果你的 canvasAPI 内部没有处理滚轮更新 zoom 变量，也可以在这里补一个
      fabricCanvas.on('mouse:wheel', updateZoomState);
    }

  } else {
    console.error('CanvasAPI not found.');
  }
});

// 记得销毁监听，防止内存泄漏
onUnmounted(() => {
  const fabricCanvas = canvasAPI?.canvas?.value;
  if (fabricCanvas) {
    fabricCanvas.off('zoom:change', updateZoomState);
    fabricCanvas.off('mouse:wheel', updateZoomState);
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
}

.canvas-center {
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  width: 95%;
  height: 95%;
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
  cursor: pointer;
  transition: color 0.2s;
}

.zoom-text:hover {
  color: #409eff;
}
</style>