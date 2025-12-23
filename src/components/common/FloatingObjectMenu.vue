<template>
  <div 
    v-show="isVisible" 
    class="floating-wrapper"
    :style="{ left: position.left + 'px', top: position.top + 'px' }"
  >
    <button 
      class="trigger-btn" 
      @click.stop="toggleMenu" 
      :class="{ active: isMenuOpen }"
      title="更多操作"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="19" cy="12" r="1"></circle>
        <circle cx="5" cy="12" r="1"></circle>
      </svg>
    </button>

    <div v-if="isMenuOpen" class="main-menu">
      
      <div class="menu-item" @click="handleAction(actions.copyActive)">
        <span class="icon">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </span>
        <span class="label">复制</span>
        <span class="shortcut">Ctrl+C</span>
      </div>

      <div class="menu-item" @click="handleAction(actions.cutActive)">
        <span class="icon">
           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
        </span>
        <span class="label">剪切</span>
        <span class="shortcut">Ctrl+X</span>
      </div>

      <div class="menu-item" @click="handleLock">
        <span class="icon">
          <svg v-if="isLocked" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
        </span>
        <span class="label">{{ isLocked ? '解锁' : '锁定' }}</span>
        <span class="shortcut">Shift+Ctrl+L</span>
      </div>

      <div class="menu-item has-submenu">
        <span class="icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 7 12 12 22 7"></polyline></svg>
        </span>
        <span class="label">图层顺序</span>
        <span class="arrow-right">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>

        <div class="submenu">
           <div class="menu-item" @click="handleAction(() => actions.moveLayer('forward'))">
             <span class="label">上一层</span>
             <span class="shortcut">]</span>
           </div>
           <div class="menu-item" @click="handleAction(() => actions.moveLayer('backward'))">
             <span class="label">下一层</span>
             <span class="shortcut">[</span>
           </div>
           <div class="divider"></div>
           <div class="menu-item" @click="handleAction(() => actions.moveLayer('front'))">
             <span class="label">置顶</span>
             <span class="shortcut">Shift+]</span>
           </div>
           <div class="menu-item" @click="handleAction(() => actions.moveLayer('back'))">
             <span class="label">置底</span>
             <span class="shortcut">Shift+[</span>
           </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="menu-item delete" @click="handleAction(actions.deleteActive)">
        <span class="icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </span>
        <span class="label">删除</span>
        <span class="shortcut">Del</span>
      </div>

      <div v-if="$slots.extra">
          <div class="divider"></div>
          <slot name="extra"></slot>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, inject, onMounted, onUnmounted, unref } from 'vue';
import { useObjectActions } from '@/composables/useObjectActions';

const canvasAPI = inject('canvasAPI');
const actions = useObjectActions();

const isVisible = ref(false);
const isMenuOpen = ref(false); 
const isLocked = ref(false);
const position = ref({ left: 0, top: 0 });

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const handleAction = (actionFn) => {
  actionFn();
  isMenuOpen.value = false; 
};

const handleLock = () => {
  const locked = actions.toggleLock();
  isLocked.value = locked;
};

// 更新菜单位置
const updatePosition = () => {
  const canvas = unref(canvasAPI.canvas);
  const activeObj = canvas?.getActiveObject();

  if (!activeObj || activeObj.isMainImage) {
    isVisible.value = false;
    isMenuOpen.value = false;
    return;
  }

  const coords = activeObj.getBoundingRect(true, true);
  const containerWidth = canvas.getElement().parentElement.offsetWidth;
  const menuWidth = 40; 
  
  let newLeft = coords.left + coords.width + 40; 

  if (newLeft + menuWidth > containerWidth) {
      newLeft = coords.left - menuWidth + 76;
  }

  position.value = {
    left: newLeft,
    top: coords.top + 5
  };

  isVisible.value = true;
  isLocked.value = !!activeObj.lockMovementX;
};

const bindEvents = () => {
  const canvas = unref(canvasAPI.canvas);
  if (!canvas) return;

  const events = [
    'selection:created', 'selection:updated', 'object:moving', 
    'object:scaling', 'object:rotating', 'object:modified'
  ];
  events.forEach(evt => canvas.on(evt, updatePosition));
  
  canvas.on('selection:cleared', () => { 
    isVisible.value = false; 
    isMenuOpen.value = false;
  });
};

const unbindEvents = () => {
  const canvas = unref(canvasAPI.canvas);
  if (!canvas) return;
  canvas.off('selection:cleared');
  const events = [
    'selection:created', 'selection:updated', 'object:moving', 
    'object:scaling', 'object:rotating', 'object:modified'
  ];
  events.forEach(evt => canvas.off(evt));
};

onMounted(() => setTimeout(bindEvents, 200));
onUnmounted(unbindEvents);
</script>

<style scoped>
/* 悬浮容器 */
.floating-wrapper {
  position: absolute;
  z-index: 2000;
  pointer-events: auto;
}

/* 1. 触发按钮 */
.trigger-btn {
  width: 24px;
  height: 24px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
  padding: 0 !important;
}

.trigger-btn:hover, .trigger-btn.active {
  background: #ecf5ff;
  color: var(--ie-primary-color);
  border-color: var(--ie-primary-color);
}

/* 2. 主菜单 */
.main-menu {
  position: absolute;
  top: 15px;
  left: 22px;
  width: 180px; /* 加宽一点以容纳快捷键 */
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  padding: 4px 0;
  display: flex;
  flex-direction: column;
}

/* 菜单项布局优化 */
.menu-item {
  position: relative;
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

.menu-item.delete:hover {
  background: #fef0f0;
  color: #f56c6c;
}

.icon {
  display: flex;
  align-items: center;
  margin-right: 8px;
  width: 16px;
  opacity: 0.8;
}

.label {
  flex: 1; /* 撑开中间，把快捷键挤到右边 */
}

/* ✨ 快捷键样式 */
.shortcut {
  font-size: 11px;
  color: #bfa; /* 这个绿色是示例，实际建议用浅灰色 */
  color: #909399; /* 修正为浅灰色，更专业 */
  margin-left: 8px;
  font-family: monospace; /* 等宽字体更好看 */
  opacity: 0.8;
}

.arrow-right {
  margin-left: auto;
  opacity: 0.5;
  display: flex;
  align-items: center;
}

.divider {
  height: 1px;
  background: #ebeef5;
  margin: 4px 0;
}

/* 3. 二级菜单 */
.submenu {
  display: none;
  position: absolute;
  left: 100%;
  top: -4px;
  width: 140px; /* 也稍微加宽 */
  background: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  padding: 4px 0;
  margin-left: 4px;
}

.menu-item.has-submenu:hover .submenu {
  display: block;
}

.menu-item.has-submenu::after {
  content: '';
  position: absolute;
  top: 0;
  right: -10px;
  width: 10px;
  height: 100%;
}
</style>