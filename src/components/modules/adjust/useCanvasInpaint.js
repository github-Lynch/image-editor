import { ref, unref, watch } from 'vue';
import { fabric } from 'fabric';
import { aiApi } from '@/api/ai';
import { toast } from '@/utils/toast';
import { useEditorState } from '@/composables/useEditorState';

// === 模块级单例状态 ===
let canvasRef = null;
let saveHistoryFn = null;
let initialSnapshot = null; 
let autoInpaintTimer = null;
let isDragging = false;
let startPoint = null;
let activeRect = null;

// 响应式状态
export const brushSize = ref(30);
export const drawMode = ref('brush'); 

// 注册模块
export const registerInpaintModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;
};

// === 🔒 画布锁定系统 ===
const setObjectsLocked = (locked) => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    const objects = canvas.getObjects();
    objects.forEach(obj => {
        if (obj.isMaskObject || obj.type === 'path') return; // 跳过遮罩层

        if (locked) {
            obj._prevSelectable = obj.selectable;
            obj._prevEvented = obj.evented;
            obj.selectable = false;
            obj.evented = false; // 让事件穿透底图
            obj.lockMovementX = true;
            obj.lockMovementY = true;
        } else {
            obj.selectable = obj._prevSelectable ?? true;
            obj.evented = obj._prevEvented ?? true;
            obj.lockMovementX = false;
            obj.lockMovementY = false;
        }
    });

    if (locked) {
        canvas.discardActiveObject();
        canvas.selection = false;
    } else {
        canvas.selection = true;
    }
    canvas.requestRenderAll();
};

// === 🛠 核心修复：离屏生成遮罩 (解决闪屏问题) ===
const getInpaintMaskOffscreen = async () => {
    const canvas = unref(canvasRef);
    if (!canvas) return null;

    // 1. 筛选出屏幕上的红线或红框
    const maskObjects = canvas.getObjects().filter(o => o.isMaskObject || o.type === 'path');
    if (maskObjects.length === 0) return null;

    // 2. 创建一个临时的、不可见的画布 (StaticCanvas)
    // 大小与主画布一致，背景设为黑色
    const tempCanvas = new fabric.StaticCanvas(null, {
        width: canvas.width,
        height: canvas.height,
        backgroundColor: 'black' 
    });

    // 3. 克隆遮罩对象并“洗白”
    const clonePromises = maskObjects.map(obj => {
        return new Promise(resolve => {
            obj.clone((cloned) => {
                // 强制设为纯白，不透明
                cloned.set({
                    left: obj.left,
                    top: obj.top,
                    fill: 'white', 
                    stroke: 'white',
                    opacity: 1,
                    visible: true,
                    evented: false
                });

                // 针对画笔(Path)和框选(Rect)做微调，确保是实心白
                if (cloned.type === 'path') {
                    cloned.set({ fill: null, stroke: 'white' });
                } else if (cloned.type === 'rect') {
                    cloned.set({ fill: 'white', stroke: 'transparent' });
                }

                resolve(cloned);
            });
        });
    });

    // 4. 将克隆体添加到临时画布
    const clones = await Promise.all(clonePromises);
    clones.forEach(c => tempCanvas.add(c));
    
    // 5. 渲染并导出 (这一步发生在内存中，用户看不见)
    tempCanvas.renderAll();
    const dataUrl = tempCanvas.toDataURL({ 
        format: 'png',
        multiplier: 1 
    });
    
    // 6. 销毁临时画布释放内存
    tempCanvas.dispose();
    
    return dataUrl;
};

// === 进入/退出模块 ===
export const enterInpaintMode = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    initialSnapshot = JSON.stringify(canvas.toJSON(['id', 'selectable', 'name']));
    setObjectsLocked(true); // 锁定底图
    drawMode.value = 'brush';
    enableBrush();
};

export const exitInpaintMode = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    if (autoInpaintTimer) clearTimeout(autoInpaintTimer);
    unbindEvents();
    
    canvas.isDrawingMode = false;
    setObjectsLocked(false); // 解锁底图
    clearMaskObjects();
    canvas.defaultCursor = 'default';
};

// === 模式切换 ===
const enableBrush = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    unbindEvents();
    canvas.isDrawingMode = true;
    
    const brush = new fabric.PencilBrush(canvas);
    brush.color = 'rgba(255, 0, 0, 0.5)';
    brush.width = brushSize.value;
    canvas.freeDrawingBrush = brush;
    
    canvas.on('path:created', onPathCreated);
};

const enableRect = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    canvas.isDrawingMode = false;
    unbindEvents();
    setObjectsLocked(true); 
    canvas.defaultCursor = 'crosshair';

    canvas.on('mouse:down', onRectDown);
    canvas.on('mouse:move', onRectMove);
    canvas.on('mouse:up', onRectUp);
};

// === 事件处理 ===
const onPathCreated = (opt) => {
    const path = opt.path;
    if (path) {
        path.excludeFromHistory = true; 
        path.isMaskObject = true;
    }
    // 1秒防抖
    if (autoInpaintTimer) clearTimeout(autoInpaintTimer);
    autoInpaintTimer = setTimeout(() => executeInpaint(), 1000);
};

const onRectDown = (opt) => {
    const canvas = unref(canvasRef);
    if (opt.target && !opt.target.isMaskObject) return;

    const pointer = canvas.getPointer(opt.e);
    isDragging = true;
    startPoint = { x: pointer.x, y: pointer.y };

    activeRect = new fabric.Rect({
        left: startPoint.x, top: startPoint.y,
        width: 0, height: 0,
        fill: 'rgba(255, 0, 0, 0.5)',
        stroke: 'transparent',
        selectable: false, evented: false,
        isMaskObject: true,
        excludeFromHistory: true
    });
    canvas.add(activeRect);
};

const onRectMove = (opt) => {
    if (!isDragging || !activeRect) return;
    const canvas = unref(canvasRef);
    const pointer = canvas.getPointer(opt.e);
    
    let w = Math.abs(pointer.x - startPoint.x);
    let h = Math.abs(pointer.y - startPoint.y);
    
    if (pointer.x < startPoint.x) activeRect.set({ left: pointer.x });
    if (pointer.y < startPoint.y) activeRect.set({ top: pointer.y });

    activeRect.set({ width: w, height: h });
    canvas.requestRenderAll();
};

const onRectUp = () => {
    isDragging = false;
    if (activeRect && (activeRect.width < 5 || activeRect.height < 5)) {
        unref(canvasRef).remove(activeRect);
    } else {
        executeInpaint(); // 松手即触发
    }
    activeRect = null;
};

const unbindEvents = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;
    canvas.off('path:created', onPathCreated);
    canvas.off('mouse:down', onRectDown);
    canvas.off('mouse:move', onRectMove);
    canvas.off('mouse:up', onRectUp);
};

// === 🚀 核心执行逻辑 ===
const executeInpaint = async () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    // 1. 检查是否有遮罩内容
    const hasContent = canvas.getObjects().some(o => o.isMaskObject || o.type === 'path');
    if (!hasContent) return;

    const { setLoading } = useEditorState(); // 获取全局 Loading 控制

    try {
        setLoading(true, 'AI 正在消除...'); // 开启 Loading，遮住画布
        
        // 2. 寻找底图
        const activeObj = canvas.getObjects().find(o => o.type === 'image' && !o.isMaskObject);
        if (!activeObj) throw new Error('未找到底图');

        // 3. 【新逻辑】使用离屏渲染获取 Mask，不再导致主画布闪黑
        const maskBase64 = await getInpaintMaskOffscreen();
        if (!maskBase64) return;

        // 4. 调用 AI 接口
        const resultUrl = await aiApi.inpaint(activeObj.getSrc(), maskBase64);
        
        if (resultUrl) {
            // 5. 成功后替换图片
            activeObj.setSrc(resultUrl, () => {
                clearMaskObjects(); // 清除红线
                setObjectsLocked(true); // 重新锁定新图片
                
                if (saveHistoryFn) saveHistoryFn();
                toast.success('消除完成');
                canvas.requestRenderAll();
                
                // 图片加载完再关闭 Loading，体验更平滑
                setLoading(false);
            }, { crossOrigin: 'anonymous' });
        } else {
            setLoading(false);
        }
    } catch (error) {
        console.error('Inpaint error:', error);
        toast.error('消除失败，请重试');
        clearMaskObjects();
        setLoading(false);
    }
};

const clearMaskObjects = () => {
    const canvas = unref(canvasRef);
    if (!canvas) return;
    const masks = canvas.getObjects().filter(o => o.isMaskObject || o.type === 'path');
    canvas.remove(...masks);
    canvas.requestRenderAll();
};

// === 恢复原图 ===
export const handleRestoreOriginal = () => {
    const canvas = unref(canvasRef);
    if (!canvas || !initialSnapshot) return;

    canvas.loadFromJSON(initialSnapshot, () => {
        setObjectsLocked(true);
        if (drawMode.value === 'brush') enableBrush();
        else enableRect();
        
        if (saveHistoryFn) saveHistoryFn();
        toast.success('已恢复至初始状态');
    });
};

watch(drawMode, (newMode) => {
    if (newMode === 'brush') enableBrush();
    else enableRect();
});

watch(brushSize, (val) => {
    const canvas = unref(canvasRef);
    if (canvas && canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.width = val;
    }
});