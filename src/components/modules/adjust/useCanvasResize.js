// src/components/modules/adjust/useCanvasResize.js

import { ref, unref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;

const previewRect = shallowRef(null);
let isDraggingImage = false;
let dragLastX = 0;
let dragLastY = 0;

let originalSelectable = true;
let originalEvented = true;
let originalTransform = null; 

export const registerResizeModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

export const getCurrentSize = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return { width: 0, height: 0 };
  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (bgImage) {
    return {
      width: Math.round(bgImage.getScaledWidth()),
      height: Math.round(bgImage.getScaledHeight())
    };
  }
  return { width: canvas.width, height: canvas.height };
};

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

const constrainImageToRect = (bgImage, targetRect) => {
  if (!bgImage || !targetRect) return;
  const bgRect = getLogicRect(bgImage);
  let deltaX = 0;
  let deltaY = 0;

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

const onPreviewMouseDown = (opt) => {
  if (!canvasRef?.value || !previewRect.value) return;
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
        constrainImageToRect(bgImage, getLogicRect(previewRect.value));
        canvasRef.value.requestRenderAll();
      }
    }
    isDraggingImage = false;
    if (canvasRef?.value) canvasRef.value.defaultCursor = 'default';
  }
};

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

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  const currentImgCenter = bgImage.getCenterPoint();

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
      originY: bgImage.originY,
      centerX: currentImgCenter.x,
      centerY: currentImgCenter.y
    };
  }

  if (previewRect.value) {
    canvas.remove(toRaw(previewRect.value));
    previewRect.value = null;
  }

  const targetCenter = { x: originalTransform.centerX, y: originalTransform.centerY };

  if (!isStretch) {
    restoreImageState(bgImage);
  } else {
    bgImage.selectable = false;
    bgImage.evented = false;
  }

  const imgW = originalTransform.width * originalTransform.scaleX;
  const imgH = originalTransform.height * originalTransform.scaleY;
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

  const rect = new fabric.Rect({
    width: previewW,
    height: previewH,
    left: targetCenter.x,
    top: targetCenter.y,
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

  if (!isStretch) {
    const rectLogic = getLogicRect(rect);
    constrainImageToRect(bgImage, rectLogic);
    canvas.on('mouse:down', onPreviewMouseDown);
    canvas.on('mouse:move', onPreviewMouseMove);
    canvas.on('mouse:up', onPreviewMouseUp);
  } else {
    bgImage.set({
      scaleX: previewW / originalTransform.width,
      scaleY: previewH / originalTransform.height,
      left: targetCenter.x,
      top: targetCenter.y,
      originX: 'center',
      originY: 'center'
    });
    canvas.off('mouse:down', onPreviewMouseDown);
    canvas.off('mouse:move', onPreviewMouseMove);
    canvas.off('mouse:up', onPreviewMouseUp);
  }

  bgImage.setCoords();
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
      restoreImageState(bgImage);
      bgImage.selectable = originalSelectable;
      bgImage.evented = originalEvented;
    }
    canvas.discardActiveObject();
    originalTransform = null;
    canvas.requestRenderAll();
  }
};

/**
 * 应用尺寸调整：修复二次偏移跑偏，保持逻辑与剪裁模块高度统一
 */
export const applyResize = (width, height, isStretch = false) => {
  const canvas = unref(canvasRef);
  if (!canvas || !previewRect.value) return;

  const targetW = Math.round(width);
  const targetH = Math.round(height);
  if (targetW <= 0 || targetH <= 0) return;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  // 1. 【核心修复】：基于 getCenterPoint 捕获精准视觉状态，不受 Origin 干扰
  const rect = previewRect.value;
  const prevVpt = [...canvas.viewportTransform];
  const prevZoom = canvas.getZoom();
  
  const rectCenterLogic = rect.getCenterPoint();
  const rectCenterScreen = {
    x: rectCenterLogic.x * prevVpt[0] + prevVpt[4],
    y: rectCenterLogic.y * prevVpt[3] + prevVpt[5]
  };

  const finalPos = { 
    logicalW: rect.width * rect.scaleX,
    logicalH: rect.height * rect.scaleY
  };

  const originalSrc = bgImage.getSrc();
  originalTransform = null; 

  fabric.Image.fromURL(originalSrc, (highResImg) => {
    const tempCanvas = new fabric.StaticCanvas(null, {
      width: targetW,
      height: targetH,
      backgroundColor: 'transparent'
    });

    const multiplier = targetW / finalPos.logicalW;

    if (isStretch) {
      highResImg.set({
        originX: 'center', originY: 'center',
        left: targetW / 2, top: targetH / 2,
        scaleX: targetW / highResImg.width,
        scaleY: targetH / highResImg.height
      });
    } else {
      // ✅ 核心修复：计算“图片中心”相对于“预览框中心”的逻辑偏移
      const imgCenter = bgImage.getCenterPoint();
      const relCenterX = imgCenter.x - rectCenterLogic.x;
      const relCenterY = imgCenter.y - rectCenterLogic.y;

      highResImg.set({
        originX: 'center', originY: 'center',
        left: (targetW / 2) + (relCenterX * multiplier),
        top: (targetH / 2) + (relCenterY * multiplier),
        scaleX: bgImage.scaleX * multiplier,
        scaleY: bgImage.scaleY * multiplier,
        angle: bgImage.angle,
        flipX: bgImage.flipX,
        flipY: bgImage.flipY
      });
    }

    tempCanvas.add(highResImg);
    tempCanvas.renderAll();
    const dataURL = tempCanvas.toDataURL({ format: 'png', quality: 1 });
    tempCanvas.dispose();

    bgImage.setSrc(dataURL, () => {
      // ✅ 核心修复：应用后将图片物理重置到画布中心，配合视口补偿
      const newZoom = prevZoom / multiplier;

      bgImage.set({
        originX: "center", originY: "center",
        angle: 0, flipX: false, flipY: false,
        scaleX: 1, scaleY: 1, // 结果图已经是目标尺寸，缩放设为 1
        left: canvas.width / 2, 
        top: canvas.height / 2,
      });
      
      bgImage.setCoords();
      canvas.centerObject(bgImage);

      // ✅ 核心修复：计算视口补偿，确保视觉位置精准对齐
      const newCenterLogic = { x: canvas.width / 2, y: canvas.height / 2 };
      const newPanX = rectCenterScreen.x - newCenterLogic.x * newZoom;
      const newPanY = rectCenterScreen.y - newCenterLogic.y * newZoom;

      canvas.setViewportTransform([newZoom, 0, 0, newZoom, newPanX, newPanY]);
      
      stopPreview();
      canvas.requestRenderAll();
      canvas.fire('zoom:change', { from: 'resize-apply' });

      if (saveHistoryFn) saveHistoryFn();
    });
  }, { crossOrigin: 'anonymous' });
};