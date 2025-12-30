// [文件: src/components/modules/adjust/useCanvasMosaic.js]
import { unref } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;

// --- 模块内部状态 ---
// 预览层：一个带有马赛克滤镜的图片克隆
let mosaicPreviewLayer = null;
// 预览遮罩组：包含所有在预览层坐标系下的遮罩形状（用于 clipPath）
let maskGroup = null;
// 高清应用遮罩数据：存储所有遮罩形状的“世界坐标烘焙”版本（可序列化纯对象）
let worldMaskObjects = [];

export const registerMosaicModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

/**
 * 开启或更新马赛克交互
 */
export const startMosaicInteraction = (mode, intensity = 15) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (!bgImage) return;

  // 如果已在交互中，仅更新滤镜强度和模式
  if (mosaicPreviewLayer) {
    const filter = new fabric.Image.filters.Pixelate({ blocksize: intensity });
    mosaicPreviewLayer.filters = [filter];
    mosaicPreviewLayer.applyFilters();

    canvas.isDrawingMode = mode === "path";
    if (!canvas.isDrawingMode) addMosaicShape(mode);

    canvas.requestRenderAll();
    return;
  }

  // 首次初始化
  bgImage.clone((cloned) => {
    mosaicPreviewLayer = cloned;
    const pixelateFilter = new fabric.Image.filters.Pixelate({ blocksize: intensity });
    mosaicPreviewLayer.filters = [pixelateFilter];
    mosaicPreviewLayer.applyFilters();

    maskGroup = new fabric.Group([], { absolutePositioned: true });

    mosaicPreviewLayer.set({
      selectable: false,
      evented: false,
      clipPath: maskGroup,
      name: "mosaic-preview-layer",
    });

    canvas.add(mosaicPreviewLayer);
    canvas.bringToFront(mosaicPreviewLayer);

    canvas.isDrawingMode = mode === "path";
    if (mode === "path") {
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 30;
      brush.color = "rgba(0,0,0,1)";
      canvas.freeDrawingBrush = brush;
      canvas.on("path:created", onPathCreated);
    } else {
      addMosaicShape(mode);
    }

    canvas.requestRenderAll();
  });
};

// 辅助函数：将路径对象的点“烘焙”到世界坐标
const bakePathToWorld = (path) => {
  const m = path.calcTransformMatrix();
  const bakedPathData = (path.path || []).map((seg) => {
    const cmd = seg[0];
    if (cmd === "M" || cmd === "L") {
      const p = fabric.util.transformPoint(new fabric.Point(seg[1], seg[2]), m);
      return [cmd, p.x, p.y];
    }
    if (cmd === "Q") {
      const c = fabric.util.transformPoint(new fabric.Point(seg[1], seg[2]), m);
      const p = fabric.util.transformPoint(new fabric.Point(seg[3], seg[4]), m);
      return [cmd, c.x, c.y, p.x, p.y];
    }
    if (cmd === "C") {
      const c1 = fabric.util.transformPoint(new fabric.Point(seg[1], seg[2]), m);
      const c2 = fabric.util.transformPoint(new fabric.Point(seg[3], seg[4]), m);
      const p = fabric.util.transformPoint(new fabric.Point(seg[5], seg[6]), m);
      return [cmd, c1.x, c1.y, c2.x, c2.y, p.x, p.y];
    }
    return seg;
  });

  return new fabric.Path(bakedPathData, {
    fill: "rgba(0,0,0,1)",
    stroke: null,
    left: 0,
    top: 0,
    originX: "left",
    originY: "top",
  });
};

// 当涂抹路径创建时
const onPathCreated = (opt) => {
  const canvas = unref(canvasRef);
  if (!canvas || !maskGroup || !opt.path) return;

  const path = opt.path;
  canvas.remove(path);

  // 1. 预览：将原始 path 加入 maskGroup，保持预览坐标正确
  maskGroup.addWithUpdate(path);

  // 2. 高清应用：存储一份“世界坐标烘焙”版本
  const worldPath = bakePathToWorld(path);
  worldMaskObjects.push(worldPath.toObject());

  canvas.requestRenderAll();
};

// 添加矩形或圆形遮罩
const addMosaicShape = (type) => {
  const canvas = unref(canvasRef);
  const center = canvas.getCenter();

  const existing = canvas.getObjects().find((o) => o.name === "mosaic-shape");
  if (existing) {
    canvas.setActiveObject(existing);
    return;
  }

  const commonTpl = {
    left: center.left,
    top: center.top,
    fill: "rgba(64, 158, 255, 0.2)",
    stroke: "#409eff",
    strokeWidth: 2,
    originX: "center",
    originY: "center",
    name: "mosaic-shape",
  };

  const shape = type === "rect"
      ? new fabric.Rect({ ...commonTpl, width: 150, height: 150 })
      : new fabric.Circle({ ...commonTpl, radius: 75 });

  canvas.add(shape);
  canvas.setActiveObject(shape);

  const updateClip = () => canvas.requestRenderAll();
  shape.on("moving", updateClip);
  shape.on("scaling", updateClip);

  mosaicPreviewLayer.clipPath = new fabric.Group([maskGroup, shape], {
    absolutePositioned: true,
  });

  canvas.requestRenderAll();
};

/**
 * 应用马赛克
 */
export const applyMosaic = (intensity) => {
  return new Promise((resolve) => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find((o) => o.type === "image");
    if (!bgImage) return resolve();

    const prevVpt = [...canvas.viewportTransform];
    const prevZoom = canvas.getZoom();
    const imgCenter = bgImage.getCenterPoint();
    const rectCenterScreen = {
      x: imgCenter.x * prevVpt[0] + prevVpt[4],
      y: imgCenter.y * prevVpt[3] + prevVpt[5],
    };

    // 合并涂抹路径和交互形状
    const shape = canvas.getObjects().find((o) => o.name === "mosaic-shape");
    const finalMaskData = [...worldMaskObjects];
    if (shape) {
      finalMaskData.push(shape.toObject());
    }

    console.log('[Mosaic] applyMosaic: collected maskData len=', finalMaskData.length, finalMaskData);
    if (finalMaskData.length === 0) return resolve();

    const originalSrc = bgImage.getSrc();
    console.log('[Mosaic] applyMosaic: start Image.fromURL');
fabric.Image.fromURL(
      originalSrc,
      (highResImg) => {
        const { width, height } = highResImg;
        const tempCanvas = new fabric.StaticCanvas(null, { width, height });
        const scale = width / bgImage.getScaledWidth();

        const mosaicLayer = fabric.util.object.clone(highResImg);
        const hdBlockSize = Math.max(1, Math.round(intensity * scale));
        mosaicLayer.filters = [
          new fabric.Image.filters.Pixelate({ blocksize: hdBlockSize }),
        ];
        mosaicLayer.applyFilters();

        // 使用 enlivenObjects 从纯数据恢复遮罩对象
        fabric.util.enlivenObjects(finalMaskData, (objects) => {
          console.log('[Mosaic] enlivenObjects done, objects len=', objects.length, objects);
          // 关键修复：使用包围盒差值算法，不受 originX/Y 影响，且在主图无旋转时最稳定
          const imgTLWorld = {
            x: bgImage.left - bgImage.getScaledWidth() / 2,
            y: bgImage.top - bgImage.getScaledHeight() / 2,
          };

          const finalMaskObjects = objects.map((o) => {
            // o.left/top 是烘焙后的世界坐标
            const worldLeft = o.left;
            const worldTop = o.top;

            o.set({
              left: (worldLeft - imgTLWorld.x) * scale,
              top: (worldTop - imgTLWorld.y) * scale,
              scaleX: (o.scaleX || 1) * scale,
              scaleY: (o.scaleY || 1) * scale,
              angle: o.angle || 0,
              // originX/Y 必须与烘焙时一致，这里是 left/top
              originX: "left",
              originY: "top",
            });
            return o;
          });

          mosaicLayer.clipPath = new fabric.Group(finalMaskObjects, {
            absolutePositioned: true,
          });
          console.log('[Mosaic] clipPath group created:', mosaicLayer.clipPath);

          tempCanvas.add(highResImg);
          tempCanvas.add(mosaicLayer);
          tempCanvas.renderAll();

          const dataURL = tempCanvas.toDataURL({ format: "png", quality: 1 });
          console.log('[Mosaic] offscreen dataURL len=', dataURL.length);
          tempCanvas.dispose(); // 在这里安全地销毁

          bgImage.setSrc(dataURL, () => {
            const newZoom = prevZoom / scale;
            bgImage.set({
              scaleX: 1, scaleY: 1, angle: 0,
              originX: "center", originY: "center",
              left: canvas.width / 2, top: canvas.height / 2,
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
            canvas.fire("zoom:change");
            resolve();
          });
        });
      },
      { crossOrigin: "anonymous" }
    );
  });
};

export const stopMosaicInteraction = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  canvas.off("path:created", onPathCreated);
  canvas.isDrawingMode = false;

  if (mosaicPreviewLayer) canvas.remove(mosaicPreviewLayer);
  const shapes = canvas.getObjects().filter((o) => o.name === "mosaic-shape");
  if (shapes.length > 0) canvas.remove(...shapes);

  mosaicPreviewLayer = null;
  maskGroup = null;
  worldMaskObjects = [];
  canvas.requestRenderAll();
};

export const cancelMosaic = () => {
  stopMosaicInteraction();
};
