<template>
  <div class="puzzle-module">
    <!-- sub page count: 3 -->
    <!-- 1. 初始, 网格/拼接 选择页 (包含选择模板后的配置面板) -->
    <!-- 2. 模板选择页 -->
    <!-- 3. 点击 Canvas 图片的配置页 (替换/删除 透明度 缩放) 点击空白处 back to sub 1 -->

    <!-- 初始页 -->
    <div
      v-if="sub === 1"
      class="puzzle-main"
    >
      <!-- 选项卡 -->
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

      <!-- 操作内容 -->
      <div>
        <!-- 网格选项卡内容 -->
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

          <!-- 控制组件 -->
          <div
            v-if="showControlPanel"
            class="control-panel"
          >
            <!-- 拼图尺寸 -->
            <div class="control-group">
              <label>拼图尺寸</label>
              <div class="size-controls">
                <div class="input-wrapper">
                  <input
                    type="number"
                    v-model.number="puzzleSettings.size.width"
                    min="100"
                    max="2000"
                    class="ie-input"
                    @change="updateSize('width', puzzleSettings.size.width)"
                  >
                  <span class="suffix">W</span>
                </div>

                <div
                  class="link-icon"
                  title="锁定宽高比"
                  @click="toggleRatioLock"
                >
                  <svg
                    v-if="puzzleSettings.size.lockRatio"
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
                    v-model.number="puzzleSettings.size.height"
                    min="100"
                    max="2000"
                    class="ie-input"
                    @change="updateSize('height', puzzleSettings.size.height)"
                  >
                  <span class="suffix">H</span>
                </div>
              </div>
            </div>

            <!-- 边框 -->
            <div class="control-group">
              <label>边框</label>
              <input
                v-model="puzzleSettings.border"
                type="range"
                min="0"
                max="100"
                step="1"
              />
              <span class="value-display">{{ puzzleSettings.border }}px</span>
            </div>

            <!-- 间距 -->
            <div class="control-group">
              <label>间距</label>
              <input
                type="range"
                v-model="puzzleSettings.spacing"
                min="0"
                max="100"
                step="1"
              />
              <span class="value-display">{{ puzzleSettings.spacing }}px</span>
            </div>

            <!-- 拼图背景 -->
            <div class="control-group">
              <label>拼图背景颜色</label>
              <input
                type="color"
                class="color"
                v-model="puzzleSettings.background"
              />
            </div>

            <!-- 保存按钮 -->
            <button
              class="save-btn"
              @click="save"
            >
              保存
            </button>
          </div>
        </div>

        <!-- 拼接选项卡内容 -->
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

    <!-- 模板选择面板 -->
    <div
      v-if="sub === 2"
      class="grid-templates"
    >
      <!-- 返回按钮 -->
      <div
        class="back-header"
        @click="backToMain"
      >
        <span class="back-icon">‹</span> 网格
      </div>

      <!-- 图片数量选择 -->
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

      <!-- 网格模板列表 -->
      <div class="grid-list">
        <div
          v-for="(group, count) in filteredTemplates"
          :key="count"
          class="grid-group"
        >
          <!-- 图片数量标题 -->
          <div class="grid-group-title">{{ count }}</div>

          <!-- 该数量下的所有模板 -->
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

    <!-- 图片的配置页 -->
    <div
      v-if="sub === 3"
      class="p-20"
    >
      <div class="operate-tabs">
        <div class="tab-item border">
          替换图片
        </div>
        <div
          v-if="false"
          class="tab-item border"
        >
          删除图片
        </div>
      </div>

      <!-- 透明度 -->
      <div class="control-group">
        <label>透明度</label>
        <input
          v-model="transparent"
          type="range"
          min="0"
          max="100"
          step="1"
        />
        <span class="value-display">{{ transparent }}px</span>
      </div>

      <!-- 放大 -->
      <div class="control-group">
        <label>放大</label>
        <input
          type="range"
          v-model="zoom"
          min="100"
          max="300"
          step="1"
        />
        <span class="value-display">{{ zoom }}px</span>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watchEffect, inject } from 'vue';
  import { gridTemplates, countOptions } from './config.js';
  import { useEditorState } from '../../../composables/useEditorState';
  import { useCanvas } from '../../../composables/useCanvas';

  // 获取编辑器状态和Canvas API
  const { state } = useEditorState();
  const canvasAPI = inject('canvasAPI');
  const canvas = computed(() => canvasAPI?.canvas?.value);
  const { initImage, addImage } = useCanvas();

  /**
   * sub page count: 3
   * 1. 初始, 网格/拼接 选择页 (包含选择模板后的配置面板)
   * 2. 模板选择页
   * 3. 点击 Canvas 图片的配置页 (替换/删除 透明度 缩放) 点击空白处 back to sub 1
   */
  const sub = ref(1);
  const showControlPanel = ref(false);

  // 状态管理
  const selectedImageCount = ref('all');
  const activeTab = ref('grid');
  const puzzleSettings = ref({
    size: { width: 1000, height: 1000, lockRatio: true },
    border: 15,
    spacing: 15,
    background: '#ffffff'
  });

  // 过滤显示的网格模板
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

  // 返回上一级
  const backToMain = () => {
    sub.value = 1;
    selectedImageCount.value = 'all';
  };

  // 选择网格模板
  const curTemp = ref({});
  const selectTemplate = (template) => {
    curTemp.value = template;
    showControlPanel.value = true;
    sub.value = 1;
  };

  const cancel = () => {
    showControlPanel.value = false;
    curTemp.value = {};
    // sub.value = 1;
  };

  // 切换宽高比锁定
  const toggleRatioLock = () => {
    puzzleSettings.value.size.lockRatio = !puzzleSettings.value.size.lockRatio;
  };

  // 更新尺寸
  const updateSize = (dimension, value) => {
    puzzleSettings.value.size[dimension] = parseInt(value) || 0;
    // 如果锁定宽高比，同时更新另一个维度
    if (puzzleSettings.value.size.lockRatio && canvas.value) {
      const activeObject = canvas.value.getActiveObject();
      if (activeObject) {
        const ratio = activeObject.width / activeObject.height;
        if (dimension === 'width') {
          puzzleSettings.value.size.height = Math.round(puzzleSettings.value.size.width / ratio);
        } else {
          puzzleSettings.value.size.width = Math.round(puzzleSettings.value.size.height * ratio);
        }
      }
    }
  };

  // 保存拼图
  const save = () => { };

  // sub 3
  const transparent = ref(100);
  const zoom = ref(100);

  // Canvas 点击事件监听
  watchEffect(() => {
    if (canvas.value) {
      // 移除之前的事件监听器
      canvas.value.off('mouse:down');

      // 添加新的点击事件监听器
      canvas.value.on('mouse:down', (opt) => {
        const target = opt.target;

        if (!showControlPanel.value) return;

        // 检查是否点击了图片区域
        if (target && target.type === 'image') {
          // 点击图片区域，设置sub为3
          sub.value = 3;
        } else {
          // 点击非图片区域，设置sub为1
          sub.value = 1;
        }
      });
    }
  });
</script>

<style scoped>
  .puzzle-module {
    width: 100%;
    height: 100%;
    background-color: #fff;
  }

  /* 主面板样式 */
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
    padding: 20px;
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
    border-radius: 4;
    background-color: #fff;
    font-size: 24px;
    line-height: 40px;
    text-align: center;
    margin-right: 16px;
  }

  .small-grid-template {
    height: 100%;
    display: grid;
    /* border-radius: 4px; */
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

  /* 网格模板选择面板样式 */
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

  /* 控制面板样式 */
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

  /* 尺寸控制 */
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

  .-ratio-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    background-color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
  }

  .-ratio-btn:hover {
    border-color: #409eff;
    color: #409eff;
  }

  .-ratio-btn.active {
    background-color: #409eff;
    border-color: #409eff;
    color: #fff;
  }

  /* 滑块控制 */
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

  /* 保存按钮 */
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

  .operate-tabs {
    display: flex;
    margin-bottom: 16px;
  }

  .border {
    border: 1px solid #dcdfe6;
  }
</style>
