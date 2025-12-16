// src/components/modules/adjust/useCanvasResize.js
import { ref, unref } from "vue";
import { ZOOM_PADDING } from "@/composables/useEditorState";
// 内部状态
let canvasRef = null;
let saveHistoryFn = null;

// 注册模块（为了获取 canvas 实例）
export const registerResizeModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

/**
 * 获取当前画布/图片的尺寸信息
 */
export const getCurrentSize = () => {
  if (!canvasRef?.value) return { width: 0, height: 0 };
  
  // 这里我们逻辑上以“背景图”的尺寸或者画布尺寸为准
  // 通常图片编辑器里，Adjust Resize 是调整画布大小，同时缩放图片
  const canvas = canvasRef.value;
  return {
    width: canvas.width,
    height: canvas.height
  };
};

/**
 * 执行调整尺寸
 * @param {number} width 目标宽度
 * @param {number} height 目标高度
 * @param {boolean} adaptive 是否自适应调整图片内容 (Scale Image)
 */
export const applyResize = (width, height, adaptive = true) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  width = Math.round(width);
  height = Math.round(height);
  
  if (width <= 0 || height <= 0) return;

  const oldWidth = canvas.width;
  const oldHeight = canvas.height;

  // 1. 调整画布物理尺寸
  canvas.setWidth(width);
  canvas.setHeight(height);

  // 2. 如果开启了自适应（图片跟随缩放）
  if (adaptive) {
    const scaleX = width / oldWidth;
    const scaleY = height / oldHeight;
    
    // 如果是锁定比例缩放，scaleX 和 scaleY 应该是一样的，
    // 但如果是自由拉伸，图片会被拉变形。
    // 通常调整尺寸功能，如果是“自适应”，意味着拉伸图片填满画布
    
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      // 忽略不需要缩放的辅助线等（如果有）
      if (obj.excludeFromExport) return;

      const objScaleX = obj.scaleX || 1;
      const objScaleY = obj.scaleY || 1;
      const objLeft = obj.left || 0;
      const objTop = obj.top || 0;

      obj.set({
        scaleX: objScaleX * scaleX,
        scaleY: objScaleY * scaleY,
        left: objLeft * scaleX,
        top: objTop * scaleY,
      });
      obj.setCoords();
    });
  } else {
    // 如果不自适应（类似于画布裁剪/扩展），通常需要把图片居中
    // 或者什么都不做，只改变画布框
    // 这里我们简单做一个居中处理，体验更好
    const objects = canvas.getObjects();
    objects.forEach(obj => {
        if(obj.type === 'image') {
            canvas.centerObject(obj);
        }
    });
  }

  // 3. 调整视口以适应新尺寸 (Zoom fit)
  const containerWidth = canvas.wrapperEl.parentNode.clientWidth || width;
  const containerHeight = canvas.wrapperEl.parentNode.clientHeight || height;
  
  const zoomToFit = Math.min(
    (containerWidth * ZOOM_PADDING) / width,
    (containerHeight * ZOOM_PADDING) / height
  );
  
  // 设置 Zoom 和 Pan
  canvas.setZoom(zoomToFit);
  const vpt = canvas.viewportTransform;
  vpt[4] = (containerWidth - width * zoomToFit) / 2;
  vpt[5] = (containerHeight - height * zoomToFit) / 2;
  
  canvas.requestRenderAll();

  // 4. 保存历史记录
  if (saveHistoryFn) saveHistoryFn();
};