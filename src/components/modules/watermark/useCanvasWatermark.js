// src/components/modules/watermark/useCanvasWatermark.js
import { reactive, unref } from 'vue';
import { fabric } from 'fabric';

// === 模块单例状态 ===
let canvasRef = null;
let saveHistoryFn = null;
let isInternalUpdate = false;
let renderTimer = null; // 用于防抖 (Debounce)

const DEFAULT_CONFIG = {
  mode: 'single', // 'single' | 'tiled'
  opacity: 100,
  scale: 100,
  rotate: 0,      // 单元旋转 (0-360)
  gap: 24,        // 间距 (px)
  stagger: 0,     // 交错 (0-100%)

  // UI 状态
  isSelected: false,
  currentSrc: '',
  isTiled: false
};

export const wmState = reactive({ ...DEFAULT_CONFIG });

// === 注册模块 ===
export const registerWatermarkModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;

  const c = unref(canvas);
  if (c) {
    c.on('selection:created', syncUIFromSelection);
    c.on('selection:updated', syncUIFromSelection);
    c.on('selection:cleared', resetUI);

    // ✨ 全局监听：如果底图动了（缩放/移动），也要更新水印的裁剪框位置
    // 确保裁剪框永远“吸附”在底图上
    c.on('object:modified', (e) => {
      if (e.target && (e.target.isMainImage || e.target.type === 'image')) {
        // 找到当前的平铺水印，更新它的裁剪
        const tiledGroup = c.getObjects().find(o => o.watermarkMode === 'tiled');
        if (tiledGroup && tiledGroup !== e.target) {
          updateClipPath(c, tiledGroup);
          c.requestRenderAll();
        }
      }
    });
  }
};

// === 核心算法：动态裁剪路径更新 (Viewport Clipping) ===
/**
 * 计算逻辑：
 * Fabric 的 clipPath 是相对于对象的中心的。
 * 当用户拖动水印 Group 时，Group 的中心点变了，导致 clipPath 跟着跑。
 * 我们需要计算：[底图绝对位置] 相对于 [Group 当前位置] 的反向偏移量。
 * 这样无论 Group 怎么动，clipPath 视觉上都钉在底图上。
 */
const updateClipPath = (canvas, tiledGroup) => {
  // 1. 寻找底图 (Main Image)
  // 优先找标记了 isMainImage 的，否则找层级最低的非水印图片
  const mainImage = canvas.getObjects().find(o => o.isMainImage) ||
    canvas.getObjects().find(o => o.type === 'image' && o !== tiledGroup && !o.isWatermark);

  if (!mainImage) {
    tiledGroup.clipPath = null; // 没有底图就不裁剪，显示全屏
    return;
  }

  // 2. 计算变换矩阵
  // 获取 Group 的变换逆矩阵 (将绝对坐标转回 Group 局部坐标)
  const invertedMatrix = fabric.util.invertTransform(tiledGroup.calcTransformMatrix());

  // 获取底图中心点的绝对坐标
  const mainCenter = mainImage.getCenterPoint();

  // 将底图中心点 转换到 Group 的局部坐标系下
  const localPoint = fabric.util.transformPoint(mainCenter, invertedMatrix);

  // 3. 创建或更新 ClipPath
  // 我们创建一个矩形，其尺寸等于底图的显示尺寸
  // 注意：clipPath 对象本身的 angle/scale 也会叠加 Group 的变换。
  // 为了让 ClipPath 不随 Group 旋转/缩放而变形，我们需要抵消 Group 的变换。

  const clipRect = new fabric.Rect({
    width: mainImage.getScaledWidth(),
    height: mainImage.getScaledHeight(),
    top: localPoint.y,
    left: localPoint.x,
    originX: 'center',
    originY: 'center',
    // ✨ 关键：抵消 Group 的旋转 (底图角度 - Group角度)
    angle: mainImage.angle - tiledGroup.angle,
    // ✨ 关键：抵消 Group 的缩放 
    scaleX: 1 / tiledGroup.scaleX,
    scaleY: 1 / tiledGroup.scaleY,
    absolutePositioned: false
  });

  tiledGroup.clipPath = clipRect;

  // 标记为脏，确保渲染更新
  tiledGroup.dirty = true;
};

// === 核心算法：生成平铺 Group ===
const generateTiledWatermark = (sourceObj) => {
  const canvas = unref(canvasRef);
  const config = sourceObj._wmConfig || {};
  const src = config.src || sourceObj.getSrc();

  fabric.Image.fromURL(src, (baseImg) => {
    const canvasW = canvas.width;
    const canvasH = canvas.height;

    // 1. 获取基础参数
    const scale = (config.scale || 1) * 0.5; // 默认缩小一半作为基准
    const gap = config.gap || 24;
    const stagger = config.stagger || 0;
    const rotate = config.rotate || 0;
    const opacity = config.opacity ?? 1;

    const itemW = baseImg.width * scale;
    const itemH = baseImg.height * scale;

    const stepX = itemW + gap;
    const stepY = itemH + gap;

    // 2. 计算覆盖范围
    // ✨ 扩大生成范围 (Canvas * 1)，确保拖拽或旋转时边缘不会露白(Canvas 画布够大了, )
    const cols = Math.ceil((canvasW * 1) / stepX) + 2;
    const rows = Math.ceil((canvasH * 1) / stepY) + 2;

    // 偏移起始点，让 Grid 中心对齐画布中心
    const startOffsetX = -((cols * stepX) - canvasW) / 2;
    const startOffsetY = -((rows * stepY) - canvasH) / 2;

    const objects = [];

    // 3. 循环生成
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // 使用 clone 亦可，但 new Image 利用缓存性能尚可
        const clone = new fabric.Image(baseImg.getElement(), {
          width: baseImg.width,
          height: baseImg.height,
          scaleX: scale,
          scaleY: scale,
          angle: rotate, // 单元自转
          opacity: 1,    // 子元素不透明，由 Group 控制整体透明度
          originX: 'center',
          originY: 'center'
        });

        let x = startOffsetX + c * stepX;
        let y = startOffsetY + r * stepY;

        // 应用交错 (Stagger)
        if (r % 2 !== 0) {
          x += stepX * (stagger / 100);
        }

        clone.set({ left: x, top: y });
        objects.push(clone);
      }
    }

    // 4. 创建 Group
    const tiledGroup = new fabric.Group(objects, {
      left: canvasW / 2,
      top: canvasH / 2,
      originX: 'center',
      originY: 'center',
      opacity: opacity,
      selectable: true,
      isWatermark: true,
      watermarkMode: 'tiled',
      customTool: 'watermark',
      // 允许移动，但锁定 Group 自身的缩放/旋转 (通过参数滑块控制内部)
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
      // 继承并更新配置
      _wmConfig: { ...config, scale: scale / 0.5 }
    });

    // 5. 绑定实时事件，实现视口裁切
    const updateHandler = () => {
      updateClipPath(canvas, tiledGroup);
    };
    tiledGroup.on('moving', updateHandler);
    // 虽然锁了旋转，但防守性编程加上
    tiledGroup.on('rotating', updateHandler);
    tiledGroup.on('modified', updateHandler);

    // 初始化裁切
    updateClipPath(canvas, tiledGroup);

    // 6. 替换场景
    canvas.remove(sourceObj);
    canvas.add(tiledGroup);
    canvas.setActiveObject(tiledGroup);
    canvas.requestRenderAll();
    saveHistoryFn && saveHistoryFn();

  }, { crossOrigin: 'anonymous' });
};

// === 辅助：平铺模式下的参数重绘 ===
const regenerateTiledGroup = (canvas, oldGroup, srcUrl = null) => {
  // 创建一个临时对象携带配置，复用生成逻辑
  const dummyObj = {
    _wmConfig: { ...oldGroup._wmConfig },
    getSrc: () => srcUrl || oldGroup._wmConfig.src
  };
  canvas.remove(oldGroup);
  generateTiledWatermark(dummyObj);
};

// === 核心算法：恢复单体水印 ===
const restoreSingleWatermark = (groupObj) => {
  const canvas = unref(canvasRef);
  const config = groupObj._wmConfig || {};

  fabric.Image.fromURL(config.src, (img) => {
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    // 恢复单体时，限制最大宽度
    if (img.width > canvasW * 0.4) img.scaleToWidth(canvasW * 0.4);

    img.set({
      left: canvasW / 2,
      top: canvasH / 2,
      originX: 'center',
      originY: 'center',
      opacity: config.opacity,
      isWatermark: true,
      customTool: 'watermark',
      watermarkMode: 'single',
      _wmConfig: { ...config, mode: 'single' } // 保持配置
    });

    canvas.remove(groupObj);
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    saveHistoryFn && saveHistoryFn();
  }, { crossOrigin: 'anonymous' });
};

// === 对外接口：添加新水印 ===
export const addWatermark = (url) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  fabric.Image.fromURL(url, (img) => {
    const canvasW = canvas.width;
    const canvasH = canvas.height;
    if (img.width > canvasW * 0.4) img.scaleToWidth(canvasW * 0.4);

    img.set({
      left: canvasW / 2, top: canvasH / 2, originX: 'center', originY: 'center',
      opacity: wmState.opacity / 100,
      isWatermark: true, customTool: 'watermark', watermarkMode: 'single',
      _wmConfig: {
        src: url,
        opacity: wmState.opacity / 100,
        scale: 1, rotate: 0, gap: 24, stagger: 0
      }
    });

    canvas.add(img);
    canvas.setActiveObject(img);
    saveHistoryFn && saveHistoryFn();
    canvas.requestRenderAll();
  }, { crossOrigin: 'anonymous' });
};

// === 对外接口：替换水印图片 ===
export const replaceWatermark = (url) => {
  const canvas = unref(canvasRef);
  const activeObj = canvas?.getActiveObject();

  if (!activeObj || !activeObj.isWatermark) return;

  if (wmState.isTiled) {
    if (activeObj._wmConfig) activeObj._wmConfig.src = url;
    wmState.currentSrc = url;
    regenerateTiledGroup(canvas, activeObj, url);
  } else {
    activeObj.setSrc(url, () => {
      if (activeObj._wmConfig) activeObj._wmConfig.src = url;
      wmState.currentSrc = url;
      canvas.requestRenderAll();
      saveHistoryFn && saveHistoryFn();
    }, { crossOrigin: 'anonymous' });
  }
};

// === 对外接口：切换模式 ===
export const toggleTilingMode = () => {
  const canvas = unref(canvasRef);
  const activeObj = canvas?.getActiveObject();
  if (!activeObj || !activeObj.isWatermark) return;

  const isToTiled = !wmState.isTiled;
  wmState.isTiled = isToTiled;

  // 状态预处理
  if (activeObj._wmConfig) {
    if (isToTiled) {
      // 切换到平铺时，重置 scale 为 1 (对应 UI 100%)，避免单体大图直接平铺
      wmState.scale = 100;
      activeObj._wmConfig.scale = 1;
    }
  }

  if (isToTiled) {
    generateTiledWatermark(activeObj);
  } else {
    restoreSingleWatermark(activeObj);
  }
};

// === 对外接口：参数更新 ===
export const updateWatermarkParams = (key, value) => {
  if (isInternalUpdate) return;

  const canvas = unref(canvasRef);
  const activeObj = canvas?.getActiveObject();
  if (!activeObj || !activeObj.isWatermark) return;

  wmState[key] = value;

  if (!activeObj._wmConfig) activeObj._wmConfig = {};

  // 归一化数值
  let fabricValue = value;
  if (key === 'scale') fabricValue = value / 100;
  if (key === 'opacity') fabricValue = value / 100;

  // 存入配置
  activeObj._wmConfig[key] = value;
  if (key === 'scale') activeObj._wmConfig.scale = fabricValue;

  // 应用更新
  if (key === 'opacity') {
    activeObj.set('opacity', fabricValue);
    canvas.requestRenderAll();
  } else if (wmState.isTiled) {
    // 平铺模式：布局类参数防抖重绘
    if (['gap', 'stagger', 'rotate', 'scale'].includes(key)) {
      if (renderTimer) clearTimeout(renderTimer);
      renderTimer = setTimeout(() => {
        regenerateTiledGroup(canvas, activeObj);
      }, 50);
    }
  } else {
    // 单体模式
    if (key === 'rotate') activeObj.rotate(value); // 这里直接旋转对象
    canvas.requestRenderAll();
  }
};

// === 内部：从选中对象同步 UI ===
const syncUIFromSelection = (e) => {
  const activeObj = e.selected?.[0];
  if (!activeObj || !activeObj.isWatermark) {
    // 如果选中的不是水印，重置 UI
    resetUI();
    return;
  }

  isInternalUpdate = true;
  wmState.isSelected = true;
  wmState.isTiled = (activeObj.watermarkMode === 'tiled');

  if (activeObj._wmConfig) {
    const conf = activeObj._wmConfig;
    wmState.currentSrc = conf.src;
    wmState.opacity = Math.round((activeObj.opacity || 1) * 100);

    if (wmState.isTiled) {
      wmState.gap = conf.gap ?? 24;
      wmState.stagger = conf.stagger ?? 0;
      wmState.rotate = conf.rotate ?? 0;
      wmState.scale = Math.round((conf.scale || 1) * 100);
    }
  }
  isInternalUpdate = false;
};

const resetUI = () => {
  isInternalUpdate = true;
  wmState.isSelected = false;
  wmState.currentSrc = '';
  isInternalUpdate = false;
};