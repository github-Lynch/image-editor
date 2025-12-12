<template>
  <div class="navbar">
    <div class="logo">大秘美图</div>
    <div class="actions">
      <el-button 
        size="small" 
        @click="handleUndo" 
        :disabled="!store.canUndo"
      >
        撤销
      </el-button>
      
      <el-button 
        size="small" 
        @click="handleRedo" 
        :disabled="!store.canRedo"
      >
        重做
      </el-button>
      
      <el-button type="primary" size="small" @click="handleSave">保存 / 导出</el-button>
    </div>
  </div>
</template>

<script setup>
import { inject } from 'vue';
import { saveAs } from 'file-saver';
import { useEditorStore } from '../../stores/editorStore';
import { ElMessage } from 'element-plus';

const store = useEditorStore();
const canvasAPI = inject('canvasAPI');

const handleSave = () => {
  if (!canvasAPI) return;
  
  // 1. 取消选中状态，防止把选中框（蓝色边框）也截进去
  canvasAPI.canvas.value?.discardActiveObject();
  canvasAPI.canvas.value?.renderAll();

  // 2. 导出图片 (如果不希望有背景色，可以用 { format: 'png', multiplier: 2 } 来提高分辨率)
  const dataURL = canvasAPI.exportImg();
  
  if (dataURL) {
    // 3. 触发下载
    saveAs(dataURL, `edited-image-${Date.now()}.png`);
    ElMessage.success('图片导出成功');
  } else {
    ElMessage.warning('画布为空');
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
.logo { font-weight: bold; font-size: 16px; color: #333; }
</style>