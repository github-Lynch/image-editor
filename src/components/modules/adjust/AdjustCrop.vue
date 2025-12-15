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
        <div class="ratio-item" @click="resetCrop">
          <div class="icon-box">
            <svg width="16" height="16" viewBox="0 0 24 24" style="fill: currentColor">
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
          </svg>
          </div>
          <span>初始化</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 'original' }" @click="startCrop(null, true)">
          <div class="shape-rect" style="width: 14px; height: 14px; border:1px solid #666"></div>
          <span>原比例</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 'free' }" @click="startCrop(null)">
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

        <div class="ratio-item" :class="{ active: currentRatio === 1 }" @click="startCrop(1)">
          <div class="shape-rect square"></div>
          <span>1:1</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 3 / 2 }" @click="startCrop(3 / 2)">
          <div class="shape-rect" style="width: 12px; height: 8px;"></div>
          <span>3:2</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 2 / 3 }" @click="handleStartCrop(2 / 3)">
          <div class="shape-rect" style="width: 8px; height: 12px;"></div>
          <span>2:3</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 4 / 3 }" @click="startCrop(4 / 3)">
          <div class="shape-rect" style="width: 16px; height: 12px;"></div>
          <span>4:3</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 3 / 4 }" @click="handleStartCrop(3 / 4)">
          <div class="shape-rect" style="width: 12px; height: 16px;"></div>
          <span>3:4</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 16 / 9 }" @click="startCrop(16 / 9)">
          <div class="shape-rect" style="width: 16px; height: 9px;"></div>
          <span>16:9</span>
        </div>

        <div class="ratio-item" :class="{ active: currentRatio === 9 / 16 }" @click="handleStartCrop(9 / 16)">
          <div class="shape-rect" style="width: 9px; height: 16px;"></div>
          <span>9:16</span>
        </div>
      </div>

      <div class="custom-size-box">
        <div class="input-row">
          <div class="input-wrapper">
            <input type="number" v-model.number="cropW" class="ie-input" @change="updateCropSize">
            <span class="input-suffix">W</span>
          </div>

          <div class="link-icon">
            <span style="color: #909399; font-size: 14px;">×</span>
          </div>

          <div class="input-wrapper">
            <input type="number" v-model.number="cropH" class="ie-input" @change="updateCropSize">
            <span class="input-suffix">H</span>
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
        <button class="ie-btn ie-primary full-btn" @click="applyCrop">应用</button>
        <button class="ie-btn full-btn" @click="cancelCrop">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted, computed } from 'vue';
import { fabric } from 'fabric'; 

// === 【关键】直接从 Singleton 模块导入方法和状态 ===
import { 
  startCrop, 
  confirmCrop,
  setCropRatio,
  cancelCrop, 
  isRatioLocked,
  currentAspectRatio,
  setCropBoxSize, 
  rotateActive, 
  flipActive, 
  startManualSelection,
  isManualCropping,
  cropObject
} from './useCanvasCrop';

const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  }
});
const emit = defineEmits(['toggle']);

const currentRatio = ref('free');
const cropW = ref(1000);
const cropH = ref(1000);

// 辅助函数：判断按钮是否激活
const isRatioMatch = (r) => {
    if (!currentAspectRatio.value) return false;
    // 简单的浮点数比较
    return Math.abs(currentAspectRatio.value - r) < 0.01;
};

// 切换比例
const handleSetRatio = (ratio) => {
    if (ratio === 'original') {
        currentRatio.value = 'original';
        // 计算原图比例
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
    // 更新输入框数值
    updateInputFromCanvas();
};

// 手动点击中间的链接图标
const toggleRatioLock = () => {
    if (isRatioLocked.value) {
        // 解锁 -> 变自由比例
        handleSetRatio(null);
    } else {
        // 锁定 -> 锁定当前比例
        if (cropW.value && cropH.value) {
            const currentR = cropW.value / cropH.value;
            currentRatio.value = ''; // 不高亮特定预设按钮
            setCropRatio(currentR);
        }
    }
};

// 输入框输入宽度时的逻辑
const onWidthInput = () => {
    if (isRatioLocked.value && currentAspectRatio.value) {
        // 锁定状态下，根据比例自动计算高度
        // H = W / Ratio
        cropH.value = Math.round(cropW.value / currentAspectRatio.value);
    }
};

// 输入框输入高度时的逻辑
const onHeightInput = () => {
    if (isRatioLocked.value && currentAspectRatio.value) {
        // 锁定状态下，根据比例自动计算宽度
        // W = H * Ratio
        cropW.value = Math.round(cropH.value * currentAspectRatio.value);
    }
};

// 提交尺寸到 Canvas (change 或 enter 事件)
const applyInputSize = () => {
    setCropBoxSize(cropW.value, cropH.value);
};


// 状态计算属性
const isManualActive = computed(() => isManualCropping.value);

// 更新尺寸输入框的函数
const updateInputFromCanvas = () => {
  if (cropObject.value) {
    cropW.value = Math.round(cropObject.value.getScaledWidth());
    cropH.value = Math.round(cropObject.value.getScaledHeight());
  }
};

// 监听展开状态
watch(() => props.isExpanded, (val) => {
  if (val) {
    setTimeout(() => startCrop(null), 50);
  } else {
    cancelCrop();
  }
});

const handleToggle = () => {
  emit('toggle');
};

const resetCrop = () => {
    // 初始化即为自由比例，但需要重新计算尺寸
    startCrop(null); 
};

// 裁剪比例按钮点击事件
const handleStartCrop = (ratio, isOriginal = false) => {
  currentRatio.value = ratio;
  if (ratio === null && !isOriginal) currentRatio.value = 'free';
  if (isOriginal) currentRatio.value = 'original';

  let targetRatio = ratio;
  if (isOriginal) {
    // 动态计算图片比例
    const canvas = cropObject.value?.canvas;
    const activeObj = canvas?.getObjects().find(o => o.type === 'image');
    if (activeObj) {
      targetRatio = activeObj.width / activeObj.height;
    }
  }
  startCrop(targetRatio);
};

// 尺寸输入框改变事件
const updateCropSize = () => {
  setCropBoxSize(cropW.value, cropH.value);
};

// 手动选区
const handleManualSelect = () => {
  currentRatio.value = ''; // 清除选中状态高亮
  startManualSelection();
};

const applyCrop = () => {
  confirmCrop();
  emit('toggle');
};

const rotate = (angle) => {
  // 调用聚合后的 rotateActive
  rotateActive(angle);
  setTimeout(() => updateInputFromCanvas(), 50);
};

const flip = (axis) => {
  // 调用聚合后的 flipActive
  flipActive(axis);
};

onMounted(() => {
  // 注意：cropObject.value 在模块初始化时为空，需等待 canvas 加载
  // 我们直接监听 cropObject.value?.canvas 上的事件
  const canvasInstance = cropObject.value?.canvas; 

  if (canvasInstance) {
    canvasInstance.on('object:scaling', updateInputFromCanvas);
    canvasInstance.on('object:modified', updateInputFromCanvas);
    // 监听选区移动以更新数值（虽然移动不改宽高，但保持一致性）
    canvasInstance.on('object:moving', updateInputFromCanvas);
  }
  updateInputFromCanvas();
  // 如果当前是锁定状态（比如从其他 Tab 切回来），保持 UI 同步
  if (!isRatioLocked.value) {
      currentRatio.value = 'free';
  }
  if (props.isExpanded) {
    startCrop(null);
  }
});

onUnmounted(() => {
  const canvasInstance = cropObject.value?.canvas;
  if (canvasInstance) {
    canvasInstance.off('object:scaling', updateInputFromCanvas);
    canvasInstance.off('object:modified', updateInputFromCanvas);
  }
});
</script>

<style scoped>
/* 保持原有布局样式 */
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
  border-color: #409eff;
  color: #409eff;
  background-color: #ecf5ff;
}

/* 图标辅助样式 */
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


.custom-size-box {
  margin-bottom: 16px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 输入框包装，用于定位 suffix */
.input-wrapper {
  position: relative;
  width: 45%;
}

.ie-input {
  padding-right: 25px;
  text-align: center;
}

.input-suffix {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: #999;
  pointer-events: none;
}

.link-icon {
  color: #909399;
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