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
      
      <div class="control-group">
        <div class="section-title">
          端点样式 
          <span v-if="isDrawing" style="color:var(--ie-primary-color); float:right; font-weight:normal; animation: blink 1.5s infinite;">
            绘制中...
          </span>
        </div>
        <div class="style-grid">
          <div 
            v-for="style in CAP_STYLES" 
            :key="style.id"
            class="style-item"
            :class="{ active: isStyleActive(style.id) }" 
            @click="setCapStyle(style.id)"
            :title="style.label"
          >
            <svg width="40" height="20" viewBox="0 0 60 20">
              <line x1="10" y1="10" x2="50" y2="10" stroke="currentColor" stroke-width="2" />
              <g v-if="style.id === 'line'">
                <line x1="10" y1="5" x2="10" y2="15" stroke="currentColor" stroke-width="2" />
                <line x1="50" y1="5" x2="50" y2="15" stroke="currentColor" stroke-width="2" />
              </g>
              <g v-if="style.id === 'arrow'">
                <path d="M10 10 L15 7 V13 Z" fill="currentColor" />
                <path d="M50 10 L45 7 V13 Z" fill="currentColor" />
              </g>
              <g v-if="style.id === 'arrow_in'">
                <path d="M5 7 L10 10 L5 13 Z" fill="currentColor" />
                <path d="M55 7 L50 10 L55 13 Z" fill="currentColor" />
              </g>
              <g v-if="style.id === 'dot'">
                <circle cx="10" cy="10" r="3" fill="currentColor" />
                <circle cx="50" cy="10" r="3" fill="currentColor" />
              </g>
            </svg>
          </div>
        </div>
      </div>

      <div class="control-group">
        <div class="section-title">线身类型</div>
        <div class="custom-select" :class="{ open: isDashSelectOpen }">
          <div class="selected-value" @click="isDashSelectOpen = !isDashSelectOpen">
             <svg width="100%" height="10" viewBox="0 0 160 10" preserveAspectRatio="none">
               <line 
                 x1="0" y1="5" x2="160" y2="5" 
                 stroke="currentColor" stroke-width="2" 
                 :stroke-dasharray="currentDashStr"
                 :stroke-linecap="rulerConfig.strokeLineCap || 'butt'"
               />
             </svg>
             <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5z" fill="currentColor"/></svg>
          </div>
          
          <div v-show="isDashSelectOpen" class="options-list">
             <div 
               v-for="(opt, idx) in DASH_OPTIONS" 
               :key="idx" 
               class="option-item"
               @click="setDashPattern(opt)"
             >
                <div class="opt-label">{{ opt.label }}</div>
                <svg width="80" height="10" viewBox="0 0 80 10" preserveAspectRatio="none">
                  <line 
                    x1="0" y1="5" x2="80" y2="5" 
                    stroke="#606266" stroke-width="2" 
                    :stroke-dasharray="opt.value.join(',')" 
                    :stroke-linecap="opt.strokeLineCap || 'butt'"
                  />
                </svg>
             </div>
          </div>
        </div>
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
import { defineProps, defineEmits, inject, onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { 
  registerRulerModule, 
  rulerConfig, 
  isDrawing, 
  startDrawMode, 
  stopDrawMode, 
  updateActiveRuler,
  CAP_STYLES,      
  DASH_OPTIONS     
} from './useCanvasRuler';
// [NEW] 引入通用锁定钩子
import { useCanvasLock } from '@/composables/useCanvasLock'; // 假设路径

const props = defineProps({ isExpanded: Boolean });
const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

const isDashSelectOpen = ref(false);
const { setBackgroundLock } = useCanvasLock();

// === 生命周期与状态管理 ===
watch(() => props.isExpanded, (val) => {
    const canvas = canvasAPI.canvas.value;
    
    // [NEW] 同步锁定/解锁背景
    // 进入模块 -> 锁背景; 离开模块 -> 解锁背景
    setBackgroundLock(canvas, val);

    if (val) {
        // [场景1] 进入模块
        const activeObj = canvas?.getActiveObject();
        // 只有在【没有】选中现有尺子的情况下，才自动进入绘制模式
        if (!activeObj || !activeObj.isRuler) {
            setCapStyle(CAP_STYLES[0].id); 
        }
    } else {
        // [场景2] 离开模块
        if (isDrawing.value) {
            stopDrawMode();
        }
    }
});

// [NEW] 组件销毁兜底：确保一定解锁背景，防止副作用残留
onUnmounted(() => {
    if (canvasAPI && canvasAPI.canvas.value) {
        setBackgroundLock(canvasAPI.canvas.value, false);
    }
});

// === 视觉高亮逻辑 ===
const isStyleActive = (styleId) => {
    // 仅在“绘制中”才高亮图标，选中旧尺子时不亮
    return isDrawing.value && rulerConfig.value.capStyle === styleId;
};

// ...其余交互逻辑保持不变...
const setCapStyle = (styleId) => {
    rulerConfig.value.capStyle = styleId;
    const canvas = canvasAPI.canvas.value;
    const activeObj = canvas?.getActiveObject();

    if (activeObj && activeObj.isRuler) {
        updateActiveRuler();
    } else {
        if (!isDrawing.value) {
            startDrawMode();
        }
    }
};

const setDashPattern = (opt) => {
    rulerConfig.value.dashArray = opt.value;
    rulerConfig.value.strokeLineCap = opt.strokeLineCap || 'butt';
    isDashSelectOpen.value = false;
    const canvas = canvasAPI.canvas.value;
    const activeObj = canvas?.getActiveObject();
    if (activeObj && activeObj.isRuler) {
        updateActiveRuler();
    }
};

const currentDashStr = computed(() => {
    return rulerConfig.value.dashArray ? rulerConfig.value.dashArray.join(',') : '';
});

onMounted(() => {
  if (canvasAPI && canvasAPI.canvas) {
    registerRulerModule(canvasAPI.canvas, canvasAPI.saveHistory);
  }
});
</script>

<style scoped>
@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.tool-content { padding: 16px; }
.section-title { font-size: 12px; color: #909399; margin-bottom: 8px; font-weight: 500; }
.style-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 16px; }
.style-item { height: 32px; border: 1px solid #dcdfe6; border-radius: 4px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #606266; background: #fff; transition: all 0.2s; }
.style-item:hover { border-color: #c0c4cc; }
.style-item.active { border-color: var(--ie-primary-color); color: var(--ie-primary-color); background-color: #ecf5ff; }

.custom-select { position: relative; width: 100%; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; cursor: pointer; }
.selected-value { height: 32px; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; color: #606266; }
.options-list { position: absolute; top: 100%; left: -1px; right: -1px; background: #fff; border: 1px solid #dcdfe6; border-radius: 0 0 4px 4px; z-index: 10; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
.option-item { height: 32px; padding: 0 12px; display: flex; align-items: center; }
.option-item:hover { background-color: #f5f7fa; }
.opt-label { font-size: 12px; color: #606266; margin-right: 12px; min-width: 40px; }

.divider { height: 1px; background: #ebeef5; margin: 16px 0; }
.control-group { margin-bottom: 16px; }
.label-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #606266; margin-bottom: 8px; }
.input-group { display: flex; gap: 8px; }
.ie-select { height: 28px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 12px; color: #606266; padding: 0 4px; outline: none; background: white; }
.val { font-family: monospace; }
.ie-slider { width: 100%; }
</style>