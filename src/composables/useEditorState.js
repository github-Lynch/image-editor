import { reactive, readonly,watch } from 'vue';

/**
 * ✨ 配置驱动：定义与全局拖拽模式冲突的二级 Tab 黑名单
 */
const DRAG_INCOMPATIBLE_TABS = ['crop', 'resize', 'ruler'];

/**
 * ✨ 全局路由配置表 (Single Source of Truth)
 * 定义 Fabric 对象类型 -> 工具面板(Tool) + 子选项卡(Tab) 的映射关系
 */
export const OBJECT_TO_TOOL_MAP = {
    // === 基础形状 ===
    'i-text': { tool: 'text', tab: 'style' },    // 文本 -> 文本面板-样式Tab
    'textbox': { tool: 'text', tab: 'style' },
    'image': { tool: 'adjust', tab: 'filter' }, // 图片 -> 调整面板-滤镜Tab
    'group': { tool: 'adjust', tab: '' },       // 组 -> 调整面板 (根据业务需求)

    // === 绘制/矢量 ===
    'path': { tool: 'draw', tab: '' },         // 路径 -> 绘制面板

    // === 几何图形 (通常归类为素材或边框，根据你的业务定) ===
    'rect': { tool: 'border', tab: 'style' },
    'circle': { tool: 'material', tab: 'basic' },
    'triangle': { tool: 'material', tab: 'basic' },

    // === 自定义业务类型 ===
    'puzzle': { tool: 'puzzle', tab: 'template' }
};

// 单例状态
const state = reactive({
    activeTool: 'adjust', // 一级菜单 ID
    activeTab: '',        // ✨ 新增: 二级菜单 ID (例如 'style', 'color', 'filter')

    isDrawing: false,     // 是否处于自由绘制模式

    canUndo: false,       // 历史记录状态
    canRedo: false,

    isLoading: false,
    loadingText: '处理中...',

    isSidebarDisabled: false, // 侧边栏残影模式
    isGlobalDragMode: false,  // 全局拖动模式

    /**
     * ✨ 导航来源标记
     * 'system': 初始化或系统重置
     * 'manual': 用户手动点击侧边栏 (优先级最高，应有点击反馈)
     * 'canvas': 画布对象选中触发自动跳转 (应平滑过渡，无干扰)
     */
    navigationSource: 'system'
});

// ✨✨✨ 核心互斥逻辑：方式 2 (监听器模式) ✨✨✨
watch(() => state.isGlobalDragMode, (isDragging) => {
    if (isDragging) {
        // 如果开启了拖拽模式，检查当前 Tab 是否在黑名单中
        if (DRAG_INCOMPATIBLE_TABS.includes(state.activeTab)) {
            console.log(`[Interaction] Drag Mode ON: Auto-closing incompatible tab: ${state.activeTab}`);
            state.activeTab = ''; // 清空 Tab，触发 UI 收起与模块清理
        }
    }
});

export function useEditorState() {

    /**
     * 切换当前激活的工具和选项卡
     * @param {string} tool - 一级工具 ID
     * @param {string} tab - (可选) 二级选项卡 ID
     * @param {string} source - 触发来源 ('manual' | 'canvas' | 'system')
     */
    const setActiveTool = (tool, tab = '', source = 'manual') => {
        // 状态防抖：如果 Tool 和 Tab 都没变，且侧边栏也是激活状态，则不执行
        if (state.activeTool === tool && state.activeTab === tab && !state.isSidebarDisabled) {
            return;
        }

        state.activeTool = tool;
        state.activeTab = tab; // 更新二级路由
        state.navigationSource = source;

        // 副作用处理
        state.isDrawing = false; // 切换工具默认退出绘制模式
        state.isSidebarDisabled = false; // 只要切换工具，必定激活面板
    };

    /**
     * ✨ 动作驱动：设置拖拽模式
     * 在此处执行同步互斥，确保 UI 立即响应
     */
    const setGlobalDragMode = (val) => {
        state.isGlobalDragMode = val;
        console.log(`[Interaction] Global Drag Mode: ${val ? 'ON' : 'OFF'}`);
        
        if (val) {
            if (DRAG_INCOMPATIBLE_TABS.includes(state.activeTab)) {
                console.log(`[Interaction] Auto-closing incompatible tab: ${state.activeTab}`);
                state.activeTab = ''; // 立即清空，触发侧边栏收起
            }
        }
    };


    // ✨ [核心补全] 切换二级 Tab (专门给 UI 组件用来清理状态)
    const setActiveTab = (tab) => {
        state.activeTab = tab;
    };

    const toggleDrawing = (status) => {
        state.isDrawing = status;
    };

    const setHistoryState = (canUndo, canRedo) => {
        state.canUndo = canUndo;
        state.canRedo = canRedo;
    };

    const setLoading = (status, text = '处理中...') => {
        state.isLoading = status;
        state.loadingText = text;
    };

    const setSidebarDisabled = (status) => {
        state.isSidebarDisabled = status;
    };

    // === ✨ 核心：智能路由系统 ===

    /**
     * 根据 Canvas 选中的对象，自动路由到对应的工具面板
     * @param {Object} target - Fabric 对象实例
     * @returns {boolean} - 是否成功匹配并跳转
     */
    const routeToObject = (target) => {
      if (!target || state.isGlobalDragMode) return false; // ✨ 开启拖拽时，禁止自动跳转

        if (target.customTab) {
            setActiveTool(target.customTool || 'adjust');
            if (state.activeTab === target.customTab) {
                state.activeTab = '';
                setTimeout(() => { state.activeTab = target.customTab; }, 0);
            } else {
                state.activeTab = target.customTab;
            }
            return true;
        }

        // 2. 默认路由规则
        if (target.type === "i-text") {
            setActiveTool("text");
            return true;
        }

        // ... 其他默认规则可在此补充 ...

        return false;
    };

    return {
        state: readonly(state), // 导出只读状态
        setActiveTool,
        setActiveTab,       // ✨ 确保导出此函数
        toggleDrawing,
        setHistoryState,
        setLoading,
        setSidebarDisabled,
        routeToObject, // 导出路由动作供 useCanvas 使用
        setGlobalDragMode // 导出全局拖动模式设置
    };
}

// 全局聚焦系数 (保留)
export const ZOOM_PADDING = 0.921;