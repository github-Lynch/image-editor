import { ref, unref } from 'vue';
import { fabric } from 'fabric';
import { useEditorState } from '@/composables/useEditorState';

// === 模块级单例状态 ===
let canvasRef = null;
let saveHistoryFn = null;
const { state } = useEditorState();

export const DASH_OPTIONS = [
    { label: '实线', value: [], icon: 'solid' },
    { label: '长虚线', value: [15, 15], icon: 'long-dash' },
    { label: '短虚线', value: [5, 5], icon: 'short-dash' },
    { label: '疏点线', value: [0, 8], strokeLineCap: 'round' },
    { label: '密点线', value: [0, 4], strokeLineCap: 'round' },
    { label: '点划线', value: [15, 5, 0, 5], strokeLineCap: 'round' }
];

export const CAP_STYLES = [
    { id: 'line', label: '短线' },
    { id: 'arrow', label: '外向箭头' },
    { id: 'arrow_in', label: '内向箭头' },
    { id: 'dot', label: '圆点' },
    { id: 'none', label: '无' }
];

// ✨ 配置驱动：单位换算系数 (1单位 = 多少英寸) [宪法 0.7]
const TO_INCH_FACTORS = {
    'px': 1 / 96,
    'cm': 1 / 2.54,
    'mm': 1 / 25.4,
    'm': 39.37,
    'inch': 1,
    'ft': 12
};

const isDrawing = ref(false);
const rulerConfig = ref({
    value: 20,
    unit: 'cm',
    color: '#ffffff',
    opacity: 100,
    fontSize: 24,
    textColor: '#ffffff',
    fontFamily: 'Arial', // ✨ 默认本地字体
    isManualText: false, // ✨ 新增：是否开启手动模式
    customText: '',      // ✨ 新增：手动输入的文本内容
    strokeWidth: 1,
    capStyle: 'line',
    dashArray: [],
    strokeLineCap: 'butt',
    showSecondaryUnit: false, // ✨ 新增：是否显示次要单位 (inch)
});

// ✨ 辅助函数：合成标尺显示文本 (增加 cfg 参数以保证 SSOT)
const getRulerDisplayText = (cfg) => {
    if (cfg.isManualText) return cfg.customText;

    const primaryText = `${cfg.value}${cfg.unit}`;
    
    // 逻辑：如果开启双单位且主单位不是英寸，执行转换 [宪法 0.0]
    if (cfg.showSecondaryUnit && cfg.unit !== 'inch') {
        const factor = TO_INCH_FACTORS[cfg.unit] || 1;
        const inchVal = (cfg.value * factor).toFixed(2);
        return `${primaryText} / ${inchVal}inch`;
    }
    
    return primaryText;
};

// ✨ 新增：常用系统字体列表供侧边栏使用
export const SYSTEM_FONTS = [
    { label: 'Arial', value: 'Arial' },
    { label: '微软雅黑', value: 'Microsoft YaHei' },
    { label: '宋体', value: 'SimSun' },
    { label: '黑体', value: 'SimHei' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Courier New', value: 'Courier New' }
];

export const registerRulerModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;

    const c = unref(canvas);
    if (c) {
        // 先清理旧事件，避免重复绑定
        c.off('selection:created', onSelectionChanged);
        c.off('selection:updated', onSelectionChanged);
        c.off('object:scaling', onRulerScaling);
        c.off('object:modified', onRulerModified);

        // 重新绑定
        c.on('selection:created', onSelectionChanged);
        c.on('selection:updated', onSelectionChanged);
        c.on('object:scaling', onRulerScaling);
        c.on('object:modified', onRulerModified);
    }
};

// --- 新增：标尺防变形修复 ---
/**
 * 阶段一：实时防变形 (拖动时)
 * 原理：应用一个反向的 scaleX 给内部的 text 对象，抵消 Group 拉伸带来的变形
 */
const onRulerScaling = (e) => {
    const group = e.target;
    if (!group || !group.isRuler) return;

    const textObj = group.getObjects()[3];
    if (textObj && group.scaleX) {
        textObj.set('scaleX', 1 / group.scaleX);
    }
};

/**
 * 阶段二：固化变换 (松手后)
 * 原理：调用 recreate 函数，用一个无缩放的新对象替换被拉伸的旧对象
 */
const onRulerModified = (e) => {
    const group = e.target;
    if (!group || !group.isRuler) return;

    // 使用现有函数重建标尺，将变换“烘焙”进去，并将 scaleX 恢复为 1
    recreateActiveRuler(group);
};

const createCap = (type, color, strokeWidth) => {
    const size = 10 + strokeWidth;
    if (type === 'arrow' || type === 'arrow_in') {
        return new fabric.Triangle({
            width: size, height: size, fill: color,
            originX: 'center', originY: 'center', selectable: false
        });
    } else if (type === 'dot') {
        return new fabric.Circle({
            radius: strokeWidth * 1.5, fill: color,
            originX: 'center', originY: 'center', selectable: false
        });
    } else if (type === 'line') {
        return new fabric.Line([0, -size, 0, size], {
            stroke: color, strokeWidth: strokeWidth,
            originX: 'center', originY: 'center', selectable: false
        });
    } else {
        return new fabric.Rect({ width: 0, height: 0, visible: false });
    }
};

/**
 * 最终修复版 createRulerObject
 * 修复：标尺生成后位置偏移问题
 * 原理：基于 Group 内部几何分布，逆向计算并补偿 Line 相对于 Group 中心的偏移量
 */
// --- 全量替换 createRulerObject ---
const createRulerObject = (start, end) => {
    const canvas = unref(canvasRef);
    const cfg = rulerConfig.value;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const halfLen = length / 2;

    const line = new fabric.Line([-halfLen, 0, halfLen, 0], {
        stroke: cfg.color, strokeWidth: cfg.strokeWidth,
        strokeDashArray: cfg.dashArray, strokeLineCap: cfg.strokeLineCap || 'butt',
        originX: 'center', originY: 'center'
    });

    const startCap = createCap(cfg.capStyle, cfg.color, cfg.strokeWidth);
    const endCap = createCap(cfg.capStyle, cfg.color, cfg.strokeWidth);
    startCap.set({ left: -halfLen, top: 0 });
    endCap.set({ left: halfLen, top: 0 });
    
    const updateCapRotation = (cap, isStart) => {
        if (cfg.capStyle.includes('arrow')) {
            let rot = 90;
            if (cfg.capStyle === 'arrow') rot = isStart ? -90 : 90;
            else rot = isStart ? 90 : -90;
            cap.set({ angle: rot });
        } else { cap.set({ angle: 0 }); }
    };
    updateCapRotation(startCap, true);
    updateCapRotation(endCap, false);

    // ✨ 修复点：调用统一的文字合成逻辑 [宪法 0.0]
    const displayText = getRulerDisplayText(cfg);

    const textObj = new fabric.Text(displayText, {
        fontSize: cfg.fontSize, fill: cfg.textColor, fontFamily: cfg.fontFamily,
        originX: 'center', originY: 'bottom', left: 0, top: -10
    });
    
    if (Math.abs(angle) > 90) textObj.set({ angle: 180, originY: 'bottom', top: 10 });

    const group = new fabric.Group([line, startCap, endCap, textObj], {
        left: midX, top: midY, angle: angle,
        originX: 'center', originY: 'center', opacity: cfg.opacity / 100,
        customTab: 'ruler', customTool: 'adjust', isRuler: true,
        // 序列化属性
        _rulerValue: cfg.value, _rulerUnit: cfg.unit,
        _isManualText: cfg.isManualText, _customText: cfg.customText,
        _fontFamily: cfg.fontFamily,
        _capStyle: cfg.capStyle, _dashArray: cfg.dashArray, _strokeLineCap: cfg.strokeLineCap,
        _showSecondaryUnit: cfg.showSecondaryUnit, // ✨ 修复点：持久化双单位状态
        lockScalingY: true, lockUniScaling: true,
        hoverCursor: 'move', _textColor: cfg.textColor 
    });

    const lineObj = group.getObjects()[0];
    const lineLocalX = lineObj.left || 0;
    const lineLocalY = lineObj.top || 0;

    if (lineLocalX !== 0 || lineLocalY !== 0) {
        const angleRad = fabric.util.degreesToRadians(angle);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const worldOffsetX = lineLocalX * cos - lineLocalY * sin;
        const worldOffsetY = lineLocalX * sin + lineLocalY * cos;
        group.set({
            left: midX - worldOffsetX,
            top: midY - worldOffsetY
        });
        group.setCoords();
    }

    group.setControlsVisibility({ mtr: true, ml: true, mr: true, mt:false, mb:false, tl:false, tr:false, bl:false, br:false });
    canvas.add(group);
    
    if (saveHistoryFn) saveHistoryFn();
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    return group;
};

/**
 * 🛠️ 核心函数：重建激活的标尺对象 (Fabric v5 兼容版)
 * 修复：解决 get2DPoints 报错，改用 v5 标准矩阵变换获取世界坐标
 */
const recreateActiveRuler = (oldGroup) => {
    const canvas = unref(canvasRef);
    if (!canvas || !oldGroup) return;

    // 1. 获取标尺的核心线条对象
    const line = oldGroup.getObjects()[0];
    if (!line) return;

    // 2. ✨ 核心修复：使用 v5 标准 API 计算世界坐标 [宪法 2.0]
    // 获取子对象相对于画布的完整变换矩阵
    const matrix = line.calcTransformMatrix();
    
    // 获取 Line 的局部端点坐标 (x1, y1) 和 (x2, y2)
    const p1 = { x: line.x1, y: line.y1 };
    const p2 = { x: line.x2, y: line.y2 };

    // 将局部点转换为画布的世界坐标点
    const startPoint = fabric.util.transformPoint(p1, matrix);
    const endPoint = fabric.util.transformPoint(p2, matrix);

    // 3. 执行销毁与重建逻辑
    canvas.remove(oldGroup);

    // createRulerObject 内部会应用最新的 rulerConfig (含双单位开关)
    const newRuler = createRulerObject(startPoint, endPoint);

    // 4. 同步序列化属性 [SSOT]
    const cfg = rulerConfig.value;
    newRuler.set({
        _showSecondaryUnit: cfg.showSecondaryUnit,
        _isManualText: cfg.isManualText,
        _customText: cfg.customText,
        _rulerValue: cfg.value,
        _rulerUnit: cfg.unit
    });

    // 5. 状态恢复与历史记录 [宪法 6.2]
    canvas.setActiveObject(newRuler);
    if (saveHistoryFn) saveHistoryFn();
    
    canvas.requestRenderAll();
    console.log('[Module:Ruler] Object recreated using v5 matrix transformation.');
};

/**
 * 修改后的 updateActiveRuler
 * 核心变更：集成双单位显示、增强重建判定、同步序列化属性
 */
export const updateActiveRuler = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    const group = canvas.getActiveObject();
    if (!group || !group.isRuler) return;

    const cfg = rulerConfig.value;
    const items = group.getObjects(); 

    // ✨ 1. 增强型重建判定 [宪法 0.4]
    // 逻辑：文字内容的重大改变(单变双单位)会破坏包围盒平衡，必须通过重绘激活补偿算法
    const needsRebuild = (group._capStyle !== cfg.capStyle) || 
                        (items[3].fontSize !== cfg.fontSize) ||
                        (items[3].fontFamily !== cfg.fontFamily) ||
                        (group._showSecondaryUnit !== cfg.showSecondaryUnit); // 新增：双单位切换触发重建

    if (needsRebuild) {
        recreateActiveRuler(group);
    } else {
        // 2. 更新线条与端点
        items[0].set({
            stroke: cfg.color, 
            strokeWidth: cfg.strokeWidth,
            strokeDashArray: cfg.dashArray, 
            strokeLineCap: cfg.strokeLineCap || 'butt'
        });
        
        // 同步端点颜色
        items[1].set({ fill: cfg.color, stroke: cfg.color });
        items[2].set({ fill: cfg.color, stroke: cfg.color });

        // ✨ 3. 应用双单位合成文字 [宪法 0.0]
        const displayText = getRulerDisplayText(cfg);
        
        items[3].set({
            text: displayText, 
            fill: cfg.textColor,
        });

        // 4. 更新组属性与序列化标识 [SSOT]
        group.set({ opacity: cfg.opacity / 100, dirty: true });
        
        group._rulerValue = cfg.value;
        group._rulerUnit = cfg.unit;
        group._isManualText = cfg.isManualText;
        group._customText = cfg.customText;
        group._fontFamily = cfg.fontFamily;
        group._dashArray = cfg.dashArray;
        group._strokeLineCap = cfg.strokeLineCap;
        group._textColor = cfg.textColor;
        group._showSecondaryUnit = cfg.showSecondaryUnit; // ✨ 持久化记录双单位状态

        canvas.requestRenderAll();
        
        // 5. 历史记录保存 [宪法 6.2]
        if (saveHistoryFn) saveHistoryFn();
    }
};

const onSelectionChanged = (e) => {
    if (isDrawing.value) return;
    const activeObj = e.selected?.[0];
    syncConfigFromObject(activeObj);
};

export const syncConfigFromActiveSelection = () => {
    const canvas = unref(canvasRef);
    const activeObj = canvas?.getActiveObject();
    syncConfigFromObject(activeObj);
    return activeObj;
};

// --- 全量替换 syncConfigFromObject ---
const syncConfigFromObject = (activeObj) => {
    if (activeObj && activeObj.isRuler) {
        const items = activeObj.getObjects();
        // ✨ 从对象中读取私有属性并回填给侧边栏 UI [SSOT 准则]
        rulerConfig.value.value = activeObj._rulerValue ?? 20;
        rulerConfig.value.unit = activeObj._rulerUnit ?? 'cm';
        rulerConfig.value.isManualText = activeObj._isManualText ?? false;
        rulerConfig.value.customText = activeObj._customText ?? '';
        rulerConfig.value.fontFamily = activeObj._fontFamily || 'Arial';
        rulerConfig.value.showSecondaryUnit = activeObj._showSecondaryUnit ?? false; // ✨ 修复点：回填双单位开关
        rulerConfig.value.opacity = (activeObj.opacity || 1) * 100;
        
        if (items[0]) {
            rulerConfig.value.color = items[0].stroke;
            rulerConfig.value.strokeWidth = items[0].strokeWidth;
            rulerConfig.value.dashArray = activeObj._dashArray || [];
            rulerConfig.value.strokeLineCap = activeObj._strokeLineCap || 'butt';
        }
        if (items[3]) {
            rulerConfig.value.fontSize = items[3].fontSize;
            rulerConfig.value.textColor = items[3].fill;
        }
        // 同步端点样式标识
        rulerConfig.value.capStyle = activeObj._capStyle || 'line';
    }
};

let startPoint = null;
let activeLine = null;

const onKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        stopRulerMode();
    }
};

const onMouseDown = (opt) => {
    const canvas = unref(canvasRef);
    if (!canvas || state.isGlobalDragMode) return;

    if (opt.target && opt.target.isRuler) {
        canvas.setActiveObject(opt.target);
        return;
    }

    if (!opt.target) {
        const pointer = canvas.getPointer(opt.e);
        startPoint = { x: pointer.x, y: pointer.y };

        activeLine = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
            stroke: rulerConfig.value.color,
            strokeWidth: rulerConfig.value.strokeWidth,
            selectable: true,
            evented: true,
            isRuler: true
        });

        canvas.add(activeLine);
        canvas.on('mouse:move', onMouseMove);
        canvas.on('mouse:up', onMouseUp);
    }
};

const onMouseMove = (opt) => {
    if (!activeLine) return;
    const canvas = unref(canvasRef);
    const pointer = canvas.getPointer(opt.e);
    activeLine.set({ x2: pointer.x, y2: pointer.y });
    canvas.requestRenderAll();
};

const onMouseUp = () => {
    const canvas = unref(canvasRef);
    canvas.off('mouse:move', onMouseMove);
    canvas.off('mouse:up', onMouseUp);

    if (!activeLine) return;
    const endPoint = { x: activeLine.x2, y: activeLine.y2 };
    canvas.remove(activeLine);
    activeLine = null;

    const dist = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
    if (dist > 10) {
        createRulerObject(startPoint, endPoint);
    }
};

export const startRulerMode = (canvas) => {
    canvasRef = canvas;
    const c = unref(canvas);
    if (!c) return;

    c.on('mouse:down', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    // ✨ 光标由 useCanvasLock 统一管理，无需此处手动设置
};

export const stopRulerMode = () => {
    const c = unref(canvasRef);
    if (!c) return;
    c.off('mouse:down', onMouseDown);
    c.off('mouse:move', onMouseMove);
    c.off('mouse:up', onMouseUp);
    window.removeEventListener('keydown', onKeyDown);
};

export { rulerConfig, isDrawing };