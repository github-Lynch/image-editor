<template>
  <div class="puzzle-panel">
    <div class="main-tabs">
      <div class="tab-item" :class="{ active: mode === 'grid' }" @click="mode = 'grid'">
        网格布局
      </div>
      <div class="tab-item disabled">
        长图拼接
      </div>
    </div>

    <div v-if="mode === 'grid'" class="panel-content">
      <div class="sub-tabs">
        <div class="sub-item" :class="{ active: subTab === 'tpl' }" @click="subTab = 'tpl'">模板库</div>
        <div class="sub-item" :class="{ active: subTab === 'style' }" @click="subTab = 'style'">样式调整</div>
      </div>

      <div v-show="subTab === 'tpl'" class="tab-pane fade-in">

        <div class="filter-section">
          <div class="filter-label">图片数量</div>
          <div class="filter-scroll-wrapper hide-scrollbar">
            <div v-for="opt in countOptions" :key="opt.value" class="filter-tag"
              :class="{ active: selectedCount === opt.value }" @click="selectedCount = opt.value">
              {{ opt.label }}
            </div>
          </div>
        </div>

        <div class="template-section">
          <div class="section-header">
            <span class="title">布局列表</span>
            <span class="count-badge" v-if="filteredTemplates.length">{{ filteredTemplates.length }}</span>
          </div>

          <div v-if="filteredTemplates.length === 0" class="empty-state">
            暂无此类模板
          </div>

          <div class="template-grid-container" v-else>
            <div v-for="tpl in filteredTemplates" :key="tpl.id" class="tpl-card" @click="applyTemplate(tpl)">
              <div class="mini-grid-preview" :style="tpl.wrapStyle">
                <div v-for="(area, idx) in tpl.gridAreas" :key="idx" :style="{ gridArea: area }"></div>
              </div>
              <div class="card-overlay">{{ tpl.label || '模板' }}</div>
            </div>
          </div>
        </div>

        <div class="custom-grid-section">
          <div class="section-header small">自定义行列</div>
          <div class="custom-input-group">
            <div class="input-item">
              <span class="label">行</span>
              <input type="number" class="ie-input" v-model.number="customRows" min="1" max="6" @change="applyCustom">
            </div>
            <div class="divider"></div>
            <div class="input-item">
              <span class="label">列</span>
              <input type="number" class="ie-input" v-model.number="customCols" min="1" max="6" @change="applyCustom">
            </div>
          </div>
        </div>

      </div>

      <div v-show="subTab === 'style'" class="tab-pane fade-in">
        <div class="ie-group">
          <div class="group-header">间距与圆角</div>
          <div class="control-list">
            <div class="slider-item">
              <span class="label">外边距</span>
              <input type="range" class="ie-range" v-model.number="style.padding" max="60" @input="updateStyle">
              <span class="val">{{ style.padding }}</span>
            </div>
            <div class="slider-item">
              <span class="label">间隙</span>
              <input type="range" class="ie-range" v-model.number="style.spacing" max="40" @input="updateStyle">
              <span class="val">{{ style.spacing }}</span>
            </div>
            <div class="slider-item">
              <span class="label">圆角</span>
              <input type="range" class="ie-range" v-model.number="style.radius" max="100" @input="updateStyle">
              <span class="val">{{ style.radius }}</span>
            </div>
          </div>
        </div>

        <div class="ie-group">
          <div class="group-header">画布背景</div>
          <div class="color-selector">
            <div class="color-preview" :style="{ backgroundColor: style.bgColor }">
              <input type="color" v-model="style.bgColor" @input="updateStyle" class="color-input-hidden">
            </div>
            <span class="color-value">{{ style.bgColor }}</span>
          </div>
        </div>
      </div>
    </div>

    <input type="file" ref="fileInput" accept="image/png, image/jpeg, image/jpg" style="display:none"
      @change="onFileSelected">
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted, onUnmounted, computed } from 'vue';
import { Toast } from '@/utils/toast';
import {
  registerPuzzleModule,
  initPuzzleMode,
  exitPuzzleMode,
  updateLayout,
  addImageToCell,
} from './useCanvasPuzzle';
import {
  generateGridCells,
  gridTemplates,
  countOptions,
  parseTemplateToCells
} from './config';

const canvasAPI = inject('canvasAPI');
const fileInput = ref(null);
const mode = ref('grid');
const subTab = ref('tpl');

const selectedCount = ref('all');
let pendingCellIndex = -1;

const customRows = ref(2);
const customCols = ref(2);

const style = reactive({
  padding: 20,
  spacing: 10,
  radius: 0,
  bgColor: '#ffffff'
});

const filteredTemplates = computed(() => {
  if (selectedCount.value === 'all') {
    return Object.values(gridTemplates).flat();
  }
  return gridTemplates[selectedCount.value] || [];
});

onMounted(() => {
  if (canvasAPI) {
    registerPuzzleModule(canvasAPI.canvas, canvasAPI.saveHistory, {
      onCellClick: (index) => {
        pendingCellIndex = index;
        if (fileInput.value) {
          fileInput.value.value = '';
          fileInput.value.click();
        }
      }
    });
    initPuzzleMode();
  }
});

onUnmounted(() => {
  exitPuzzleMode();
});

const applyCustom = () => {
  const cells = generateGridCells(customRows.value, customCols.value);
  updateLayout(cells, style);
};

const applyTemplate = (tpl) => {
  const cells = parseTemplateToCells(tpl);
  updateLayout(cells, style);
};

const updateStyle = () => {
  updateLayout(null, style);
};

const onFileSelected = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
    Toast.error('仅支持 JPG/PNG 图片格式');
    return;
  }
  if (pendingCellIndex >= 0) {
    const url = URL.createObjectURL(file);
    addImageToCell(url, pendingCellIndex);
    pendingCellIndex = -1;
  }
};
</script>

<style scoped>
/* === 全局变量 (Design Token) === */
.puzzle-panel {
  --primary: #409eff;
  --primary-soft: #ecf5ff;
  --text-main: #2c3e50;
  --text-sub: #606266;
  --text-light: #909399;
  --bg-page: #ffffff;
  --bg-block: #f7f8fa;
  /* 浅灰块背景 */
  --border: #eef0f4;
  --radius-md: 8px;
  --radius-pill: 20px;

  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow: hidden;
}

/* === 顶部 Tabs === */
.main-tabs {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  gap: 10px;
  background: var(--bg-page);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  border-radius: var(--radius-md);
  color: var(--text-sub);
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-block);
  font-weight: 500;
  border: 1px solid transparent;
}

.tab-item:hover:not(.disabled) {
  background: #fff;
  border-color: var(--border);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.tab-item.active {
  background: var(--primary-soft);
  color: var(--primary);
  border-color: transparent;
}

.tab-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* === 内容区 === */
.panel-content {
  flex: 1;
  overflow-y: auto;
  /* 纵向滚动 */
  padding: 0;
  display: flex;
  flex-direction: column;
}


/* 二级 Tabs */
.sub-tabs {
  display: flex;
  padding: 0 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-page);
  position: sticky;
  top: 0;
  z-index: 10;
}

.sub-item {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-sub);
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}

.sub-item.active {
  color: var(--primary);
  font-weight: 600;
}

.sub-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--primary);
  border-radius: 2px 2px 0 0;
}

.tab-pane {
  padding: 16px;
}

/* === 1. 筛选器 (横向滚动 + 胶囊) === */
.filter-section {
  margin-bottom: 24px;
}

.filter-label {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 8px;
  padding-left: 2px;
}

.filter-scroll-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
  justify-content: space-between;
}

.filter-scroll-wrapper::-webkit-scrollbar {
  display: none;
}

.filter-scroll-wrapper:active {
  cursor: grabbing;
}

.filter-tag {
  width: 58px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  /* 圆角更精致 */
  font-size: 14px;
  color: #606266;
  background: #ffffff;
  border: 1px solid #e5e8eb;
  /* 基础阴影 - 提升层次感 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  /* 过渡动画 - 交互更丝滑 */
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

/* 激活态（全部按钮）样式 */
.filter-tag.active {
  color: #ffffff;
  /* 渐变背景 - 提升质感 */
  background: linear-gradient(135deg, #2596ff 0%, #0078ff 100%);
  border-color: #0078ff;
  /* 增强阴影 - 突出选中状态 */
  box-shadow: 0 4px 8px rgba(0, 120, 255, 0.25);
}

/* 悬浮态样式 */
.filter-tag:not(.active):hover {
  border-color: #ccd0d6;
  background: #f8f9fa;
  /* 悬浮阴影提升 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
  /* 轻微上浮 - 触感反馈 */
}

/* 点击按压态 */
.filter-tag:not(.active):active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  background: #f0f2f5;
}

/* 激活态伪元素 - 增加细节质感 */
.filter-tag.active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

/* === 2. 模板列表 (卡片风格) === */
.section-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 2px;
}

.count-badge {
  font-size: 12px;
  color: var(--text-light);
  background: var(--bg-block);
  padding: 2px 6px;
  border-radius: 4px;
}

.template-grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.tpl-card {
  position: relative;
  aspect-ratio: 1;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 5px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden;
}

.tpl-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-soft);
}

/* 预览图容器 */
.mini-grid-preview {
  width: 100%;
  height: 100%;
  display: grid;
  gap: 2px;
  border-radius: 4px;
  overflow: hidden;
}

.mini-grid-preview>div {
  background: #e6e8eb;
  /* 默认灰色 */
  transition: background 0.2s;
}

.tpl-card:hover .mini-grid-preview>div {
  background: #d4d7dc;
  /* 悬浮加深 */
}

/* 底部文字遮罩 (只在hover显示) */
.card-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  /* 半透明黑底 */
  padding: 4px;
  text-align: center;
  font-size: 10px;
  color: #fff;
  transform: translateY(100%);
  transition: transform 0.2s ease;
  backdrop-filter: blur(2px);
}

.tpl-card:hover .card-overlay {
  transform: translateY(0);
}

/* === 3. 自定义行列 (整合输入框) === */
.custom-grid-section {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px dashed var(--border);
}

.section-header.small {
  font-size: 12px;
  color: var(--text-light);
  margin-bottom: 10px;
}

.custom-input-group {
  display: flex;
  align-items: center;
  background: var(--bg-block);
  border-radius: var(--radius-md);
  padding: 6px;
  border: 1px solid transparent;
  transition: border-color 0.2s;
}

.custom-input-group:focus-within {
  border-color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 2px var(--primary-soft);
}

.input-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-item .label {
  font-size: 12px;
  color: var(--text-sub);
  margin-right: 8px;
}

.ie-input {
  width: 40px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
  outline: none;
}

.divider {
  width: 1px;
  height: 16px;
  background: #ddd;
  margin: 0 8px;
}

/* === 样式调整 Tab === */
.ie-group {
  margin-bottom: 24px;
}

.group-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 12px;
}

.slider-item {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.slider-item .label {
  width: 48px;
  font-size: 13px;
  color: var(--text-sub);
}

.ie-range {
  flex: 1;
  margin: 0 12px;
  height: 4px;
  background: #e4e7ed;
  border-radius: 2px;
  -webkit-appearance: none;
  cursor: pointer;
}

.ie-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: var(--primary);
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.1s;
}

.ie-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider-item .val {
  width: 24px;
  text-align: right;
  font-size: 12px;
  color: var(--text-light);
  font-family: monospace;
}

.color-selector {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-block);
  padding: 8px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.color-selector:hover {
  background: #eef1f6;
}

.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.color-input-hidden {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  cursor: pointer;
}

.color-value {
  font-size: 13px;
  color: var(--text-sub);
  font-family: monospace;
}

.empty-state {
  text-align: center;
  color: var(--text-light);
  font-size: 13px;
  padding: 40px 0;
  background: var(--bg-block);
  border-radius: var(--radius-md);
}

.fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>