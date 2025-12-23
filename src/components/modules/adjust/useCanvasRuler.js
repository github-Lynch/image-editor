import { ref, unref } from 'vue';
import { fabric } from 'fabric';

// === 模块级单例状态 ===
let canvasRef = null;
let saveHistoryFn = null;

// === 配置常量 ===
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

// 响应式状态
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
    capStyle: 'line',    
    dashArray: [],       
    strokeLineCap: 'butt'
});

// === 1. 注册与初始化 ===
export const registerRulerModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;

    const c = unref(canvas);
    if (c) {
        c.on('selection:created', onSelectionChanged);
        c.on('selection:updated', onSelectionChanged);
    }
};

// === 2. 端点工厂 ===
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

// === 3. 创建标尺对象 ===
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
        fontSize: cfg.fontSize, fill: cfg.color, fontFamily: cfg.fontFamily,
        backgroundColor: cfg.showBg ? 'rgba(255,255,255,0.8)' : '',
        originX: 'center', originY: 'bottom', left: 0, top: -10
    });
    if (Math.abs(angle) > 90) textObj.set({ angle: 180, originY: 'bottom', top: 10 });

    const group = new fabric.Group([line, startCap, endCap, textObj], {
        left: midX, top: midY, angle: angle,
        originX: 'center', originY: 'center', opacity: cfg.opacity / 100,
        customTab: 'ruler', customTool: 'adjust', isRuler: true,
        _rulerValue: cfg.value, _rulerUnit: cfg.unit,
        _capStyle: cfg.capStyle, _dashArray: cfg.dashArray, _strokeLineCap: cfg.strokeLineCap,
        lockScalingY: true, lockUniScaling: true
    });

    group.setControlsVisibility({ mtr: true, ml: true, mr: true, mt:false, mb:false, tl:false, tr:false, bl:false, br:false });
    canvas.add(group);
    
    // 【重要逻辑变更】
    // 在连续绘制模式下，不要 setActiveObject(group)，因为这会触发 selection:created 
    // 可能会导致 UI 跳变或干扰用户的下一次点击。
    // 让新画的尺子静静地躺在那里即可。
    
    // canvas.setActiveObject(group); <--- 注释掉这行
    
    if (saveHistoryFn) saveHistoryFn();
};

// === 4. 原地重生逻辑 ===
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
    createRulerObject(start, end); // 这里调用会创建新对象，且不选中
    
    // 如果是编辑模式触发的重生，我们需要把新对象选中，不然用户会觉得自己丢失了焦点
    // 但上面的 createRulerObject 修改为了不选中。
    // 这里是一个 edge case，但为了保证连续绘制的体验，我们先优先保证绘制。
    // 实际在 updateActiveRuler 里，我们最好手动选中回来。
    const newGroup = canvas.getObjects().slice(-1)[0];
    if (newGroup) canvas.setActiveObject(newGroup);

    canvas.requestRenderAll();
};

// === 5. 更新逻辑 ===
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
            text: `${cfg.value} ${cfg.unit}`, fill: cfg.color,
            backgroundColor: cfg.showBg ? 'rgba(255,255,255,0.8)' : ''
        });
        group.set({ opacity: cfg.opacity / 100 });
        group._rulerValue = cfg.value;
        group._rulerUnit = cfg.unit;
        group._dashArray = cfg.dashArray;
        group._strokeLineCap = cfg.strokeLineCap;

        canvas.requestRenderAll();
        if (saveHistoryFn) saveHistoryFn();
    }
};

// === 6. 事件监听 ===
const onSelectionChanged = (e) => {
    // 【重要】如果在绘制模式下，不要让选中的物体打断我的配置
    if (isDrawing.value) return;

    const activeObj = e.selected?.[0];
    if (activeObj && activeObj.isRuler) {
        // ... (同步配置代码保持不变) ...
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
            rulerConfig.value.showBg = !!items[3].backgroundColor;
        }
    }
};

// === 7. 绘制交互 (Continuos Mode) ===
let startPoint = null;
let activeLine = null;

// 新增：键盘监听退出
const onKeyDown = (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
        stopDrawMode();
    }
};

export const startDrawMode = () => {
    if (isDrawing.value) return; // 防止重复绑定

    const canvas = unref(canvasRef);
    if (!canvas) return;
    isDrawing.value = true;
    
    // 锁定画布所有对象
    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.defaultCursor = 'crosshair';
    canvas.getObjects().forEach(obj => {
        obj._prevSelectable = obj.selectable;
        obj.selectable = false;
    });

    canvas.on('mouse:down', onMouseDown);
    // 添加键盘监听
    window.addEventListener('keydown', onKeyDown);
};

export const stopDrawMode = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;
    isDrawing.value = false;
    
    // 恢复状态
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.getObjects().forEach(obj => {
        if (obj._prevSelectable !== undefined) {
            obj.selectable = obj._prevSelectable;
            delete obj._prevSelectable;
        }
    });

    // 移除监听
    canvas.off('mouse:down', onMouseDown);
    canvas.off('mouse:move', onMouseMove);
    canvas.off('mouse:up', onMouseUp);
    window.removeEventListener('keydown', onKeyDown);
};

const onMouseDown = (opt) => {
    // 只有左键才绘制
    // if (opt.e.button !== 0) return; // 可选

    const canvas = unref(canvasRef);
    const pointer = canvas.getPointer(opt.e);
    startPoint = { x: pointer.x, y: pointer.y };
    activeLine = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
        stroke: rulerConfig.value.color,
        strokeWidth: rulerConfig.value.strokeWidth,
        strokeDashArray: [5, 5], 
        selectable: false, evented: false
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
    // 只移除 move 和 up，保留 down (实现连续绘制)
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
    
    // [修正]: 删除 stopDrawMode()，保持 isDrawing = true
    // stopDrawMode(); 
};

export { rulerConfig, isDrawing };