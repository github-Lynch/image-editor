<template>
  <div class="left-sidebar">
    <div v-for="item in menuItems" :key="item.id" class="menu-item" :class="{
      active: state.activeTool === item.id,
      'auto-activated': state.activeTool === item.id && state.navigationSource === 'canvas'
    }" @click="handleToolClick(item.id)">
      <svg class="menu-icon" viewBox="0 0 1024 1024" width="20" height="20">
        <path :d="item.iconPath" fill="currentColor" />
      </svg>
      <span class="label">{{ item.label }}</span>
    </div>
  </div>
</template>

<script setup>
import { useEditorState } from '../../composables/useEditorState';

// 1. 替代 Pinia
const { state, setActiveTool } = useEditorState();

// 2. 点击处理：手动点击时，强制解除 Disabled 状态
// 点击处理：标记来源为 'manual'
const handleToolClick = (id) => {
  // setActiveTool(tool, tab = '', source = 'manual')
  // 这里必须把 'manual' 作为第三参 source，避免误写入 activeTab 导致面板瞬间收起
  setActiveTool(id, '', 'manual');
};

// 3. 定义菜单配置 (保持原样)
const menuItems = [
  {
    id: 'adjust',
    label: '调整',
    iconPath: 'M192 128v768h128V672h192v224h128V672h192V544H512V128H192zm128 128h192v160H320V256z'
  },
  {
    id: 'draw',
    label: '绘制',
    iconPath: 'M853.504 192.064l-235.008 235.008-60.352-60.352 235.008-235.008a64 64 0 0 1 90.496 0l-30.144 30.144 30.144 30.208z m-467.2 491.52l60.352-60.352L249.408 425.984l-60.352 60.352 197.248 197.248zM189.056 365.632l60.352-60.352 384.896 384.896-60.352 60.352L189.056 365.632zM128 896a64 64 0 0 1-64-64c0-68.992 48.128-196.608 107.52-256l192 192C304.128 827.392 192 896 128 896z'
  },
  {
    id: 'text',
    label: '文本',
    iconPath: 'M832 64H192a64 64 0 0 0-64 64v768a64 64 0 0 0 64 64h640a64 64 0 0 0 64-64V128a64 64 0 0 0-64-64zM256 256h512v64H256v-64zm512 448H256v-64h512v64zm0-192H256v-64h512v64z'
  },
  {
    id: 'border',
    label: '边框',
    iconPath: 'M160 160v192h-64V96h256v64H160z m0 704h192v64H96V672h64v192z m704-192v192H672v64h256V672h-64z m0-288V160H672V96h256v288h-64z'
  },
  {
    id: 'material',
    label: '素材',
    iconPath: 'M448 128H128v320h320V128zm-64 256H192V192h192v192z m448-256H576v320h256V128zm-64 256H640V192h192v192z M448 576H128v320h320V576zm-64 256H192V640h192v192z m448-256H576v320h256V576zm-64 256H640V640h192v192z'
  },
  {
    id: 'watermark',
    label: '水印',
    iconPath: 'M832 320H608V128h-64a96 96 0 0 0-96-96h-64a96 96 0 0 0-96 96h-64v192H192a64 64 0 0 0-64 64v512h768V384a64 64 0 0 0-64-64z m-320-96h64v96h-64v-96z m0-128h64a32 32 0 0 1 32 32v32h-128V128a32 32 0 0 1 32-32zM256 704a64 64 0 1 1 0-128 64 64 0 0 1 0 128zm256 128a64 64 0 1 1 0-128 64 64 0 0 1 0 128zm256-128a64 64 0 1 1 0-128 64 64 0 0 1 0 128z'
  },
  {
    id: 'puzzle',
    label: '拼图',
    iconPath: 'M704 576a128 128 0 0 1-128 128h-64v256h-64V704h-64a128 128 0 1 1 0-256h64V192h64v256h64a128 128 0 0 1 128 128z m-256-64h64V256h-64v256zM320 576a64 64 0 1 0 64-64h-64v64zm384 0a64 64 0 1 0-64-64h64v64z'
  },
  {
    id: 'ai',
    label: 'AI',
    iconPath: 'M832 192H192v640h640V192z m64-64v768H128V128h768z M320 320h128v128H320V320z m0 256h128v128H320V576z m256-256h128v128H576V320z m0 256h128v128H576V576z'
  },
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
  overflow-y: auto;
  transition: opacity 0.3s ease;
}


.left-sidebar::-webkit-scrollbar {
  display: none;
}

.menu-item {
  height: 68px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #606266;
  gap: 6px;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0 8px; /* Add some padding */
}

.menu-item .left {
  display: flex;
  align-items: center;
}

.menu-item .left .menu-icon {
  width: 24px; /* Fixed width for icon container */
  text-align: center; /* Center icon inside container */
  margin-right: 8px; /* Space between icon and text */
}

.menu-item:hover {
  color: var(--ie-primary-color);
  background-color: #f5f7fa;
}

.menu-item.active {
  color: var(--ie-primary-color);
  font-weight: 500;
  background-color: #ecf5ff;
  position: relative;
}

.menu-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 24px;
  background-color: var(--ie-primary-color);
  border-radius: 0 2px 2px 0;
}

.label {

  line-height: 1;
}

.menu-icon {
  fill: currentColor;
  display: block;
}

/* 这是一个可选的增强： */
/* 如果是自动跳转的，我们可以让高亮条有个淡入效果，而不是瞬间切换 */
.menu-item.active.auto-activated::before {
  transition: all 0.3s ease;
}

.left-sidebar.is-disabled {
  /* 你的残影样式 */
  opacity: 0.5;
  filter: grayscale(0.8);
  pointer-events: auto;
  /* 关键：允许点击以重新激活 */
}
</style>