<template>
  <div class="left-sidebar">
    <div 
      v-for="item in menuItems" 
      :key="item.id"
      class="menu-item"
      :class="{ active: store.activeTool === item.id }"
      @click="store.setActiveTool(item.id)"
    >
      <el-icon :size="20"><component :is="item.icon" /></el-icon>
      <span class="label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { markRaw } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import { 
  Operation,      // 调整
  Brush,          // 绘制
  Document,       // 文本
  FullScreen,     // 边框
  Grid,           // 素材
  Stamp,          // 水印
  Connection,     // 拼图
  Cpu             // AI
} from '@element-plus/icons-vue';

const store = useEditorStore();

const menuItems = [
  { id: 'adjust', label: '调整', icon: markRaw(Operation) },
  { id: 'draw', label: '绘制', icon: markRaw(Brush) },
  { id: 'text', label: '文本', icon: markRaw(Document) },
  { id: 'border', label: '边框', icon: markRaw(FullScreen) },
  { id: 'material', label: '素材', icon: markRaw(Grid) },
  { id: 'watermark', label: '水印', icon: markRaw(Stamp) },
  { id: 'puzzle', label: '拼图', icon: markRaw(Connection) },
  { id: 'ai', label: 'AI', icon: markRaw(Cpu) },
];
</script>

<style scoped>
.left-sidebar {
  width: 72px;
  background-color: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  padding-top: 12px;
  overflow-y: auto; /* 防止高度不够时无法滚动 */
}

/* 隐藏滚动条 */
.left-sidebar::-webkit-scrollbar { display: none; }

.menu-item {
  height: 68px; /* 稍微调低一点高度以容纳更多图标 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #606266;
  gap: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.menu-item:hover {
  color: #409eff;
  background-color: #f5f7fa;
}

.menu-item.active {
  color: #409eff;
  font-weight: 500;
  background-color: #ecf5ff;
  position: relative;
}

/* 选中时的左侧蓝条 */
.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background-color: #409eff;
  border-radius: 0 2px 2px 0;
}

.label {
  font-size: 12px;
  line-height: 1;
}
</style>