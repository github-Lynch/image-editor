// src/components/modules/adjust/useCanvasCrop.js
import { ref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";

// 1. 引入通用规范工具
import { getLogicRect, animateRebound, constrainObjectToRect } from '@/composables/useConstraint';
import { renderHighResSnapshot } from '@/composables/useOffscreenHelper';
import { useInteractionHelper } from '@/composables/useInteractionHelper';
const { isBreakThreshold } = useInteractionHelper();
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
// === 状态变量 (新增防抖相关) ===
let isDraggingImage = false;
let dragLastX = 0;
let dragLastY = 0;
let dragStartX = 0; // ✨ 新增：记录起始坐标
let dragStartY = 0;
let hasPassedThreshold = false;
let hasBrokenThreshold = false; // ✨ 新增：是否已突破阈值
const DRAG_THRESHOLD = 1; // ✨ 物理防抖阈值 (单位: 像素) [宪法 0.0]
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

/**
 * 修改位置：useCanvasCrop.js -> onCropMouseDown
 * 变更：允许点击主图或裁剪框触发拖拽
 */
const onCropMouseDown = (opt) => {
  if (!canvasRef?.value || !cropObject.value) return;

  // ✅ 产品规则 A：裁剪/旋转模块内禁止拖动主图
  // 原逻辑：在裁剪框内按下后进入“拖主图对齐裁剪框”的模式。
  // 现在要求彻底禁止，因此直接返回（不进入 isDraggingImage 状态）。
  return;

  // --- 以下为历史逻辑（保留作为参考）---
  // const target = opt.target;
  // const canvas = canvasRef.value;

  // 1. 逻辑判定：点击在裁剪框上
  if (target !== cropObject.value) return;

  const activeObj = canvas.getActiveObject();
  if (activeObj && activeObj.__corner) return;

  // 2. 初始化拖拽状态
  isDraggingImage = true;
  hasBrokenThreshold = false; // 重置阈值标记 [宪法 6.1]

  const pointer = canvas.getPointer(opt.e);
  dragStartX = pointer.x; // 记录物理起点
  dragStartY = pointer.y;
  dragLastX = pointer.x;
  dragLastY = pointer.y;

  canvas.defaultCursor = 'move';
};

const onCropMouseMove = (opt) => {
  // ✅ 产品规则 A：裁剪/旋转模块内禁止拖动主图
  // （历史逻辑：当 isDraggingImage=true 时，移动主图 left/top 来对齐裁剪框）
  return;

  // if (!isDraggingImage || !canvasRef?.value) return;
  // const canvas = canvasRef.value;
  // const pointer = canvas.getPointer(opt.e);

  // ✨ 调用通用防抖判定 [SSOT]
  if (!hasBrokenThreshold) {
    if (!isBreakThreshold({ x: dragStartX, y: dragStartY }, pointer, 2)) {
      return;
    }
    hasBrokenThreshold = true;
  }

  // 4. 计算增量并应用
  const deltaX = pointer.x - dragLastX;
  const deltaY = pointer.y - dragLastY;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (bgImage) {
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
    if (canvasRef?.value && cropObject.value && hasBrokenThreshold) {
      const bgImage = canvasRef.value.getObjects().find(o => o.type === 'image');
      if (bgImage) {
        // 只有产生过实际位移才执行回弹动画
        animateRebound(bgImage, cropObject.value, canvasRef.value);
      }
    }

    isDraggingImage = false;
    hasBrokenThreshold = false;
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
    zoomToCropArea(cropObject.value);
    canvas.requestRenderAll();
  } else {
    startCrop(ratio, { left, top, width: newW, height: newH });
  }
};

/**
 * 🛠️ 辅助函数：将相机视口调整至剪裁区域 (视口前置方案)
 * 逻辑：以当前剪裁框为 100% 目标，重新计算缩放和中心点 [宪法 0.0]
 */
const zoomToCropArea = (obj) => {
  if (!obj || !canvasRef?.value || !zoomToRectFn) return;

  // 获取裁剪框的逻辑几何信息
  const rect = {
    left: obj.left,
    top: obj.top,
    width: obj.getScaledWidth(),
    height: obj.getScaledHeight()
  };

  // 调用全局注册的视口调整函数
  // 该函数应包含计算 Z_target 并居中的逻辑 [宪法 0.7]
  zoomToRectFn(rect);
};

// =========================================================
// startCrop
// =========================================================
export const startCrop = (aspectRatio = null, customBox = null) => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  if (isManualCropping.value) endManualSelectionMode();

  let activeObj = canvas.getObjects().find((obj) => obj.type === "image");
  if (!activeObj) return;

  cancelCrop();

  const rect = getLogicRect(activeObj, canvas);
  let width, height, left, top;

  if (customBox) {
    width = customBox.width; height = customBox.height; left = customBox.left; top = customBox.top;
  } else {
    const imgWidth = rect.width; const imgHeight = rect.height;
    width = imgWidth; height = imgHeight;
    if (aspectRatio) {
      height = width / aspectRatio;
      if (height > imgHeight) { height = imgHeight; width = height * aspectRatio; }
    }
    left = rect.left + (imgWidth - width) / 2;
    top = rect.top + (imgHeight - height) / 2;
  }

  const cropZone = new fabric.Rect({
    left, top, width, height,
    fill: "transparent", stroke: "#409eff", strokeWidth: 2,
    cornerColor: "white", cornerStrokeColor: "#409eff", cornerSize: 12,
    transparentCorners: false, lockRotation: true, hasRotatingPoint: false,
    customTool: 'adjust', customTab: 'crop'
  });

  canvas.add(cropZone);
  canvas.setActiveObject(cropZone);
  cropObject.value = cropZone;

  updateCurrentDims(cropZone);
  constrainCrop(cropZone);

  // ✨✨✨ 核心变更：裁剪框确定后，立即调整相机视距 [宪法 0.0] ✨✨✨
  zoomToCropArea(cropZone);

  canvas.on('mouse:down', onCropMouseDown);
  canvas.on('mouse:move', onCropMouseMove);
  canvas.on('mouse:up', onCropMouseUp);

  canvas.requestRenderAll();
};

/**
 * 🛠️ 高精度 confirmCrop (消除微增感)
 * 逻辑：通过精确的浮点运算与中心点对齐，消除 1-2 像素的视觉漂移 [宪法 6.1]
 */
export const confirmCrop = async () => {
  if (!canvasRef?.value || !cropObject.value) return;
  const canvas = canvasRef.value;
  const cropRect = cropObject.value;
  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (!bgImage) return cancelCrop();

  isApplyingCrop = true;

  // 1. 获取绝对物理尺寸（不使用 Math.round 以减少舍入误差漂移）
  const scaleFactor = bgImage.scaleX;
  const cropScaledWidth = cropRect.getScaledWidth();
  const cropScaledHeight = cropRect.getScaledHeight();

  // 映射到原图尺度的目标尺寸
  const targetW = Math.floor(cropScaledWidth / scaleFactor);
  const targetH = Math.floor(cropScaledHeight / scaleFactor);

  if (targetW <= 0 || targetH <= 0) return cancelCrop();

  // 暂时隐藏裁剪框
  cropRect.visible = false;

  // 2. 高清快照生成
  const croppedDataUrl = await renderHighResSnapshot(bgImage, targetW, targetH, (highResImg) => {
    // 获取当前剪裁框和图片的中心点（世界坐标） [宪法 2.0]
    const cropCenter = cropRect.getCenterPoint();
    const imgCenter = bgImage.getCenterPoint();

    // 计算中心点偏移量（逻辑像素）
    const diffX = (imgCenter.x - cropCenter.x) / scaleFactor;
    const diffY = (imgCenter.y - cropCenter.y) / scaleFactor;

    highResImg.set({
      originX: 'center',
      originY: 'center',
      left: targetW / 2 + diffX,
      top: targetH / 2 + diffY,
      scaleX: 1,
      scaleY: 1,
      angle: bgImage.angle,
      flipX: bgImage.flipX,
      flipY: bgImage.flipY
    });
  });

  // 3. 应用变更
  bgImage.setSrc(croppedDataUrl, () => {
    cancelCrop(false);

    // ✨✨✨ 物理重置与视口重置强制同步 [宪法 0.0] ✨✨✨
    // 确保图片放置在画布中心，且视口完全回归 1:1
    bgImage.set({
      originX: "center",
      originY: "center",
      left: canvas.width / 2,
      top: canvas.height / 2,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
    });

    bgImage.setCoords();
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // 强制归一化

    isApplyingCrop = false;
    isCropping.value = false;

    if (saveHistoryFn) saveHistoryFn();
    canvas.fire('zoom:change', { from: 'crop-confirm' });
    canvas.requestRenderAll();
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