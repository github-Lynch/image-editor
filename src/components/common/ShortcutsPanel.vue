<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="shortcut-overlay" @click="close"></div>
    </Transition>

    <Transition name="slide">
      <div v-if="visible" class="shortcut-drawer">
        <div class="drawer-header">
          <h3>快捷键列表</h3>
          <button class="close-btn" @click="close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div class="drawer-content">
          <div v-for="(group, index) in groups" :key="index" class="group-section">
            <h4 class="group-title">{{ group.title }}</h4>
            <div class="shortcut-list">
              <div v-for="(item, idx) in group.items" :key="idx" class="shortcut-item">
                <span class="label">{{ item.label }}</span>
                <div class="keys">
                  <span v-for="(key, kIdx) in item.keys" :key="kIdx" class="keycap">
                    {{ key }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { SHORTCUT_GROUPS } from '@/config/shortcuts';

defineProps({
  visible: Boolean
});

const emit = defineEmits(['close']);
const groups = SHORTCUT_GROUPS;

const close = () => {
  emit('close');
};
</script>

<style scoped>
/* 遮罩层 */
.shortcut-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 3000;
  backdrop-filter: blur(2px);
}

/* 抽屉面板 */
.shortcut-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100vh;
  background: white;
  z-index: 3001;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

/* 头部 */
.drawer-header {
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.drawer-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #909399;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
  display: flex;
}
.close-btn:hover {
  background: #f5f7fa;
  color: #606266;
}

/* 内容区 */
.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.group-section {
  margin-bottom: 24px;
}

.group-title {
  font-size: 14px;
  color: #909399;
  margin: 0 0 12px 0;
  font-weight: 600;
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

/* ✨ Keycap 风格核心代码 */
.keys {
  display: flex;
  gap: 4px;
}

.keycap {
  display: inline-block;
  padding: 2px 8px;
  font-size: 12px;
  font-family: 'SF Mono', 'Roboto Mono', Monaco, monospace;
  color: #303133;
  background: #fdfdfd; /* 稍微白一点 */
  border: 1px solid #dcdfe6;
  border-bottom-width: 3px; /* 底部加厚模拟立体感 */
  border-radius: 6px;
  min-width: 20px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* 动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

.slide-enter-active, .slide-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
</style>