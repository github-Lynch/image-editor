import { ref, unref } from 'vue';
import { fabric } from 'fabric';
import { renderHighResSnapshot } from '@/composables/useOffscreenHelper';

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// 主图原始源地址标识（用于移除边框回滚 & 多次烘焙不劣化）
const ORIGINAL_SRC_KEY = 'originalSrc';
// 边框操作基准源（替换模式：永远从 baseSrc 烘焙）
const BORDER_BASE_SRC_KEY = 'borderBaseSrc';
// 记录“原始主图像素尺寸”（不含边框）
const BASE_NATURAL_SIZE_KEY = 'borderBaseNaturalSize';
// 记录“内容区显示尺寸”（不含边框），作为替换模式的绝对锚点，避免多次烘焙累计变小
const BASE_DISPLAY_SIZE_KEY = 'borderBaseDisplaySize';

const drawSolidBorder = (tempCanvas, highResImg, opts) => {
  const bw = Math.max(0, Number(opts.borderWidth) || 0);
  if (bw <= 0) return;

  const color = String(opts.color || '#ffffff');
  const opacity = clamp(Number(opts.opacity) ?? 1, 0, 1);

  const cw = tempCanvas.getWidth();
  const ch = tempCanvas.getHeight();

  tempCanvas.setBackgroundColor(color, null);
  tempCanvas.backgroundColorOpacity = opacity;

  const scale = Math.min((cw - bw * 2) / highResImg.width, (ch - bw * 2) / highResImg.height);
  highResImg.set({
    originX: 'center',
    originY: 'center',
    left: cw / 2,
    top: ch / 2,
    scaleX: scale,
    scaleY: scale,
  });
};

const drawRadialGradientBorder = (tempCanvas, highResImg, opts) => {
  const bw = Math.max(0, Number(opts.borderWidth) || 0);
  if (bw <= 0) return;

  const opacity = clamp(Number(opts.opacity) ?? 1, 0, 1);
  const colors = Array.isArray(opts.colors) && opts.colors.length === 3 ? opts.colors : ['#FF6B6B', '#FFD93D', '#4D96FF'];

  const cw = tempCanvas.getWidth();
  const ch = tempCanvas.getHeight();

  // 图片缩放到内框区域
  const innerW = cw - bw * 2;
  const innerH = ch - bw * 2;
  const scale = Math.min(innerW / highResImg.width, innerH / highResImg.height);
  highResImg.set({
    originX: 'center',
    originY: 'center',
    left: cw / 2,
    top: ch / 2,
    scaleX: scale,
    scaleY: scale,
  });

  // 绘制环形渐变 overlay
  const off = document.createElement('canvas');
  off.width = Math.max(1, Math.round(cw));
  off.height = Math.max(1, Math.round(ch));
  const ctx = off.getContext('2d');
  if (!ctx) return;

  const cx = off.width / 2;
  const cy = off.height / 2;
  const r0 = 0;
  const r1 = Math.max(off.width, off.height) / 2;

  const g = ctx.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.5, colors[1]);
  g.addColorStop(1, colors[2]);

  ctx.clearRect(0, 0, off.width, off.height);
  ctx.globalAlpha = opacity;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, off.width, off.height);

  // 挖空中间
  ctx.globalCompositeOperation = 'destination-out';
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000';
  ctx.fillRect(bw, bw, off.width - bw * 2, off.height - bw * 2);

  ctx.globalCompositeOperation = 'source-over';

  const overlay = new fabric.Image(off, {
    left: 0,
    top: 0,
    originX: 'left',
    originY: 'top',
    selectable: false,
    evented: false,
    excludeFromExport: false,
  });

  tempCanvas.setOverlayImage(overlay, tempCanvas.renderAll.bind(tempCanvas));
};

export function useBakedBorder(canvasRef, canvasAPIRef) {
  const mode = ref('solid');

  const borderWidth = ref(20);
  const borderColor = ref('#ffffff');
  const borderOpacity = ref(1);
  const gradientColors = ref(['#FF6B6B', '#FFD93D', '#4D96FF']);

  const isProcessing = ref(false);

  const getCanvas = () => unref(canvasRef);
  const getCanvasAPI = () => unref(canvasAPIRef);

  const getMainImage = () => {
    const canvas = getCanvas();
    if (!canvas) return null;
    return canvas.getObjects().find((obj) => obj.isMainImage);
  };

  const ensureSrcKeys = (mainImage) => {
    if (!mainImage) return { originalSrc: null, baseSrc: null };

    const current = typeof mainImage.getSrc === 'function' ? mainImage.getSrc() : null;

    if (!mainImage[ORIGINAL_SRC_KEY] && current) {
      mainImage[ORIGINAL_SRC_KEY] = current;
    }

    if (!mainImage[BORDER_BASE_SRC_KEY]) {
      mainImage[BORDER_BASE_SRC_KEY] = mainImage[ORIGINAL_SRC_KEY] || current;
    }

    // 记录原始像素尺寸（以“最初没有边框的主图”作为基准）
    if (!mainImage[BASE_NATURAL_SIZE_KEY]) {
      const nw = mainImage._originalElement?.naturalWidth || mainImage.width;
      const nh = mainImage._originalElement?.naturalHeight || mainImage.height;
      mainImage[BASE_NATURAL_SIZE_KEY] = { w: Number(nw) || 0, h: Number(nh) || 0 };
    }

    // ✅ 锚定“内容区显示尺寸”（不含边框）：只记录一次，后续所有烘焙都以此为准
    // 目的：避免每次 replace 后 scaleX/scaleY 浮点误差累计，导致主图逐步变小
    if (!mainImage[BASE_DISPLAY_SIZE_KEY]) {
      const baseNatural = mainImage[BASE_NATURAL_SIZE_KEY];
      const baseNW = baseNatural?.w || (mainImage._originalElement?.naturalWidth || mainImage.width);
      const baseNH = baseNatural?.h || (mainImage._originalElement?.naturalHeight || mainImage.height);
      mainImage[BASE_DISPLAY_SIZE_KEY] = {
        w: (Number(mainImage.scaleX) || 1) * baseNW,
        h: (Number(mainImage.scaleY) || 1) * baseNH,
      };
    }

    return {
      originalSrc: mainImage[ORIGINAL_SRC_KEY] || current,
      baseSrc: mainImage[BORDER_BASE_SRC_KEY] || mainImage[ORIGINAL_SRC_KEY] || current,
    };
  };

  const fireHistory = () => {
    const canvas = getCanvas();
    const main = getMainImage();
    if (!canvas || !main) return;
    canvas.fire('object:modified', { target: main });
  };

  /**
   * 替换模式 + 视觉不变：
   * - 每次从 baseSrc（无边框）重新烘焙
   * - 替换后保持“图片内容区域”的显示尺寸不变（不是保持整张新图尺寸）
   */
  const bakeAndReplace = async () => {
    const canvas = getCanvas();
    const canvasAPI = getCanvasAPI();
    const main = getMainImage();
    if (!canvas || !canvasAPI || !main) return;

    const { originalSrc, baseSrc } = ensureSrcKeys(main);
    if (!originalSrc || !baseSrc) return;

    const bw = Math.max(0, Number(borderWidth.value) || 0);
    const opacity = clamp(Number(borderOpacity.value) ?? 1, 0, 1);

    // 记录替换前：内容区显示尺寸（基于当前主图的“内容区像素尺寸”）
    // 我们希望“再次点击边框”时不要感觉图片变大 => 保持内容区显示尺寸不变
    const baseNatural = main[BASE_NATURAL_SIZE_KEY];
    const baseNW = baseNatural?.w || (main._originalElement?.naturalWidth || main.width);
    const baseNH = baseNatural?.h || (main._originalElement?.naturalHeight || main.height);

    const prevCenter = main.getCenterPoint();
    const prevAngle = main.angle || 0;

    // 当前画布上“内容区”的显示宽高（不含边框）
    // ✅ 使用锚点（只记录一次）避免反复替换后 scale 浮点误差累计导致逐步变小
    const baseDisplay = main[BASE_DISPLAY_SIZE_KEY];
    const contentDisplayW = baseDisplay?.w ?? (Number(main.scaleX) || 1) * baseNW;
    const contentDisplayH = baseDisplay?.h ?? (Number(main.scaleY) || 1) * baseNH;

    isProcessing.value = true;
    try {
      // 强制 renderHighResSnapshot 使用 baseSrc（替换模式）
      const originalGetSrc = main.getSrc.bind(main);
      main.getSrc = () => baseSrc;

      const targetW = Math.round(baseNW + bw * 2);
      const targetH = Math.round(baseNH + bw * 2);

      const dataURL = await renderHighResSnapshot(main, targetW, targetH, (highResImg, tempCanvas) => {
        if (mode.value === 'solid') {
          drawSolidBorder(tempCanvas, highResImg, { borderWidth: bw, color: borderColor.value, opacity });
        } else {
          drawRadialGradientBorder(tempCanvas, highResImg, { borderWidth: bw, colors: gradientColors.value, opacity });
        }
      });

      main.getSrc = originalGetSrc;

      // 入历史（替换前）
      fireHistory();

      canvas.setActiveObject(main);
      canvasAPI.replaceActiveImage(dataURL, { center: false });

      setTimeout(() => {
        const newMain = getMainImage();
        if (!newMain) return;

        // 继承元数据
        newMain[ORIGINAL_SRC_KEY] = originalSrc;
        newMain[BORDER_BASE_SRC_KEY] = baseSrc;
        newMain[BASE_NATURAL_SIZE_KEY] = { w: baseNW, h: baseNH };
      if (baseDisplay) {
        newMain[BASE_DISPLAY_SIZE_KEY] = baseDisplay;
      }
        if (baseDisplay) {
          newMain[BASE_DISPLAY_SIZE_KEY] = baseDisplay;
        }

        // 关键：保持“内容区显示尺寸”不变
        // 新图像素为 baseNW+2*bw，我们要让其缩放后内容区仍然是 contentDisplayW/H
        const newNW = baseNW + bw * 2;
        const newNH = baseNH + bw * 2;

        const nextScaleX = contentDisplayW / newNW;
        const nextScaleY = contentDisplayH / newNH;

        newMain.set({
          originX: 'center',
          originY: 'center',
          scaleX: nextScaleX,
          scaleY: nextScaleY,
          angle: prevAngle,
        });

        newMain.setPositionByOrigin(new fabric.Point(prevCenter.x, prevCenter.y), 'center', 'center');
        newMain.setCoords();
        canvas.requestRenderAll();

        // 入历史（最终态）
        fireHistory();
      }, 0);
    } finally {
      isProcessing.value = false;
    }
  };

  const removeBorder = () => {
    const canvas = getCanvas();
    const canvasAPI = getCanvasAPI();
    const main = getMainImage();
    if (!canvas || !canvasAPI || !main) return;

    const { originalSrc } = ensureSrcKeys(main);
    if (!originalSrc) return;

    const baseNatural = main[BASE_NATURAL_SIZE_KEY];
    const baseNW = baseNatural?.w || (main._originalElement?.naturalWidth || main.width);
    const baseNH = baseNatural?.h || (main._originalElement?.naturalHeight || main.height);

    const prevCenter = main.getCenterPoint();
    const prevAngle = main.angle || 0;

    // ✅ 使用锚点（只记录一次）避免反复替换后 scale 浮点误差累计导致逐步变小
    const baseDisplay = main[BASE_DISPLAY_SIZE_KEY];
    const contentDisplayW = baseDisplay?.w ?? (Number(main.scaleX) || 1) * baseNW;
    const contentDisplayH = baseDisplay?.h ?? (Number(main.scaleY) || 1) * baseNH;

    fireHistory();

    canvas.setActiveObject(main);
    canvasAPI.replaceActiveImage(originalSrc, { center: false });

    setTimeout(() => {
      const newMain = getMainImage();
      if (!newMain) return;

      newMain[ORIGINAL_SRC_KEY] = originalSrc;
      newMain[BORDER_BASE_SRC_KEY] = originalSrc;
      newMain[BASE_NATURAL_SIZE_KEY] = { w: baseNW, h: baseNH };

      // 新图像素 = baseNW/baseNH
      const nextScaleX = contentDisplayW / baseNW;
      const nextScaleY = contentDisplayH / baseNH;

      newMain.set({
        originX: 'center',
        originY: 'center',
        scaleX: nextScaleX,
        scaleY: nextScaleY,
        angle: prevAngle,
      });

      newMain.setPositionByOrigin(new fabric.Point(prevCenter.x, prevCenter.y), 'center', 'center');
      newMain.setCoords();
      canvas.requestRenderAll();

      fireHistory();
    }, 0);
  };

  return {
    mode,
    borderWidth,
    borderColor,
    borderOpacity,
    gradientColors,

    isProcessing,

    bakeAndReplace,
    removeBorder,
  };
}
