<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="handleToggle">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
        <span>调整尺寸</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      
      <div class="resize-input-box">
        <div class="input-header">
          <span>自定义</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </div>

        <div class="input-controls">
           <div class="input-wrapper">
             <input type="number" v-model.number="width" class="ie-input" @input="onWidthChange">
             <span class="suffix">W</span>
           </div>

           <div class="link-icon" @click="toggleLock">
              <svg v-if="locked" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#409eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.6">
                 <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                 <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                 <line x1="4" y1="4" x2="20" y2="20" stroke="#909399"></line>
              </svg>
           </div>

           <div class="input-wrapper">
             <input type="number" v-model.number="height" class="ie-input" @input="onHeightChange">
             <span class="suffix">H</span>
           </div>
        </div>
      </div>

      <div class="preset-list">
        <div 
          v-for="(preset, index) in presets" 
          :key="index" 
          class="preset-item"
          @click="selectPreset(preset)"
        >
          {{ preset.label }} ({{ preset.w }} × {{ preset.h }})
        </div>
      </div>

      <div class="switch-row">
        <label class="switch-label">
          <div class="switch-box" :class="{ checked: isAdaptive }" @click="isAdaptive = !isAdaptive">
            <div class="switch-core"></div>
          </div>
          <span style="margin-left: 8px; font-size: 13px; color: #333;">图片宽高等比缩放</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;">
             <circle cx="12" cy="12" r="10"></circle>
             <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
             <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </label>
      </div>

      <div class="action-buttons">
        <button class="ie-btn ie-primary full" @click="handleApply">应用</button>
        <button class="ie-btn full" @click="handleToggle">取消</button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, onMounted } from 'vue';
import { registerResizeModule, getCurrentSize, applyResize } from './useCanvasResize';

const props = defineProps({
  isExpanded: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle']);

const canvasAPI = inject('canvasAPI');

// 状态
const width = ref(0);
const height = ref(0);
const locked = ref(true);     // 默认锁定比例
const aspectRatio = ref(1);   // 宽高比
const isAdaptive = ref(true); // 默认图片自适应

// 预设数据 (模拟截图)
const presets = [
  { label: '方形主图', w: 800, h: 800 },
  { label: 'Temu服装图', w: 1340, h: 1785 },
  { label: '方形主图', w: 1000, h: 1000 },
  { label: '竖版主图', w: 750, h: 1000 },
  { label: '方形主图', w: 500, h: 500 },
  { label: '竖版主图', w: 1000, h: 1200 },
  { label: 'Youtube视频封面', w: 1280, h: 720 },
  { label: 'Pinterest帖子', w: 750, h: 1120 },
  { label: 'Facebook封面', w: 851, h: 315 },
];

// 初始化逻辑
const initSize = () => {
  if (canvasAPI && canvasAPI.canvas) {
    // 注册逻辑模块
    registerResizeModule(canvasAPI.canvas, canvasAPI.saveHistory);
    const size = getCurrentSize();
    width.value = size.width;
    height.value = size.height;
    if (size.height > 0) {
      aspectRatio.value = size.width / size.height;
    }
  }
};

// 监听展开，获取当前尺寸
watch(() => props.isExpanded, (val) => {
  if (val) {
    initSize();
  }
});

// 交互逻辑
const toggleLock = () => {
  locked.value = !locked.value;
  if (locked.value && height.value > 0) {
    // 重新计算当前比例作为锁定比例
    aspectRatio.value = width.value / height.value;
  }
};

const onWidthChange = () => {
  if (locked.value && width.value) {
    height.value = Math.round(width.value / aspectRatio.value);
  }
};

const onHeightChange = () => {
  if (locked.value && height.value) {
    width.value = Math.round(height.value * aspectRatio.value);
  }
};

const selectPreset = (preset) => {
  width.value = preset.w;
  height.value = preset.h;
  // 选中预设时，自动更新比例（如果锁定了的话，需要更新比例基准，否则会跳回去）
  if (locked.value) {
    aspectRatio.value = preset.w / preset.h;
  }
};

const handleApply = () => {
  applyResize(width.value, height.value, isAdaptive.value);
  emit('toggle'); // 关闭面板
};

const handleToggle = () => {
  emit('toggle');
};

onMounted(() => {
  initSize();
});
</script>

<style scoped>
/* 简单的 hover 动画 */
.tool-item:hover .arrow {
  transform: translateX(2px);
  transition: transform 0.2s;
}

.resize-input-box {
  border: 1px solid #2db7a5; /* 截图中的绿色边框 */
  background-color: #f6fffa;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 12px;
}

.input-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #333;
  margin-bottom: 8px;
}

.input-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-wrapper {
  position: relative;
  width: 38%;
}

.ie-input {
  text-align: center;
  padding-right: 20px;
  font-weight: 500;
  color: #333;
}

.suffix {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  color: #c0c4cc;
  font-size: 12px;
  pointer-events: none;
}

.link-icon {
  width: 24px;
  display: flex;
  justify-content: center;
  cursor: pointer;
}

/* 预设列表样式 */
.preset-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 280px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.preset-item {
  background-color: #f5f7fa;
  padding: 10px 12px;
  border-radius: 4px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.preset-item:hover {
  background-color: #e6f7ff;
  color: #409eff;
}

/* 开关行 */
.switch-row {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.switch-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
}

/* 自定义开关样式 (仿 AntD/Element) */
.switch-box {
  width: 36px;
  height: 18px;
  background-color: #dcdfe6;
  border-radius: 9px;
  position: relative;
  transition: background-color 0.3s;
}

.switch-box.checked {
  background-color: #009688; /* 截图中的墨绿色 */
}

.switch-core {
  width: 14px;
  height: 14px;
  background-color: #fff;
  border-radius: 50%;
  position: absolute;
  left: 2px;
  top: 2px;
  transition: left 0.3s;
}

.switch-box.checked .switch-core {
  left: 20px;
}

/* 底部按钮 */
.action-buttons {
  display: flex;
  gap: 10px;
}

.full {
  flex: 1;
}

.ie-btn.ie-primary {
  background-color: #009688; /* 截图中的墨绿色 */
  border-color: #009688;
}

.ie-btn.ie-primary:hover {
  background-color: #00796b;
  border-color: #00796b;
}
</style>