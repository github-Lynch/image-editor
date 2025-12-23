<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="handleToggle">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </svg>
        <span>裁剪/旋转</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">

      <div class="ratio-grid">
        <div class="ratio-item" @click="handleSetRatio(null, true)">
          <div class="icon-box">
            <svg width="16" height="16" viewBox="0 0 24 24" style="fill: currentColor">
              <path
                d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </div>
          <span>初始化</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 'original' }" @click="handleSetRatio('original')">
          <div class="shape-rect" style="width: 14px; height: 14px; border:1px solid #666"></div>
          <span>原比例</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 'free' }" @click="handleSetRatio(null)">
          <div class="shape-rect dashed"></div>
          <span>自由比例</span>
        </div>

        <div class="ratio-item" :class="{ active: isManualActive }" @click="handleManualSelect">
          <div class="icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path stroke-dasharray="4 4" d="M4 4h16v16H4z" />
              <path fill="currentColor" stroke="none" d="M14 14l3.5 8 1.5-3.5 3.5-1.5-8-3.5z" />
            </svg>
          </div>
          <span>手动选区</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(1) }" @click="handleSetRatio(1)">
          <div class="shape-rect square"></div>
          <span>1:1</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(3 / 2) }" @click="handleSetRatio(3 / 2)">
          <div class="shape-rect" style="width: 12px; height: 8px;"></div>
          <span>3:2</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(2 / 3) }" @click="handleSetRatio(2 / 3)">
          <div class="shape-rect" style="width: 8px; height: 12px;"></div>
          <span>2:3</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(4 / 3) }" @click="handleSetRatio(4 / 3)">
          <div class="shape-rect" style="width: 16px; height: 12px;"></div>
          <span>4:3</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(3 / 4) }" @click="handleSetRatio(3 / 4)">
          <div class="shape-rect" style="width: 12px; height: 16px;"></div>
          <span>3:4</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(16 / 9) }" @click="handleSetRatio(16 / 9)">
          <div class="shape-rect" style="width: 16px; height: 9px;"></div>
          <span>16:9</span>
        </div>

        <div class="ratio-item" :class="{ active: isRatioMatch(9 / 16) }" @click="handleSetRatio(9 / 16)">
          <div class="shape-rect" style="width: 9px; height: 16px;"></div>
          <span>9:16</span>
        </div>
      </div>

      <div class="custom-input-box">
        <div class="input-header">
          <span>自定义</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer">
            <circle cx="12" cy="12" r="3"></circle>
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z">
            </path>
          </svg>
        </div>

        <div class="input-controls">
          <div class="input-wrapper">
            <input type="number" v-model.number="cropW" class="ie-input" @change="onWidthChange">
            <span class="suffix">W</span>
          </div>

          <div class="link-icon" @click="toggleRatioLock">
            <svg v-if="isRatioLocked" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="var(--ie-primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              <line x1="4" y1="4" x2="20" y2="20" stroke="#909399" />
            </svg>
          </div>

          <div class="input-wrapper">
            <input type="number" v-model.number="cropH" class="ie-input" @change="onHeightChange">
            <span class="suffix">H</span>
          </div>
        </div>
      </div>

      <div class="rotate-actions">
        <div class="action-btn" title="向左旋转90°" @click="rotate(-90)">
          <svg width="20" height="20" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </div>
        <div class="action-btn" title="向右旋转90°" @click="rotate(90)">
          <svg width="20" height="20" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </div>
        <div class="divider"></div>
        <div class="action-btn" title="水平翻转" @click="flip('X')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14" />
            <path d="M8 9l-3 3 3 3" />
            <path d="M16 9l3 3-3 3" />
          </svg>
        </div>
        <div class="action-btn" title="垂直翻转" @click="flip('Y')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14" />
            <path d="M9 8l3-3 3 3" />
            <path d="M9 16l3 3 3-3" />
          </svg>
        </div>
      </div>

      <div class="confirm-row">
        <button class="ie-btn ie-primary full-btn" @click="handleApply">应用</button>
        <button class="ie-btn full-btn" @click="handleCancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { fabric } from 'fabric';

import {
  startCrop,
  confirmCrop,
  setCropRatio,
  currentSelectionDims,
  isRatioLocked,
  currentAspectRatio, // 确保引入了此变量
  setCropBoxSize,
  rotateActive,
  flipActive,
  startManualSelection,
  isManualCropping,
  cropObject,
  openCropPanel,
  closeCropPanel,
} from './useCanvasCrop';

const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['toggle']);

const currentRatio = ref('free');
const cropW = ref(0);
const cropH = ref(0);

// 监听来自逻辑层的尺寸变化
watch(currentSelectionDims, (newVal) => {
  if (newVal && (newVal.width !== 0 || newVal.height !== 0)) {
    cropW.value = newVal.width;
    cropH.value = newVal.height;
  }
});

watch(() => props.isExpanded, (val) => {
  if (val) {
    nextTick(() => {
      startCrop(null);
      updateInputFromCanvas();
    });
  } else {
    closeCropPanel();
  }
});

const handleToggle = () => {
  emit('toggle');
};

const handleCancel = () => {
  emit('toggle');
};

const handleApply = () => {
  confirmCrop();
  emit('toggle');
};

const isRatioMatch = (r) => {
  if (currentRatio.value === 'original') return false;
  if (!currentAspectRatio.value) return false;
  return Math.abs(currentAspectRatio.value - r) < 0.01;
};

const handleSetRatio = (ratio, isReset = false) => {
  if (isReset) {
    currentRatio.value = 'free';
    startCrop(null);
  } else if (ratio === 'original') {
    currentRatio.value = 'original';
    const activeObj = cropObject.value?.canvas?.getObjects().find(o => o.type === 'image');
    if (activeObj) {
      setCropRatio(activeObj.width / activeObj.height);
    }
  } else if (ratio === null) {
    currentRatio.value = 'free';
    setCropRatio(null);
  } else {
    currentRatio.value = ratio;
    setCropRatio(ratio);
  }
  nextTick(() => {
    updateInputFromCanvas();
  });
};

// ============================================
// 新增/修改：输入框联动计算逻辑
// ============================================

// 获取当前有效的计算比例
const getActiveRatio = () => {
  // 1. 如果当前选中的是数字比例 (如 1.5, 0.75 等)，直接返回
  if (typeof currentRatio.value === 'number') {
    return currentRatio.value;
  }
  // 2. 如果当前选中的是 'original'，则使用逻辑层计算出的真实比例
  if (currentRatio.value === 'original' && currentAspectRatio.value) {
    return currentAspectRatio.value;
  }
  // 3. 自由比例返回 null
  return null;
};

// 宽度变化时
const onWidthChange = () => {
  const ratio = getActiveRatio();
  // 如果有锁定比例，且宽度有效
  if (ratio && cropW.value > 0) {
    // 宽 = 高 * 比例  =>  高 = 宽 / 比例
    cropH.value = Math.round(cropW.value / ratio);
  }
  // 应用到画布
  applyInputSize();
};

// 高度变化时
const onHeightChange = () => {
  const ratio = getActiveRatio();
  // 如果有锁定比例，且高度有效
  if (ratio && cropH.value > 0) {
    // 宽 = 高 * 比例
    cropW.value = Math.round(cropH.value * ratio);
  }
  // 应用到画布
  applyInputSize();
};

// 将输入框的值应用到 Canvas 选区
const applyInputSize = () => {
  if (cropW.value > 0 && cropH.value > 0) {
    setCropBoxSize(cropW.value, cropH.value);
  }
};

const toggleRatioLock = () => {
  if (isRatioLocked.value) {
    handleSetRatio(null);
  } else {
    // 如果是从自由比例点击锁定，则锁定当前输入的比例
    if (cropW.value && cropH.value) {
      const currentR = cropW.value / cropH.value;
      currentRatio.value = currentR;
      setCropRatio(currentR);
    }
  }
};

// ============================================

const isManualActive = computed(() => isManualCropping.value);

const updateInputFromCanvas = () => {
  if (cropObject.value) {
    const w = Math.round(cropObject.value.getScaledWidth());
    const h = Math.round(cropObject.value.getScaledHeight());

    cropW.value = w;
    cropH.value = h;
    if (currentRatio.value !== 'free' && currentRatio.value !== 'original' && typeof currentRatio.value === 'number') {
      const currentRealRatio = w / h;
      const targetRatio = currentRatio.value;
      if (Math.abs(currentRealRatio - targetRatio) > 0.02) {
        currentRatio.value = 'free';
        setCropRatio(null);
      }
    }
  }
};

const handleManualSelect = () => {
  currentRatio.value = 'manual'; // 1. 将 UI 状态设为 manual，清除“原比例”和“自由比例”的高亮
  setCropRatio(null);            // 2. 核心修复：调用逻辑层方法，将比例锁定设为 null，从而清除 1:1、3:2 等项的高亮
  startManualSelection()
};

const rotate = (angle) => {
  rotateActive(angle);
  setTimeout(updateInputFromCanvas, 50);
};
const flip = (axis) => flipActive(axis);

onMounted(() => {
  if (props.isExpanded) {
    openCropPanel();
    nextTick(() => {
      startCrop(null);
      updateInputFromCanvas();
    });
  }

  const checkCanvas = setInterval(() => {
    const canvasInstance = cropObject.value?.canvas;
    if (canvasInstance) {
      canvasInstance.on('object:scaling', updateInputFromCanvas);
      canvasInstance.on('object:modified', updateInputFromCanvas);
      canvasInstance.on('object:moving', updateInputFromCanvas);
      clearInterval(checkCanvas);
    }
  }, 100);
});

onUnmounted(() => {
  const canvasInstance = cropObject.value?.canvas;
  if (canvasInstance) {
    canvasInstance.off('object:scaling', updateInputFromCanvas);
    canvasInstance.off('object:modified', updateInputFromCanvas);
    canvasInstance.off('object:moving', updateInputFromCanvas);
  }

  if (props.isExpanded) {
    closeCropPanel();
  }
});
</script>

<style scoped>
/* 保持所有样式不变 */
.ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.ratio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border: 1px solid #f2f2f2;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  background: #fff;
  transition: all 0.2s;
  height: 60px;
}

.ratio-item:hover {
  background-color: #f9f9f9;
  border-color: #dcdfe6;
}

.ratio-item.active {
  border-color: var(--ie-primary-color);
  color: var(--ie-primary-color);
  background-color: #ecf5ff;
}

.icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
}

.shape-rect {
  border: 1px solid currentColor;
  margin-bottom: 6px;
  box-sizing: border-box;
}

.shape-rect.dashed {
  border-style: dashed;
  width: 14px;
  height: 14px;
}

.shape-rect.square {
  width: 14px;
  height: 14px;
}

.custom-input-box {
  background-color: #f8f9fa;
  border: none;
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

.rotate-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  font-size: 18px;
  background-color: #f5f7fa;
  transition: all 0.2s;
}

.action-btn:hover {
  background-color: #e6e8eb;
  color: #333;
}

.divider {
  width: 1px;
  height: 20px;
  background-color: #eee;
}

.confirm-row {
  display: flex;
  gap: 10px;
}

.full-btn {
  flex: 1;
}
</style>