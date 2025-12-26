<template>
  <div class="p-16">
    <input
      type="file"
      ref="fileInput"
      accept="image/*"
      style="display: none"
      @change="handleFileChange"
    >

    <div
      v-if="!wmState.isSelected"
      class="state-initial"
    >
      <div class="action-section">
        <button
          class="ie-btn full-width"
          @click="triggerUpload('add')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            style="margin-right: 6px;"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          添加水印
        </button>
      </div>
    </div>

    <div
      v-else
      class="state-selected"
    >
      <div class="thumb-row">
        <div class="thumb-box">
          <img
            v-if="wmState.currentSrc"
            :src="wmState.currentSrc"
            class="thumb-img"
          >
        </div>
        <button
          class="replace-text-btn"
          @click="triggerUpload('replace')"
        >替换图片</button>
      </div>

      <div class="switch-row">
        <span class="switch-label">平铺水印</span>
        <div
          class="ie-switch"
          :class="{ 'is-checked': wmState.isTiled }"
          @click="handleToggleTiling"
        >
          <span class="ie-switch-core"></span>
        </div>
      </div>

      <div class="divider"></div>

      <div v-if="wmState.isTiled">
        <div class="control-group">
          <div class="label-row">
            <span>水印间距</span>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="wmState.gap"
                class="ie-input-number"
                min="0"
                max="200"
                @input="updateParam('gap', wmState.gap)"
              >
            </div>
          </div>
          <input
            type="range"
            v-model.number="wmState.gap"
            class="ie-slider w-full"
            min="0"
            max="200"
            @input="updateParam('gap', wmState.gap)"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <span>水印交错</span>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="wmState.stagger"
                class="ie-input-number"
                min="0"
                max="100"
                @input="updateParam('stagger', wmState.stagger)"
              >
            </div>
          </div>
          <input
            type="range"
            v-model.number="wmState.stagger"
            class="ie-slider w-full"
            min="0"
            max="100"
            @input="updateParam('stagger', wmState.stagger)"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <span>水印旋转</span>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="wmState.rotate"
                class="ie-input-number"
                min="0"
                max="360"
                @input="updateParam('rotate', wmState.rotate)"
              >
            </div>
          </div>
          <input
            type="range"
            v-model.number="wmState.rotate"
            class="ie-slider w-full"
            min="0"
            max="360"
            @input="updateParam('rotate', wmState.rotate)"
          >
        </div>

        <div class="control-group">
          <div class="label-row">
            <span>水印缩放</span>
            <div class="input-wrapper">
              <input
                type="number"
                v-model.number="wmState.scale"
                class="ie-input-number"
                min="10"
                max="200"
                @input="updateParam('scale', wmState.scale)"
              >
              <span class="unit">%</span>
            </div>
          </div>
          <input
            type="range"
            v-model.number="wmState.scale"
            class="ie-slider w-full"
            min="10"
            max="200"
            @input="updateParam('scale', wmState.scale)"
          >
        </div>
      </div>

      <div class="control-group">
        <div class="label-row">
          <span>透明度</span>
          <div class="input-wrapper">
            <input
              type="number"
              v-model.number="wmState.opacity"
              class="ie-input-number"
              min="0"
              max="100"
              @input="updateParam('opacity', wmState.opacity)"
            >
            <span class="unit">%</span>
          </div>
        </div>
        <input
          type="range"
          v-model.number="wmState.opacity"
          class="ie-slider w-full"
          min="0"
          max="100"
          @input="updateParam('opacity', wmState.opacity)"
        >
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, inject, onMounted } from 'vue';
  import {
    registerWatermarkModule, addWatermark, replaceWatermark,
    updateWatermarkParams, toggleTilingMode, wmState
  } from './useCanvasWatermark';

  const canvasAPI = inject('canvasAPI');
  const fileInput = ref(null);
  const uploadMode = ref('add');

  onMounted(() => {
    if (canvasAPI?.canvas) registerWatermarkModule(canvasAPI.canvas, canvasAPI.saveHistory);
  });

  const triggerUpload = (mode) => {
    uploadMode.value = mode;
    fileInput.value.value = '';
    fileInput.value.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (uploadMode.value === 'add') addWatermark(url);
    else replaceWatermark(url);
  };

  const handleToggleTiling = () => toggleTilingMode();
  const updateParam = (key, value) => updateWatermarkParams(key, value);
</script>

<style scoped>
  .p-16 {
    padding: 16px;
  }

  .action-section {
    margin-bottom: 20px;
    display: flex;
    justify-content: center;
  }

  .full-width {
    width: 100%;
    height: 40px;
    font-size: 14px;
  }

  /* 缩略图行 */
  .thumb-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    background-color: #f5f7fa;
    padding: 8px;
    border-radius: 6px;
  }

  .thumb-box {
    width: 40px;
    height: 40px;
    border: 1px solid #e4e7ed;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .thumb-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .replace-text-btn {
    background: none;
    border: none;
    color: var(--ie-primary-color);
    font-size: 13px;
    cursor: pointer;
    font-weight: 500;
    padding: 4px 8px;
  }

  .replace-text-btn:hover {
    text-decoration: underline;
  }

  /* 开关行 */
  .switch-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .switch-label {
    font-size: 13px;
    color: #606266;
    font-weight: 500;
  }

  .ie-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    width: 36px;
    height: 20px;
    border-radius: 10px;
    background-color: #dcdfe6;
    cursor: pointer;
    transition: background-color 0.3s;
  }

  .ie-switch.is-checked {
    background-color: var(--ie-primary-color);
  }

  .ie-switch-core {
    position: absolute;
    top: 2px;
    left: 2px;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    background-color: #fff;
    transition: all 0.3s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  .ie-switch.is-checked .ie-switch-core {
    left: 100%;
    margin-left: -18px;
  }

  .divider {
    height: 1px;
    background: #ebeef5;
    margin: 16px 0;
  }

  .control-group {
    margin-bottom: 20px;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-size: 13px;
    color: #606266;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .ie-input-number {
    text-align: right;
    padding-right: 18px;
    width: 60px;
  }

  .unit {
    position: absolute;
    right: 6px;
    font-size: 12px;
    color: #909399;
    pointer-events: none;
  }

  .w-full {
    width: 100%;
  }
</style>