<template>
    <div class="tool-group">
        <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="handleToggle">
            <div class="left">
                <svg width="18" height="18" viewBox="0 0 1024 1024" style="margin-right: 8px; fill: currentColor">
                    <path
                        d="M96 896a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h832a32 32 0 0 1 32 32v704a32 32 0 0 1-32 32H96z m315.52-228.48l-68.928-114.88a32 32 0 0 0-54.784 0l-68.928 114.88L158.72 768h316.16l-60.16-100.48zM288 384a64 64 0 1 0 0-128 64 64 0 0 0 0 128z m261.12 216.96l-78.72-118.08a32 32 0 0 0-53.12 0l-78.72 118.08L483.2 697.6h126.72l-54.4-96.64z m208.64-106.88l-98.56-147.84a32 32 0 0 0-53.12 0l-98.56 147.84L652.8 697.6h209.92l-104.96-157.44z" />
                </svg>
                <span>图片补白</span>
            </div>
            <div class="right-icon">
                <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </div>
        </div>

        <div v-if="isExpanded" class="tool-content">

            <div class="preset-grid">
                <div class="preset-item custom-item" :class="{ active: isCustomMode }" @click="selectCustomMode">
                    <span>自定义</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                </div>

                <div v-for="(preset, index) in presets" :key="index" class="preset-item"
                    :class="{ active: activePresetIndex === index }" @click="selectPreset(preset, index)">
                    <span class="preset-name">{{ preset.label }}</span>
                    <span class="preset-dim">{{ preset.w }}×{{ preset.h }}</span>
                </div>
            </div>

            <div class="resize-input-box">
                <div class="input-controls">
                    <div class="input-wrapper">
                        <input type="number" v-model.number="width" class="ie-input" @change="onInputChanged('w')">
                        <span class="suffix">W</span>
                    </div>

                    <div class="link-icon-btn" @click="toggleAdaptive" :title="isAdaptive ? '锁定比例' : '自由比例'">
                        <svg v-if="isAdaptive" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#409eff"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.6">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            <line x1="4" y1="4" x2="20" y2="20" stroke="#999"></line>
                        </svg>
                    </div>

                    <div class="input-wrapper">
                        <input type="number" v-model.number="height" class="ie-input" @change="onInputChanged('h')">
                        <span class="suffix">H</span>
                    </div>
                </div>

                <div class="bg-color-section">
                    <div class="section-label">背景颜色</div>
                    <div class="color-row">
                        <div class="color-item checkerboard" :class="{ active: currentBgColor === 'transparent' }"
                            @click="setBgColor('transparent')" title="透明"></div>
                        <div class="color-item" style="background: #ffffff; border: 1px solid #ddd;"
                            :class="{ active: currentBgColor === '#ffffff' }" @click="setBgColor('#ffffff')"></div>
                        <div class="color-item" style="background: #808080;"
                            :class="{ active: currentBgColor === '#808080' }" @click="setBgColor('#808080')"></div>
                        <div class="color-item" style="background: #000000;"
                            :class="{ active: currentBgColor === '#000000' }" @click="setBgColor('#000000')"></div>
                        <div class="color-item color-picker-wrap" :class="{ active: isCustomColor }">
                            <input type="color" v-model="customColorVal" @input="onCustomColorChange"
                                class="native-color-input" />
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2">
                                <path
                                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </div>
                    </div>
                </div>

            </div>

            <div class="action-buttons">
                <button class="ie-btn ie-primary full" @click="handleApply">应用修改</button>
                <button class="ie-btn full" @click="handleCancel">取消</button>
            </div>

        </div>
    </div>
</template>

<script setup>
import { ref, inject, watch, onMounted, onUnmounted, nextTick, computed } from 'vue';
// 引入修改后的 useCanvasWhite
import { registerWhiteModule, getCurrentSize, applyWhitePadding, startPreview, updatePreview, stopPreview } from './useCanvasWhite';

const props = defineProps({
    isExpanded: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

// === 状态定义 ===
const width = ref(0);
const height = ref(0);
const isAdaptive = ref(false); // 补白模式下，默认自由比例
const originalRatio = ref(1);
const activePresetIndex = ref(-1);
const isInternalUpdate = ref(false);

// 背景颜色状态
const currentBgColor = ref('#ffffff'); // 默认白色
const customColorVal = ref('#ff0000');
const isCustomColor = computed(() => !['transparent', '#ffffff', '#808080', '#000000'].includes(currentBgColor.value));


// 预设数据
const presets = [
    { label: '方形主图', w: 800, h: 800 },
    { label: 'Temu服装图', w: 1340, h: 1785 },
    { label: '方形主图', w: 1000, h: 1000 },
    { label: '竖图主图', w: 750, h: 1000 },
    { label: '方形主图', w: 500, h: 500 },
    { label: '竖图主图', w: 1000, h: 1200 },
    { label: 'Youtube视频封面', w: 1280, h: 720 },
    { label: 'Pinterest帖子', w: 750, h: 1120 },
    { label: 'Facebook封面', w: 851, h: 315 },
];

const isCustomMode = computed(() => activePresetIndex.value === -1);
const currentTargetRatio = computed(() => {
    if (activePresetIndex.value >= 0) {
        const p = presets[activePresetIndex.value];
        return p.h !== 0 ? (p.w / p.h) : 1;
    } else {
        return originalRatio.value;
    }
});

// === 初始化 ===
const initSize = () => {
    if (canvasAPI && canvasAPI.canvas) {
        registerWhiteModule(canvasAPI.canvas, canvasAPI.saveHistory);

        // 1. 获取图片当前的视觉尺寸 (由 useCanvasWhite 改良后的方法提供)
        const size = getCurrentSize();

        if (size.height > 0) {
            originalRatio.value = size.width / size.height;
        }

        // 2. 关键修改：直接将输入框的值设置为图片的视觉尺寸
        width.value = size.width;
        height.value = size.height;

        // 3. 强制选中“自定义”模式
        activePresetIndex.value = -1;

        // 4. 建议：默认锁定比例，因为是基于原图初始化的，通常希望保持比例调整
        isAdaptive.value = true;

        nextTick(() => {
            // 启动预览：此时传入的 width/height 等于图片尺寸
            // 预览框会完美包裹图片，达成“静止”效果
            startPreview(width.value, height.value, currentBgColor.value);
        });
    }
};

// === 交互逻辑 ===
const selectCustomMode = () => {
    activePresetIndex.value = -1;
    const size = getCurrentSize();
    width.value = size.width;
    height.value = size.height;
    updatePreviewBox();
};

const selectPreset = (preset, index) => {
    activePresetIndex.value = index;
    isInternalUpdate.value = true;
    width.value = preset.w;
    height.value = preset.h;
    nextTick(() => {
        isInternalUpdate.value = false;
        updatePreviewBox();
    });
};

const toggleAdaptive = () => {
    isAdaptive.value = !isAdaptive.value;
    if (isAdaptive.value && width.value > 0) {
        height.value = Math.round(width.value / currentTargetRatio.value);
        updatePreviewBox();
    }
};

// 背景颜色处理
const setBgColor = (color) => {
    currentBgColor.value = color;
    updatePreviewBox();
};

const onCustomColorChange = (e) => {
    currentBgColor.value = e.target.value;
    updatePreviewBox();
};

// 监听输入
watch([width, height], ([newW, newH]) => {
    if (isInternalUpdate.value) return;
    // 如果开启了锁定比例 (输入W自动算H)
    if (isAdaptive.value) {
        // 简单的防止死循环逻辑
        // 实际业务中通常只在一个方向输入时触发另一个，这里简化为change触发updatePreview
    }
    updatePreviewBox();
});

const onInputChanged = (type) => {
    // 1. 如果开启了“锁定比例” (isAdaptive) 且有原始比例数据
    if (isAdaptive.value && originalRatio.value) {

        // 标记为内部更新，防止触发 watch 导致死循环或多余计算
        isInternalUpdate.value = true;

        // 根据输入的类型进行换算
        // originalRatio = 宽 / 高

        if (type === 'w' && width.value > 0) {
            // 用户改了【宽度】 -> 自动算【高度】
            // 公式: Height = Width / Ratio
            height.value = Math.round(width.value / originalRatio.value);

        } else if (type === 'h' && height.value > 0) {
            // 用户改了【高度】 -> 自动算【宽度】
            // 公式: Width = Height * Ratio
            width.value = Math.round(height.value * originalRatio.value);
        }

        // 计算并赋值完成后，在下一个 tick 释放锁
        nextTick(() => {
            isInternalUpdate.value = false;
        });
    }

    // 2. 实时更新画布上的预览框
    updatePreviewBox();
};

const updatePreviewBox = () => {
    if (width.value > 0 && height.value > 0) {
        updatePreview(width.value, height.value, currentBgColor.value);
    } else {
        stopPreview();
    }
};

// 监听面板展开
watch(() => props.isExpanded, (val) => {
    if (val) initSize();
    else stopPreview();
});

const handleApply = async () => {
    // 1. 等待图片处理完全结束 (新图上屏，状态重置完成)
    await applyWhitePadding(width.value, height.value, currentBgColor.value);

    // 2. 只有处理完了，才通知父组件关闭面板
    // 此时 isExpanded 变 false 触发 watcher 里的 stopPreview
    // 但因为 originalTransform 已经被置空，stopPreview 不会产生任何副作用
    emit('toggle');
};

const handleCancel = () => {
    stopPreview();
    emit('toggle');
}

const handleToggle = () => emit('toggle');

onMounted(() => {
    if (props.isExpanded) initSize();
});

onUnmounted(() => stopPreview());
</script>

<style scoped>
/* 继承并复用了大部分 AdjustResize 的样式 */
.preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
    max-height: 280px;
    overflow-y: auto;
}

.preset-item {
    background-color: #f5f7fa;
    padding: 10px;
    border-radius: 6px;
    font-size: 13px;
    color: #606266;
    cursor: pointer;
    border: 1px solid transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    transition: all 0.2s;
}

.preset-item:hover {
    background-color: #e6f7ff;
    border-color: #c0c4cc;
}

.preset-item.active {
    background-color: #ecf5ff;
    color: #409eff;
    border-color: #409eff;
    font-weight: 500;
}

.custom-item {
    flex-direction: row;
    grid-column: span 2;
    background-color: #fff;
    border: 1px dashed #dcdfe6;
}

.custom-item.active {
    border-style: solid;
}

.preset-name {
    font-weight: 500;
    margin-bottom: 2px;
}

.preset-dim {
    font-size: 11px;
    color: #909399;
}

.resize-input-box {
    background-color: #fff;
    padding: 4px 0;
}

.input-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.input-wrapper {
    position: relative;
    width: 40%;
}

.ie-input {
    text-align: center;
    padding-right: 20px;
    font-weight: bold;
    color: #333;
    width: 100%;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    height: 32px;
    font-size: 13px;
}

.ie-input:focus {
    border-color: #409eff;
    outline: none;
}

.suffix {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    color: #c0c4cc;
    font-size: 11px;
    pointer-events: none;
}

.link-icon-btn {
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
}

.link-icon-btn:hover {
    background-color: #f0f0f0;
}

/* 颜色选择器样式 */
.bg-color-section {
    margin-bottom: 16px;
}

.section-label {
    font-size: 12px;
    color: #606266;
    margin-bottom: 8px;
}

.color-row {
    display: flex;
    gap: 12px;
}

.color-item {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 2px solid transparent;
    transition: all 0.2s;
}

.color-item.active {
    border-color: #409eff;
    transform: scale(1.1);
}

.checkerboard {
    background-image:
        linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
    background-size: 8px 8px;
    background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
    background-color: #fff;
}

.color-picker-wrap {
    background: linear-gradient(to bottom right, #ff0000, #00ff00, #0000ff);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    position: relative;
    overflow: hidden;
}

.native-color-input {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}


.action-buttons {
    display: flex;
    gap: 10px;
}

.full {
    flex: 1;
}

.tool-item:hover .arrow {
    transform: translateX(2px);
    transition: transform 0.2s;
}

.tool-content {
    padding: 16px;
    border: 1px solid #eee;
    border-top: none;
}
</style>