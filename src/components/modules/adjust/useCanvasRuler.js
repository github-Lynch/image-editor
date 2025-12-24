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

const isDrawing = ref(false);
const rulerConfig = ref({
    value: 20,
    unit: 'cm',
    color: '#000000',
    opacity: 100,
    fontSize: 24,
    textColor: '#000000',
    fontFamily: 'Arial',
    strokeWidth: 1,
    capStyle: 'line',    
    dashArray: [],       
    strokeLineCap: 'butt'
});

export const registerRulerModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;

    const c = unref(canvas);
    if (c) {
        c.off('selection:created', onSelectionChanged);
        c.off('selection:updated', onSelectionChanged);
        c.on('selection:created', onSelectionChanged);
        c.on('selection:updated', onSelectionChanged);
    }
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

    const textObj = new fabric.Text(`${cfg.value} ${cfg.unit}`, {
        fontSize: cfg.fontSize, fill: cfg.textColor, fontFamily: cfg.fontFamily,
        originX: 'center', originY: 'bottom', left: 0, top: -10
    });
    if (Math.abs(angle) > 90) textObj.set({ angle: 180, originY: 'bottom', top: 10 });

    const group = new fabric.Group([line, startCap, endCap, textObj], {
        left: midX, top: midY, angle: angle,
        originX: 'center', originY: 'center', opacity: cfg.opacity / 100,
        customTab: 'ruler', customTool: 'adjust', isRuler: true,
        _rulerValue: cfg.value, _rulerUnit: cfg.unit,
        _capStyle: cfg.capStyle, _dashArray: cfg.dashArray, _strokeLineCap: cfg.strokeLineCap,
        lockScalingY: true, lockUniScaling: true,
        hoverCursor: 'move',_textColor: cfg.textColor // ✨ 确保对象自身的悬停形态
    });

    group.setControlsVisibility({ mtr: true, ml: true, mr: true, mt:false, mb:false, tl:false, tr:false, bl:false, br:false });
    canvas.add(group);
    
    if (saveHistoryFn) saveHistoryFn();
    return group;
};

const recreateActiveRuler = (activeGroup) => {
    const canvas = unref(canvasRef);
    const center = activeGroup.getCenterPoint();
    const lineObj = activeGroup.getObjects()[0];
    const currentWidth = lineObj.width * activeGroup.scaleX;
    const angleRad = fabric.util.degreesToRadians(activeGroup.angle);
    const dx = (currentWidth / 2) * Math.cos(angleRad);
    const dy = (currentWidth / 2) * Math.sin(angleRad);
    const start = { x: center.x - dx, y: center.y - dy };
    const end = { x: center.x + dx, y: center.y + dy };
    
    canvas.remove(activeGroup);
    const newGroup = createRulerObject(start, end);
    canvas.setActiveObject(newGroup);
    canvas.requestRenderAll();
};

export const updateActiveRuler = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;
    const group = canvas.getActiveObject();
    if (!group || !group.isRuler) return;

    const cfg = rulerConfig.value;
    const needsRebuild = (group._capStyle !== cfg.capStyle) || (group.getObjects()[3].fontSize !== cfg.fontSize);

    if (needsRebuild) {
        recreateActiveRuler(group);
    } else {
        const items = group.getObjects(); 
        items[0].set({
            stroke: cfg.color, strokeWidth: cfg.strokeWidth,
            strokeDashArray: cfg.dashArray, strokeLineCap: cfg.strokeLineCap || 'butt'
        });
        items[1].set({ fill: cfg.color, stroke: cfg.color });
        items[2].set({ fill: cfg.color, stroke: cfg.color });
        items[3].set({
            text: `${cfg.value} ${cfg.unit}`, fill: cfg.textColor,
        });
        group.set({ opacity: cfg.opacity / 100,dirty: true });
        group._rulerValue = cfg.value;
        group._rulerUnit = cfg.unit;
        group._dashArray = cfg.dashArray;
        group._strokeLineCap = cfg.strokeLineCap;
        group._textColor = cfg.textColor;
        canvas.requestRenderAll();
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

const syncConfigFromObject = (activeObj) => {
    if (activeObj && activeObj.isRuler) {
        const items = activeObj.getObjects();
        rulerConfig.value.value = activeObj._rulerValue ?? 20;
        rulerConfig.value.unit = activeObj._rulerUnit ?? 'cm';
        rulerConfig.value.opacity = (activeObj.opacity || 1) * 100;
        rulerConfig.value.capStyle = activeObj._capStyle || 'line'; 
        rulerConfig.value.dashArray = activeObj._dashArray || [];
        rulerConfig.value.strokeLineCap = activeObj._strokeLineCap || 'butt';
        if (items[0]) {
            rulerConfig.value.color = items[0].stroke;
            rulerConfig.value.strokeWidth = items[0].strokeWidth;
        }
        if (items[3]) {
            rulerConfig.value.fontSize = items[3].fontSize;
            rulerConfig.value.textColor = items[3].fill;
        }
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