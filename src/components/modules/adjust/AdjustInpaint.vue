<template>
  <div class="tool-group">
    <div
      class="tool-item"
      :class="{ 'is-expanded': isExpanded }"
      @click="$emit('toggle')"
    >
      <div class="left">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"
          ></path>
          <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon>
        </svg>
        <span>智能消除笔</span>
      </div>
      <div class="right-icon">
        <svg
          class="arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M18 13.29C18 16.54 15.6 19 12 19s-6-2.46-6-5.71c0-2.83 2-6.29 6-9.29 4 3 6 6.46 6 9.29z"
            ></path>
            <path d="M12 19v2"></path>
          </svg>
          <span class="mode-label">涂抹</span>
        </div>

        <div
          class="mode-btn"
          :class="{ active: drawMode === 'rect' }"
          @click="drawMode = 'rect'"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
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
            />
          </div>
          <input
            type="range"
            v-model.number="brushSize"
            min="5"
            max="100"
            class="ie-slider"
            v-ie-slider-progress
          />
          <div class="auto-tip">💡 涂抹结束 1秒后自动消除</div>
        </div>

        <div v-else class="tips-box">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="margin-right: 4px; min-width: 14px"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          </svg>
          <span>拖拽框选，松手后自动消除区域内容。</span>
        </div>
      </div>

      <div class="action-buttons">
        <button class="ie-btn full" @click="handleRestoreOriginal">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="margin-right: 6px"
          >
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
import { inject, watch, onMounted, onUnmounted } from "vue";
import {
  registerInpaintModule,
  enterInpaintMode,
  exitInpaintMode,
  handleRestoreOriginal,
  brushSize,
  drawMode,
} from "./useCanvasInpaint";

const props = defineProps({
  isExpanded: Boolean,
});

const emit = defineEmits(["toggle"]);
const canvasAPI = inject("canvasAPI");

onMounted(() => {
  if (canvasAPI?.canvas) {
    // 注册模块，传入 canvas 实例和 saveHistory 方法
    registerInpaintModule(canvasAPI.canvas, canvasAPI.saveHistory);
  }
});

// 监听面板展开/收起状态
watch(
  () => props.isExpanded,
  (expanded) => {
    if (expanded) {
      enterInpaintMode();
    } else {
      exitInpaintMode();
    }
  }
);

// 组件卸载时确保清理
onUnmounted(() => {
  exitInpaintMode();
});
</script>

<style scoped>
/* 样式与 AdjustInpaint copy.vue 保持一致 */
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
  margin-top: 4px;
}

.control-section {
  margin-bottom: 24px;
  min-height: 50px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
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
  color: #909399;
  line-height: 1.4;
}

.auto-tip {
  margin-top: 8px;
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

/* Slider 和 Input Number 样式已在全局定义，此处无需重复 */
</style>
