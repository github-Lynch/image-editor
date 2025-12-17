// src/components/modules/adjust/useCanvasResize.js

import { ref, unref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;

// === 预览相关状态 ===
const previewRect = shallowRef(null);
let isDraggingImage = false;
let dragLastX = 0;
let dragLastY = 0;

// 记录交互状态 & 原始变换状态 (用于取消或切换模式时恢复)
let originalSelectable = true;
let originalEvented = true;
let originalTransform = null; // 新增：用于保存图片原始的缩放和位置

export const registerResizeModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

export const getCurrentSize = () => {
  if (!canvasRef?.value) return { width: 0, height: 0 };
  const canvas = canvasRef.value;
  return { width: canvas.width, height: canvas.height };
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

// =========================================================
// 约束逻辑 (仅在裁剪模式下使用)
// =========================================================
const constrainImageToRect = (bgImage, targetRect) => {
  if (!bgImage || !targetRect) return;

  const bgRect = getLogicRect(bgImage);
  let deltaX = 0;
  let deltaY = 0;

  // 简单碰撞检测
  if (bgRect.left > targetRect.left) deltaX = targetRect.left - bgRect.left;
  if (bgRect.top > targetRect.top) deltaY = targetRect.top - bgRect.top;

  const bgRight = bgRect.left + bgRect.width;
  const targetRight = targetRect.left + targetRect.width;
  if (bgRight < targetRight) deltaX = targetRight - bgRight;

  const bgBottom = bgRect.top + bgRect.height;
  const targetBottom = targetRect.top + targetRect.height;
  if (bgBottom < targetBottom) deltaY = targetBottom - bgBottom;

  if (deltaX !== 0 || deltaY !== 0) {
    bgImage.left += deltaX;
    bgImage.top += deltaY;
    bgImage.setCoords();
  }
};

// =========================================================
// 拖拽逻辑 (仅在裁剪模式下生效)
// =========================================================
const onPreviewMouseDown = (opt) => {
  if (!canvasRef?.value || !previewRect.value) return;
  // 如果是拉伸模式，禁止拖拽图片
  if (previewRect.value.data?.isStretch) return;

  const canvas = canvasRef.value;
  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  isDraggingImage = true;
  const pointer = canvas.getPointer(opt.e);
  dragLastX = pointer.x;
  dragLastY = pointer.y;
  canvas.defaultCursor = 'move';
};

const onPreviewMouseMove = (opt) => {
  if (!isDraggingImage || !canvasRef?.value) return;
  const canvas = canvasRef.value;
  const pointer = canvas.getPointer(opt.e);
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

const onPreviewMouseUp = () => {
  if (isDraggingImage) {
    if (canvasRef?.value && previewRect.value) {
      const bgImage = canvasRef.value.getObjects().find(o => o.type === 'image');
      if (bgImage) {
        const rectLogic = getLogicRect(previewRect.value);
        constrainImageToRect(bgImage, rectLogic);
        canvasRef.value.requestRenderAll();
      }
    }
    isDraggingImage = false;
    if (canvasRef?.value) canvasRef.value.defaultCursor = 'default';
  }
};

// =========================================================
// 预览控制 (核心修改部分)
// =========================================================

// 恢复图片的原始状态（用于切换模式或取消时）
const restoreImageState = (bgImage) => {
  if (originalTransform && bgImage) {
    bgImage.set({
      scaleX: originalTransform.scaleX,
      scaleY: originalTransform.scaleY,
      left: originalTransform.left,
      top: originalTransform.top,
      width: originalTransform.width,
      height: originalTransform.height,
      angle: originalTransform.angle,
      originX: originalTransform.originX,
      originY: originalTransform.originY
    });
    bgImage.setCoords();
  }
};

export const startPreview = (targetW, targetH, isStretch = false) => {
  const canvas = unref(canvasRef);
  if (!canvas || !targetW || !targetH) return;

  // 1. 获取背景图
  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  // 2. 第一次进入必须保存原始状态 (这是我们的“唯一真理来源”)
  if (!originalTransform) {
    originalSelectable = bgImage.selectable;
    originalEvented = bgImage.evented;
    originalTransform = {
      scaleX: bgImage.scaleX,
      scaleY: bgImage.scaleY,
      left: bgImage.left,
      top: bgImage.top,
      width: bgImage.width,
      height: bgImage.height,
      angle: bgImage.angle,
      originX: bgImage.originX,
      originY: bgImage.originY
    };
  }

  // 3. 清理旧的预览框
  if (previewRect.value) {
    canvas.remove(toRaw(previewRect.value));
    previewRect.value = null;
  }

  // 【修复核心】：如果是拉伸模式，不要把图片恢复成原样，否则会闪烁！
  // 只有在“保真/裁剪模式”下，才需要图片恢复正常比例供用户操作。
  if (!isStretch) {
    restoreImageState(bgImage);
  } else {
    // 如果是拉伸模式，我们只锁定交互，不重置视觉，直接平滑过渡到下一个尺寸
    bgImage.selectable = false;
    bgImage.evented = false;
  }

  // === 计算预览框尺寸 ===
  // 注意：计算必须使用 originalTransform (原始数据)，不能用 bgImage (因为它可能被拉伸了)
  const imgW = originalTransform.width * originalTransform.scaleX;
  const imgH = originalTransform.height * originalTransform.scaleY;
  const center = canvas.getCenter();

  const targetRatio = targetW / targetH;
  const imgRatio = imgW / imgH;

  let previewW, previewH;

  if (targetRatio > imgRatio) {
    previewW = imgW;
    previewH = imgW / targetRatio;
  } else {
    previewH = imgH;
    previewW = imgH * targetRatio;
  }

  // 5. 绘制蓝框
  const rect = new fabric.Rect({
    width: previewW,
    height: previewH,
    left: center.left,
    top: center.top,
    originX: 'center',
    originY: 'center',
    fill: 'transparent',
    stroke: '#409eff',
    strokeWidth: 2,
    strokeDashArray: [6, 6],
    selectable: false,
    evented: false,
    excludeFromExport: true,
    data: { isStretch }
  });

  previewRect.value = rect;
  canvas.add(rect);
  canvas.bringToFront(rect);

  // === 应用拉伸或交互逻辑 ===
  if (isStretch) {
    // 【非保真模式】：强制拉伸图片以填充蓝框
    // 算法：目标尺寸(previewW) / 图片原始物理宽度(originalTransform.width)
    // 这样每次都是基于“原始数据”计算出“新的缩放比”，直接 apply，不会有中间态
    const newScaleX = previewW / originalTransform.width;
    const newScaleY = previewH / originalTransform.height;

    bgImage.set({
      scaleX: newScaleX,
      scaleY: newScaleY,
      left: center.left,
      top: center.top,
      originX: 'center',
      originY: 'center'
    });
    bgImage.setCoords();

    // 移除拖拽事件
    canvas.off('mouse:down', onPreviewMouseDown);
    canvas.off('mouse:move', onPreviewMouseMove);
    canvas.off('mouse:up', onPreviewMouseUp);

  } else {
    // 【保真模式】：绑定拖拽事件
    bgImage.setCoords();
    canvas.on('mouse:down', onPreviewMouseDown);
    canvas.on('mouse:move', onPreviewMouseMove);
    canvas.on('mouse:up', onPreviewMouseUp);
  }

  canvas.requestRenderAll();
};

export const updatePreview = (targetW, targetH, isStretch = false) => {
  startPreview(targetW, targetH, isStretch);
};

export const stopPreview = () => {
  const canvas = unref(canvasRef);
  if (canvas) {
    canvas.off('mouse:down', onPreviewMouseDown);
    canvas.off('mouse:move', onPreviewMouseMove);
    canvas.off('mouse:up', onPreviewMouseUp);

    if (previewRect.value) {
      canvas.remove(toRaw(previewRect.value));
      previewRect.value = null;
    }

    const bgImage = canvas.getObjects().find(o => o.type === 'image');
    if (bgImage) {
      // 退出预览时，彻底恢复到最初的样子
      restoreImageState(bgImage);
      bgImage.selectable = originalSelectable;
      bgImage.evented = originalEvented;
    }
    canvas.discardActiveObject();
    originalTransform = null; // 清空记录
    canvas.requestRenderAll();
  }
};

// =========================================================
// 应用尺寸调整
// =========================================================
export const applyResize = (width, height, isStretch = false) => {
  const canvas = unref(canvasRef);
  if (!canvas || !previewRect.value) return;

  width = Math.round(width);
  height = Math.round(height);
  if (width <= 0 || height <= 0) return;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;
  originalTransform = null;
  // 1. 截图准备
  const rect = previewRect.value;
  rect.visible = false;

  const originalVpt = [...canvas.viewportTransform];
  const oldZoom = originalVpt[0];
  const oldPanX = originalVpt[4];
  const oldPanY = originalVpt[5];

  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

  // 计算裁剪区域
  // 注意：在 isStretch 模式下，图片已经被我们在 updatePreview 中物理拉伸了
  // 所以直接截取 rect 的范围，得到的就是拉伸后的图像数据
  const cropLeft = rect.left - (rect.width * rect.scaleX) / 2;
  const cropTop = rect.top - (rect.height * rect.scaleY) / 2;
  const cropWidth = rect.width * rect.scaleX;
  const cropHeight = rect.height * rect.scaleY;

  // 计算最终输出的倍率
  const multiplier = width / cropWidth;

  // 2. 生成新图
  const dataURL = canvas.toDataURL({
    left: cropLeft,
    top: cropTop,
    width: cropWidth,
    height: cropHeight,
    format: 'png',
    multiplier: multiplier
  });

  // 截图完毕，恢复视口，避免加载等待期间画面跳动
  canvas.setViewportTransform(originalVpt);

  // 3. 加载新图
  bgImage.setSrc(dataURL, () => {
    // 新图加载完毕，清理旧状态

    // 这里的 restoreImageState 调用很重要
    // 因为 setSrc 只是换了源图，但对象的 scaleX/scaleY 还是刚才预览时的拉伸状态
    // 我们需要重置它们为 1 (因为新图本身已经是处理好的尺寸了)
    bgImage.set({
      scaleX: 1, scaleY: 1,
      angle: 0, flipX: false, flipY: false,
      left: 0, top: 0,
      originX: 'center', originY: 'center',
      cropX: 0, cropY: 0
    });

    // 因为已经应用了，所以不需要再恢复到 originalTransform 了
    // 我们手动清空它，防止 stopPreview 被调用时回滚回旧图
    originalTransform = null;

    canvas.centerObject(bgImage);
    bgImage.setCoords();

    stopPreview(); // 此时 stopPreview 内部发现 originalTransform 为空，就不会执行回滚

    // === 计算视觉补偿 (保持画布在屏幕视觉大小不变) ===
    const newZoom = oldZoom / multiplier;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const screenCenterX = centerX * oldZoom + oldPanX;
    const screenCenterY = centerY * oldZoom + oldPanY;
    const newPanX = screenCenterX - centerX * newZoom;
    const newPanY = screenCenterY - centerY * newZoom;

    canvas.setViewportTransform([newZoom, 0, 0, newZoom, newPanX, newPanY]);
    canvas.requestRenderAll();
    canvas.fire('zoom:change', { from: 'resize-apply' });

    if (saveHistoryFn) saveHistoryFn();
  });
};