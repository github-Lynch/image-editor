// [文件: src/components/modules/adjust/useCanvasMosaic.js]
import { unref } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;

// 内部状态：保持持久化，直到点击应用或取消
let mosaicPreviewLayer = null;
let maskGroup = null;

export const registerMosaicModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

/**
 * 核心：开启或更新马赛克交互 [遵循全景报告：状态保护]
 */
export const startMosaicInteraction = (mode, intensity = 15) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  // 1. 如果预览层已存在，仅更新滤镜强度，不重置状态
  if (mosaicPreviewLayer) {
    const filter = new fabric.Image.filters.Pixelate({ blocksize: intensity });
    mosaicPreviewLayer.filters = [filter];
    mosaicPreviewLayer.applyFilters();
    
    // 切换模式逻辑
    canvas.isDrawingMode = (mode === 'path');
    if (!canvas.isDrawingMode) addMosaicShape(mode);
    
    canvas.requestRenderAll();
    return;
  }

  // 2. 首次初始化：创建预览层
  bgImage.clone((cloned) => {
    mosaicPreviewLayer = cloned;
    
    const pixelateFilter = new fabric.Image.filters.Pixelate({ blocksize: intensity });
    mosaicPreviewLayer.filters = [pixelateFilter];
    mosaicPreviewLayer.applyFilters();

    // 初始化路径遮罩组
    maskGroup = new fabric.Group([], { absolutePositioned: true });

    mosaicPreviewLayer.set({
      selectable: false,
      evented: false,
      clipPath: maskGroup, // 初始关联
      name: 'mosaic-preview-layer'
    });

    canvas.add(mosaicPreviewLayer);
    canvas.bringToFront(mosaicPreviewLayer);

    // 设置交互
    canvas.isDrawingMode = (mode === 'path');
    if (mode === 'path') {
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 30;
      brush.color = 'rgba(0,0,0,1)'; // 遮罩色
      canvas.freeDrawingBrush = brush;
      canvas.on('path:created', onPathCreated);
    } else {
      addMosaicShape(mode);
    }
    
    canvas.requestRenderAll();
  });
};

const onPathCreated = (opt) => {
  const canvas = unref(canvasRef);
  if (maskGroup && mosaicPreviewLayer) {
    canvas.remove(opt.path);
    maskGroup.addWithUpdate(opt.path);
    canvas.requestRenderAll();
  }
};

/**
 * 添加可交互的形状框 [修复交互失效的关键]
 */
const addMosaicShape = (type) => {
  const canvas = unref(canvasRef);
  const center = canvas.getCenter();
  
  // 检查是否已有形状，避免重复生成
  const existing = canvas.getObjects().find(o => o.name === 'mosaic-shape');
  if (existing) {
    canvas.setActiveObject(existing);
    return;
  }

  const commonTpl = {
    left: center.left, top: center.top,
    fill: 'rgba(64, 158, 255, 0.2)', // 半透明蓝色，表示选区
    stroke: '#409eff', strokeWidth: 2,
    originX: 'center', originY: 'center',
    cornerColor: '#fff', cornerStrokeColor: '#409eff',
    transparentCorners: false,
    name: 'mosaic-shape',
    absolutePositioned: true
  };

  const shape = type === 'rect' 
    ? new fabric.Rect({ ...commonTpl, width: 150, height: 150 })
    : new fabric.Circle({ ...commonTpl, radius: 75 });

  canvas.add(shape);
  canvas.setActiveObject(shape);

  // ✅ 关键：形状变动时，强制马赛克预览层刷新渲染
  const updateClip = () => canvas.requestRenderAll();
  shape.on('moving', updateClip);
  shape.on('scaling', updateClip);

  // 修改预览层的 clipPath，使其包含路径组和当前交互形状
  mosaicPreviewLayer.clipPath = new fabric.Group([maskGroup, shape], { 
    absolutePositioned: true 
  });
  
  canvas.requestRenderAll();
};

/**
 * 应用马赛克：离屏高清重制 [遵循全景报告：高清准则]
 */
export const applyMosaic = (intensity) => {
  return new Promise((resolve) => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    if (!bgImage) return resolve();

    // 1. 捕获视觉快照 (Viewport Compensation)
    const prevVpt = [...canvas.viewportTransform];
    const prevZoom = canvas.getZoom();
    const imgCenter = bgImage.getCenterPoint();
    const rectCenterScreen = {
      x: imgCenter.x * prevVpt[0] + prevVpt[4],
      y: imgCenter.y * prevVpt[3] + prevVpt[5]
    };

    // 2. 收集所有作为遮罩的对象
    const shapes = canvas.getObjects().filter(o => o.name === 'mosaic-shape');
    const allMaskObjects = [...maskGroup.getObjects(), ...shapes];
    if (allMaskObjects.length === 0) return resolve();

    const originalSrc = bgImage.getSrc();
    fabric.Image.fromURL(originalSrc, (highResImg) => {
      const { width, height } = highResImg;
      const tempCanvas = new fabric.StaticCanvas(null, { width, height });
      const scale = width / bgImage.getScaledWidth();

      const mosaicLayer = fabric.util.object.clone(highResImg);
      mosaicLayer.filters = [new fabric.Image.filters.Pixelate({ blocksize: intensity })];
      mosaicLayer.applyFilters();

      // 坐标换算
      const finalMaskObjects = allMaskObjects.map(obj => {
        const cloned = fabric.util.object.clone(obj);
        const localLeft = (obj.left - (bgImage.left - bgImage.getScaledWidth() / 2)) * scale;
        const localTop = (obj.top - (bgImage.top - bgImage.getScaledHeight() / 2)) * scale;
        cloned.set({
          left: localLeft, top: localTop,
          scaleX: obj.scaleX * scale, scaleY: obj.scaleY * scale,
          absolutePositioned: true
        });
        return cloned;
      });

      mosaicLayer.clipPath = new fabric.Group(finalMaskObjects, { absolutePositioned: true });

      tempCanvas.add(highResImg); 
      tempCanvas.add(mosaicLayer);
      tempCanvas.renderAll();

      const dataURL = tempCanvas.toDataURL({ format: 'png', quality: 1 });
      tempCanvas.dispose();

      // 3. 应用并补偿视口
      bgImage.setSrc(dataURL, () => {
        const newZoom = prevZoom / scale;
        bgImage.set({
          scaleX: 1, scaleY: 1, angle: 0,
          originX: 'center', originY: 'center',
          left: canvas.width / 2, top: canvas.height / 2
        });
        bgImage.setCoords();
        canvas.centerObject(bgImage);

        stopMosaicInteraction();

        const newCenterLogic = { x: canvas.width / 2, y: canvas.height / 2 };
        const newPanX = rectCenterScreen.x - newCenterLogic.x * newZoom;
        const newPanY = rectCenterScreen.y - newCenterLogic.y * newZoom;
        canvas.setViewportTransform([newZoom, 0, 0, newZoom, newPanX, newPanY]);

        if (saveHistoryFn) saveHistoryFn();
        canvas.requestRenderAll();
        canvas.fire('zoom:change');
        resolve();
      });
    }, { crossOrigin: 'anonymous' });
  });
};

export const stopMosaicInteraction = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  canvas.off('path:created', onPathCreated);
  canvas.isDrawingMode = false;
  
  if (mosaicPreviewLayer) canvas.remove(mosaicPreviewLayer);
  const shapes = canvas.getObjects().filter(o => o.name === 'mosaic-shape');
  if (shapes.length > 0) canvas.remove(...shapes);

  mosaicPreviewLayer = null;
  maskGroup = null;
  canvas.requestRenderAll();
};

export const cancelMosaic = () => {
  stopMosaicInteraction();
};