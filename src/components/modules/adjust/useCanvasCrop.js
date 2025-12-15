// src/components/modules/adjust/useCanvasCrop.js
import { ref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";

// === 【关键】状态提升到模块作用域（单例模式） ===
// 这样在任何组件 import 这些变量时，拿到的都是同一份引用
const cropObject = shallowRef(null);
const isManualCropping = ref(false);

// 内部持有 canvas 和 saveHistory 的引用
// 它们将在 registerCropModule 中被赋值
let canvasRef = null;
let saveHistoryFn = null;

// 内部变量
let selectionRect = null;
let maskRect = null;
let selectionStartX = 0;
let selectionStartY = 0;
let aspectRatioValue = null;

/**
 * 注册模块：由 useCanvas 在初始化时调用，注入 canvas 实例
 */
export const registerCropModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

// 聚焦动画相关变量
let defaultViewport = [1, 0, 0, 1, 0, 0];
/**
 * 【新增】聚焦到剪裁框
 * @param {fabric.Object} targetObj - 剪裁框对象
 */
const focusOnCrop = (targetObj) => {
  if (!canvasRef?.value || !targetObj) return;
  const canvas = canvasRef.value;

  // 1. 记录当前视口作为“默认状态”，以便后续还原 (仅第一次记录)
  // 如果你的画布本身支持缩放拖拽，这里可能需要更复杂的逻辑来决定“还原到哪里”
  // 这里假设还原到 "fit canvas to screen" 的初始状态
  if (JSON.stringify(defaultViewport) === JSON.stringify([1, 0, 0, 1, 0, 0])) {
      defaultViewport = [...canvas.viewportTransform];
  }

  // 2. 获取画布尺寸
  const canvasW = canvas.getWidth();
  const canvasH = canvas.getHeight();

  // 3. 获取目标对象的几何信息
  const rect = targetObj.getBoundingRect();
  const targetW = rect.width;
  const targetH = rect.height;
  const targetCenter = targetObj.getCenterPoint();

  // 4. 计算目标缩放级别 (Zoom)
  // 我们希望目标占据屏幕的 85% (0.85)，留出一点边距
  const paddingFactor = 0.85; 
  // 计算宽和高的缩放比，取较小值以保证完全容纳
  let zoom = Math.min(canvasW / targetW, canvasH / targetH) * paddingFactor;

  // 限制最大放大倍数，防止选区太小时放大得过于模糊 (例如最大放大 5 倍)
  if (zoom > 5) zoom = 5;
  // 限制最小缩放，防止比原始视角还小
  if (zoom < 1) zoom = 1; 

  // 5. 计算目标平移 (Pan) - 也就是视口偏移量
  // 公式：视口中心 - (物体中心 * 缩放倍率)
  const panX = (canvasW / 2) - (targetCenter.x * zoom);
  const panY = (canvasH / 2) - (targetCenter.y * zoom);

  // 6. 执行动画 (使用 fabric.util.animate 产生平滑过渡)
  const currentVpt = canvas.viewportTransform;
  
  fabric.util.animate({
    startValue: { 
      zoom: currentVpt[0], 
      x: currentVpt[4], 
      y: currentVpt[5] 
    },
    endValue: { 
      zoom: zoom, 
      x: panX, 
      y: panY 
    },
    duration: 400, // 动画时长 400ms
    easing: fabric.util.ease.easeOutQuad, // 缓动函数
    onChange: (value) => {
      canvas.setViewportTransform([value.zoom, 0, 0, value.zoom, value.x, value.y]);
      canvas.requestRenderAll();
    },
    onComplete: () => {
      // 动画结束后再次确保坐标正确 (防止浮点数误差)
      canvas.setViewportTransform([zoom, 0, 0, zoom, panX, panY]);
      targetObj.setCoords(); // 更新控制点
    }
  });
};

/**
 * 【新增】还原视角
 */
const resetZoom = () => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  
  // 同样使用动画还原
  const currentVpt = canvas.viewportTransform;
  
  fabric.util.animate({
    startValue: { 
      zoom: currentVpt[0], 
      x: currentVpt[4], 
      y: currentVpt[5] 
    },
    endValue: { 
      zoom: defaultViewport[0], 
      x: defaultViewport[4], 
      y: defaultViewport[5] 
    },
    duration: 300,
    easing: fabric.util.ease.easeOutQuad,
    onChange: (value) => {
      canvas.setViewportTransform([value.zoom, 0, 0, value.zoom, value.x, value.y]);
      canvas.requestRenderAll();
    }
  });
};

// === 核心功能：约束逻辑 (回弹矫正版) ===
// === 核心功能：约束逻辑 (抗缩放干扰 + 尺寸压缩 + 位置回弹) ===
export const constrainCrop = (activeObj) => {
  if (!canvasRef?.value || !activeObj) return;

  const bgImage = canvasRef.value.getObjects().find((o) => o.type === "image");
  if (!bgImage) return;

  // 【核心修正点】：不要用 getBoundingRect()，那个会受 Zoom 影响
  // 直接读取对象的逻辑坐标和缩放，这是“绝对真值”
  
  // 1. 获取背景图的逻辑边界 (Model Coordinates)
  const bgScaleX = bgImage.scaleX;
  const bgScaleY = bgImage.scaleY;
  const bgWidth = bgImage.width * bgScaleX;
  const bgHeight = bgImage.height * bgScaleY;
  const bgLeft = bgImage.left;
  const bgTop = bgImage.top;

  // 2. 获取剪裁框的逻辑尺寸
  let currentScaleX = activeObj.scaleX;
  let currentScaleY = activeObj.scaleY;
  
  // getScaledWidth() 在某些版本也会受 viewport 影响，最稳妥是用 raw math
  let cropCurrentWidth = activeObj.width * currentScaleX;
  let cropCurrentHeight = activeObj.height * currentScaleY;

  // 3. === 步骤一：尺寸修正 (Size Correction) ===
  // 确保框不比图大
  let sizeChanged = false;

  // 宽度检查
  if (cropCurrentWidth > bgWidth + 1) { // +1 是容差
    currentScaleX = bgWidth / activeObj.width;
    cropCurrentWidth = bgWidth; // 更新当前宽，供后面位置计算用
    sizeChanged = true;
  }

  // 高度检查
  if (cropCurrentHeight > bgHeight + 1) {
    currentScaleY = bgHeight / activeObj.height;
    cropCurrentHeight = bgHeight; // 更新当前高
    sizeChanged = true;
  }

  if (sizeChanged) {
    activeObj.set({
      scaleX: currentScaleX,
      scaleY: currentScaleY
    });
  }

  // 4. === 步骤二：位置修正 (Position Correction) ===
  
  // 计算 Left 的安全范围 (基于纯逻辑坐标)
  const minLeft = bgLeft;
  const maxLeft = bgLeft + bgWidth - cropCurrentWidth;

  // 计算 Top 的安全范围
  const minTop = bgTop;
  const maxTop = bgTop + bgHeight - cropCurrentHeight;

  let newLeft = activeObj.left;
  let newTop = activeObj.top;

  // 修正 X 轴
  // 注意：如果剪裁框比背景宽(极少数情况)，maxLeft 会小于 minLeft，Math.min 会取 maxLeft
  // 所以我们需要处理这种情况，通常让它居中或贴左
  if (cropCurrentWidth >= bgWidth) {
      newLeft = bgLeft;
  } else {
      newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
  }

  // 修正 Y 轴
  if (cropCurrentHeight >= bgHeight) {
      newTop = bgTop;
  } else {
      newTop = Math.max(minTop, Math.min(newTop, maxTop));
  }

  // 5. 应用最终位置
  activeObj.set({
    left: newLeft,
    top: newTop
  });

  // 6. 刷新
  activeObj.setCoords(); 
  canvasRef.value.requestRenderAll();
};

// === 核心功能：取消裁剪 ===
export const cancelCrop = () => {
  if (canvasRef?.value && cropObject.value) {
    const rawObj = toRaw(cropObject.value);
    canvasRef.value.remove(rawObj);
    cropObject.value = null;
    canvasRef.value.renderAll();
    // 取消时还原视角
    resetZoom();
  }
};

// === 手动选区逻辑 ===
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

  if (selectionRect) {
    canvas.remove(selectionRect);
    selectionRect = null;
  }
  if (maskRect) {
    canvas.remove(maskRect);
    maskRect = null;
  }
  
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
    left: selectionStartX,
    top: selectionStartY,
    width: 0,
    height: 0,
    fill: 'transparent',
    stroke: '#fff',
    strokeWidth: 2,
    strokeDashArray: [6, 6],
    selectable: false,
    evented: false
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
  canvasRef.value.requestRenderAll();
};

const onSelectionUp = () => {
  if (!selectionRect) {
    endManualSelectionMode();
    return;
  }
  const box = {
    left: selectionRect.left,
    top: selectionRect.top,
    width: selectionRect.width,
    height: selectionRect.height
  };
  endManualSelectionMode();
  if (box.width < 10 || box.height < 10) return;
  startCrop(null, box);
};

export const startManualSelection = () => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  cancelCrop(); 
  
  canvas.getObjects().forEach(o => {
    o.selectable = false;
    o.evented = false; 
  });

  maskRect = new fabric.Rect({
    left: -5000, 
    top: -5000,
    width: 20000, 
    height: 20000,
    fill: 'rgba(0, 0, 0, 0.45)', 
    selectable: false,
    evented: false, 
    excludeFromExport: true
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
// 【新增】标记比例是否锁定
const isRatioLocked = ref(false); 
// 【新增】记录当前的宽高比数值 (例如 1.5 或 0.5625)
const currentAspectRatio = ref(null);
/**
 * 应用特定的裁剪比例
 * @param {number|null} ratio - 宽高比 (width / height)，传入 null 表示自由比例
 */
export const setCropRatio = (ratio) => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  
  // 1. 设置状态
  if (ratio === null) {
    isRatioLocked.value = false;
    currentAspectRatio.value = null;
    
    // 如果已经有裁剪框，解锁它的缩放限制
    if (cropObject.value) {
      cropObject.value.set({ lockUniScaling: false });
      canvas.requestRenderAll();
    }
    return;
  }

  // 2. 锁定比例状态
  isRatioLocked.value = true;
  currentAspectRatio.value = ratio;

  // 3. 获取计算基准 (【关键修改】：强制始终基于原图计算)
  let baseW, baseH, left, top;
  const activeObj = canvas.getObjects().find((obj) => obj.type === "image");
  if (!activeObj) return;

  // 无论当前是否有 cropObject，都从 activeObj (背景图) 获取基准信息
  // 这样保证了“每次都按照最初读取到的图片真实尺寸为标准”
  const rect = activeObj.getBoundingRect();
  baseW = rect.width;
  baseH = rect.height;
  left = rect.left;
  top = rect.top;

  // 4. 【核心算法】计算最大内含尺寸 (Fit Inside)
  // 比较当前矩形的比例与目标比例
  const currentRatio = baseW / baseH;
  let newW, newH;

  if (currentRatio > ratio) {
    // 图片比目标更“宽”，以高度为基准 (高度撑满，宽度缩小)
    newH = baseH;
    newW = newH * ratio;
    // 居中调整 left
    left += (baseW - newW) / 2;
  } else {
    // 图片比目标更“瘦”，以宽度为基准 (宽度撑满，高度缩小)
    newW = baseW;
    newH = newW / ratio;
    // 居中调整 top
    top += (baseH - newH) / 2;
  }

  // 5. 应用或创建裁剪框
  if (cropObject.value) {
    cropObject.value.set({
      width: newW,
      height: newH,
      left: left,
      top: top,
      scaleX: 1, // 重置缩放，直接改宽高
      scaleY: 1,
      lockUniScaling: true // 锁定等比缩放
    });
    cropObject.value.setCoords();
    // 立即进行边界约束检查
    constrainCrop(cropObject.value); 
    canvas.requestRenderAll();
  } else {
    // 如果还没开始裁剪，直接启动
    startCrop(ratio, { left, top, width: newW, height: newH });
  }
};

// === 核心功能：开始裁剪 ===
export const startCrop = (aspectRatio = null, customBox = null) => {
  if (!canvasRef?.value) return;
  const canvas = canvasRef.value;
  
  if (isManualCropping.value) endManualSelectionMode();

  aspectRatioValue = aspectRatio || null;
  let activeObj = canvas.getObjects().find((obj) => obj.type === "image");
  if (!activeObj) return;

  cancelCrop();

  const rect = activeObj.getBoundingRect();
  let width, height, left, top;

  if (customBox) {
    width = customBox.width;
    height = customBox.height;
    left = customBox.left;
    top = customBox.top;
  } else {
    const imgWidth = rect.width;
    const imgHeight = rect.height;
    width = imgWidth * 1;
    height = imgHeight * 1;

    if (aspectRatio) {
      height = width / aspectRatio;
      if (height > imgHeight) {
        height = imgHeight;
        width = height * aspectRatio;
      }
      isRatioLocked.value = true;
      currentAspectRatio.value = aspectRatio;
    }else{
      isRatioLocked.value = false;
      currentAspectRatio.value = null;
    }
    left = rect.left + (imgWidth - width) / 2;
    top = rect.top + (imgHeight - height) / 2;
  }


  const cropZone = new fabric.Rect({
    left: left,
    top: top,
    width: width,
    height: height,
    fill: "transparent",
    stroke: "#409eff",
    strokeWidth: 2,
    cornerColor: "white",
    cornerStrokeColor: "#409eff",
    cornerSize: 12,
    transparentCorners: false,
    lockRotation: true,
    hasRotatingPoint: false,
    lockUniScaling: !!aspectRatio 
  });

  if (aspectRatio) {
    cropZone.set("height", width / aspectRatio);
  }

  canvas.add(cropZone);
  canvas.setActiveObject(cropZone);
  cropObject.value = cropZone;
  canvas.renderAll();
  
  constrainCrop(cropZone);
  // 聚焦到剪裁框
  focusOnCrop(cropZone);
};

// === 核心功能：确认裁剪 ===
export const confirmCrop = () => {
  if (!canvasRef?.value || !cropObject.value) return;
  const canvas = canvasRef.value;
  const cropRect = cropObject.value;
  const bgImage = canvas.getObjects().find((o) => o.type === "image");
  if (!bgImage) return cancelCrop();

  cropRect.visible = false;
  
  const croppedDataUrl = canvas.toDataURL({
    left: cropRect.left,
    top: cropRect.top,
    width: cropRect.getScaledWidth(),
    height: cropRect.getScaledHeight(),
    format: "png",
    multiplier: 1,
  });

  bgImage.setSrc(croppedDataUrl, () => {
    bgImage.set({
      originX: "left",
      originY: "top",
      left: cropRect.left,
      top: cropRect.top,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false,
      width: cropRect.getScaledWidth(),
      height: cropRect.getScaledHeight(),
    });
    bgImage.setCoords();
    cancelCrop();
    canvas.renderAll();
    if (saveHistoryFn) saveHistoryFn();
  });
};

export const setCropBoxSize = (width, height) => {
  if (!cropObject.value || !canvasRef?.value) return;
  cropObject.value.set({ width, height });
  cropObject.value.setCoords();
  canvasRef.value.renderAll();
  constrainCrop(cropObject.value);
};

// === 旋转和翻转 ===
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

// 导出状态，供外部监听
export { 
  cropObject, 
  isManualCropping,
  isRatioLocked,
  currentAspectRatio,
};