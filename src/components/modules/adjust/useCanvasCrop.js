// src/components/modules/adjust/useCanvasCrop.js
import { ref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";

// 1. 引入通用规范工具
import { getLogicRect, animateRebound, constrainObjectToRect } from '@/composables/useConstraint';
import { renderHighResSnapshot } from '@/composables/useOffscreenHelper';

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
// 辅助工具
// =========================================================

const updateCurrentDims = (obj) => {
  if (!obj || !canvasRef?.value) return;
  const rect = getLogicRect(obj, canvasRef.value);
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
// 拖动图片的核心逻辑 (集成通用回弹)
// =========================================================
const onCropMouseDown = (opt) => {
  if (!canvasRef?.value || !cropObject.value) return;
  const target = opt.target;
  // 必须点击在剪裁框上（作为容器）
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
    // 自由拖拽，暂不约束，依靠 mouseUp 时的回弹
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
    if (canvasRef?.value && cropObject.value) {
      const bgImage = canvasRef.value.getObjects().find(o => o.type === 'image');
      if (bgImage) {
        // 【核心升级】使用通用动画回弹，确保图片始终填满裁剪框
        animateRebound(bgImage, cropObject.value, canvasRef.value);
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

  canvas.discardActiveObject();
  canvas.requestRenderAll();
  canvas.fire('zoom:change');
};

// =========================================================
// 约束裁剪框 (保持在图片范围内)
// 注意：裁剪框的约束逻辑特殊（Box inside Image），与 Resize（Image inside Box）相反
// 因此保留了部分特定的尺寸检查逻辑，但位置修正可复用逻辑
// =========================================================
export const constrainCrop = (activeObj) => {
  if (!canvasRef?.value || !activeObj) return;
  const canvas = canvasRef.value;

  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (!bgImage) return;

  const bgRect = getLogicRect(bgImage, canvas);
  const bgWidth = bgRect.width;
  const bgHeight = bgRect.height;
  const bgLeft = bgRect.left;
  const bgTop = bgRect.top;

  let currentScaleX = activeObj.scaleX;
  let currentScaleY = activeObj.scaleY;

  // 1. 尺寸约束：裁剪框不能比图片大
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

  // 2. 位置约束：裁剪框必须在图片内部
  // 计算边界
  const finalCropWidth = activeObj.getScaledWidth();
  const finalCropHeight = activeObj.getScaledHeight();

  // 限制左上角坐标
  const minLeft = bgLeft;
  const maxLeft = bgLeft + bgWidth - finalCropWidth;
  const minTop = bgTop;
  const maxTop = bgTop + bgHeight - finalCropHeight;

  let newLeft = Math.max(minLeft, Math.min(activeObj.left, maxLeft));
  let newTop = Math.max(minTop, Math.min(activeObj.top, maxTop));

  activeObj.set({ left: newLeft, top: newTop });
  activeObj.setCoords();

  updateCurrentDims(activeObj);
  canvas.requestRenderAll();
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
    isDraggingImage = false;

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

  // 使用 getLogicRect 获取准确的包围盒
  const rect = getLogicRect(activeObj, canvas);
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

  const rect = getLogicRect(activeObj, canvas);
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

  canvas.add(cropZone);
  canvas.setActiveObject(cropZone);
  cropObject.value = cropZone;
  canvas.renderAll();
  updateCurrentDims(cropZone);
  constrainCrop(cropZone);

  // 绑定拖图事件
  canvas.on('mouse:down', onCropMouseDown);
  canvas.on('mouse:move', onCropMouseMove);
  canvas.on('mouse:up', onCropMouseUp);
};

// =========================================================
// 确认裁剪 (高清重制版)
// =========================================================
export const confirmCrop = async () => {
  if (!canvasRef?.value || !cropObject.value) return Promise.resolve();
  const canvas = canvasRef.value;
  const cropRect = cropObject.value;
  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (!bgImage) { cancelCrop(); return Promise.resolve(); }

  isApplyingCrop = true;

  // 1. 获取裁剪区域的逻辑信息
  const cropLogicRect = getLogicRect(cropRect, canvas);
  const bgLogicRect = getLogicRect(bgImage, canvas);

  // 2. 计算目标导出尺寸 (基于原图分辨率)
  // 如果图片被缩放了(scale=0.5), 我们希望裁剪出来的图是基于原图大小的，所以目标尺寸要除以 scale
  const scaleFactor = bgImage.scaleX; // 假设均匀缩放
  const targetW = Math.round(cropLogicRect.width / scaleFactor);
  const targetH = Math.round(cropLogicRect.height / scaleFactor);

  if (targetW <= 0 || targetH <= 0) {
    cancelCrop();
    return Promise.resolve();
  }

  // 临时隐藏裁剪框，避免干扰
  cropRect.visible = false;

  // 3. 使用离屏渲染生成高清裁剪图
  const croppedDataUrl = await renderHighResSnapshot(bgImage, targetW, targetH, (highResImg) => {
    // 3.1 计算相对位置偏移 (使用中心点差值法，抗旋转干扰)
    const cropCenter = cropRect.getCenterPoint();
    const imgCenter = bgImage.getCenterPoint();

    // 计算中心点差距（逻辑像素）
    const diffX = imgCenter.x - cropCenter.x;
    const diffY = imgCenter.y - cropCenter.y;

    // 映射到原图尺度
    const finalDiffX = diffX / scaleFactor;
    const finalDiffY = diffY / scaleFactor;

    // 3.2 设置高分图属性
    highResImg.set({
      originX: 'center', originY: 'center',
      left: targetW / 2 + finalDiffX,
      top: targetH / 2 + finalDiffY,
      scaleX: 1, // 恢复到原图比例
      scaleY: 1,
      angle: bgImage.angle,
      flipX: bgImage.flipX,
      flipY: bgImage.flipY
    });
  });

  cropRect.visible = true;

  return new Promise((resolve) => {
    // 4. 应用回主画布
    bgImage.setSrc(croppedDataUrl, () => {
      cancelCrop(false);

      // 5. 物理重置：将新图片放回画布中心
      bgImage.set({
        originX: "center", originY: "center",
        left: canvas.width / 2, top: canvas.height / 2,
        scaleX: 1, scaleY: 1, // 裁剪后就是 1:1
        angle: 0, flipX: false, flipY: false,
      });
      bgImage.setCoords();
      canvas.centerObject(bgImage);

      // 6. 视口自适应 (Zoom to fit)
      // 让裁剪后的图片在屏幕上显示大小合适
      const paddingFactor = 0.85;
      const zoomToFit = Math.min(
        (canvas.width * paddingFactor) / targetW, // 注意这里用 targetW 可能会很大
        (canvas.height * paddingFactor) / targetH
      );

      // 因为 targetW 是原图尺寸，可能几千像素，我们这里计算的是 Zoom Level
      // 实际上展示时，我们希望它占据屏幕大部分
      // 重新计算：图片现在尺寸是 targetW * 1 * zoomToFit
      // 所以 Zoom 应该是 canvasSize / targetSize

      // 设置新的视口
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // 先重置
      const newZoom = zoomToFit;
      const center = canvas.getCenter();
      canvas.zoomToPoint({ x: center.left, y: center.top }, newZoom);

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