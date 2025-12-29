<template>
  <div class="module-text ie-panel ie-scroll">
    <!-- 二级面板：设置文字特效 -->
    <div v-if="activeSubPanel === 'effects'" class="effects-panel">
      <div class="subpanel-header">
        <button class="back-btn" @click="closeEffectsPanel()">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          设置文字特效
        </button>
        <div class="subpanel-actions">
          <button
            class="icon-btn"
            title="重置特效"
            @click="handleResetEffect()"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </div>
      </div>

      <div class="effects-grid ie-scroll">
        <button
          v-for="effect in TEXT_EFFECTS"
          :key="effect.id"
          class="effect-card"
          :class="{ active: effect.id === textState.textEffectId }"
          @click="selectTextEffectFromPanel(effect.id)"
        >
          <div class="effect-card-preview">
            <span
              class="effect-card-text"
              :style="getEffectPreviewStyle(effect.id)"
              >Hello</span
            >
          </div>
        </button>
      </div>
    </div>

    <!-- 主面板 -->
    <template v-else>
      <div class="action-header">
        <button class="ie-btn ie-primary ie-btn-block" @click="addText()">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          新增文字内容
        </button>
      </div>

      <div class="tool-content" ref="toolContentRef">
        <div class="control-group">
          <div class="section-title">基础排版</div>

          <div class="label-row" style="margin-bottom: 8px">
            <span>选择字体</span>
          </div>
          <div
            class="custom-select"
            :class="{ open: isFontSelectOpen }"
            v-click-outside="() => (isFontSelectOpen = false)"
          >
            <div
              class="selected-value"
              @click="isFontSelectOpen = !isFontSelectOpen"
            >
              <span :style="{ fontFamily: textState.fontFamily }">{{
                textState.fontFamily
              }}</span>
              <svg
                class="dropdown-arrow"
                width="12"
                height="12"
                viewBox="0 0 24 24"
              >
                <path d="M7 10l5 5 5-5z" fill="currentColor" />
              </svg>
            </div>
            <div v-show="isFontSelectOpen" class="options-list">
              <div
                v-for="font in SYSTEM_FONTS"
                :key="font.value"
                class="option-item"
                @click="setFont(font.value)"
              >
                <div class="opt-label" :style="{ fontFamily: font.value }">
                  {{ font.label }}
                </div>
              </div>
            </div>
          </div>

          <div class="label-row" style="margin-top: 16px">
            <span>字号大小</span>
            <input
              type="number"
              v-model.number="textState.fontSize"
              class="ie-input-number"
              @change="() => updateTextProp('fontSize', textState.fontSize)"
            />
          </div>
          <input
            type="range"
            min="10"
            max="200"
            v-model.number="textState.fontSize"
            class="ie-slider"
            v-ie-slider-progress
            @input="() => updateTextProp('fontSize', textState.fontSize, false)"
            @change="() => updateTextProp('fontSize', textState.fontSize)"
          />

          <div class="style-grid">
            <button
              class="style-item"
              :class="{ active: textState.fontWeight === 'bold' }"
              @click="toggleStyle('bold')"
            >
              B
            </button>
            <button
              class="style-item"
              :class="{ active: textState.fontStyle === 'italic' }"
              @click="toggleStyle('italic')"
            >
              I
            </button>
            <button
              class="style-item"
              :class="{ active: textState.underline }"
              @click="toggleStyle('underline')"
            >
              U
            </button>
            <button
              class="style-item"
              :class="{ active: textState.linethrough }"
              @click="toggleStyle('linethrough')"
            >
              S
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <div class="section-title">高级布局</div>
          <div class="label-row">
            <span>字符间距</span>
            <span class="val">{{ textState.charSpacing }}</span>
          </div>
          <input
            type="range"
            min="-10"
            max="100"
            v-model.number="textState.charSpacing"
            class="ie-slider"
            v-ie-slider-progress
            @input="
              () => updateTextProp('charSpacing', textState.charSpacing, false)
            "
            @change="() => updateTextProp('charSpacing', textState.charSpacing)"
          />

          <div class="label-row" style="margin-top: 12px">
            <span>行高倍数</span>
            <span class="val">{{ textState.lineHeight }}</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            v-model.number="textState.lineHeight"
            class="ie-slider"
            v-ie-slider-progress
            @input="
              () => updateTextProp('lineHeight', textState.lineHeight, false)
            "
            @change="() => updateTextProp('lineHeight', textState.lineHeight)"
          />
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <div class="section-title">文字特效</div>

          <!-- 入口卡片（参考图布局）：左侧预览 + 中间标题 + 右侧重置 -->
          <div class="effect-entry-card" @click="openEffectsPanel()">
            <div class="effect-entry-left">
              <div class="effect-entry-preview">
                <span
                  class="effect-preview-text"
                  :style="selectedEffectPreviewStyle"
                  >Hello</span
                >
              </div>
            </div>
            <div class="effect-entry-center">设置文字特效</div>
            <button
              class="effect-entry-reset"
              title="重置特效"
              @click.stop="handleResetEffect()"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
          </div>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <div class="section-title">色彩与描边</div>
          <div class="label-row">
            <span>文本颜色</span>
            <div
              class="color-picker-container"
              v-click-outside="() => closePicker('fill')"
            >
              <div
                class="ie-color-trigger"
                :style="{ backgroundColor: textState.fill || '#ffffff' }"
                @click="togglePicker('fill')"
              ></div>
              <transition name="fade">
                <div v-if="activePicker === 'fill'" class="absolute-popover">
                  <IeColorPicker
                    :modelValue="textState.fill || '#ffffff'"
                    :allowTransparent="false"
                    @update:modelValue="(val) => updateTextProp('fill', val)"
                    @confirm="closePicker('fill')"
                  />
                </div>
              </transition>
            </div>
          </div>
          <div class="label-row">
            <span>背景颜色</span>
            <div class="flex-row" v-click-outside="() => closePicker('bg')">
              <div class="color-picker-wrapper">
                <div
                  class="ie-color-trigger"
                  :style="{
                    backgroundColor:
                      textState.textBackgroundColor || 'transparent',
                  }"
                  @click="togglePicker('bg')"
                >
                  <div
                    v-if="!textState.textBackgroundColor"
                    class="transparent-slash"
                  ></div>
                </div>
                <transition name="fade">
                  <div v-if="activePicker === 'bg'" class="absolute-popover">
                    <IeColorPicker
                      :modelValue="textState.textBackgroundColor || ''"
                      @update:modelValue="
                        (val) => updateTextProp('textBackgroundColor', val)
                      "
                      @confirm="closePicker('bg')"
                      @clear="updateTextProp('textBackgroundColor', '')"
                    />
                  </div>
                </transition>
              </div>
            </div>
          </div>
          <div class="label-row">
            <span>描边粗细</span>
            <input
              type="number"
              class="ie-input-number"
              v-model.number="textState.strokeWidth"
              @change="
                () => updateTextProp('strokeWidth', textState.strokeWidth)
              "
            />
          </div>
          <div class="label-row" v-if="textState.strokeWidth > 0">
            <span>描边颜色</span>
            <div class="color-picker-container">
              <div
                class="ie-color-trigger"
                :style="{ backgroundColor: textState.stroke || '#ffffff' }"
                @click="togglePicker('stroke')"
              ></div>
              <transition name="fade">
                <div v-if="activePicker === 'stroke'" class="absolute-popover">
                  <IeColorPicker
                    :modelValue="textState.stroke || '#ffffff'"
                    @update:modelValue="(val) => updateTextProp('stroke', val)"
                    @confirm="closePicker('stroke')"
                  />
                </div>
              </transition>
            </div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="control-group">
          <div class="section-title">投影效果</div>
          <div class="label-row">
            <span>投影颜色</span>
            <div
              class="color-picker-container"
              v-click-outside="() => closePicker('shadow')"
            >
              <div
                class="ie-color-trigger"
                :style="{ backgroundColor: textState.shadowColor || '#000000' }"
                @click="togglePicker('shadow')"
              ></div>
              <transition name="fade">
                <div v-if="activePicker === 'shadow'" class="absolute-popover">
                  <IeColorPicker
                    :modelValue="textState.shadowColor || '#000000'"
                    @update:modelValue="
                      (val) => updateTextProp('shadowColor', val)
                    "
                    @confirm="closePicker('shadow')"
                  />
                </div>
              </transition>
            </div>
          </div>
          <div class="label-row">
            <span>模糊半径</span>
            <input
              type="number"
              class="ie-input-number"
              v-model.number="textState.shadowBlur"
              @change="() => updateTextProp('shadowBlur', textState.shadowBlur)"
            />
          </div>
          <input
            type="range"
            min="0"
            max="30"
            v-model.number="textState.shadowBlur"
            class="ie-slider"
            v-ie-slider-progress
            @input="
              () => updateTextProp('shadowBlur', textState.shadowBlur, false)
            "
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject, computed } from "vue";
import { useCanvasText } from "./useCanvasText";
import { SYSTEM_FONTS } from "../adjust/useCanvasRuler";
import IeColorPicker from "@/components/common/IeColorPicker.vue";

const activePicker = ref(null);
const canvasAPI = inject("canvasAPI");
const {
  textState,
  textEffects,
  applyTextEffect,
  resetTextEffect,
  getTextEffectPreviewStyle,
  initTextModule,
  destroyTextModule,
  addText,
  updateTextProp,
  toggleStyle,
} = useCanvasText();

// === 二级面板状态 ===
const activeSubPanel = ref(null);

// 主面板滚动位置缓存（返回时恢复）
const toolContentRef = ref(null);
const mainPanelScrollTop = ref(0);

// UI 用的列表（避免模板里直接引用对象字典）
const TEXT_EFFECTS = computed(() =>
  Object.values(textEffects).filter((e) => e && e.id !== "none")
);

const openEffectsPanel = () => {
  // 记录主面板滚动位置
  if (toolContentRef.value) {
    mainPanelScrollTop.value = toolContentRef.value.scrollTop || 0;
  }
  activeSubPanel.value = "effects";
};

const closeEffectsPanel = () => {
  activeSubPanel.value = null;
  // nextTick 恢复滚动位置（避免 v-if 切换 DOM 未就绪）
  setTimeout(() => {
    if (toolContentRef.value) {
      toolContentRef.value.scrollTop = mainPanelScrollTop.value || 0;
    }
  }, 0);
};

const selectTextEffectFromPanel = (id) => {
  applyTextEffect(id);
  // 选择后直接返回主面板
  closeEffectsPanel();
};

const handleResetEffect = () => {
  resetTextEffect();
};

const getEffectPreviewStyle = (id) => getTextEffectPreviewStyle(id);

const selectedEffectPreviewStyle = computed(() =>
  getEffectPreviewStyle(textState.value.textEffectId)
);

const isFontSelectOpen = ref(false);

const togglePicker = (type) => {
  activePicker.value = activePicker.value === type ? null : type;
};

// 补齐 closePicker 函数，确保面板能正常关闭
const closePicker = (type) => {
  if (activePicker.value === type) activePicker.value = null;
};

const setFont = (font) => {
  updateTextProp("fontFamily", font);
  isFontSelectOpen.value = false;
};

onMounted(() => {
  if (canvasAPI) {
    initTextModule(canvasAPI.canvas, canvasAPI.saveHistory);
    // ✨ 关键修复：模块挂载后立即触发锁定逻辑，确保主图被锁定
    // 参考页面初始化逻辑：onMounted 中调用 syncLockState 确保主图被锁定
    // 通过触发 image:updated 事件来触发 syncLockState（Workspace 中已监听此事件）
    const canvas = canvasAPI.canvas?.value;
    if (canvas) {
      canvas.fire("image:updated");
    }
  }
});

onUnmounted(() => {
  destroyTextModule();
});
</script>

<style scoped>
/* 样式部分完全保留，未做任何删减 */
.module-text {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.action-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.tool-content {
  padding: 16px;
  flex: 1;
}

.section-title {
  color: #909399;
  margin-bottom: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.control-group {
  margin-bottom: 20px;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #606266;
  margin-bottom: 12px;
  position: relative;
}

.val {
  font-family: monospace;
  color: var(--ie-primary-color);
}

.flex-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}

.style-item {
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: bold;
}

.style-item.active {
  border-color: var(--ie-primary-color);
  color: var(--ie-primary-color);
  background: #ecf5ff;
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
  z-index: 100;
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

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  padding: 40px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.2;
}

/* 颜色触发器相关样式 */
.color-picker-container {
  position: relative;
  display: flex;
  align-items: center;
}

.ie-color-trigger {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  background-color: #fff;
}

.transparent-slash {
  position: absolute;
  width: 140%;
  height: 1.5px;
  background: #ff4d4f;
  transform: rotate(45deg);
  top: 50%;
  left: -20%;
  margin-top: -0.75px;
}

.absolute-popover {
  position: absolute;
  top: 32px;
  right: 0;
  z-index: 1000;
}

/* 文字特效相关样式（主面板入口卡片，布局参考图） */
.effect-entry-card {
  width: 100%;
  height: 52px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}
.effect-entry-card:hover {
  border-color: var(--ie-primary-color);
  background: #f0f7ff;
}

.effect-entry-left {
  display: flex;
  align-items: center;
}

.effect-entry-preview {
  width: 60px;
  height: 36px;
  border-radius: 6px;
  background: #dbdbdb;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ebeef5;
  overflow: hidden;
}

.effect-preview-text {
  font-size: 18px;
  line-height: 1;
  background: transparent;
  padding: 0;
}

.effect-entry-center {
  flex: 1;
  padding: 0 12px;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
  text-align: left;
}

.effect-entry-reset {
  border: none;
  background: transparent;
  color: var(--ie-primary-color);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}
.effect-entry-reset:hover {
  opacity: 0.85;
}

/* 二级面板：设置文字特效 */
.effects-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.subpanel-header {
  height: 48px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
}

.back-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

.subpanel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #909399;
}
.icon-btn:hover {
  color: var(--ie-primary-color);
}

.effects-grid {
  flex: 1;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  overflow-y: auto;
}

.effect-card {
  height: 72px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.effect-card:hover {
  border-color: var(--ie-primary-color);
}

.effect-card.active {
  border-color: var(--ie-primary-color);
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.12);
}

.effect-card-preview {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.effect-card-text {
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  background: transparent;
}
</style>
