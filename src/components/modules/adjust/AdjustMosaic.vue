<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="$emit('toggle')">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
        <span>马赛克</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content filter-panel">
      <div class="mode-row">
        <div class="mode-btn" :class="{ active: activeMode === 'path' }" @click="setMode('path')" title="涂抹">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 14c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM4 11c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm16 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </div>
        <div class="mode-btn" :class="{ active: activeMode === 'rect' }" @click="setMode('rect')" title="矩形">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
        </div>
        <div class="mode-btn" :class="{ active: activeMode === 'circle' }" @click="setMode('circle')" title="圆形">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /></svg>
        </div>
      </div>

      <div class="intensity-section">
        <div class="label-row">
          <span>强度</span>
          <input type="number" v-model.number="intensity" class="ie-input-number" @change="updateConfig">
        </div>
        <input type="range" v-model.number="intensity" min="4" max="100" class="ie-slider" @input="updateConfig">
      </div>

      <div class="action-buttons">
        <button class="ie-btn ie-primary full" @click="handleApply" :disabled="loading">
          {{ loading ? '处理中...' : '确定应用' }}
        </button>
        <button class="ie-btn full" @click="handleCancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import { registerMosaicModule, startMosaicInteraction, applyMosaic, cancelMosaic } from './useCanvasMosaic';

const props = defineProps({ isExpanded: Boolean });
const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

const activeMode = ref('path');
const intensity = ref(15);
const loading = ref(false);

const setMode = (mode) => {
  activeMode.value = mode;
  startMosaicInteraction(mode, intensity.value);
};

const updateConfig = () => {
  startMosaicInteraction(activeMode.value, intensity.value);
};

const handleApply = async () => {
  loading.value = true;
  await applyMosaic(intensity.value);
  loading.value = false;
  emit('toggle');
};

const handleCancel = () => {
  cancelMosaic();
  emit('toggle');
};

watch(() => props.isExpanded, (val) => {
  if (val) setMode('path');
  else cancelMosaic();
});

onMounted(() => {
  if (canvasAPI?.canvas) registerMosaicModule(canvasAPI.canvas, canvasAPI.saveHistory);
});

// 组件销毁时确保清理交互状态
onUnmounted(() => {
  cancelMosaic();
});
</script>

<style scoped>
.filter-panel { padding: 16px; }
.mode-row { display: flex; justify-content: space-between; margin-bottom: 24px; gap: 12px; }
.mode-btn { 
  flex: 1; height: 44px; display: flex; align-items: center; justify-content: center; 
  border-radius: 8px; background: #f5f7fa; cursor: pointer; border: 1px solid transparent; transition: 0.2s; 
}
.mode-btn:hover { background: #eef1f6; color: #333; }
.mode-btn.active { background: #ecf5ff; border-color: var(--ie-primary-color); color: var(--ie-primary-color); }

.intensity-section { margin-bottom: 24px; }
/* label-row 继承宪法规范，这里微调间距 */
.label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 13px; color: #606266; }

.action-buttons { display: flex; gap: 10px; }
.full { flex: 1; }
</style>