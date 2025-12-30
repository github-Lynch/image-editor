import { unref } from 'vue';
import { fabric } from 'fabric';

// === 模块单例状态 ===
let canvasRef = null;
let saveHistoryFn = null;

// === 注册模块 ===
export const registerMaterialModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

// === 对外接口, 在画布上添加素材图片 ===
export const addMaterial = url => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  fabric.Image.fromURL(url, (img) => {
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    if (img.width > canvasW * 0.4) img.scaleToWidth(canvasW * 0.4);

    img.set({
      left: canvasW / 2, top: canvasH / 2, originX: 'center', originY: 'center',
      opacity: 1,
      isWatermark: true, customTool: 'watermark', watermarkMode: 'single',
      _wmConfig: {
        src: url,
        opacity: 1,
        scale: 1,
        rotate: 0
      }
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
  }, { crossOrigin: 'anonymous' });
};