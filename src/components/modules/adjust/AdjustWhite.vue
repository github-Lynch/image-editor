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
                        <input type="number" v-model.number="width" class="ie-input" @input="onInputChanged">
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
                        <input type="number" v-model.number="height" class="ie-input" @input="onInputChanged">
                        <span class="suffix">H</span>
                    </div>
                </div>

                <div class="switch-row">
                    <div class="ie-switch" :class="{ 'is-checked': isAdaptive }" @click="toggleAdaptive">
                        <span class="ie-switch-core"></span>
                    </div>
                    <span class="switch-label">锁定长宽比 (保真模式)</span>
                </div>

                <!-- <div class="reset-row">
           <span class="reset-link" @click="resetToOriginal">恢复原图尺寸</span>
        </div> -->

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
import { registerResizeModule, getCurrentSize, applyResize, startPreview, updatePreview, stopPreview } from './useCanvasWhite';

const props = defineProps({
    isExpanded: { type: Boolean, default: false }
});

const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

// === 状态定义 ===
const width = ref(0);
const height = ref(0);
const isAdaptive = ref(true);
const originalRatio = ref(1);
const activePresetIndex = ref(-1);
const isInternalUpdate = ref(false); // 防止循环更新

// 预设数据 (可根据需要扩展)
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

// === 核心逻辑：获取当前应遵循的比例 ===
// 对应表格逻辑：如果是预设，用预设比例；如果是自定义，用原图比例
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
        registerResizeModule(canvasAPI.canvas, canvasAPI.saveHistory);
        const size = getCurrentSize();

        if (size.height > 0) {
            originalRatio.value = size.width / size.height;
        }

        width.value = size.width;
        height.value = size.height;
        activePresetIndex.value = -1; // 默认选中自定义
        isAdaptive.value = true;      // 默认开启保真

        // 立即启动预览 (显示蓝色虚线框)
        nextTick(() => {
            startPreview(width.value, height.value, !isAdaptive.value);
        });
    }
};

// === 交互逻辑 ===

const selectCustomMode = () => {
    activePresetIndex.value = -1;
    // 切换到自定义时，恢复到原图尺寸，或者保持当前输入但切换比例基准
    // 这里选择：重置回原图尺寸，符合直觉
    resetToOriginal();
};

const selectPreset = (preset, index) => {
    activePresetIndex.value = index;
    // 选中预设 -> 立即应用预设数值
    isInternalUpdate.value = true;
    width.value = preset.w;
    height.value = preset.h;
    // 选中预设通常意味着用户希望遵循该比例，所以自动开启保真
    isAdaptive.value = true;
    nextTick(() => {
        isInternalUpdate.value = false;
        updatePreviewBox(); // 更新预览
    });
};

const toggleAdaptive = () => {
    isAdaptive.value = !isAdaptive.value;
    // 打开开关瞬间，根据当前 Width 和 目标比例 修正 Height
    if (isAdaptive.value && width.value > 0) {
        isInternalUpdate.value = true;
        height.value = Math.round(width.value / currentTargetRatio.value);
        nextTick(() => {
            isInternalUpdate.value = false;
            updatePreviewBox();
        });
    } else {
        // 修改点 2：如果是关闭保真（进入拉伸模式），也立即刷新预览，触发图片拉伸效果
        updatePreviewBox();
    }
};

const resetToOriginal = () => {
    const size = getCurrentSize();
    width.value = size.width;
    height.value = size.height;
    // 恢复原尺寸预览
    updatePreviewBox();
};

// === 监听输入 (实现表格矩阵逻辑) ===

// 监听宽度变化
watch(width, (newW) => {
    if (isInternalUpdate.value) return;

    // 表格逻辑 1 & 3 & 5: 保真开启 -> 自动计算高度
    if (isAdaptive.value && newW > 0) {
        isInternalUpdate.value = true;
        height.value = Math.round(newW / currentTargetRatio.value);
        nextTick(() => { isInternalUpdate.value = false; });
    }
    // 表格逻辑 2 & 4: 保真关闭 -> 高度不变 (导致变形)
});

// 监听高度变化
watch(height, (newH) => {
    if (isInternalUpdate.value) return;

    if (isAdaptive.value && newH > 0) {
        isInternalUpdate.value = true;
        width.value = Math.round(newH * currentTargetRatio.value);
        nextTick(() => { isInternalUpdate.value = false; });
    }
});

// === 预览更新 ===
// 只要输入变化，就通知 canvas 更新虚线框
const onInputChanged = () => {
    updatePreviewBox();
};

const updatePreviewBox = () => {
    if (width.value > 0 && height.value > 0) {
        // 修改点 3：传入拉伸状态 (!isAdaptive.value)
        updatePreview(width.value, height.value, !isAdaptive.value);
    } else {
        stopPreview();
    }
};

// 监听展开状态
watch(() => props.isExpanded, (val) => {
    if (val) initSize();
    else stopPreview();
});

// === 应用与取消 ===
const handleApply = () => {
    // 修改点 4：传入拉伸状态
    applyResize(width.value, height.value, !isAdaptive.value);
    emit('toggle');
};

const handleCancel = () => {
    stopPreview();
    emit('toggle');
}

const handleToggle = () => {
    emit('toggle');
};

onMounted(() => {
    if (props.isExpanded) initSize();
});

onUnmounted(() => stopPreview());
</script>

<style scoped>
/* Grid 布局实现矩阵效果 */
.preset-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    /* 两列 */
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
    /* 垂直排列文字 */
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

/* 自定义项特殊样式 */
.custom-item {
    flex-direction: row;
    /* 横向 */
    grid-column: span 2;
    /* 占满一行 */
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

/* 输入框区域样式优化 */
.resize-input-box {
    background-color: #fff;
    padding: 4px 0;
}

.input-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
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

.switch-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
}

.switch-label {
    font-size: 12px;
    color: #606266;
    margin-left: 8px;
    cursor: pointer;
}

.ie-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 32px;
    height: 16px;
    border-radius: 10px;
    background-color: #dcdfe6;
    cursor: pointer;
    transition: background-color 0.3s;
}

.ie-switch.is-checked {
    background-color: #409eff;
}

.ie-switch-core {
    position: absolute;
    top: 2px;
    left: 2px;
    border-radius: 100%;
    width: 12px;
    height: 12px;
    background-color: #fff;
    transition: all 0.3s;
}

.ie-switch.is-checked .ie-switch-core {
    left: 100%;
    margin-left: -14px;
}

.reset-row {
    text-align: center;
    margin-bottom: 10px;
}

.reset-link {
    font-size: 12px;
    color: #909399;
    cursor: pointer;
    text-decoration: underline;
}

.reset-link:hover {
    color: #409eff;
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