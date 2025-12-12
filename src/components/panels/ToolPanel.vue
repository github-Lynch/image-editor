<template>
  <div class="tool-panel">
    <PanelAdjust v-if="store.activeTool === 'adjust'" />
    
    <PanelText v-else-if="store.activeTool === 'text'" />
    
    <div v-else class="empty-panel">
      <div class="empty-icon">
        <el-icon :size="40"><WarnTriangleFilled /></el-icon>
      </div>
      <p class="empty-text">“{{ currentToolName }}”功能正在开发中</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import { WarnTriangleFilled } from '@element-plus/icons-vue';
import PanelAdjust from './PanelAdjust.vue';
import PanelText from './PanelText.vue';

const store = useEditorStore();

const toolNames = {
  draw: '绘制',
  border: '边框',
  material: '素材',
  watermark: '水印',
  puzzle: '拼图',
  ai: 'AI工具'
};

const currentToolName = computed(() => toolNames[store.activeTool] || '未知');
</script>

<style scoped>
.tool-panel {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  height: 100%;
  overflow-y: auto;
}

.empty-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
}
.empty-icon {
  margin-bottom: 10px;
  color: #e4e7ed;
}
.empty-text {
  font-size: 14px;
}
</style>