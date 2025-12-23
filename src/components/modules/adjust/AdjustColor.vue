<template>
    <div class="tool-group">
        <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="handleToggle">
            <div class="left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a10 10 0 0 0 0 20Z" />
                </svg>
                <span>色彩调节</span>
            </div>
            <div class="right-icon">
                <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2">
                    <path d="m9 18 6-6-6-6" />
                </svg>
            </div>
        </div>

        <div v-if="isExpanded" class="tool-content">
            <div class="color-controls">
                <div v-for="item in config" :key="item.key" class="control-row">
                    <div class="label-box">
                        <span>{{ item.label }}</span>
                        <input type="number" v-model.number="values[item.key]" class="ie-input-number"
                            @input="updateFilters">
                    </div>
                    <input type="range" v-model.number="values[item.key]" :min="item.min" :max="item.max" step="1"
                        class="ie-slider" @input="updateFilters">
                </div>
            </div>

            <div class="action-buttons">
                <button class="ie-btn ie-primary full" @click="handleApply">确定</button>
                <button class="ie-btn full" @click="handleCancel">取消</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { reactive, inject, onMounted } from 'vue';
import { registerColorModule, applyColorAdjust, commitColorAdjust, cancelColorAdjust } from './useCanvasColor';

const props = defineProps({ isExpanded: Boolean });
const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

const values = reactive({
    blurSharpen: 0,
    saturation: 0,
    brightness: 0,
    contrast: 0,
    temperature: 0,
    hue: 0
});

const config = [
    { label: '模糊 / 锐化', key: 'blurSharpen', min: -10, max: 10 },
    { label: '饱和度', key: 'saturation', min: -100, max: 100 },
    { label: '亮度', key: 'brightness', min: -10, max: 10 },
    { label: '对比度', key: 'contrast', min: -10, max: 10 },
    { label: '色温', key: 'temperature', min: -20, max: 20 },
    { label: '色调', key: 'hue', min: -20, max: 20 },
];

const updateFilters = () => applyColorAdjust(values);
const handleToggle = () => emit('toggle');

const handleApply = () => {
    commitColorAdjust();
    emit('toggle');
};

const handleCancel = () => {
    cancelColorAdjust();
    emit('toggle');
};

onMounted(() => {
    if (canvasAPI?.canvas) {
        registerColorModule(canvasAPI.canvas, canvasAPI.saveHistory);
    }
});
</script>

<style scoped>
.color-controls {
    padding: 8px 0;
}

.control-row {
    margin-bottom: 16px;
}

.label-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 13px;
    color: #606266;
}

/* 已移除局部的 ie-small-input 样式 */

.ie-slider {
    width: 100%;
    height: 4px;
    background: #e4e7ed;
    border-radius: 2px;
    appearance: none;
    outline: none;
}

.ie-slider::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #fff;
    border: 2px solid var(--ie-primary-color); /* 修正为主题色 */
    border-radius: 50%;
    cursor: pointer;
    transition: transform 0.2s;
}

.ie-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}

.action-buttons {
    display: flex;
    gap: 10px;
    margin-top: 10px;
}

.full {
    flex: 1;
}
</style>