<!-- 边框（烘焙模式） -->
<template>
  <div class="tool-panel">
    <div class="panel-title">边框</div>

    <!-- 模式切换 -->
    <div class="mode-switch">
      <button
        class="mode-btn"
        :class="{ 'is-active': mode === 'solid' }"
        @click="setMode('solid')"
      >
        纯色
      </button>
      <button
        class="mode-btn"
        :class="{ 'is-active': mode === 'gradient' }"
        @click="setMode('gradient')"
      >
        渐变
      </button>
    </div>

    <!-- 模板 -->
    <div class="border-templates">
      <!-- 纯色模板 -->
      <template v-if="mode === 'solid'">
        <div
          v-for="template in solidTemplates"
          :key="template.color"
          class="template-item"
          :style="{ 'background-color': template.color }"
          @click="applySolid(template.color)"
        ></div>
      </template>

      <!-- 渐变模板 -->
      <template v-else>
        <div
          v-for="tpl in gradientTemplates"
          :key="tpl.id"
          class="template-item template-gradient"
          :style="{ background: tpl.preview }"
          @click="applyGradient(tpl.colors)"
        ></div>
      </template>
    </div>

    <!-- 控制器 -->
    <div class="control-group">
      <div class="label-row">
        <span>宽度</span>
        <span>{{ borderWidth }}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        v-model.number="borderWidth"
        class="ie-slider"
        v-ie-slider-progress
        @change="triggerBake"
      />
    </div>

    <div class="control-group">
      <div class="label-row">
        <span>透明度</span>
        <span>{{ borderOpacityPercent }}</span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        v-model.number="borderOpacityPercent"
        class="ie-slider"
        v-ie-slider-progress
        @change="triggerBake"
      />
    </div>

    <!-- 动作 -->
    <div class="panel-actions">
      <button
        class="btn-primary"
        @click="removeBorder"
        :disabled="isProcessing"
      >
        {{ isProcessing ? "处理中..." : "移除边框" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from "vue";
import { useBakedBorder } from "./useBakedBorder";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const canvasRef = inject("canvas");
const canvasAPIRef = inject("canvasAPI");

const {
  mode,
  borderWidth,
  borderColor,
  borderOpacity,
  gradientColors,
  isProcessing,
  bakeAndReplace,
  removeBorder,
} = useBakedBorder(canvasRef, canvasAPIRef);

// --- 模板定义 ---
const solidTemplates = [
  { color: "#FFFFFF" },
  { color: "#000000" },
  { color: "#FF0000" },
  { color: "#00FF00" },
  { color: "#0000FF" },
];

const gradientTemplates = [
  {
    id: "warm",
    colors: ["#FF6B6B", "#FFD93D", "#FF6B6B"],
    preview: "radial-gradient(circle, #FF6B6B 0%, #FFD93D 55%, #FF6B6B 100%)",
  },
  {
    id: "fresh",
    colors: ["#4D96FF", "#6BCB77", "#4D96FF"],
    preview: "radial-gradient(circle, #4D96FF 0%, #6BCB77 55%, #4D96FF 100%)",
  },
  {
    id: "purpleOrange",
    colors: ["#845EC2", "#FF9671", "#845EC2"],
    preview: "radial-gradient(circle, #845EC2 0%, #FF9671 55%, #845EC2 100%)",
  },
];

// --- UI 与逻辑绑定 ---
const borderOpacityPercent = computed({
  get() {
    return clamp(Math.round((borderOpacity.value ?? 1) * 100), 0, 100);
  },
  set(v) {
    const pct = clamp(Number(v), 0, 100);
    borderOpacity.value = pct / 100;
  },
});

const setMode = (nextMode) => {
  if (mode.value === nextMode) return;
  mode.value = nextMode;
  // 切换模式时，如果已有边框，则按新模式重新烘焙
  triggerBake();
};

const applySolid = (color) => {
  borderColor.value = color;
  mode.value = "solid";
  triggerBake();
};

const applyGradient = (colors) => {
  gradientColors.value = colors;
  mode.value = "gradient";
  triggerBake();
};

const triggerBake = () => {
  // 宽度为 0 时，等同于移除边框
  if ((Number(borderWidth.value) || 0) <= 0) {
    removeBorder();
    return;
  }
  bakeAndReplace();
};
</script>

<style scoped>
/* 样式与之前保持一致，此处省略以节约篇幅 */
.tool-panel {
  padding: 16px;
  background-color: var(--panel-bg, #fff);
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.mode-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--ie-border-color, #e5e5e5);
  background: #fff;
  cursor: pointer;
}

.mode-btn.is-active {
  border-color: var(--primary, #409eff);
  color: var(--primary, #409eff);
}

.border-templates {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.template-item {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.template-item.is-active {
  border-color: var(--primary, #409eff);
}

.control-group {
  margin-bottom: 18px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 8px;
}

.panel-actions {
  margin-top: 18px;
}

.btn-primary {
  width: 100%;
  padding: 10px 0;
  font-size: 14px;
  background-color: var(--primary, #409eff);
  color: #fff;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.btn-primary:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
</style>
