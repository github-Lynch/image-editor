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
            <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
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

      <div class="custom-size-box">
        <div class="input-row">
          <div class="input-wrapper">
            <input type="number" v-model.number="cropW" class="ie-input" @change="applyInputSize">
            <span class="input-suffix">W</span>
          </div>

          <div class="link-icon" @click="toggleRatioLock">
            <svg v-if="isRatioLocked" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#409eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
               <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6">
               <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
               <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
               <line x1="4" y1="4" x2="20" y2="20" stroke="#909399" /> 
            </svg>
          </div>

          <div class="input-wrapper">
            <input type="number" v-model.number="cropH" class="ie-input" @change="applyInputSize">
            <span class="input-suffix">H</span>
          </div>
        </div>
      </div>

      <div class="rotate-actions">
        <div class="action-btn" title="向左旋转90°" @click="rotate(-90)">
          <svg width="20" height="20" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
        </div>
        <div class="action-btn" title="向右旋转90°" @click="rotate(90)">
          <svg width="20" height="20" viewBox="-1 -1 26 26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /></svg>
        </div>
        <div class="divider"></div>
        <div class="action-btn" title="水平翻转" @click="flip('X')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M8 9l-3 3 3 3" /><path d="M16 9l3 3-3 3" /></svg>
        </div>
        <div class="action-btn" title="垂直翻转" @click="flip('Y')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M9 8l3-3 3 3" /><path d="M9 16l3 3 3-3" /></svg>
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
  currentAspectRatio,
  setCropBoxSize, 
  rotateActive, 
  flipActive, 
  startManualSelection,
  isManualCropping,
  cropObject,
  // 引入新的一对“大闸”函数
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

// 【核心修改】监听来自逻辑层的尺寸变化
watch(currentSelectionDims, (newVal) => {
  // 只有当新的值有效时才更新，避免闪烁
  if (newVal && (newVal.width !== 0 || newVal.height !== 0)) {
    cropW.value = newVal.width;
    cropH.value = newVal.height;
  }
});

// === 1. 状态监听核心 (最重要的一步) ===
watch(() => props.isExpanded, (val) => {
  if (val) {
    // 【展开】：先锁视图，再画框
    // 1. 强制 100% 并劫持滚轮
    // openCropPanel();
    
    // 2. 稍微延迟等待 Viewport 重置完成（虽然 setViewport 是同步的，但稳妥起见）
    nextTick(() => {
        startCrop(null); // 默认进入自由裁剪
        updateInputFromCanvas();
    });
  } else {
    // 【折叠】：清理一切，恢复视图
    closeCropPanel();
  }
});

// === 2. 按钮事件处理 ===

// 切换面板开关（不要在这里调 openCropPanel，交给 watch）
const handleToggle = () => {
  emit('toggle');
};

// 点击“取消”：只负责关闭面板，watch 会负责清理
const handleCancel = () => {
  emit('toggle'); // 这会导致 props.isExpanded 变 false -> 触发 closeCropPanel
};

// 点击“应用”：确认裁剪 -> 关闭面板
const handleApply = () => {
  confirmCrop();
  emit('toggle'); // 关闭面板 -> 触发 closeCropPanel
};



// === 3. 其他辅助逻辑 (保持原有) ===
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

const applyInputSize = () => {
    setCropBoxSize(cropW.value, cropH.value);
    nextTick(updateInputFromCanvas);
};

const toggleRatioLock = () => {
    if (isRatioLocked.value) {
        handleSetRatio(null); 
    } else {
        if (cropW.value && cropH.value) {
            const currentR = cropW.value / cropH.value;
            currentRatio.value = ''; 
            setCropRatio(currentR);
        }
    }
};

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
      
      // 允许 1% 的误差 (比如 16:9 是 1.7777...)
      if (Math.abs(currentRealRatio - targetRatio) > 0.02) {
        // 如果误差超过阈值，说明用户手动拉伸了，破坏了比例
        // 自动切换为 'free' (自由比例)
        currentRatio.value = 'free';
        // 同时在逻辑层也解除锁定标记（虽然我们已经解除了物理锁定，但状态变量也要同步）
        setCropRatio(null); 
      }
    }
  }
};

const handleManualSelect = () => {
  currentRatio.value = '';
  startManualSelection();
};

const rotate = (angle) => {
  rotateActive(angle);
  setTimeout(updateInputFromCanvas, 50);
};
const flip = (axis) => flipActive(axis);

// === 生命周期 ===
onMounted(() => {
  // 如果组件挂载时默认为展开，手动触发一次打开逻辑
  if (props.isExpanded) {
    openCropPanel();
    nextTick(() => {
        startCrop(null);
        updateInputFromCanvas();
    });
  }
  
  // 监听画布变动更新输入框数值
  // 注意：这里需要确保 canvas 实例存在
  // 由于 useCanvasCrop 是单例，我们可以在 startCrop 后获取 canvas
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
  
  // 安全起见，组件销毁时强制退出裁剪模式
  // 防止用户直接路由跳转导致 Canvas 依然被锁定
  if (props.isExpanded) {
      closeCropPanel();
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
.link-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  cursor: pointer;
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