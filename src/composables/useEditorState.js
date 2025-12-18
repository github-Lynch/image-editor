import { reactive, readonly } from 'vue';

// 单例状态 (替代 State)
const state = reactive({
    activeTool: 'adjust', // 当前激活的工具模块
    isDrawing: false,     // 是否处于绘制模式
    canUndo: false,       // 是否可撤销
    canRedo: false        // 是否可重做
});

export function useEditorState() {
    // 替代 Actions
    const setActiveTool = (tool) => {
        state.activeTool = tool;
        state.isDrawing = false; // 切换工具时退出绘制模式
    };

    const toggleDrawing = (status) => {
        state.isDrawing = status;
    };

    const setHistoryState = (canUndo, canRedo) => {
        state.canUndo = canUndo;
        state.canRedo = canRedo;
    };

    return {
        state: readonly(state), // 只读状态导出，防止直接修改
        setActiveTool,
        toggleDrawing,
        setHistoryState
    };
}

// 全局聚焦系数
export const ZOOM_PADDING = 0.921;