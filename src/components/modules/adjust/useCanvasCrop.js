// src/components/modules/adjust/useCanvasCrop.js
import { ref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";
import { ZOOM_PADDING } from "@/composables/useEditorState";

// === 状态变量 ===
const cropObject = shallowRef(null);
const isManualCropping = ref(false);
const isCropping = ref(false);
const isRatioLocked = ref(false);
const currentAspectRatio = ref(null);

// 用于实时向 UI 传递当前选区/裁剪框的宽高
const currentSelectionDims = ref({ width: 0, height: 0 });

// 内部引用
let canvasRef = null;
let saveHistoryFn = null;
let zoomToRectFn = null;

// 内部变量
let selectionRect = null;
let maskRect = null;
let selectionStartX = 0;
let selectionStartY = 0;
let aspectRatioValue = null;
let savedWheelListeners = [];

// 拖拽图片相关变量
let isDraggingImage = false;
let dragLastX = 0;
let dragLastY = 0;

// 标志位：是否正在应用裁剪
let isApplyingCrop = false;

export const registerCropModule = (canvas, saveHistory, zoomToRect) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
  zoomToRectFn = zoomToRect;
};

// =========================================================
// 核心工具
// =========================================================
const getLogicRect = (obj) => {
  if (!canvasRef?.value || !obj) return { left: 0, top: 0, width: 0, height: 0 };
  const canvas = canvasRef.value;
  const zoom = canvas.getZoom();
  const vpt = canvas.viewportTransform;

  const rawRect = obj.getBoundingRect();

  return {
    left: (rawRect.left - vpt[4]) / zoom,
    top: (rawRect.top - vpt[5]) / zoom,
    width: rawRect.width / zoom,
    height: rawRect.height / zoom
  };
};

const updateCurrentDims = (obj) => {
  if (!obj) return;
  const rect = getLogicRect(obj);
  currentSelectionDims.value = {
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
};

const preventZoomWheel = (opt) => {
  if (!opt || !opt.e) return;
  opt.e.preventDefault();
  opt.e.stopPropagation();
  if (opt.e.stopImmediatePropagation) opt.e.stopImmediatePropagation();
};

// =========================================================
// 图片位置约束核心逻辑
// =========================================================
const constrainImageUnderCrop = (bgImage, cropRect) => {
  if (!bgImage || !cropRect) return;

  // 获取当前的逻辑包围盒
  const bgRect = getLogicRect(bgImage);
  const cropRectVal = getLogicRect(cropRect);

  let deltaX = 0;
  let deltaY = 0;

  // 1. 检查左边界：图片的左边不能在这个点右边 (必须 <= cropRect.left)
  if (bgRect.left > cropRectVal.left) {
    deltaX = cropRectVal.left - bgRect.left;
  }

  // 2. 检查上边界：图片的上边不能在这个点下边 (必须 <= cropRect.top)
  if (bgRect.top > cropRectVal.top) {
    deltaY = cropRectVal.top - bgRect.top;
  }

  // 3. 检查右边界：图片的右边不能在这个点左边 (必须 >= cropRect.right)
  const bgRight = bgRect.left + bgRect.width;
  const cropRight = cropRectVal.left + cropRectVal.width;
  if (bgRight < cropRight) {
    // 优先保证填满
    deltaX = cropRight - bgRight;
  }

  // 4. 检查下边界
  const bgBottom = bgRect.top + bgRect.height;
  const cropBottom = cropRectVal.top + cropRectVal.height;
  if (bgBottom < cropBottom) {
    deltaY = cropBottom - bgBottom;
  }

  // 如果需要修正
  if (deltaX !== 0 || deltaY !== 0) {
    // 可以考虑在这里加一个简单的动画效果（animate），目前使用直接设置
    bgImage.left += deltaX;
    bgImage.top += deltaY;
    bgImage.setCoords();
  }
};

// =========================================================
// 拖动图片的核心逻辑 (修改版)
// =========================================================
const onCropMouseDown = (opt) => {
  if (!canvasRef?.value || !cropObject.value) return;
  const target = opt.target;
  // 必须点击在剪裁框上
  if (target !== cropObject.value) return;

  const activeObj = canvasRef.value.getActiveObject();
  if (activeObj && activeObj.__corner) return;

  // 开始拖动图片
  isDraggingImage = true;
  const pointer = canvasRef.value.getPointer(opt.e);
  dragLastX = pointer.x;
  dragLastY = pointer.y;
  canvasRef.value.defaultCursor = 'move';
};

const onCropMouseMove = (opt) => {
  if (!isDraggingImage || !canvasRef?.value) return;
  const canvas = canvasRef.value;
  const pointer = canvas.getPointer(opt.e);
  const deltaX = pointer.x - dragLastX;
  const deltaY = pointer.y - dragLastY;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');

  if (bgImage) {
    // 【修改】只移动，不实时约束
    // 这样用户可以把图片拖出边界，体验更流畅
    bgImage.left += deltaX;
    bgImage.top += deltaY;
    bgImage.setCoords();
  }

  dragLastX = pointer.x;
  dragLastY = pointer.y;
  canvas.requestRenderAll();
};

const onCropMouseUp = () => {
  if (isDraggingImage) {
    // 【修改】拖拽结束的一瞬间，执行“回弹/修正”
    if (canvasRef?.value && cropObject.value) {
      const bgImage = canvasRef.value.getObjects().find(o => o.type === 'image');
      if (bgImage) {
        // 这里执行修正，如果图片跑出去了，会瞬间回到边缘
        constrainImageUnderCrop(bgImage, cropObject.value);
        canvasRef.value.requestRenderAll();
      }
    }

    isDraggingImage = false;
    if (canvasRef?.value) canvasRef.value.defaultCursor = 'default';
  }
};

// =========================================================
// 面板开关
// =========================================================
export const openCropPanel = () => {
  if (!canvasRef?.value) return;
  if (isCropping.value) return;

  isApplyingCrop = false;

  const canvas = canvasRef.value;
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  canvas.fire('zoom:change', { from: 'crop-module' });

  if (canvas.__eventListeners && canvas.__eventListeners['mouse:wheel']) {
    savedWheelListeners = [...canvas.__eventListeners['mouse:wheel']];
    canvas.off('mouse:wheel');
  }
  canvas.on('mouse:wheel', preventZoomWheel);

  isCropping.value = true;
};

export const closeCropPanel = () => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;

  if (isApplyingCrop) {
    if (isManualCropping.value) endManualSelectionMode();
    isCropping.value = false;
    return;
  }

  if (isManualCropping.value) {
    endManualSelectionMode();
  }

  cancelCrop();

  isCropping.value = false;

  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (bgImage) {
    const imgWidth = bgImage.width * bgImage.scaleX;
    const imgHeight = bgImage.height * bgImage.scaleY;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const paddingFactor = ZOOM_PADDING;
    const zoomToFit = Math.min(
      (canvasWidth * paddingFactor) / imgWidth,
      (canvasHeight * paddingFactor) / imgHeight
    );
    const center = bgImage.getCenterPoint();
    const panX = (canvasWidth / 2) - center.x * zoomToFit;
    const panY = (canvasHeight / 2) - center.y * zoomToFit;

    canvas.setViewportTransform([zoomToFit, 0, 0, zoomToFit, panX, panY]);
    canvas.setZoom(zoomToFit);
  }
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  canvas.fire('zoom:change');
};

// =========================================================
// 约束逻辑 (Resizing时触发)
// =========================================================
export const constrainCrop = (activeObj) => {
  if (!canvasRef?.value || !activeObj) return;

  const bgImage = canvasRef.value.getObjects().find((o) => o.type === "image");
  if (!bgImage) return;

  const bgRect = getLogicRect(bgImage);
  const bgWidth = bgRect.width;
  const bgHeight = bgRect.height;
  const bgLeft = bgRect.left;
  const bgTop = bgRect.top;

  let currentScaleX = activeObj.scaleX;
  let currentScaleY = activeObj.scaleY;

  let cropCurrentWidth = activeObj.width * currentScaleX;
  let cropCurrentHeight = activeObj.height * currentScaleY;
  let sizeChanged = false;

  if (cropCurrentWidth > bgWidth + 0.5) {
    currentScaleX = bgWidth / activeObj.width;
    sizeChanged = true;
  }
  if (cropCurrentHeight > bgHeight + 0.5) {
    currentScaleY = bgHeight / activeObj.height;
    sizeChanged = true;
  }
  if (sizeChanged) {
    activeObj.set({ scaleX: currentScaleX, scaleY: currentScaleY });
    activeObj.setCoords();
  }

  const finalCropWidth = activeObj.getScaledWidth();
  const finalCropHeight = activeObj.getScaledHeight();
  const minLeft = bgLeft;
  const maxLeft = bgLeft + bgWidth - finalCropWidth;
  const minTop = bgTop;
  const maxTop = bgTop + bgHeight - finalCropHeight;

  let newLeft = Math.max(minLeft, Math.min(activeObj.left, maxLeft));
  let newTop = Math.max(minTop, Math.min(activeObj.top, maxTop));

  activeObj.set({ left: newLeft, top: newTop });
  activeObj.setCoords();

  updateCurrentDims(activeObj);
  canvasRef.value.requestRenderAll();
};

// =========================================================
// 取消裁剪 (清理)
// =========================================================
export const cancelCrop = (shouldRender = true) => {
  if (canvasRef?.value && cropObject.value) {
    const rawObj = toRaw(cropObject.value);

    // 解绑拖拽图片事件
    canvasRef.value.off('mouse:down', onCropMouseDown);
    canvasRef.value.off('mouse:move', onCropMouseMove);
    canvasRef.value.off('mouse:up', onCropMouseUp);

    canvasRef.value.remove(rawObj);
    cropObject.value = null;
    isDraggingImage = false; // 重置拖拽状态

    if (shouldRender) {
      canvasRef.value.renderAll();
    }
  }
};

// ... (手动选区逻辑保持不变) ...
export const endManualSelectionMode = () => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  canvas.defaultCursor = 'default';
  canvas.hoverCursor = 'move';
  canvas.selection = true;
  canvas.getObjects().forEach(o => {
    if (o !== maskRect && o !== selectionRect) {
      o.selectable = true;
      o.evented = true;
    }
  });
  canvas.off('mouse:down', onSelectionDown);
  canvas.off('mouse:move', onSelectionMove);
  canvas.off('mouse:up', onSelectionUp);
  if (selectionRect) { canvas.remove(selectionRect); selectionRect = null; }
  if (maskRect) { canvas.remove(maskRect); maskRect = null; }
  isManualCropping.value = false;
  canvas.requestRenderAll();
};

const onSelectionDown = (opt) => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const pointer = canvas.getPointer(opt.e);
  selectionStartX = pointer.x;
  selectionStartY = pointer.y;
  selectionRect = new fabric.Rect({
    left: selectionStartX, top: selectionStartY, width: 0, height: 0,
    fill: 'transparent', stroke: '#fff', strokeWidth: 2, strokeDashArray: [6, 6],
    selectable: false, evented: false
  });
  canvas.add(selectionRect);
  canvas.bringToFront(selectionRect);
};

const onSelectionMove = (opt) => {
  if (!selectionRect || !canvasRef.value) return;
  const pointer = canvasRef.value.getPointer(opt.e);
  let w = Math.abs(pointer.x - selectionStartX);
  let h = Math.abs(pointer.y - selectionStartY);
  let left = selectionStartX;
  let top = selectionStartY;
  if (pointer.x < selectionStartX) left = pointer.x;
  if (pointer.y < selectionStartY) top = pointer.y;
  selectionRect.set({ left, top, width: w, height: h });
  currentSelectionDims.value = { width: Math.round(w), height: Math.round(h) };
  canvasRef.value.requestRenderAll();
};

const onSelectionUp = () => {
  if (!selectionRect) {
    endManualSelectionMode();
    if (cropObject.value) cancelCrop();
    return;
  }
  const box = {
    left: selectionRect.left, top: selectionRect.top,
    width: selectionRect.width, height: selectionRect.height
  };
  endManualSelectionMode();
  if (box.width < 10 || box.height < 10) return;
  startCrop(null, box);
  if (zoomToRectFn) zoomToRectFn(box);
};

export const startManualSelection = () => {
  if (!canvasRef?.value) return;
  if (isManualCropping.value) endManualSelectionMode();
  const canvas = canvasRef.value;
  cancelCrop();
  canvas.getObjects().forEach(o => { o.selectable = false; o.evented = false; });
  maskRect = new fabric.Rect({
    left: -5000, top: -5000, width: 20000, height: 20000,
    fill: 'rgba(0, 0, 0, 0.45)', selectable: false, evented: false, excludeFromExport: true
  });
  canvas.add(maskRect);
  canvas.defaultCursor = 'crosshair';
  canvas.hoverCursor = 'crosshair';
  canvas.selection = false;
  isManualCropping.value = true;
  canvas.on('mouse:down', onSelectionDown);
  canvas.on('mouse:move', onSelectionMove);
  canvas.on('mouse:up', onSelectionUp);
  canvas.requestRenderAll();
};

// ... (setCropRatio 保持不变) ...
export const setCropRatio = (ratio) => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  if (ratio === null) {
    isRatioLocked.value = false;
    currentAspectRatio.value = null;
    if (cropObject.value) {
      cropObject.value.set({ lockUniScaling: false });
      canvas.requestRenderAll();
    }
    return;
  }
  isRatioLocked.value = true;
  currentAspectRatio.value = ratio;
  let baseW, baseH, left, top;
  const activeObj = canvas.getObjects().find((obj) => obj.type === "image");
  if (!activeObj) return;
  const rect = getLogicRect(activeObj);
  baseW = rect.width; baseH = rect.height; left = rect.left; top = rect.top;
  const currentRatio = baseW / baseH;
  let newW, newH;
  if (currentRatio > ratio) {
    newH = baseH; newW = newH * ratio; left += (baseW - newW) / 2;
  } else {
    newW = baseW; newH = newW / ratio; top += (baseH - newH) / 2;
  }
  if (cropObject.value) {
    cropObject.value.set({
      width: newW, height: newH, left: left, top: top,
      scaleX: 1, scaleY: 1, lockUniScaling: false
    });
    cropObject.value.setCoords();
    constrainCrop(cropObject.value);
    canvas.requestRenderAll();
    if (zoomToRectFn) zoomToRectFn(getLogicRect(cropObject.value));
  } else {
    startCrop(ratio, { left, top, width: newW, height: newH });
  }
};

// =========================================================
// startCrop
// =========================================================
export const startCrop = (aspectRatio = null, customBox = null) => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  if (isManualCropping.value) endManualSelectionMode();

  aspectRatioValue = aspectRatio || null;
  let activeObj = canvas.getObjects().find((obj) => obj.type === "image");
  if (!activeObj) return;

  cancelCrop();

  const rect = getLogicRect(activeObj);
  let width, height, left, top;

  if (customBox) {
    width = customBox.width; height = customBox.height; left = customBox.left; top = customBox.top;
  } else {
    const imgWidth = rect.width; const imgHeight = rect.height;
    width = imgWidth * 1; height = imgHeight * 1;
    if (aspectRatio) {
      height = width / aspectRatio;
      if (height > imgHeight) {
        height = imgHeight; width = height * aspectRatio;
      }
      isRatioLocked.value = true; currentAspectRatio.value = aspectRatio;
    } else {
      isRatioLocked.value = false; currentAspectRatio.value = null;
    }
    left = rect.left + (imgWidth - width) / 2;
    top = rect.top + (imgHeight - height) / 2;
  }

  const cropZone = new fabric.Rect({
    left: left, top: top, width: width, height: height,
    fill: "transparent", stroke: "#409eff", strokeWidth: 2,
    cornerColor: "white", cornerStrokeColor: "#409eff", cornerSize: 12,
    transparentCorners: false, lockRotation: true, hasRotatingPoint: false,
    lockUniScaling: false,
    lockMovementX: true,
    lockMovementY: true
  });
  if (aspectRatio) cropZone.set("height", width / aspectRatio);

  cropZone.on('modified', () => {
    if (zoomToRectFn) zoomToRectFn(getLogicRect(cropZone));
  });

  canvas.add(cropZone);
  canvas.setActiveObject(cropZone);
  cropObject.value = cropZone;
  canvas.renderAll();
  updateCurrentDims(cropZone);
  if (zoomToRectFn) zoomToRectFn(getLogicRect(cropZone));
  constrainCrop(cropZone);

  // 绑定拖图事件
  canvas.on('mouse:down', onCropMouseDown);
  canvas.on('mouse:move', onCropMouseMove);
  canvas.on('mouse:up', onCropMouseUp);
};

// ... (confirmCrop, setCropBoxSize, rotateActive, flipActive 保持不变) ...
export const confirmCrop = () => {
  if (!canvasRef?.value || !cropObject.value) return Promise.resolve();
  const canvas = canvasRef.value;
  const cropRect = cropObject.value;
  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (!bgImage) { cancelCrop(); return Promise.resolve(); }

  isApplyingCrop = true;
  const prevVpt = [...canvas.viewportTransform];
  const prevZoom = canvas.getZoom();
  const cropCenterLogic = cropRect.getCenterPoint();
  const cropCenterScreen = {
    x: cropCenterLogic.x * prevVpt[0] + prevVpt[4],
    y: cropCenterLogic.y * prevVpt[3] + prevVpt[5]
  };

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  cropRect.visible = false;
  const currentImageScale = bgImage.scaleX || 1;
  const multiplier = 1 / currentImageScale;
  const croppedDataUrl = canvas.toDataURL({
    left: cropRect.left, top: cropRect.top,
    width: cropRect.getScaledWidth(), height: cropRect.getScaledHeight(),
    format: "png", multiplier: multiplier,
  });
  canvas.setViewportTransform(prevVpt);
  cropRect.visible = true;

  return new Promise((resolve) => {
    bgImage.setSrc(croppedDataUrl, () => {
      cancelCrop(false);
      bgImage.set({
        originX: "center", originY: "center",
        left: canvas.width / 2, top: canvas.height / 2,
        scaleX: 1 / multiplier, scaleY: 1 / multiplier,
        angle: 0, flipX: false, flipY: false,
      });
      bgImage.setCoords();
      canvas.centerObject(bgImage);

      const newCenterLogic = { x: canvas.width / 2, y: canvas.height / 2 };
      const newPanX = cropCenterScreen.x - newCenterLogic.x * prevZoom;
      const newPanY = cropCenterScreen.y - newCenterLogic.y * prevZoom;
      canvas.setViewportTransform([prevZoom, 0, 0, prevZoom, newPanX, newPanY]);
      canvas.setZoom(prevZoom);

      isApplyingCrop = false;
      isCropping.value = false;
      canvas.fire('zoom:change', { from: 'crop-confirm' });
      canvas.requestRenderAll();
      if (saveHistoryFn) saveHistoryFn();
      resolve();
    });
  });
};

export const setCropBoxSize = (width, height) => {
  if (!cropObject.value || !canvasRef?.value) return;
  const obj = cropObject.value;
  const oldRealWidth = obj.getScaledWidth();
  const oldRealHeight = obj.getScaledHeight();
  const centerX = obj.left + oldRealWidth / 2;
  const centerY = obj.top + oldRealHeight / 2;
  obj.set({ width: width, height: height, scaleX: 1, scaleY: 1 });
  const newLeft = centerX - width / 2;
  const newTop = centerY - height / 2;
  obj.set({ left: newLeft, top: newTop });
  obj.setCoords();
  constrainCrop(obj);
  canvasRef.value.requestRenderAll();
};

export const rotateActive = (angle) => {
  if (cropObject.value && canvasRef?.value) {
    const canvas = canvasRef.value;
    const bgImage = canvas.getObjects().find((o) => o.type === "image");
    if (bgImage) {
      bgImage.rotate((bgImage.angle || 0) + angle);
      canvas.centerObject(bgImage);
      bgImage.setCoords();
      canvas.renderAll();
      startCrop(aspectRatioValue);
    }
    return true;
  }
  return false;
};

export const flipActive = (axis) => {
  if (cropObject.value && canvasRef?.value) {
    const canvas = canvasRef.value;
    const bgImage = canvas.getObjects().find((o) => o.type === "image");
    if (bgImage) {
      if (axis === "X") bgImage.set("flipX", !bgImage.flipX);
      if (axis === "Y") bgImage.set("flipY", !bgImage.flipY);
      canvas.requestRenderAll();
    }
    return true;
  }
  return false;
};

export {
  cropObject,
  isManualCropping,
  isRatioLocked,
  currentAspectRatio,
  isCropping,
  currentSelectionDims
};