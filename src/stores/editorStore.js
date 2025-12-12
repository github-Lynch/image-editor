import { defineStore } from 'pinia';

export const useEditorStore = defineStore('editor', {
  state: () => ({
    activeTool: 'adjust',
    isDrawing: false,
    canvasInitialized: false,
    // === 新增：撤销重做状态 ===
    canUndo: false,
    canRedo: false,
  }),
  actions: {
    setActiveTool(tool) {
      this.activeTool = tool;
      this.isDrawing = false; 
    },
    toggleDrawing(status) {
      this.isDrawing = status;
    },
    // === 新增：更新历史记录状态 ===
    setHistoryState(canUndo, canRedo) {
      this.canUndo = canUndo;
      this.canRedo = canRedo;
    }
  }
});