<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="$emit('toggle')">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0l12.6 12.6z">
          </path>
          <path d="m5 6 1.7 1.7"></path>
          <path d="m17 18 1.7 1.7"></path>
          <path d="m11 12 1.7 1.7"></path>
        </svg>
        <span>测量标尺</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      <div class="control-group">
        <div class="section-title">
          端点样式
          <span v-if="isDrawing" style="
              color: var(--ie-primary-color);
              float: right;
              font-weight: normal;
              animation: blink 1.5s infinite;
            ">
            绘制中...
          </span>
        </div>
        <div class="style-grid">
          <div v-for="style in CAP_STYLES" :key="style.id" class="style-item"
            :class="{ active: isStyleActive(style.id) }" @click="setCapStyle(style.id)" :title="style.label">
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
              <line x1="0" y1="5" x2="160" y2="5" stroke="currentColor" stroke-width="2"
                :stroke-dasharray="currentDashStr" :stroke-linecap="rulerConfig.strokeLineCap || 'butt'" />
            </svg>
            <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z" fill="currentColor" />
            </svg>
          </div>

          <div v-show="isDashSelectOpen" class="options-list">
            <div v-for="(opt, idx) in DASH_OPTIONS" :key="idx" class="option-item" @click="setDashPattern(opt)">
              <div class="opt-label">{{ opt.label }}</div>
              <svg width="80" height="10" viewBox="0 0 80 10" preserveAspectRatio="none">
                <line x1="0" y1="5" x2="80" y2="5" stroke="#606266" stroke-width="2"
                  :stroke-dasharray="opt.value.join(',')" :stroke-linecap="opt.strokeLineCap || 'butt'" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="control-group">
        <div class="section-title">数值与文本</div>

        <div class="tabs-container">
          <div class="tab-item" :class="{ active: !rulerConfig.isManualText }"
            @click="rulerConfig.isManualText = false; updateActiveRuler()">
            自动测量
          </div>
          <div class="tab-item" :class="{ active: rulerConfig.isManualText }"
            @click="rulerConfig.isManualText = true; updateActiveRuler()">
            手动输入
          </div>
        </div>

        <div class="input-content-wrap">
          <template v-if="!rulerConfig.isManualText">
            <div class="secondary-unit-toggle"
              @click="rulerConfig.showSecondaryUnit = !rulerConfig.showSecondaryUnit; updateActiveRuler()">
              <div class="checkbox" :class="{ checked: rulerConfig.showSecondaryUnit }">
                <svg v-if="rulerConfig.showSecondaryUnit" viewBox="0 0 24 24" width="12" height="12">
                  <polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="3" />
                </svg>
              </div>
              <span>显示英制换算 (inch)</span>
            </div>
          </template>

          <template v-if="!rulerConfig.isManualText">
            <div class="input-group">

              <input type="number" v-model.number="rulerConfig.value" class="ie-input-number"
                style="flex: 1; width: auto" @input="updateActiveRuler" />
              <select v-model="rulerConfig.unit" class="ie-select" @change="updateActiveRuler">
                <option value="px">px</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
                <option value="m">m</option>
                <option value="inch">inch</option>
                <option value="ft">foot</option>
              </select>
            </div>
          </template>

          <template v-else>
            <input type="text" v-model="rulerConfig.customText" class="ie-input-text-full" placeholder="请输入自定义文字"
              @input="updateActiveRuler" @keydown.stop />
          </template>
        </div>
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>线条颜色</span>
          <input type="color" v-model="rulerConfig.color" @input="updateActiveRuler" />
        </div>
        <div class="label-row">
          <span>透明度</span>
          <span class="val">{{ rulerConfig.opacity }}%</span>
        </div>
        <input type="range" v-model.number="rulerConfig.opacity" min="10" max="100" class="ie-slider"
          @input="updateActiveRuler" />
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>线条粗细</span>
          <span class="val">{{ rulerConfig.strokeWidth }}px</span>
        </div>
        <input type="range" v-model.number="rulerConfig.strokeWidth" min="1" max="10" class="ie-slider"
          @input="updateActiveRuler" />
      </div>

      <div class="divider"></div>

      <div class="control-group">
        <div class="section-title">选择字体</div>
        <div class="custom-select" :class="{ open: isFontSelectOpen }">
          <div class="selected-value" @click="isFontSelectOpen = !isFontSelectOpen">
            <span :style="{ fontFamily: rulerConfig.fontFamily }">{{ rulerConfig.fontFamily }}</span>
            <svg class="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z" fill="currentColor" />
            </svg>
          </div>
          <div v-show="isFontSelectOpen" class="options-list">
            <div v-for="font in SYSTEM_FONTS" :key="font.value" class="option-item" @click="setRulerFont(font.value)">
              <div class="opt-label" :style="{ fontFamily: font.value }">{{ font.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>字体大小</span>
          <input type="number" v-model.number="rulerConfig.fontSize" class="ie-input-number"
            @input="updateActiveRuler" />
        </div>
        <div class="label-row" style="margin-top: 8px">
          <span>文字颜色</span>
          <input type="color" v-model="rulerConfig.textColor" @input="updateActiveRuler" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  defineProps,
  defineEmits,
  inject,
  onMounted,
  onUnmounted,
  ref,
  computed,
  watch,
} from "vue";
import {
  registerRulerModule,
  rulerConfig,
  isDrawing,
  // ✨ 修复点：替换为新的模式控制函数
  startRulerMode,
  stopRulerMode,
  updateActiveRuler,
  syncConfigFromActiveSelection,
  CAP_STYLES,
  DASH_OPTIONS,
  SYSTEM_FONTS,
} from "./useCanvasRuler";
import { useCanvasLock } from "@/composables/useCanvasLock";

const props = defineProps({ isExpanded: Boolean });
const emit = defineEmits(["toggle"]);
const canvasAPI = inject("canvasAPI");

const isDashSelectOpen = ref(false);
// const { setBackgroundLock } = useCanvasLock(); // ⚠️ 锁策略由 Workspace 统一管理，模块内禁止二次覆盖
// ✨ 2. 控制下拉菜单显示的响应式变量
const showFontSelect = ref(false); // ✨ 新增：字体下拉控制
const isFontSelectOpen = ref(false); // ✨ 新增：字体下拉菜单状态
const handleUpdate = () => {
  updateActiveRuler();
};

const selectFont = (font) => {
  rulerConfig.value.fontFamily = font.value;
  showFontSelect.value = false;
  handleUpdate();
};

const setRulerFont = (fontFamily) => {
  rulerConfig.value.fontFamily = fontFamily;
  isFontSelectOpen.value = false;
  updateActiveRuler();
};
// === 生命周期与状态管理 ===
watch(
  () => props.isExpanded,
  (val) => {
    const canvas = canvasAPI.canvas.value;
    if (!canvas) return;

    // ✨ 物理锁联动：进入标尺模块时由 Workspace.syncLockState 统一驱动
    // 这里严禁再直接调用 setBackgroundLock，否则会覆盖 Workspace 的策略表，导致选中态被二次锁死
    // setBackgroundLock(canvas, val, { excludeRulers: true, isRulerMode: val });

    if (val) {
      // 同步当前选中的标尺配置（如果有）
      syncConfigFromActiveSelection();
      // ✨ 开启“智能感知”标尺模式
      startRulerMode(canvasAPI.canvas, canvasAPI.saveHistory);
    } else {
      // 退出标尺模式，移除监听
      stopRulerMode();
    }
  }
);

onMounted(() => {
  if (canvasAPI && canvasAPI.canvas) {
    // 注册模块引用
    registerRulerModule(canvasAPI.canvas, canvasAPI.saveHistory);

    if (props.isExpanded) {
      syncConfigFromActiveSelection();
      startRulerMode(canvasAPI.canvas, canvasAPI.saveHistory);
    }
  }
});

onUnmounted(() => {
  const canvas = canvasAPI?.canvas?.value;
  if (canvas) {
    setBackgroundLock(canvas, false);
    stopRulerMode();
  }
});

// === 视觉高亮 ===
const isStyleActive = (styleId) => {
  const isEditing = canvasAPI.canvas.value?.getActiveObject()?.isRuler;
  if (isEditing) {
    return rulerConfig.value.capStyle === styleId;
  }
  // 在测量模式下，即使没选中也高亮当前配置的样式
  return props.isExpanded && rulerConfig.value.capStyle === styleId;
};

const setCapStyle = (styleId) => {
  rulerConfig.value.capStyle = styleId;
  const canvas = canvasAPI.canvas.value;
  const activeObj = canvas?.getActiveObject();

  if (activeObj && activeObj.isRuler) {
    updateActiveRuler();
  }
  // 注意：不再需要手动调用 startDrawMode，startRulerMode 已在后台监听
};

const setDashPattern = (opt) => {
  rulerConfig.value.dashArray = opt.value;
  rulerConfig.value.strokeLineCap = opt.strokeLineCap || "butt";
  isDashSelectOpen.value = false;
  const canvas = canvasAPI.canvas.value;
  const activeObj = canvas?.getActiveObject();
  if (activeObj && activeObj.isRuler) {
    updateActiveRuler();
  }
};

const currentDashStr = computed(() => {
  return rulerConfig.value.dashArray
    ? rulerConfig.value.dashArray.join(",")
    : "";
});
</script>

<style scoped>
@keyframes blink {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}

/* ✨ 新增样式建议 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.manual-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toggle-label {
  font-size: 11px;
  color: #909399;
}

.text-input-full {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;

}

.font-row {
  margin-bottom: 8px;
}

.font-select {
  width: 100%;
}

.option-item.active {
  color: #409eff;
  background-color: #ecf5ff;
}

.tool-content {
  padding: 16px;
}

.section-title {

  color: #909399;
  margin-bottom: 8px;
  font-weight: 500;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.style-item {
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #606266;
  background: #fff;
  transition: all 0.2s;
}

.style-item:hover {
  border-color: #c0c4cc;
}

.style-item.active {
  border-color: var(--ie-primary-color);
  color: var(--ie-primary-color);
  background-color: #ecf5ff;
}

.custom-select {
  position: relative;
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.selected-value {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #606266;
}

.options-list {
  position: absolute;
  top: 100%;
  left: -1px;
  right: -1px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 0 0 4px 4px;
  z-index: 10;
  max-height: 200px;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.option-item {
  height: 32px;
  padding: 0 12px;
  display: flex;
  align-items: center;
}

.option-item:hover {
  background-color: #f5f7fa;
}

.opt-label {

  color: #606266;
  margin-right: 12px;
  min-width: 40px;
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

  color: #606266;
  padding: 0 4px;
  outline: none;
  background: white;
}

.ie-input-number {
  height: 28px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 8px;
  outline: none;
  width: 60px;
}

.val {
  font-family: monospace;
}

.ie-slider {
  width: 100%;
}

/* ✨ Tab 切换样式 */
.tabs-container {
  display: flex;
  background: #f5f7fa;
  border-radius: 6px;
  padding: 2px;
  margin-bottom: 8px;
}

.tab-item {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;

  color: #909399;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tab-item:hover {
  color: #606266;
}

.tab-item.active {
  background: #ffffff;
  color: var(--ie-primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  font-weight: 500;
}

.input-content-wrap {
  min-height: 32px;
}

.ie-input-text-full {
  width: 100%;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 10px;

  outline: none;
  transition: border-color 0.2s;
}

.ie-input-text-full:focus {
  border-color: var(--ie-primary-color);
}

/* ✨ 新增样式 */
.secondary-unit-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  cursor: pointer;
  user-select: none;
}

.secondary-unit-toggle span {
  font-size: 11px;
  color: #909399;
}

.checkbox {
  width: 14px;
  height: 14px;
  border: 1px solid #dcdfe6;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox.checked {
  background-color: var(--ie-primary-color);
  border-color: var(--ie-primary-color);
  color: white;
}
</style>