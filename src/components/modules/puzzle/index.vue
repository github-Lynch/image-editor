<template>
  <div class="puzzle-module">
    <div
      v-if="sub === 1"
      class="puzzle-main"
    >
      <div class="puzzle-tabs">
        <div
          class="tab-item"
          :class="{ active: activeTab === 'grid' }"
          @click="activeTab = 'grid'"
        >
          网格
        </div>
        <div
          class="tab-item"
          :class="{ active: activeTab === 'join' }"
          @click="activeTab = 'join'"
        >
          拼接
        </div>
      </div>

      <div>
        <div v-if="activeTab === 'grid'">
          <button
            class="select-btn"
            @click="sub = 2"
          >
            <div class="icon-wrap">
              <div
                v-if="showControlPanel"
                :style="curTemp.wrapStyle"
                class="small-grid-template"
              >
                <div
                  v-for="(gridArea, i) in curTemp.gridAreas"
                  :key="i"
                  class="grid-cell"
                  :style="`grid-area: ${gridArea};`"
                ></div>
              </div>
              <span
                v-else
                class="plus-icon"
              >+</span>
            </div>
            <span>选择网格</span>
            <span
              v-if="showControlPanel"
              class="cancel-btn"
              @click.stop="cancel"
            >取消</span>
          </button>

          <div
            v-if="showControlPanel"
            class="control-panel"
          >
            <div class="control-group">
              <label>拼图尺寸</label>
              <div class="size-controls">
                <div class="input-wrapper">
                  <input
                    type="number"
                    v-model.number="puzzleSettings.width"
                    :min="min"
                    :max="max"
                    class="ie-input"
                    @change="updateSize('width')"
                  >
                  <span class="suffix">W</span>
                </div>

                <div
                  class="link-icon"
                  title="锁定宽高比"
                  @click="toggleRatioLock"
                >
                  <svg
                    v-if="puzzleSettings.lockRatio"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#409eff"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <svg
                    v-else
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#909399"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    style="opacity: 0.6"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    <line
                      x1="4"
                      y1="4"
                      x2="20"
                      y2="20"
                      stroke="#909399"
                    />
                  </svg>
                </div>

                <div class="input-wrapper">
                  <input
                    type="number"
                    v-model.number="puzzleSettings.height"
                    :min="min"
                    :max="max"
                    class="ie-input"
                    @change="updateSize('height')"
                  >
                  <span class="suffix">H</span>
                </div>
              </div>
            </div>

            <div class="control-group">
              <label>边框</label>
              <input
                v-model.number="puzzleSettings.padding"
                type="range"
                min="0"
                max="100"
                step="1"
                @change="updateStyle"
              />
              <span class="value-display">{{ puzzleSettings.padding }} px</span>
            </div>

            <div class="control-group">
              <label>间距</label>
              <input
                type="range"
                v-model.number="puzzleSettings.spacing"
                min="0"
                max="100"
                step="1"
                @change="updateStyle"
              />
              <span class="value-display">{{ puzzleSettings.spacing }} px</span>
            </div>

            <div class="control-group">
              <label>拼图背景颜色</label>
              <input
                type="color"
                class="color"
                v-model="puzzleSettings.bgColor"
                @input="updateStyle"
              />
            </div>

            <button
              class="save-btn"
              @click="save"
            >
              保存
            </button>
          </div>
        </div>

        <div v-else>
          <button class="select-btn">
            <div class="icon-wrap">
              <div
                v-if="showControlPanel"
                :style="curTemp.wrapStyle"
                class="small-grid-template"
              >
                <div
                  v-for="(gridArea, i) in curTemp.gridAreas"
                  :key="i"
                  class="grid-cell"
                  :style="`grid-area: ${gridArea};`"
                ></div>
              </div>
              <span
                v-else
                class="plus-icon"
              >+</span>
            </div>
            <span>选择拼接</span>
            <span
              v-if="showControlPanel"
              class="cancel-btn"
              @click.stop="cancel"
            >取消</span>
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="sub === 2"
      class="grid-templates"
    >
      <div
        class="back-header"
        @click="backToMain"
      >
        <span class="back-icon">‹</span> 网格
      </div>

      <div class="image-count-selector">
        <label>图片数量</label>
        <select v-model="selectedImageCount">
          <option
            v-for="item in countOptions"
            :key="item.value"
            :value="item.value"
          >{{ item.label }}</option>
        </select>
      </div>

      <div class="grid-list">
        <div
          v-for="(group, count) in filteredTemplates"
          :key="count"
          class="grid-group"
        >
          <div class="grid-group-title">{{ count }}</div>

          <div class="grid-templates-row">
            <div
              v-for="template in group"
              :key="template.id"
              :style="template.wrapStyle"
              class="grid-template"
              @click="selectTemplate(template)"
            >
              <div
                v-for="(gridArea, i) in template.gridAreas"
                :key="i"
                class="grid-cell"
                :style="`grid-area: ${gridArea};`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="sub === 3"
      class="p-20"
    >
      <div class="operate-buttons">
         <button class="ie-btn full" @click="triggerReplace">替换图片</button>
         <button 
            v-if="currentImgCount > 1" 
            class="ie-btn btn-danger" 
            style="margin-left: 8px;"
            @click="handleDelete"
         >删除</button>
      </div>

      <div class="divider-line"></div>

      <div class="control-group">
        <div class="label-row">
            <label>透明度</label>
            <span class="val">{{ transparent }}%</span>
        </div>
        <input
          v-model.number="transparent"
          type="range"
          min="0"
          max="100"
          step="1"
          @input="onParamsChange"
        />
      </div>

      <div class="control-group">
        <div class="label-row">
            <label>放大 (Zoom)</label>
            <span class="val">{{ Math.round(zoomScale * 100) }}%</span>
        </div>
        <input
          type="range"
          v-model.number="zoomScale"
          min="0.1"
          max="3"
          step="0.01"
          @input="onParamsChange"
        />
      </div>
    </div>

    <input
      type="file"
      ref="fileInput"
      accept="image/png, image/jpeg, image/jpg"
      style="display:none"
      @change="onFileSelected"
    >

    <Modal
      v-model="showSaveModal"
      @confirm="handleConfirmSave"
      @cancel="showSaveModal = false"
      @discard="showSaveModal = false"
    />
  </div>
</template>

<script setup>
  import { ref, reactive, computed, inject, onMounted, onUnmounted } from 'vue';
  import { toast } from '@/utils/toast';
  import Modal from '@/components/common/Modal.vue'; // 引入 Modal 组件
  import { gridTemplates, parseTemplateToCells, countOptions } from './config.js';
  import {
    registerPuzzleModule,
    initPuzzleMode,
    exitPuzzleMode,
    updateLayout,
    addImageToCell,
    deleteImageFromCell,
    updatePuzzleImageParams,
    getPuzzleImageCount,
    zoomToPuzzleArea,
    saveSnapshotBeforeLayout,
    restoreSnapshotBeforeLayout,
    completeExitPuzzle // 引入完成拼图的方法
  } from './useCanvasPuzzle.js';
  import { useEditorState } from '@/composables/useEditorState';

  const canvasAPI = inject('canvasAPI');
  const fileInput = ref(null);
  const { setPuzzleMode } = useEditorState();
  
  let pendingCellIndex = -1;
  const selectedCellIndex = ref(-1);

  // 图片参数状态
  const transparent = ref(100);
  const zoomScale = ref(1);
  const currentImgCount = ref(1);

  // 弹窗控制状态
  const showSaveModal = ref(false);

  const init = () => {
    if (canvasAPI) {
      registerPuzzleModule(canvasAPI.canvas, {
        onCellClick: (index) => {
          pendingCellIndex = index;
          if (fileInput.value) {
            fileInput.value.value = '';
            fileInput.value.click();
          }
        },
        onImageSelect: (index, params) => {
           selectedCellIndex.value = index;
           pendingCellIndex = index;
           
           transparent.value = Math.round((params.opacity || 1) * 100);
           zoomScale.value = params.scale || 1;
           
           currentImgCount.value = getPuzzleImageCount();
           sub.value = 3;
        },
        onDeselect: () => {
           sub.value = 1;
           selectedCellIndex.value = -1;
        }
      },
        canvasAPI.zoomToRect
      );
      initPuzzleMode();
    }
  }

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      toast.error('仅支持 JPG/PNG 图片格式');
      return;
    }
    if (pendingCellIndex >= 0) {
      const url = URL.createObjectURL(file);
      addImageToCell(url, pendingCellIndex);
      if (sub.value === 3) {
        transparent.value = 100;
      } else {
        pendingCellIndex = -1;
      }
    }
  };

  const sub = ref(1);
  const showControlPanel = ref(false);
  const selectedImageCount = ref('all');
  const activeTab = ref('grid');

  const filteredTemplates = computed(() => {
    if (selectedImageCount.value === 'all') {
      return gridTemplates;
    } else {
      const curCount = parseInt(selectedImageCount.value);
      const result = {};
      for (const count in gridTemplates) {
        if (parseInt(count) === curCount) {
          result[count] = gridTemplates[count];
        }
      }
      return result;
    }
  });

  const backToMain = () => {
    sub.value = 1;
    selectedImageCount.value = 'all';
  };

  const curTemp = ref({});
  const selectTemplate = (template) => {
    // Only capture snapshot if we are starting a new selection (curTemp is empty)
    if (!curTemp.value.id) {
      saveSnapshotBeforeLayout();
    }
    
    curTemp.value = template;
    showControlPanel.value = true;
    setPuzzleMode(true); // 切换到拼图模式
    init();
    sub.value = 1;
    applyTemplate(template);
    zoomToPuzzleArea();
  };

  const applyTemplate = (templ) => {
    const cells = parseTemplateToCells(templ);
    updateLayout(cells, puzzleSettings);
  };

  const cancel = () => {
    restoreSnapshotBeforeLayout();
    showControlPanel.value = false;
    setPuzzleMode(false); // 退出拼图模式
    exitPuzzleMode();
    curTemp.value = {};
  };

  const puzzleSettings = reactive({
    width: 1000,
    height: 1000,
    lockRatio: false,
    padding: 15,
    spacing: 15,
    bgColor: '#ffffff'
  });
  const min = 400;
  const max = 3840;
  let ratio = 1;

  const toggleRatioLock = () => {
    puzzleSettings.lockRatio = !puzzleSettings.lockRatio;
    if (puzzleSettings.lockRatio) {
      ratio = puzzleSettings.width / puzzleSettings.height;
    }
  };

  const updateSize = (dimension) => {
    if (puzzleSettings[dimension] < min) {
      puzzleSettings[dimension] = min;
    } else if (puzzleSettings[dimension] > max) {
      puzzleSettings[dimension] = max;
    }

    if (puzzleSettings.lockRatio) {
      if (dimension === 'width') {
        puzzleSettings.height = Math.round(puzzleSettings.width / ratio);
      } else {
        puzzleSettings.width = Math.round(puzzleSettings.height * ratio);
      }
    }

    updateStyle();
  };

  const updateStyle = () => {
    updateLayout(null, puzzleSettings);
  };

  // === 保存逻辑 ===
  const save = () => { 
    showSaveModal.value = true;
  };

  const handleConfirmSave = () => {
    // 1. 调用核心逻辑：生成图片并替换画布内容
    completeExitPuzzle('save');
    
    // 2. 关闭弹窗
    showSaveModal.value = false;
    
    // 3. 返回
    showControlPanel.value = false;
    setPuzzleMode(false); // 退出拼图模式
    exitPuzzleMode();
  };

  // === Sub 3 逻辑 ===

  const deselectImage = () => {
      sub.value = 1;
      selectedCellIndex.value = -1;
      if (canvasAPI && canvasAPI.canvas) {
          canvasAPI.canvas.value.discardActiveObject();
          canvasAPI.canvas.value.requestRenderAll();
      }
  };

  const triggerReplace = () => {
      if (fileInput.value) {
          fileInput.value.value = '';
          fileInput.value.click();
      }
  };

  const handleDelete = () => {
      if (selectedCellIndex.value === -1) return;
      deleteImageFromCell(selectedCellIndex.value);
      toast.success('图片已删除');
      deselectImage();
  };

  const onParamsChange = () => {
      if (selectedCellIndex.value === -1) return;
      updatePuzzleImageParams(selectedCellIndex.value, {
          opacity: transparent.value / 100,
          scale: zoomScale.value
      });
  };
</script>

<style scoped>
  .puzzle-module {
    width: 100%;
    height: 100%;
    background-color: #fff;
  }

  .puzzle-main {
    padding: 20px;
  }

  .puzzle-tabs {
    display: flex;
  }

  .tab-item {
    flex: 1;
    text-align: center;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    color: #606266;
  }

  .tab-item.active {
    background-color: #409eff;
    color: #fff;
  }

  .select-btn {
    display: inline-flex;
    align-items: center;
    padding: 14px;
    border-radius: 4px;
    width: 100%;
    cursor: pointer;
    font-size: 14px;
    color: #606266;
    transition: all 0.3s;
  }

  .select-btn:hover {
    border-color: #409eff;
    color: #409eff;
  }

  .icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 4px;
    background-color: #fff;
    font-size: 24px;
    line-height: 40px;
    text-align: center;
    margin-right: 16px;
  }

  .small-grid-template {
    height: 100%;
    display: grid;
    overflow: hidden;
  }

  .plus-icon {
    font-weight: bold;
  }

  .cancel-btn {
    color: #409eff;
    margin-left: 76px;
    cursor: pointer;
  }

  .grid-templates {
    padding: 20px 12px 20px;
  }

  .back-header {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 20px;
    cursor: pointer;
  }

  .back-icon {
    font-size: 20px;
    margin-right: 8px;
    color: #606266;
  }

  .image-count-selector {
    margin-bottom: 20px;
  }

  .image-count-selector label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #606266;
  }

  .image-count-selector select {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
  }

  .grid-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .grid-group {
    border-radius: 4px;
    overflow: hidden;
  }

  .grid-group-title {
    padding: 10px 15px;
    background-color: #f5f7fa;
    font-size: 14px;
    font-weight: 500;
    color: #606266;
  }

  .grid-templates-row {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 4px;
  }

  .grid-template {
    width: 120px;
    height: 120px;
    display: grid;
    border-radius: 4px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s;
  }

  .grid-template:hover {
    border-color: #409eff;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }

  .grid-cell {
    height: 100%;
    background-color: #f0f0f0;
    border: 1px solid #fff;
  }

  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 15px 0;
  }

  .control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .control-group label {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
  }

  .color {
    width: 100%;
    cursor: pointer;
    border: none;
  }

  .size-controls {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .input-wrapper {
    position: relative;
    width: 38%;
  }

  .ie-input {
    text-align: center;
    padding-right: 20px;
    font-weight: 500;
    color: #333;
  }

  .suffix {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    color: #c0c4cc;
    font-size: 12px;
    pointer-events: none;
  }

  .link-icon {
    width: 24px;
    display: flex;
    justify-content: center;
    cursor: pointer;
  }

  .control-group input[type="range"] {
    width: 100%;
    height: 4px;
    border-radius: 2px;
    background: #dcdfe6;
    outline: none;
    -webkit-appearance: none;
  }

  .control-group input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #409eff;
    cursor: pointer;
  }

  .control-group input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #409eff;
    cursor: pointer;
    border: none;
  }

  .value-display {
    font-size: 14px;
    color: #909399;
    text-align: right;
  }

  .save-btn {
    padding: 12px 20px;
    margin-top: 20px;
    border: none;
    border-radius: 21px;
    background-color: #409eff;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
  }

  .save-btn:hover {
    background-color: #66b1ff;
  }

  .p-20 {
    padding: 20px;
  }

  .operate-buttons {
    display: flex;
    margin-top: 10px;
  }

  .full {
    flex: 1;
  }

  .btn-danger {
    background-color: #fef0f0;
    color: #f56c6c;
    border-color: #fbc4c4;
  }
  .btn-danger:hover {
    background-color: #f56c6c;
    color: #fff;
    border-color: #f56c6c;
  }

  .divider-line {
    height: 1px;
    background: #ebeef5;
    margin: 20px 0;
  }

  .label-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: #606266;
  }

  .val {
    font-family: monospace;
  }

  .confirm-content {
    display: flex;
    align-items: center;
    color: #606266;
    font-size: 14px;
  }
</style>