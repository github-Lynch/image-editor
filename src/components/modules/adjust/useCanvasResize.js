// src/components/modules/adjust/useCanvasResize.js
import { ref, unref, shallowRef, toRaw } from "vue";
import { fabric } from "fabric";

// 1. 引入通用物理约束与离屏渲染工具
import { constrainObjectToRect, animateRebound } from '@/composables/useConstraint';
import { renderHighResSnapshot } from '@/composables/useOffscreenHelper';

// === 新增：同步其它对象（文本、标尺等）在拉伸模式下的变换 ===
const transformOtherObjects = (canvas, scaleXFact, scaleYFact, centerX, centerY, bgImage, previewRef) => {
  if (!canvas) return;
  const objects = canvas.getObjects();
  objects.forEach(obj => {
    if (
      obj === bgImage ||
      obj === previewRef ||
      obj.excludeFromExport ||
      obj.isMaskObject
    ) {
      return; // 跳过主图、预览框、遮罩、临时对象
    }

    // 1. 计算中心点相对位移
    const cpt = obj.getCenterPoint();
    const dx = cpt.x - centerX;
    const dy = cpt.y - centerY;

    const newCenterX = centerX + dx * scaleXFact;
    const newCenterY = centerY + dy * scaleYFact;

    // 首次备份原始变换，便于后续还原
    if (!obj._resizeBackup) {
      obj._resizeBackup = {
        scaleX: obj.scaleX,
        scaleY: obj.scaleY,
        left: obj.left,
        top: obj.top,
        originX: obj.originX,
        originY: obj.originY
      };
    }

    // 2. 缩放对象本身
    obj.scaleX = (obj.scaleX || 1) * scaleXFact;
    obj.scaleY = (obj.scaleY || 1) * scaleYFact;

    // 3. 更新位置
    obj.set({ left: newCenterX, top: newCenterY, originX: 'center', originY: 'center' });
    obj.setCoords();
  });
};

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

// --- 交互事件处理 ---

const onPreviewMouseDown = (opt) => {
  if (!canvasRef?.value || !previewRect.value) return;
  // 拉伸模式下禁止拖拽
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
    // 自由拖拽，暂不约束，依靠 mouseUp 时的回弹
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
        // 【核心升级】使用带动画的弹性回弹
        animateRebound(bgImage, previewRect.value, canvasRef.value);
      }
    }
    isDraggingImage = false;
    if (canvasRef?.value) canvasRef.value.defaultCursor = 'default';
  }
};

// --- 辅助函数 ---

const restoreOtherObjectsState = (canvas) => {
  if (!canvas) return;
  canvas.getObjects().forEach(obj => {
    if (obj._resizeBackup) {
      obj.set({
        scaleX: obj._resizeBackup.scaleX,
        scaleY: obj._resizeBackup.scaleY,
        left: obj._resizeBackup.left,
        top: obj._resizeBackup.top,
        originX: obj._resizeBackup.originX,
        originY: obj._resizeBackup.originY
      });
      obj.setCoords();
      // Do not delete the backup here, it's needed if the user toggles back to stretch mode.
    }
  });
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

// --- 预览逻辑 ---

export const startPreview = (targetW, targetH, isStretch = false) => {
  const canvas = unref(canvasRef);
  if (!canvas || !targetW || !targetH) return;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  const currentImgCenter = bgImage.getCenterPoint();

  // 第一次进入时备份状态
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

  // 清除旧的预览框
  if (previewRect.value) {
    canvas.remove(toRaw(previewRect.value));
    previewRect.value = null;
  }

  const targetCenter = { x: originalTransform.centerX, y: originalTransform.centerY };

  if (!isStretch) {
    restoreImageState(bgImage);
    // ✅ Also restore all other objects immediately when leaving stretch mode.
    restoreOtherObjectsState(canvas);
  } else {
    // 拉伸模式下禁用图片交互
    bgImage.selectable = false;
    bgImage.evented = false;
  }

  // 计算预览框尺寸（保持宽高比）
  const imgW = originalTransform.width * originalTransform.scaleX;
  const imgH = originalTransform.height * originalTransform.scaleY;
  const targetRatio = targetW / targetH;
  const imgRatio = imgW / imgH;

  let previewW, previewH;
  // 逻辑：预览框是“选区”，通常最大不超过图片原尺寸，或者根据比例适配
  if (targetRatio > imgRatio) {
    previewW = imgW;
    previewH = imgW / targetRatio;
  } else {
    previewH = imgH;
    previewW = imgH * targetRatio;
  }

  // 创建预览框
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
    // 进入尺寸模块时不要主动“推一下”图片位置：只显示预览框，保持现场不动。
    // 约束留到用户开始拖拽/或应用时再处理。

    // 绑定拖拽事件
    canvas.on('mouse:down', onPreviewMouseDown);
    canvas.on('mouse:move', onPreviewMouseMove);
    canvas.on('mouse:up', onPreviewMouseUp);
  } else {
    // 拉伸模式：直接让图片填满预览框（视觉预览）
    const newScaleX = previewW / originalTransform.width;
    const newScaleY = previewH / originalTransform.height;

    bgImage.set({
      scaleX: newScaleX,
      scaleY: newScaleY,
      left: targetCenter.x,
      top: targetCenter.y,
      originX: 'center',
      originY: 'center'
    });

    // ✨ 新增：联动其它对象
    const scaleXFact = newScaleX / originalTransform.scaleX;
    const scaleYFact = newScaleY / originalTransform.scaleY;
    transformOtherObjects(canvas, scaleXFact, scaleYFact, targetCenter.x, targetCenter.y, bgImage, rect);

    // 解绑事件
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

    // ✨ 还原所有被联动对象到 _resizeBackup
    canvas.getObjects().forEach(obj => {
      if (obj._resizeBackup) {
        obj.set({
          scaleX: obj._resizeBackup.scaleX,
          scaleY: obj._resizeBackup.scaleY,
          left: obj._resizeBackup.left,
          top: obj._resizeBackup.top,
          originX: obj._resizeBackup.originX,
          originY: obj._resizeBackup.originY
        });
        obj.setCoords();
        delete obj._resizeBackup;
      }
    });

    canvas.discardActiveObject();
    originalTransform = null;
    canvas.requestRenderAll();
  }
};

// --- 核心应用逻辑 (高清重制) ---

export const applyResize = async (width, height, isStretch = false) => {
  const canvas = unref(canvasRef);
  if (!canvas || !previewRect.value) return;

  const targetW = Math.round(width);
  const targetH = Math.round(height);
  if (targetW <= 0 || targetH <= 0) return;

  const bgImage = canvas.getObjects().find(o => o.type === 'image');
  if (!bgImage) return;

  // 1. 锁定现场
  const rect = previewRect.value;
  const prevVpt = [...canvas.viewportTransform];
  const prevZoom = canvas.getZoom();

  const rectCenterLogic = rect.getCenterPoint();
  // 计算预览框中心在当前屏幕上的绝对位置
  const rectCenterScreen = {
    x: rectCenterLogic.x * prevVpt[0] + prevVpt[4],
    y: rectCenterLogic.y * prevVpt[3] + prevVpt[5]
  };

  const finalPos = {
    logicalW: rect.width * rect.scaleX,
    logicalH: rect.height * rect.scaleY
  };

  originalTransform = null;

  // 2. 【核心升级】使用通用离屏工具生成高清图
  const dataURL = await renderHighResSnapshot(bgImage, targetW, targetH, (highResImg, tempCanvas) => {
    const multiplier = targetW / finalPos.logicalW;

    if (isStretch) {
      // 拉伸模式
      highResImg.set({
        originX: 'center', originY: 'center',
        left: targetW / 2, top: targetH / 2,
        scaleX: targetW / highResImg.width,
        scaleY: targetH / highResImg.height
      });
    } else {
      // 保持相对位置模式
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
  });

  // 3. 应用回主画布并修正视口
  bgImage.setSrc(dataURL, () => {
    // 计算视口缩放补偿
    const multiplier = targetW / finalPos.logicalW;
    const newZoom = prevZoom / multiplier;

    // 物理重置图片到画布中心
    bgImage.set({
      originX: "center", originY: "center",
      angle: 0, flipX: false, flipY: false,
      scaleX: 1, scaleY: 1,
      left: canvas.width / 2,
      top: canvas.height / 2,
    });

    // ✨ 新增：拉伸模式下，联动其它对象（文本、标尺等）
    // 注意：这里以预览框中心为轴心，对其它对象应用相同的非等比缩放。
    if (isStretch) {
      const centerX = rectCenterLogic.x;
      const centerY = rectCenterLogic.y;

      // 预览阶段主图最终 scale（相对原始宽高）
      const finalScaleX = (rect.width * rect.scaleX) / originalTransform?.width;
      const finalScaleY = (rect.height * rect.scaleY) / originalTransform?.height;

      // 相对原始主图缩放因子
      const scaleXFact = originalTransform?.scaleX ? (finalScaleX / originalTransform.scaleX) : 1;
      const scaleYFact = originalTransform?.scaleY ? (finalScaleY / originalTransform.scaleY) : 1;

      transformOtherObjects(canvas, scaleXFact, scaleYFact, centerX, centerY, bgImage, rect);
    }

    bgImage.setCoords();
    canvas.centerObject(bgImage);

    // 视口补偿：对齐视觉中心
    const newCenterLogic = { x: canvas.width / 2, y: canvas.height / 2 };
    const newPanX = rectCenterScreen.x - newCenterLogic.x * newZoom;
    const newPanY = rectCenterScreen.y - newCenterLogic.y * newZoom;

    canvas.setViewportTransform([newZoom, 0, 0, newZoom, newPanX, newPanY]);

    stopPreview();
    canvas.requestRenderAll();
    canvas.fire('zoom:change', { from: 'resize-apply' });

    if (saveHistoryFn) saveHistoryFn();
  });
};