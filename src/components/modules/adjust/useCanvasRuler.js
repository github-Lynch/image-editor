import { ref, unref, watch, nextTick } from 'vue';
import { fabric } from 'fabric';

// === 模块级单例状态 ===
let canvasRef = null;
let saveHistoryFn = null;

// 响应式状态 (供 UI 双向绑定)
const isDrawing = ref(false);
const rulerConfig = ref({
    value: 20,
    unit: 'cm',
    color: '#ff0000',
    opacity: 100,
    fontSize: 24,
    fontFamily: 'Arial',
    strokeWidth: 4,
    showBg: true,
    capStyle: 'line'
});

// === 1. 注册与初始化 ===
export const registerRulerModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;

    const c = unref(canvas);
    if (c) {
        // 绑定选择事件，实现“点击标尺回显属性”
        c.on('selection:created', onSelectionChanged);
        c.on('selection:updated', onSelectionChanged);
        c.on('selection:cleared', onSelectionCleared);
    }
};

// === 2. 事件监听逻辑 ===
const onSelectionChanged = (e) => {
    const activeObj = e.selected?.[0];
    if (activeObj && activeObj.isRuler) {
        // 回显属性到面板
        const items = activeObj.getObjects();
        rulerConfig.value.value = activeObj._rulerValue ?? 20;
        rulerConfig.value.unit = activeObj._rulerUnit ?? 'cm';
        rulerConfig.value.opacity = (activeObj.opacity || 1) * 100;
        
        // 线条样式回显 (取 Line 对象)
        if (items[0]) {
            rulerConfig.value.color = items[0].stroke;
            rulerConfig.value.strokeWidth = items[0].strokeWidth;
        }
        // 文字样式回显 (取 Text 对象)
        if (items[3]) {
            rulerConfig.value.fontSize = items[3].fontSize;
            rulerConfig.value.fontFamily = items[3].fontFamily;
            rulerConfig.value.showBg = !!items[3].backgroundColor;
        }
    }
};

const onSelectionCleared = () => {
    // 可选：清空或保持最后一次配置
    // rulerConfig.value.value = 20; 
};

// === 3. 绘制交互流程 ===
let startPoint = null;
let activeLine = null;

export const startDrawMode = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;
    
    isDrawing.value = true;
    
    // 锁定所有对象，防止误触
    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
    
    // 临时锁定其他对象
    canvas.getObjects().forEach(obj => {
        obj._prevSelectable = obj.selectable;
        obj.selectable = false;
    });

    canvas.on('mouse:down', onMouseDown);
};

export const stopDrawMode = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    isDrawing.value = false;
    
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'move';
    
    // 恢复对象可选中
    canvas.getObjects().forEach(obj => {
        if (obj._prevSelectable !== undefined) {
            obj.selectable = obj._prevSelectable;
            delete obj._prevSelectable;
        }
    });

    canvas.off('mouse:down', onMouseDown);
    canvas.off('mouse:move', onMouseMove);
    canvas.off('mouse:up', onMouseUp);
};

const onMouseDown = (opt) => {
    const canvas = unref(canvasRef);
    const pointer = canvas.getPointer(opt.e);
    startPoint = { x: pointer.x, y: pointer.y };
    
    activeLine = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
        stroke: rulerConfig.value.color,
        strokeWidth: rulerConfig.value.strokeWidth,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
    });
    
    canvas.add(activeLine);
    canvas.on('mouse:move', onMouseMove);
    canvas.on('mouse:up', onMouseUp);
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

    // 防止误触点击
    const dist = Math.sqrt(Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2));
    if (dist > 10) {
        createRulerObject(startPoint, endPoint);
    }
    
    // 绘制一次后自动退出
    stopDrawMode();
};

// === 4. 创建标尺对象 (Group) ===
const createRulerObject = (start, end) => {
    const canvas = unref(canvasRef);
    const cfg = rulerConfig.value;
    const color = cfg.color;
    
    // 1. 主线条
    const line = new fabric.Line([start.x, start.y, end.x, end.y], {
        stroke: color,
        strokeWidth: cfg.strokeWidth,
        originX: 'center', originY: 'center'
    });

    // 2. 计算几何
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;

    // 3. 端点 (Cap)
    const capSize = 10 + cfg.strokeWidth;
    const startCap = new fabric.Line([0, -capSize, 0, capSize], {
        stroke: color, strokeWidth: cfg.strokeWidth,
        left: start.x, top: start.y,
        angle: angle,
        originX: 'center', originY: 'center'
    });
    const endCap = new fabric.Line([0, -capSize, 0, capSize], {
        stroke: color, strokeWidth: cfg.strokeWidth,
        left: end.x, top: end.y,
        angle: angle,
        originX: 'center', originY: 'center'
    });

    // 4. 文字
    const textStr = `${cfg.value} ${cfg.unit}`;
    const textObj = new fabric.Text(textStr, {
        fontSize: cfg.fontSize,
        fontFamily: cfg.fontFamily,
        fill: color,
        backgroundColor: cfg.showBg ? 'rgba(255,255,255,0.8)' : '',
        originX: 'center', originY: 'bottom',
        left: midX,
        top: midY - 10,
        angle: angle > 90 || angle < -90 ? angle + 180 : angle
    });

    // 5. 组合 Group
    const group = new fabric.Group([line, startCap, endCap, textObj], {
        left: midX, top: midY,
        originX: 'center', originY: 'center',
        opacity: cfg.opacity / 100,
        id: 'ruler-group',
        isRuler: true, // 关键标识
        _rulerValue: cfg.value, // 持久化数据
        _rulerUnit: cfg.unit,
        lockScalingY: true, 
        lockUniScaling: true 
    });

    group.setControlsVisibility({
        mt: false, mb: false, ml: true, mr: true, 
        bl: false, br: false, tl: false, tr: false,
        mtr: true 
    });

    canvas.add(group);
    canvas.setActiveObject(group);
    if (saveHistoryFn) saveHistoryFn();
};

// === 5. 更新选中标尺 ===
export const updateActiveRuler = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    const obj = canvas.getActiveObject();
    if (!obj || !obj.isRuler) return;

    const cfg = rulerConfig.value;
    const items = obj.getObjects();
    
    // 更新内部子对象
    [0, 1, 2].forEach(i => {
        if (items[i]) items[i].set({ stroke: cfg.color, strokeWidth: cfg.strokeWidth });
    });
    
    if (items[3]) { // Text
        items[3].set({ 
            text: `${cfg.value} ${cfg.unit}`,
            fill: cfg.color,
            fontSize: cfg.fontSize,
            fontFamily: cfg.fontFamily,
            backgroundColor: cfg.showBg ? 'rgba(255,255,255,0.8)' : ''
        });
    }

    obj.set({ opacity: cfg.opacity / 100 });
    obj._rulerValue = cfg.value;
    obj._rulerUnit = cfg.unit;

    canvas.requestRenderAll();
    if (saveHistoryFn) saveHistoryFn();
};

// 导出 Vue 响应式数据
export { rulerConfig, isDrawing };