<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="$emit('toggle')">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path>
          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
        </svg>
        <span>智能消除笔</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      
      <div class="mode-row">
        <div 
          class="mode-btn" 
          :class="{ active: drawMode === 'brush' }" 
          @click="drawMode = 'brush'" 
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13.29C18 16.54 15.6 19 12 19s-6-2.46-6-5.71c0-2.83 2-6.29 6-9.29 4 3 6 6.46 6 9.29z"></path>
            <path d="M12 19v2"></path>
          </svg>
          <span class="mode-label">涂抹</span>
        </div>
        
        <div 
          class="mode-btn" 
          :class="{ active: drawMode === 'rect' }" 
          @click="drawMode = 'rect'" 
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span class="mode-label">框选</span>
        </div>
      </div>

      <div class="control-section">
        <div v-if="drawMode === 'brush'">
          <div class="label-row">
            <span>画笔大小</span>
            <input 
              type="number" 
              v-model.number="brushSize" 
              class="ie-input-number"
              min="5"
              max="100"
            >
          </div>
          <input 
            type="range" 
            v-model.number="brushSize" 
            min="5" 
            max="100" 
            class="ie-slider"
          >
          <div class="auto-tip">
             💡 涂抹结束 1秒后自动消除
          </div>
        </div>

        <div v-else class="tips-box">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; min-width:14px">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span>拖拽框选，松手后自动消除区域内容。</span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="ie-btn full" @click="handleRestoreOriginal">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          恢复原图
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import { 
  registerInpaintModule, 
  enterInpaintMode, 
  exitInpaintMode, 
  handleRestoreOriginal,
  brushSize, 
  drawMode 
} from './useCanvasInpaint';

const props = defineProps({
  isExpanded: Boolean
});

const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

onMounted(() => {
  if (canvasAPI?.canvas) {
    registerInpaintModule(canvasAPI.canvas, canvasAPI.saveHistory);
  }
});

watch(() => props.isExpanded, (expanded) => {
  if (expanded) {
    enterInpaintMode();
  } else {
    exitInpaintMode();
  }
});

onUnmounted(() => {
  exitInpaintMode();
});
</script>

<style scoped>
.mode-row { 
  display: flex; 
  gap: 12px; 
  margin-bottom: 20px; 
}

.mode-btn { 
  flex: 1; 
  height: 60px;
  display: flex; 
  flex-direction: column;
  align-items: center; 
  justify-content: center; 
  border-radius: 6px; 
  background: #f5f7fa; 
  cursor: pointer; 
  border: 1px solid transparent; 
  transition: all 0.2s; 
  color: #606266;
}

.mode-btn:hover {
  background: #eef1f6;
  color: #333;
}

.mode-btn.active { 
  background: #ecf5ff; 
  border-color: var(--ie-primary-color); 
  color: var(--ie-primary-color); 
  font-weight: 500;
}

.mode-label {
  font-size: 12px;
  margin-top: 4px;
}

.control-section {
  margin-bottom: 24px;
  min-height: 50px; 
}

.label-row { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; /* 确保垂直对齐 */
  font-size: 12px; 
  color: #606266; 
  margin-bottom: 8px; 
}

.tips-box {
  display: flex;
  align-items: flex-start;
  padding: 10px;
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

.auto-tip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ie-primary-color); 
  text-align: center;
  background: #ecf5ff;
  padding: 4px;
  border-radius: 4px;
}

.action-buttons { 
  display: flex; 
  margin-top: auto;
}

.full { 
  flex: 1; 
  height: 36px;
}

.tool-content {
  padding: 16px;
}

/* === 强制修正滑块主题色 === */
.ie-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--ie-primary-color);
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  margin-top: -6px;
}

.ie-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: 2px solid white;
  border-radius: 50%;
  background: var(--ie-primary-color);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.ie-slider::-webkit-slider-runnable-track {
  height: 4px;
  background: #e4e7ed;
  border-radius: 2px;
}
</style>