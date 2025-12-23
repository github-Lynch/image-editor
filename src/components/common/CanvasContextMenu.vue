<template>
  <div 
    v-show="visible" 
    class="context-menu"
    :style="{ left: position.x + 'px', top: position.y + 'px' }"
    @contextmenu.prevent 
  >
    <div 
      class="menu-item" 
      :class="{ disabled: !clipboardState.hasContent }"
      @click="handlePaste"
    >
      <span class="icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
      </span>
      <span>粘贴</span>
      <span class="shortcut">Ctrl+V</span>
    </div>

    </div>
</template>

<script setup>
import { inject } from 'vue';
import { useObjectActions } from '@/composables/useObjectActions';

// 接收 Props 控制显示
const props = defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

const emit = defineEmits(['close', 'paste']);

const actions = useObjectActions();
const clipboardState = actions.clipboardState;

const handlePaste = () => {
  if (!clipboardState.hasContent) return;
  emit('paste'); // 通知父组件进行粘贴
  emit('close'); // 关闭菜单
};
</script>

<style scoped>
.context-menu {
  position: fixed; /* 使用 fixed 避免受父容器 overflow 影响 */
  z-index: 3000;
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  padding: 4px 0;
  width: 140px;
  min-width: 120px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
  color: #606266;
  cursor: pointer;
  transition: background 0.1s;
}

.menu-item:hover {
  background: #f5f7fa;
  color: var(--ie-primary-color);
}

.menu-item.disabled {
  color: #c0c4cc;
  cursor: not-allowed;
  background: transparent !important;
}

.icon {
  display: flex;
  align-items: center;
  margin-right: 8px;
  width: 16px;
}

.shortcut {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}
</style>