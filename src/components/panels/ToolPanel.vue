<template>
  <div class="tool-panel">
    <component :is="currentModule" />

    <Modal v-model="showPuzzleConfirm" cancel-text="不保存" confirm-text="保存" @confirm="handleConfirmExit(true)"
      @discard="handleConfirmExit(false)" @cancel="handleCancelExit"
      />
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, ref, watch, inject } from 'vue';
import { useEditorState } from '../../composables/useEditorState';
import Modal from '../common/Modal.vue';
import { completeExitPuzzle } from '../modules/puzzle/useCanvasPuzzle';

const { state, setActiveTool, setPuzzleMode } = useEditorState();

// 内部驱动 UI 的工具状态
const localActiveTool = ref(state.activeTool);
const showPuzzleConfirm = ref(false);
let pendingTool = null; // 记录用户点击的目标工具

// 动态映射表保持不变
const modules = {
  adjust: defineAsyncComponent(() => import('../modules/adjust/index.vue')),
  draw: defineAsyncComponent(() => import('../modules/draw/index.vue')),
  text: defineAsyncComponent(() => import('../modules/text/index.vue')),
  border: defineAsyncComponent(() => import('../modules/border/index.vue')),
  material: defineAsyncComponent(() => import('../modules/material/index.vue')),
  watermark: defineAsyncComponent(() => import('../modules/watermark/index.vue')),
  puzzle: defineAsyncComponent(() => import('../modules/puzzle/index.vue')),
  ai: defineAsyncComponent(() => import('../modules/ai/index.vue')),
};

const currentModule = computed(() => {
  return modules[localActiveTool.value] || modules['adjust'];
});

// === 核心逻辑：拦截切换 ===
watch(() => state.activeTool, (newTool, oldTool) => {
  // 如果从拼图模块切往别的模块
  if (oldTool === 'puzzle' && state.isPuzzleMode) {
    pendingTool = newTool; // 记住想去的地方
    showPuzzleConfirm.value = true; // 弹出提示

    setActiveTool('puzzle');
  } else {
    // 普通切换直接同步
    localActiveTool.value = newTool;
  }
});

// 处理弹窗点击
const handleConfirmExit = (isSave) => {
  // 调用 useCanvasPuzzle 提供的最终退出函数
  completeExitPuzzle(isSave ? 'save' : 'discard');

  showPuzzleConfirm.value = false;

  if (pendingTool) {
    // 确认后，执行真正的全局跳转
    setActiveTool(pendingTool);
    localActiveTool.value = pendingTool;
    pendingTool = null;
  }

  setPuzzleMode(false);
};

const handleCancelExit = () => {
  showPuzzleConfirm.value = false;
  pendingTool = null;
};
</script>

<style scoped>
.tool-panel {
  background: #fff;
  border-right: 1px solid #e4e7ed;
  height: 100%;
  overflow-y: auto;
}
</style>