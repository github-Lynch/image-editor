<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="$emit('toggle')">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0l12.6 12.6z"></path>
          <path d="m5 6 1.7 1.7"></path>
          <path d="m17 18 1.7 1.7"></path>
          <path d="m11 12 1.7 1.7"></path>
        </svg>
        <span>测量标尺</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      
      <div class="action-row">
        <button 
          class="ie-btn ie-primary" 
          :class="{ 'active': isDrawing }"
          @click="toggleDrawMode"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
          {{ isDrawing ? '绘制中 (Esc退出)' : '新建标尺' }}
        </button>
      </div>

      <div class="divider"></div>

      <div class="control-group">
        <div class="label-row">
          <span>标注数值</span>
        </div>
        <div class="input-group">
          <input 
            type="number" 
            v-model.number="rulerConfig.value" 
            class="ie-input-number" 
            style="flex:1; width:auto;"
            @input="updateActiveRuler"
          >
          <select v-model="rulerConfig.unit" class="ie-select" @change="updateActiveRuler">
            <option value="px">px</option>
            <option value="cm">cm</option>
            <option value="mm">mm</option>
            <option value="m">m</option>
            <option value="in">inch</option>
            <option value="ft">foot</option>
          </select>
        </div>
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>线条颜色</span>
          <input type="color" v-model="rulerConfig.color" @input="updateActiveRuler">
        </div>
        
        <div class="label-row">
          <span>透明度</span>
          <span class="val">{{ rulerConfig.opacity }}%</span>
        </div>
        <input 
          type="range" 
          v-model.number="rulerConfig.opacity" 
          min="10" max="100" 
          class="ie-slider" 
          @input="updateActiveRuler"
        >
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>线条粗细</span>
          <span class="val">{{ rulerConfig.strokeWidth }}px</span>
        </div>
        <input 
          type="range" 
          v-model.number="rulerConfig.strokeWidth" 
          min="1" max="10" 
          class="ie-slider" 
          @input="updateActiveRuler"
        >
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>字体大小</span>
          <input 
            type="number" 
            v-model.number="rulerConfig.fontSize" 
            class="ie-input-number"
            @input="updateActiveRuler"
          >
        </div>
        <div class="label-row" style="margin-top:8px">
          <span>文字背景</span>
          <input type="checkbox" v-model="rulerConfig.showBg" @change="updateActiveRuler">
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, inject, onMounted } from 'vue';
import { 
  registerRulerModule, 
  rulerConfig, 
  isDrawing, 
  startDrawMode, 
  stopDrawMode,
  updateActiveRuler 
} from './useCanvasRuler';

const props = defineProps({
  isExpanded: Boolean
});

const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI'); // 依赖注入获取 Canvas

const toggleDrawMode = () => {
  if (isDrawing.value) {
    stopDrawMode();
  } else {
    startDrawMode();
  }
};

onMounted(() => {
  if (canvasAPI && canvasAPI.canvas) {
    registerRulerModule(canvasAPI.canvas, canvasAPI.saveHistory);
  } else {
    console.warn('CanvasAPI not found in AdjustRuler');
  }
});
</script>

<style scoped>
.tool-content { padding: 16px; }

.action-row {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.divider {
  height: 1px;
  background: #ebeef5;
  margin: 16px 0;
}

.control-group {
  margin-bottom: 16px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #606266;
  margin-bottom: 8px;
}

.input-group {
  display: flex;
  gap: 8px;
}

.ie-select {
  height: 28px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 12px;
  color: #606266;
  padding: 0 4px;
  outline: none;
  background: white;
}

.ie-btn.active {
  background-color: #ecf5ff;
  color: var(--ie-primary-color);
  border-color: var(--ie-primary-color);
}

.val { font-family: monospace; }
</style>