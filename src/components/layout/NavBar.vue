<template>
  <div class="navbar">
    <div class="logo">
      <slot name="logo">{{ textMap.title }}</slot>
    </div>
    <div class="ie-actions">
      <input type="file" ref="fileInput" @change="onFileSelected" style="display:none" accept="image/*" />

      <button class="ie-btn" @click="handleUpload">
        <svg width="14" height="14" viewBox="0 0 1024 1024" style="margin-right:4px;fill:currentColor">
          <path
            d="M544 253.696V704h-64V247.296L237.248 490.048 192 444.8 512 128l320 316.8-45.248 45.248L544 253.696zM160 832h704a32 32 0 1 1 0 64H160a32 32 0 1 1 0-64z" />
        </svg>
        {{ textMap.upload }}
      </button>

      <span class="ie-divider"></span>

      <button 
        class="ie-btn ie-btn-icon" 
        style="margin-right:8px; padding: 0 8px;" 
        title="撤销" 
        @click="handleUndo" 
        :disabled="!state.canUndo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 14 4 9l5-5"/>
          <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>
        </svg>
      </button>
      
      <button 
        class="ie-btn ie-btn-icon" 
        style="margin-right:8px; padding: 0 8px;" 
        title="重做" 
        @click="handleRedo" 
        :disabled="!state.canRedo"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 14l5-5-5-5"/>
          <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5v0A5.5 5.5 0 0 0 9.5 20H13"/>
        </svg>
      </button>
      <button class="ie-btn" style="margin-right:8px;" @click="handleReset" :disabled="!state.canUndo">还原</button>
      <button class="ie-btn ie-primary" @click="handleSave">{{ textMap.save }}</button>
    </div>
  </div>
</template>

<script setup>
import { inject, ref } from 'vue';
import { useEditorState } from '@/composables/useEditorState'; 
import { Toast } from '@/utils/toast'; 
 

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
    // 检查 inject 的 API 是否存在
    if (!canvasAPI || !canvasAPI.initImage) { 
      Toast.error('画布尚未初始化');
      return;
    }
    const url = URL.createObjectURL(file);
    
    // 调用 canvasAPI 中的方法
    canvasAPI.initImage(url); 
    
    e.target.value = '';
  }
};

const handleSave = () => {
  if (canvasAPI && canvasAPI.save) {
    canvasAPI.save(); 
  } else {
    Toast.error('导出功能未实现');
  }
};

const handleUndo = () => {
  // 调用 canvasAPI 中的方法
  if (canvasAPI && canvasAPI.undo) {
    canvasAPI.undo();
  }
};

const handleRedo = () => {
  // 调用 canvasAPI 中的方法
  if (canvasAPI && canvasAPI.redo) {
    canvasAPI.redo();
  }
};

const handleReset = () => {
  // 调用 canvasAPI 中的方法
  if (canvasAPI && canvasAPI.reset) {
    canvasAPI.reset();
  }
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