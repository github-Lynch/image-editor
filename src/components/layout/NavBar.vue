<template>
  <div class="navbar">
    <div class="logo">
      <slot name="logo">{{ textMap.title || '大蜜美图' }}</slot>
    </div>
    <div class="actions">
      <input type="file" ref="fileInput" @change="onFileSelected" style="display:none" accept="image/*" />

      <button class="ie-btn" @click="handleUpload">
        <svg width="14" height="14" viewBox="0 0 1024 1024" style="margin-right:4px;fill:currentColor">
          <path
            d="M544 253.696V704h-64V247.296L237.248 490.048 192 444.8 512 128l320 316.8-45.248 45.248L544 253.696zM160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64z" />
        </svg>
        {{ textMap.upload }}
      </button>

      <span class="ie-divider"></span>

      <button class="ie-btn" style="margin-right:8px;" @click="handleUndo" :disabled="!state.canUndo">撤销</button>
      <button class="ie-btn" style="margin-right:8px;" @click="handleRedo" :disabled="!state.canRedo">重做</button>

      <button class="ie-btn ie-primary" @click="handleSave">{{ textMap.save }}</button>
    </div>
  </div>
</template>

<script setup>
import { inject, ref } from 'vue';
import { useEditorState } from '@/composables/useEditorState'; // 使用新状态
import { Toast } from '@/utils/toast'; // 使用新提示

const { state } = useEditorState();
const canvasAPI = inject('canvasAPI');
const fileInput = ref(null);

const props = defineProps({
  textMap: {
    type: Object,
    default: () => ({}),
  },
});

const handleUpload = () => {
  fileInput.value.click();
};

const onFileSelected = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    if (!canvasAPI) {
      Toast.error('画布尚未初始化');
      return;
    }
    const url = URL.createObjectURL(file);
    canvasAPI.initImage(url);
    // 清空 value，允许重复选择同一张图片
    e.target.value = '';
  }
};

const handleSave = () => {

  if (canvasAPI && canvasAPI.save) {
    canvasAPI.save(); // 调用 EditorLayout 中定义的 handleExport
  } else {
    Toast.error('导出功能未实现');
  }
};


const handleUndo = () => {
  canvasAPI?.undo();
};

const handleRedo = () => {
  canvasAPI?.redo();
};
</script>

<style scoped>
.navbar {
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.logo {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}
</style>