<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="emit('toggle')">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3-4-3-4-1 2.4-3 4-3 3.5-3 5.5a7 7 0 0 0 7 7Z" />
        </svg>
        <span>颜色叠加</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      <div class="section-label">选择颜色</div>
      <div class="color-presets">
        <!-- 自定义颜色：结构与 AdjustWhite 对齐 -->
        <div class="color-picker-container">
          <div class="preset-item color-picker-trigger" :class="{ active: isCustomActive }"
            @click.stop="togglePicker('overlayColor')">
            <div class="rainbow-gradient"></div>
          </div>
          <transition name="fade">
            <div v-if="activePicker === 'overlayColor'" class="absolute-popover">
              <IeColorPicker :modelValue="customColor" :allowTransparent="true" @update:modelValue="onCustomColorPicked"
                @confirm="closePicker('overlayColor')" @close="closePicker('overlayColor')" @clear="handleClearColor" />
            </div>
          </transition>
        </div>

        <div v-for="color in presets" :key="color" class="preset-item" :style="{ background: color }"
          :class="{ active: selectedColor === color }" @click="selectColor(color)"></div>

        <div class="preset-item clear-item" :class="{ active: selectedColor === null }" @click="selectColor(null)">
          <div class="slash-line"></div>
        </div>
      </div>

      <div class="intensity-section">
        <div class="label-row">
          <span>叠加强度</span>
          <input type="number" v-model.number="intensity" class="ie-input-number" @input="updateOverlay" />
        </div>
        <input type="range" v-model.number="intensity" min="0" max="100" class="ie-slider" v-ie-slider-progress
          @input="updateOverlay" />
      </div>

      <div class="action-buttons">
        <button class="ie-btn ie-primary full" @click="handleConfirm">
          确定
        </button>
        <button class="ie-btn full" @click="handleCancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, computed, watch } from "vue";
import IeColorPicker from "@/components/common/IeColorPicker.vue";
import {
  registerColorOverlayModule,
  applyColorOverlay,
  commitColorOverlay,
  backupCurrentColorOverlay,
  cancelColorOverlayChange,
} from "./useCanvasColorOverlay";

const props = defineProps({ isExpanded: Boolean });
const emit = defineEmits(["toggle"]);
const canvasAPI = inject("canvasAPI");

const selectedColor = ref(null);
const customColor = ref("#ff0000");
const intensity = ref(30);
const presets = ["#000000", "#808080", "#ffffff"];

// === 颜色选择器（使用 IeColorPicker）===
const activePicker = ref(null);
const togglePicker = (type) => {
  activePicker.value = activePicker.value === type ? null : type;
};
const closePicker = (type) => {
  if (activePicker.value === type) activePicker.value = null;
};

const isCustomActive = computed(() => {
  return selectedColor.value !== null && !presets.includes(selectedColor.value);
});

const selectColor = (color) => {
  selectedColor.value = color;
  if (color && !presets.includes(color)) {
    customColor.value = color;
  }
  updateOverlay();
};

const updateOverlay = () => {
  applyColorOverlay(selectedColor.value, intensity.value);
};

const onCustomColorPicked = (val) => {
  customColor.value = val;
  selectedColor.value = val;
  updateOverlay();
};

const handleClearColor = () => {
  selectedColor.value = null;
  updateOverlay();
  closePicker('overlayColor');
};

const handleConfirm = () => {
  commitColorOverlay();
  emit("toggle");
};

const handleCancel = () => {
  cancelColorOverlayChange();
  emit("toggle");
};

watch(
  () => props.isExpanded,
  (expanded) => {
    const canvas = canvasAPI?.canvas?.value;
    const bgImage = canvas?.getObjects().find((o) => o.type === "image");

    if (expanded && bgImage) {
      selectedColor.value = bgImage._lastOverlayColor || null;
      intensity.value = bgImage._lastOverlayOpacity ?? 30;
      if (selectedColor.value && !presets.includes(selectedColor.value)) {
        customColor.value = selectedColor.value;
      }
      backupCurrentColorOverlay();
    }
  }
);

onMounted(() => {
  if (canvasAPI?.canvas) {
    registerColorOverlayModule(canvasAPI.canvas, canvasAPI.saveHistory);
  }
});
</script>

<style scoped>
.section-label {
  color: #666;
  margin-bottom: 8px;
}

.color-presets {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.preset-item {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.preset-item.active {
  border-color: var(--ie-primary-color);
  border-width: 2px;
}

.rainbow-gradient {
  width: 100%;
  height: 100%;
  background: linear-gradient(to right,
      red,
      yellow,
      lime,
      cyan,
      blue,
      magenta,
      red);
}

.color-picker-container {
  position: relative;
}

.color-picker-trigger {
  padding: 0;
}

.clear-item {
  background: #fff;
}

.slash-line {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: red;
  transform: rotate(-45deg);
}

.intensity-section {
  margin-bottom: 16px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.full {
  flex: 1;
}

.absolute-popover {
  position: absolute;
  top: 32px;
  left: 0;
  z-index: 1000;
}
</style>