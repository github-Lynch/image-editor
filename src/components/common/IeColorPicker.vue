<template>
  <div class="ie-color-picker-root" ref="rootEl" @click.stop>
    <div class="ie-color-picker-panel">
      <div class="sv-panel" :style="{ backgroundColor: hueBackground }" @mousedown="startMoveSV">
        <div class="sv-white-grad"></div>
        <div class="sv-black-grad"></div>
        <div class="sv-cursor" :style="{ left: svCursor.x + '%', top: svCursor.y + '%' }"></div>
      </div>

      <div class="hue-row">
        <div class="hue-slider-wrap">
          <input type="range" v-model="hsv.h" min="0" max="360" class="hue-range" @input="updateFromHSV" />
        </div>
        <button v-if="isEyedropperSupported" class="eyedropper-btn" @click="pickColor" title="屏幕拾色">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M11 4l1.72 1.72a3 3 0 0 1 0 4.24l-3.44 3.44a3 3 0 0 1-4.24 0L3.32 11.68a3 3 0 0 1 0-4.24L5.04 5.72A3 3 0 0 1 9.28 5.72L11 4z" />
            <path d="M15 13l6 6M18 16l3 3" />
          </svg>
        </button>
      </div>

      <div class="panel-section">
        <div class="section-header">标准预设</div>
        <div class="color-grid">
          <div v-for="c in PRESET_COLORS" :key="c" class="color-item" :class="{ active: modelValue === c }"
            :style="{ backgroundColor: c }" @click="selectColor(c)"></div>
        </div>
      </div>

      <div class="panel-section">
        <div class="section-header flex-between">
          <span>最近使用</span>
          <button class="add-btn" @click="saveCurrentColor" title="保存当前颜色">+</button>
        </div>
        <div class="color-grid">
          <div v-for="(c, idx) in customColors" :key="idx" class="color-item custom"
            :class="{ active: modelValue === c }" :style="{ backgroundColor: c }" @click="selectColor(c)">
            <span class="delete-icon" @click.stop="removeCustomColor(idx)">×</span>
          </div>
          <div v-for="n in emptySlots" :key="'empty-' + n" class="color-item empty"></div>
        </div>
      </div>

      <div class="panel-footer">
        <button class="ie-btn-panel text" @click="handleClear">清空</button>
        <div class="hex-input-wrap">
          <span class="hex-prefix">#</span>
          <input type="text" :value="cleanHex" @change="e => selectColor('#' + e.target.value)" maxlength="6" />
        </div>
        <button class="ie-btn-panel primary" @click="emit('confirm')">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '#1890FF' },
  allowTransparent: { type: Boolean, default: true },
  // 是否启用“点击空白处关闭”（默认开启，兼容现有用法）
  closeOnOutsideClick: { type: Boolean, default: true },
  // 可选：按 ESC 关闭
  closeOnEsc: { type: Boolean, default: true }
});

// 新增 close 事件：父组件（popover）收到后关闭
const emit = defineEmits(['update:modelValue', 'confirm', 'clear', 'close']);

const rootEl = ref(null);

// --- 常量 ---
const PRESET_COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF', '#FF4D4F', '#FF7A45', '#FFA940',
  '#FFC53D', '#FFEC3D', '#BAE637', '#73D13D', '#52C41A', '#36CFC9', '#40A9FF', '#1890FF', '#096DD9',
  '#2F54EB', '#722ED1', '#B37FEB', '#F759AB', '#D4380D', '#874D00'
];
const MAX_CUSTOM = 18;

// --- 状态 ---
const hsv = reactive({ h: 0, s: 0, v: 100 });
const customColors = ref([]);
const isEyedropperSupported = !!window.EyeDropper;

// --- 计算属性 ---
const svCursor = computed(() => ({
  x: hsv.s || 0,
  y: 100 - (hsv.v || 0)
}));
const hueBackground = computed(() => `hsl(${hsv.h}, 100%, 50%)`);
const cleanHex = computed(() => props.modelValue?.replace('#', '') || '');
const emptySlots = computed(() => {
  const count = customColors.value.length;
  return count < 9 ? 9 - count : (9 - (count % 9)) % 9;
});

// --- 核心转换逻辑 (保持 SSOT) ---
const syncHSVFromHex = (hex) => {
  if (!hex || hex === 'transparent' || hex === '') return;
  let r, g, b;
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16); g = parseInt(clean[1] + clean[1], 16); b = parseInt(clean[2] + clean[2], 16);
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16); g = parseInt(clean.slice(2, 4), 16); b = parseInt(clean.slice(4, 6), 16);
  } else return;

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  hsv.h = Math.round(h * 360); hsv.s = Math.round(s * 100); hsv.v = Math.round(v * 100);
};

const hsvToHex = (h, s, v) => {
  s /= 100; v /= 100;
  const i = Math.floor((h / 60) % 6), f = (h / 60) % 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

// --- 交互方法 ---
const startMoveSV = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const updateSV = (moveEvent) => {
    let x = ((moveEvent.clientX - rect.left) / rect.width) * 100;
    let y = ((moveEvent.clientY - rect.top) / rect.height) * 100;
    hsv.s = Math.max(0, Math.min(100, x));
    hsv.v = Math.max(0, Math.min(100, 100 - y));
    emit('update:modelValue', hsvToHex(hsv.h, hsv.s, hsv.v));
  };
  updateSV(e);
  window.addEventListener('mousemove', updateSV);
  window.addEventListener('mouseup', () => window.removeEventListener('mousemove', updateSV), { once: true });
};

const selectColor = (hex) => {
  if (!hex) return;
  emit('update:modelValue', hex.toUpperCase());
  syncHSVFromHex(hex);
};

const updateFromHSV = () => emit('update:modelValue', hsvToHex(hsv.h, hsv.s, hsv.v));

const pickColor = async () => {
  try {
    const res = await new window.EyeDropper().open();
    selectColor(res.sRGBHex);
  } catch (e) { }
};

const saveCurrentColor = () => {
  const val = props.modelValue;
  if (!val || val === 'transparent' || val === '') return;
  if (!customColors.value.includes(val)) {
    customColors.value.unshift(val);
    if (customColors.value.length > MAX_CUSTOM) customColors.value.pop();
    localStorage.setItem('ie_custom_colors', JSON.stringify(customColors.value));
  }
};

const removeCustomColor = (idx) => {
  customColors.value.splice(idx, 1);
  localStorage.setItem('ie_custom_colors', JSON.stringify(customColors.value));
};

const handleClear = () => {
  emit('update:modelValue', props.allowTransparent ? '' : '#ffffff');
  emit('clear');
};

// --- 点击空白处关闭 ---
const onDocPointerDown = (e) => {
  if (!props.closeOnOutsideClick) return;
  const el = rootEl.value;
  if (!el) return;
  const target = e.target;
  if (target instanceof Node && el.contains(target)) return;
  emit('close');
};

const onDocKeyDown = (e) => {
  if (!props.closeOnEsc) return;
  if (e.key === 'Escape') emit('close');
};

// --- 生命周期 ---
watch(() => props.modelValue, (nv) => { if (nv) syncHSVFromHex(nv); }, { immediate: true });

onMounted(() => {
  const saved = localStorage.getItem('ie_custom_colors');
  if (saved) customColors.value = JSON.parse(saved);
  syncHSVFromHex(props.modelValue);

  // 用 capture 确保能在外层容器 stopPropagation 的情况下仍可捕获到“点击空白处”
  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('keydown', onDocKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocPointerDown, true);
  document.removeEventListener('keydown', onDocKeyDown);
});
</script>

<style scoped>
.ie-color-picker-root {
  display: inline-block;
}

.ie-color-picker-panel {
  width: 240px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  padding: 12px;
  border: 1px solid #f0f0f0;
  user-select: none;
}

.sv-panel {
  width: 100%;
  height: 120px;
  border-radius: 4px;
  position: relative;
  cursor: crosshair;
  margin-bottom: 12px;
  overflow: hidden;
}

.sv-white-grad {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #fff, transparent);
}

.sv-black-grad {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, #000, transparent);
}

.sv-cursor {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.hue-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.hue-slider-wrap {
  flex: 1;
  height: 8px;
  display: flex;
  align-items: center;
}

.hue-range {
  -webkit-appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
  outline: none;
}

.hue-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 50%;
  cursor: pointer;
}

.eyedropper-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #606266;
  cursor: pointer;
}

.panel-section {
  margin-bottom: 12px;
}

.section-header {
  font-size: 11px;
  color: #8c8c8c;
  margin-bottom: 8px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  gap: 4px;
}

.add-btn {
  border: none;
  background: none;
  color: var(--ie-primary-color);
  cursor: pointer;
  font-size: 14px;
  font-weight: bold;
}

.color-item {
  aspect-ratio: 1;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  position: relative;
}

.color-item.active {
  border: 2px solid var(--ie-primary-color);
}

.color-item.empty {
  background: #f5f7fa;
  border-style: dashed;
  border-color: #e4e7ed;
}

.delete-icon {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 12px;
  height: 12px;
  background: #ff4d4f;
  color: #fff;
  border-radius: 50%;
  font-size: 10px;
  display: none;
  align-items: center;
  justify-content: center;
}

.color-item:hover .delete-icon {
  display: flex;
}

.panel-footer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.hex-input-wrap {
  display: flex;
  align-items: center;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 0 8px;
  border: 1px solid #dcdfe6;
}

.hex-prefix {
  color: #909399;
  font-size: 12px;
}

.hex-input-wrap input {
  width: 54px;
  border: none;
  background: transparent;
  height: 24px;
  font-size: 12px;
  font-family: monospace;
  outline: none;
}

.ie-btn-panel {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  background: #fff;
}

.ie-btn-panel.primary {
  background: var(--ie-primary-color);
  color: #fff;
  border-color: var(--ie-primary-color);
}

.ie-btn-panel.text {
  border-color: transparent;
  color: #595959;
}
</style>
