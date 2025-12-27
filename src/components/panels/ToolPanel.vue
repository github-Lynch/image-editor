<template>
  <div class="tool-panel">
    <component :is="currentModule" />

    <Modal
      v-model="showPuzzleConfirm"
      cancel-text="不保存"
      confirm-text="保存"
      @confirm="handleConfirmExit(true)"
      @discard="handleConfirmExit(false)"
      @cancel="handleCancelExit"
    />

    <Modal
      v-model="showWatermarkConfirm"
      title="保存?"
      content="检测到未保存的水印，是否保存当前效果？"
      cancel-text="不保存"
      confirm-text="保存"
      @confirm="handleWatermarkExit(true)"
      @discard="handleWatermarkExit(false)"
      @cancel="showWatermarkConfirm = false"
    />
  </div>
</template>

<script setup>
  import { computed, defineAsyncComponent, ref, watch, inject } from 'vue';
  import { useEditorState } from '../../composables/useEditorState';
  import Modal from '../common/Modal.vue';
  import { completeExitPuzzle } from '../modules/puzzle/useCanvasPuzzle';
  // ✨ 引入水印逻辑
  import { wmState, saveWatermark, clearWatermarks } from '../modules/watermark/useCanvasWatermark';

  const { state, setActiveTool, setPuzzleMode } = useEditorState();

  const localActiveTool = ref(state.activeTool);
  const showPuzzleConfirm = ref(false);
  // ✨ 新增：水印弹窗控制
  const showWatermarkConfirm = ref(false);

  let pendingTool = null;

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
    // 1. 拼图拦截
    if (oldTool === 'puzzle' && state.isPuzzleMode) {
      pendingTool = newTool;
      showPuzzleConfirm.value = true;
      setActiveTool('puzzle'); // 阻断切换
    }
    // ✨ 2. 水印拦截 (当从水印切走 且 画布上有水印时)
    else if (oldTool === 'watermark' && wmState.hasWatermark) {
      pendingTool = newTool;
      showWatermarkConfirm.value = true;
      setActiveTool('watermark'); // 阻断切换
    }
    else {
      // 正常切换
      localActiveTool.value = newTool;
    }
  });

  // --- 拼图处理 ---
  const handleConfirmExit = (isSave) => {
    completeExitPuzzle(isSave ? 'save' : 'discard');
    showPuzzleConfirm.value = false;
    if (pendingTool) {
      setActiveTool(pendingTool);
      localActiveTool.value = pendingTool;
      pendingTool = null;
    }
    setPuzzleMode(false);
  };

  // --- ✨ 水印处理 ---
  const handleWatermarkExit = async (isSave) => {
    if (isSave) {
      // 保存：执行合并算法
      await saveWatermark();
    } else {
      // 不保存：清空水印对象
      clearWatermarks();
    }

    showWatermarkConfirm.value = false;

    // 执行原本的跳转
    if (pendingTool) {
      setActiveTool(pendingTool);
      localActiveTool.value = pendingTool;
      pendingTool = null;
    }
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