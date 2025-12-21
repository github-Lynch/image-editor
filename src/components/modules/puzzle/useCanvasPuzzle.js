// src/components/modules/puzzle/useCanvasPuzzle.js
import { unref, reactive } from "vue";
import { fabric } from "fabric";
import { parseTemplateToCells, generateGridCells } from "./config";

// 【引入通用规范】
import { constrainObjectToRect, animateRebound, getLogicRect } from '@/composables/useConstraint';

// === 内部变量 ===
let canvasRef = null;
let saveHistoryFn = null;
let uiCallbacks = { onCellClick: null };

// 交互状态
let isDragging = false;
let dragOriginPoint = null;
let dragLastPoint = { x: 0, y: 0 };
let dragProxy = null;
let dragOriginCellIndex = -1;
let dragOffset = { x: 0, y: 0 };
let isCreatingProxy = false;

// 默认配置
const DEFAULTS = {
  padding: 20,
  spacing: 10,
  radius: 0,
  width: 1000,
  height: 1000,
  bgColor: '#ffffff',
  rows: 1,
  cols: 1
};

const puzzleState = reactive({
  isActive: false,
  cells: [],
  padding: DEFAULTS.padding,
  spacing: DEFAULTS.spacing,
  radius: DEFAULTS.radius,
  width: DEFAULTS.width,
  height: DEFAULTS.height,
  bgColor: DEFAULTS.bgColor
});

export const registerPuzzleModule = (canvas, saveHistory, callbacks = {}) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
  uiCallbacks = { ...uiCallbacks, ...callbacks };
};

// === 初始化 ===
export const initPuzzleMode = (initialTemplate = null) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 如果有存档，恢复存档（restorePuzzleData 内部会自己处理 fitToScreen）
  if (puzzleState.savedHistoryData && puzzleState.savedHistoryData.length > 0) {
    restorePuzzleData();
    bindEvents();
    return; // 直接返回，把控制权交给 restorePuzzleData
  }

  // === 下面是“第一次进入”的逻辑 (保持不变) ===
  puzzleState.isActive = true;

  // ... 捕获 activeImg 逻辑 ...
  const activeImg = canvas.getObjects().find(o => o.type === 'image');
  if (activeImg) {
    puzzleState.width = activeImg.width * activeImg.scaleX;
    puzzleState.height = activeImg.height * activeImg.scaleY;
  } else {
    puzzleState.width = canvas.width;
    puzzleState.height = canvas.height;
  }

  bindEvents();

  const cells = initialTemplate ? parseTemplateToCells(initialTemplate) : generateGridCells(DEFAULTS.rows, DEFAULTS.cols);
  updateLayout(cells);

  // 对于第一次进入，也直接调用这个新函数即可
  fitPuzzleToScreen();
};

// === 模块级重置 ===
export const resetPuzzle = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  puzzleState.padding = DEFAULTS.padding;
  puzzleState.spacing = DEFAULTS.spacing;
  puzzleState.radius = DEFAULTS.radius;
  puzzleState.bgColor = DEFAULTS.bgColor;

  const defaultCells = generateGridCells(DEFAULTS.rows, DEFAULTS.cols);
  updateLayout(defaultCells);

  if (saveHistoryFn) saveHistoryFn();
};

// === 退出逻辑 (核心修复：只导出有效区域) ===

export const exitPuzzleMode = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  puzzleState.isActive = false;
  unbindEvents();

  const hasContent = canvas.getObjects().some(o => o.isPuzzleImage && !o.isGhost);

  if (hasContent) {
    // 1. 隐藏辅助控件
    const auxObjs = canvas.getObjects().filter(o =>
      o.isPuzzleController || o.isDeleteBtn || o.isPlaceholder || o.isGhost
    );
    auxObjs.forEach(o => o.visible = false);

    // 2. 重置视口 (这步保留，为了截图准确)
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    // =======================================================
    // 【核心修改 START】：保存“真身”数据，防止画质丢失
    // =======================================================
    // 我们找出所有的拼图对象，把它们的坐标、大小、最重要的是“原图URL”存起来
    const puzzleRawData = canvas.getObjects()
      .filter(o => o.isPuzzleImage && !o.isGhost)
      .map(o => ({
        id: o.id,
        src: o.originalSrc || (o.getSrc ? o.getSrc() : ''),
        left: o.left,
        top: o.top,
        scaleX: o.scaleX,
        scaleY: o.scaleY,
        angle: o.angle,
        // 【新增 1】保存锚点信息
        originX: o.originX,
        originY: o.originY,
        // 【新增 2】保存它属于哪个格子 (非常重要！)
        cellIndex: o.cellIndex,

        // ... 其他属性保持不变
        flipX: o.flipX,
        flipY: o.flipY,
        cropX: o.cropX,
        cropY: o.cropY,
        isPuzzleItem: true
      }));

    // 将这份数据存到你的状态管理里
    puzzleState.savedHistoryData = puzzleRawData;

    // 【新增】保存当前的画布配置尺寸
    puzzleState.savedSettings = {
      width: puzzleState.width,
      height: puzzleState.height,
      padding: puzzleState.padding,
      spacing: puzzleState.spacing,
      radius: puzzleState.radius,
      bgColor: puzzleState.bgColor
    };

    // =======================================================
    // 【核心修改 END】
    // =======================================================


    // 3. 导出预览图 (这一步保留，用于展示给用户看，但不再用于下次编辑)
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
      left: 0,
      top: 0,
      width: puzzleState.width,
      height: puzzleState.height
    });

    // 4. 清理所有拼图对象 (真身离场)
    const allPuzzleObjs = canvas.getObjects().filter(o => o.isPuzzleItem);
    canvas.remove(...allPuzzleObjs);

    // 5. 加回合成图 (替身上场，仅供观看)
    fabric.Image.fromURL(dataURL, (img) => {
      // 给替身打个标记，下次编辑时方便找到它并删掉
      img.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: true, // 虽然可选中，但在非编辑模式下通常只是用来整体移动
        evented: true,
        isPreviewSnapshot: true // 【重要标记】告诉系统这是张预览截图
      });

      // 恢复视觉尺寸
      img.scaleToWidth(puzzleState.width);
      canvas.add(img);

      // --- 下面是原本的 Zoom/Pan 逻辑，保持不变 ---
      const paddingFactor = 0.9;
      const zoomToFit = Math.min(
        (canvas.width * paddingFactor) / puzzleState.width,
        (canvas.height * paddingFactor) / puzzleState.height
      );
      const finalZoom = Math.min(zoomToFit, 1);

      canvas.setZoom(finalZoom);

      const imageCenterX = puzzleState.width / 2;
      const imageCenterY = puzzleState.height / 2;
      const viewportHalfW = canvas.width / (2 * finalZoom);
      const viewportHalfH = canvas.height / (2 * finalZoom);
      const panX = imageCenterX - viewportHalfW;
      const panY = imageCenterY - viewportHalfH;

      canvas.absolutePan({ x: panX, y: panY });
      canvas.requestRenderAll();

      if (saveHistoryFn) saveHistoryFn();
      canvas.fire('zoom:change', { from: 'puzzle-exit' });
    });

  } else {
    // 没内容的情况
    const allPuzzleObjs = canvas.getObjects().filter(o => o.isPuzzleItem);
    canvas.remove(...allPuzzleObjs);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
  }
};

// === 修改后的辅助函数：智能适配屏幕 ===
const fitPuzzleToScreen = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const { width: puzzleW, height: puzzleH } = puzzleState;
  // 注意：这里用 width / zoom 换算回逻辑像素，确保对比单位一致
  const canvasW = canvas.width / canvas.getRetinaScaling();
  const canvasH = canvas.height / canvas.getRetinaScaling();

  // 1. 计算最佳适配 Zoom (留出 10% 边距)
  const paddingFactor = 0.9;
  const zoomX = (canvasW * paddingFactor) / puzzleW;
  const zoomY = (canvasH * paddingFactor) / puzzleH;

  // 算出“能完全放下拼图”的缩放值
  let targetZoom = Math.min(zoomX, zoomY);

  // 2. 【核心修改】智能阈值处理
  // 如果计算出的缩放比例大于 0.9 (说明图片其实跟屏幕差不多大，或者比屏幕小)
  // 我们就强制设为 1 (100%)，保证画质清晰度，只有图特别大时才缩小
  if (targetZoom > 0.9) {
    targetZoom = 1;
  }

  // 3. 应用缩放
  canvas.setZoom(targetZoom);

  // 4. 计算 Pan (让拼图中心 对齐 视口中心)
  const puzzleCenterX = puzzleW / 2;
  const puzzleCenterY = puzzleH / 2;

  // 视口在当前缩放下的逻辑一半宽高
  const viewportHalfW = canvasW / (2 * targetZoom);
  const viewportHalfH = canvasH / (2 * targetZoom);

  const panX = puzzleCenterX - viewportHalfW;
  const panY = puzzleCenterY - viewportHalfH;

  canvas.absolutePan({ x: panX, y: panY });
  canvas.requestRenderAll();

  // 同步外部 UI 显示
  canvas.fire('zoom:change', { zoom: targetZoom });
};


// 当用户点击“再次编辑”或切换回拼图模块时调用
export const restorePuzzleData = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 1. 清理预览图
  const previewImg = canvas.getObjects().find(o => o.isPreviewSnapshot);
  if (previewImg) {
    canvas.remove(previewImg);
  }

  // 2. 获取存档数据
  const historyData = puzzleState.savedHistoryData;
  // 【新增】恢复之前的拼图尺寸设置
  const savedSettings = puzzleState.savedSettings;

  if (!historyData || historyData.length === 0) return;

  // 【新增】恢复尺寸状态
  if (savedSettings) {
    puzzleState.width = savedSettings.width;
    puzzleState.height = savedSettings.height;
    puzzleState.padding = savedSettings.padding;
    puzzleState.spacing = savedSettings.spacing;
    puzzleState.radius = savedSettings.radius;
    if (savedSettings.bgColor) {
      puzzleState.bgColor = savedSettings.bgColor;
      canvas.setBackgroundColor(savedSettings.bgColor, () => { });
    }
  }

  // 3. 异步恢复图片
  let loadedCount = 0;
  // 标记 loading 状态（如果你的 UI 有 loading 遮罩可以在这开启）

  historyData.forEach(item => {
    fabric.Image.fromURL(item.src, (img) => {
      loadedCount++;

      img.set({
        id: item.id,
        left: item.left,
        top: item.top,
        scaleX: item.scaleX,
        scaleY: item.scaleY,
        angle: item.angle,
        flipX: item.flipX,
        flipY: item.flipY,
        cropX: item.cropX,
        cropY: item.cropY,
        originX: item.originX || 'center', // 确保锚点正确
        originY: item.originY || 'center',
        cellIndex: item.cellIndex,
        isPuzzleItem: true,
        isPuzzleImage: true,
        originalSrc: item.src,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });

      canvas.add(img);

      // 当所有图片加载完毕时
      if (loadedCount === historyData.length) {
        puzzleState.isActive = true;
        refreshPuzzleObjects(false);

        // 【关键修复】所有元素就位后，执行一次镜头对齐！
        fitPuzzleToScreen();

        canvas.requestRenderAll();
      }
    }, { crossOrigin: 'anonymous' });
  });
};
// =========================================================================
// 核心逻辑：位置计算 (保留用于初始适配)
// 注意：虽然 animateRebound 能处理回弹，但“初始放入”时的居中逻辑还是需要的
// =========================================================================
const calculateFitPosition = (img, cell) => {
  // 这里的逻辑是“Cover”模式：确保图片填满格子且居中
  const minScaleX = cell.width / img.width;
  const minScaleY = cell.height / img.height;
  const minScale = Math.max(minScaleX, minScaleY) + 0.0001;
  return {
    scaleX: minScale,
    scaleY: minScale,
    left: cell.left + cell.width / 2,
    top: cell.top + cell.height / 2
  };
};

// === 事件绑定 ===
const bindEvents = () => {
  const canvas = unref(canvasRef);
  canvas.on('mouse:down', onMouseDown);
  canvas.on('mouse:move', onMouseMove);
  canvas.on('mouse:up', onMouseUp);
  canvas.on('mouse:wheel', onMouseWheel);
};

const unbindEvents = () => {
  const canvas = unref(canvasRef);
  canvas.off('mouse:down', onMouseDown);
  canvas.off('mouse:move', onMouseMove);
  canvas.off('mouse:up', onMouseUp);
  canvas.off('mouse:wheel', onMouseWheel);
};

const onMouseDown = (opt) => {
  if (!puzzleState.isActive) return;
  const canvas = unref(canvasRef);
  const target = opt.target;

  dragOriginPoint = opt.absolutePointer;
  const pointer = canvas.getPointer(opt.e);
  dragLastPoint = { x: pointer.x, y: pointer.y };

  if (target && target.isDeleteBtn) {
    deleteImageFromCell(target.cellIndex);
    isDragging = false;
    dragOriginCellIndex = -1;
    dragOriginPoint = null;
    return;
  }

  if (target && target.isPuzzleController) {
    isDragging = true;
    dragOriginCellIndex = target.cellIndex;
    canvas.setActiveObject(target);

    const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === target.cellIndex);
    if (img) {
      dragOffset = {
        x: img.left - pointer.x,
        y: img.top - pointer.y
      };
    } else {
      dragOffset = { x: 0, y: 0 };
    }

  } else {
    isDragging = false;
    dragOriginCellIndex = -1;
  }
};

const onMouseMove = (opt) => {
  if (!puzzleState.isActive || !isDragging || dragOriginCellIndex === -1) return;
  const canvas = unref(canvasRef);
  const pointer = canvas.getPointer(opt.e);
  const distFromStart = Math.sqrt(
    Math.pow(pointer.x - (dragOriginPoint?.x || 0), 2) +
    Math.pow(pointer.y - (dragOriginPoint?.y || 0), 2)
  );

  if (distFromStart < 5) return;

  const cell = puzzleState.cells.find(c => c.index === dragOriginCellIndex);
  if (!cell) return;

  const isInsideCell =
    pointer.x >= cell.left && pointer.x <= cell.left + cell.width &&
    pointer.y >= cell.top && pointer.y <= cell.top + cell.height;

  if (isInsideCell) {
    // 场景A：在格子内部微调（Pan）
    if (dragProxy) {
      canvas.remove(dragProxy);
      dragProxy = null;
      isCreatingProxy = false;
      const originImg = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === dragOriginCellIndex);
      if (originImg) originImg.set('opacity', 1);
    }
    const deltaX = pointer.x - dragLastPoint.x;
    const deltaY = pointer.y - dragLastPoint.y;
    const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === dragOriginCellIndex);
    if (img) {
      // 自由拖动，不做实时约束，松手时再回弹
      img.set({ left: img.left + deltaX, top: img.top + deltaY });
      img.setCoords();
    }
  } else {
    // 场景B：拖出格子（准备交换）
    if (!dragProxy && !isCreatingProxy) {
      isCreatingProxy = true;
      createDragProxy(dragOriginCellIndex, pointer);
    }

    if (dragProxy) {
      dragProxy.set({
        left: pointer.x + dragOffset.x,
        top: pointer.y + dragOffset.y
      });
      dragProxy.setCoords();
    }
  }
  dragLastPoint = { x: pointer.x, y: pointer.y };
  canvas.requestRenderAll();
};

const createDragProxy = (cellIndex, pointer) => {
  const canvas = unref(canvasRef);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);

  if (!cell || !img) {
    isCreatingProxy = false;
    return;
  }

  img.set('opacity', 0.4);

  img.clone((cloned) => {
    dragProxy = cloned;

    if (pointer) {
      dragOffset = {
        x: img.left - pointer.x,
        y: img.top - pointer.y
      };
    }

    dragProxy.set({
      opacity: 0.8, evented: false, selectable: false,
      originX: 'center', originY: 'center',
      left: pointer ? pointer.x + dragOffset.x : img.left,
      top: pointer ? pointer.y + dragOffset.y : img.top,
      hasControls: false, hasBorders: false,
      stroke: '#409eff', strokeWidth: 2,
      isPuzzleImage: true,
      isGhost: true
    });

    // 保持裁剪样式
    const cellCenterX = cell.left + cell.width / 2;
    const cellCenterY = cell.top + cell.height / 2;
    const offsetX = (cellCenterX - img.left) / img.scaleX;
    const offsetY = (cellCenterY - img.top) / img.scaleY;

    const clipRect = new fabric.Rect({
      left: offsetX, top: offsetY,
      width: cell.width / img.scaleX, height: cell.height / img.scaleY,
      originX: 'center', originY: 'center',
      absolutePositioned: false
    });
    dragProxy.clipPath = clipRect;

    canvas.add(dragProxy);
    canvas.bringToFront(dragProxy);
    isCreatingProxy = false;
  });
};

const onMouseUp = (opt) => {
  if (!puzzleState.isActive) return;
  const canvas = unref(canvasRef);
  const pointer = canvas.getPointer(opt.e);
  isDragging = false;
  isCreatingProxy = false;

  if (dragProxy) {
    // 处理交换逻辑
    const dropCell = getCellFromPoint(pointer.x, pointer.y);
    const originCellIndex = dragOriginCellIndex;
    canvas.remove(dragProxy);
    dragProxy = null;
    const originImg = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === originCellIndex);
    if (originImg) originImg.set('opacity', 1);

    if (dropCell && dropCell.index !== originCellIndex) {
      animateSwap(originCellIndex, dropCell.index);
    } else {
      // 没交换成功，弹回去
      animateSnapBack(originCellIndex);
    }
  } else if (dragOriginPoint) {
    // 处理点击或内部拖拽结束
    const dist = Math.sqrt(
      Math.pow(pointer.x - dragOriginPoint.x, 2) +
      Math.pow(pointer.y - dragOriginPoint.y, 2)
    );

    if (dist < 5) {
      // 点击事件
      const clickedCell = getCellFromPoint(pointer.x, pointer.y);
      if (clickedCell) {
        const target = opt.target;
        if (target && target.isDeleteBtn) return;

        const hasImg = canvas.getObjects().some(o => o.isPuzzleImage && o.cellIndex === clickedCell.index);

        if (!hasImg && uiCallbacks.onCellClick) {
          uiCallbacks.onCellClick(clickedCell.index);
          canvas.discardActiveObject();
        } else if (hasImg) {
          const controller = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === clickedCell.index);
          if (controller) canvas.setActiveObject(controller);
        }
      }
    } else {
      // 内部拖拽结束，触发回弹
      if (dragOriginCellIndex !== -1) animateSnapBack(dragOriginCellIndex);
    }
  }
  dragOriginCellIndex = -1;
  dragOriginPoint = null;
  canvas.requestRenderAll();
};

// 【核心修改】替换原有的 animateSnapBack 实现
const animateSnapBack = (cellIndex) => {
  const canvas = unref(canvasRef);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);

  if (img && cell) {
    // 构造容器矩形 (Cell)
    // 注意：animateRebound 接受的是 {left, top, width, height} 对象
    const containerRect = {
      left: cell.left,
      top: cell.top,
      width: cell.width,
      height: cell.height
    };

    // 直接调用通用物理回弹引擎！
    // 这样拼图的回弹手感就和 Crop/Resize 完全一样了
    animateRebound(img, containerRect, canvas);
  }
};

const animateSwap = (idxA, idxB) => {
  const canvas = unref(canvasRef);
  const imgA = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxA);
  const imgB = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxB);
  const cellA = puzzleState.cells.find(c => c.index === idxA);
  const cellB = puzzleState.cells.find(c => c.index === idxB);
  const animations = [];
  const duration = 300;
  const easing = fabric.util.ease.easeOutQuart;

  const createSyncAnimation = (img, targetCell) => {
    if (!img || !targetCell) return;

    // 交换时，我们需要重新计算“Cover”状态下的最佳位置
    const targetImgState = calculateFitPosition(img, targetCell);

    animations.push(new Promise(resolve => {
      img.animate({
        left: targetImgState.left,
        top: targetImgState.top,
        scaleX: targetImgState.scaleX,
        scaleY: targetImgState.scaleY
      }, {
        duration, easing,
        onChange: canvas.requestRenderAll.bind(canvas),
        onComplete: resolve
      });
    }));

    if (img.clipPath) {
      animations.push(new Promise(resolve => {
        img.clipPath.animate({
          left: targetCell.left,
          top: targetCell.top,
          width: targetCell.width,
          height: targetCell.height,
          rx: puzzleState.radius,
          ry: puzzleState.radius
        }, {
          duration, easing,
          onComplete: resolve
        });
      }));
    }
  };

  createSyncAnimation(imgA, cellB);
  createSyncAnimation(imgB, cellA);

  Promise.all(animations).then(() => {
    if (imgA) imgA.cellIndex = idxB;
    if (imgB) imgB.cellIndex = idxA;
    const ctrlA = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === idxA);
    const ctrlB = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === idxB);
    if (ctrlA) ctrlA.cellIndex = idxB;
    if (ctrlB) ctrlB.cellIndex = idxA;
    refreshPuzzleObjects();
    if (saveHistoryFn) saveHistoryFn();
  });
};

const onMouseWheel = (opt) => {
  const canvas = unref(canvasRef);
  const target = canvas.getActiveObject();
  if (!target || !target.isPuzzleController) return;
  opt.e.preventDefault(); opt.e.stopPropagation();
  const cell = puzzleState.cells.find(c => c.index === target.cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === target.cellIndex);
  if (!cell || !img) return;

  // 缩放逻辑
  let zoom = img.scaleX;
  zoom *= 0.999 ** opt.e.deltaY;

  // 限制缩放范围
  const minScale = Math.max(cell.width / img.width, cell.height / img.height);
  const maxScale = minScale * 5;
  if (zoom < minScale) zoom = minScale;
  if (zoom > maxScale) zoom = maxScale;

  img.set({ scaleX: zoom, scaleY: zoom });

  // 【核心修改】使用通用硬约束，实时修正位置，防止缩放露出黑边
  const containerRect = {
    left: cell.left, top: cell.top, width: cell.width, height: cell.height
  };
  constrainObjectToRect(img, containerRect, canvas);

  canvas.requestRenderAll();
};

export const updateLayout = (cellDefinitions = null, config = {}) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  if (config.padding !== undefined) puzzleState.padding = config.padding;
  if (config.spacing !== undefined) puzzleState.spacing = config.spacing;
  if (config.radius !== undefined) puzzleState.radius = config.radius;
  if (config.bgColor) {
    puzzleState.bgColor = config.bgColor;
    canvas.setBackgroundColor(config.bgColor, () => canvas.requestRenderAll());
  }
  const isTemplateChange = !!cellDefinitions;
  if (cellDefinitions) puzzleState.rawCells = cellDefinitions;
  const { width, height, padding, spacing } = puzzleState;
  const availW = width - (padding * 2);
  const availH = height - (padding * 2);
  puzzleState.cells = puzzleState.rawCells.map(cell => ({
    index: cell.index,
    left: padding + cell.x * availW + spacing / 2,
    top: padding + cell.y * availH + spacing / 2,
    width: cell.w * availW - spacing,
    height: cell.h * availH - spacing
  }));
  refreshPuzzleObjects(isTemplateChange);
  if (saveHistoryFn) saveHistoryFn();
};

// === 刷新对象 (防重叠 + 自动吸入) ===
const refreshPuzzleObjects = (shouldResetImages = false) => {
  const canvas = unref(canvasRef);
  const { radius } = puzzleState;

  const toRemove = canvas.getObjects().filter(o => o.isPlaceholder || o.isPuzzleController || o.isDeleteBtn);
  canvas.remove(...toRemove);

  const existingPuzzleImages = canvas.getObjects()
    .filter(o => o.isPuzzleImage && !o.isGhost && o !== dragProxy)
    .sort((a, b) => a.cellIndex - b.cellIndex);

  // 1. 自动吸入普通图片 (修复：不传 scale，强制重新计算 Cover)
  if (shouldResetImages && existingPuzzleImages.length === 0) {
    const rawImages = canvas.getObjects().filter(o => o.type === 'image' && !o.isPuzzleItem);
    if (rawImages.length > 0) {
      const rawImg = rawImages[0];
      const src = rawImg.getSrc();
      // 这里删除了 currentScale 的获取
      canvas.remove(rawImg);

      // 不传 targetScale，强制使用 addImageToCell 内部的自动居中逻辑
      addImageToCell(src, 0);

      puzzleState.cells.forEach(cell => drawPlaceholder(canvas, cell));
      canvas.requestRenderAll();
      return;
    }
  }

  puzzleState.cells.forEach((cell, index) => {
    let img = null;
    if (shouldResetImages) {
      if (index < existingPuzzleImages.length) {
        img = existingPuzzleImages[index];
        img.cellIndex = cell.index;
        img.set({ opacity: 1, visible: true });
        // 模板切换：强制居中
        const fitState = calculateFitPosition(img, cell);
        img.set({ scaleX: fitState.scaleX, scaleY: fitState.scaleY, left: fitState.left, top: fitState.top });
        img.setCoords();
      }
    } else {
      img = existingPuzzleImages.find(o => o.cellIndex === cell.index);
      if (img) {
        // 布局变动（如调整 Padding）：检查是否填满，不够则放大
        const minScale = Math.max(cell.width / img.width, cell.height / img.height);
        if (img.scaleX < minScale - 0.001) {
          img.set({ scaleX: minScale, scaleY: minScale });
        }
        // 硬约束防止跑偏
        const containerRect = { left: cell.left, top: cell.top, width: cell.width, height: cell.height };
        constrainObjectToRect(img, containerRect, canvas);
      }
    }

    if (img) {
      const clipRect = new fabric.Rect({
        left: cell.left, top: cell.top, width: cell.width, height: cell.height,
        rx: radius, ry: radius, absolutePositioned: true
      });
      img.set({ clipPath: clipRect, opacity: 1 });
      img.setCoords();

      const controller = new fabric.Rect({
        left: cell.left, top: cell.top, width: cell.width, height: cell.height,
        fill: 'transparent', noScaleCache: false,
        transparentCorners: false, cornerSize: 8, borderOpacityWhenMoving: 0.5,
        selectable: true, evented: true, hasControls: true, hasBorders: true,
        lockMovementX: true, lockMovementY: true,
        lockRotation: true, lockScalingX: true, lockScalingY: true,
        isPuzzleItem: true, isPuzzleController: true, cellIndex: cell.index
      });
      canvas.add(controller);
      drawDeleteBtn(canvas, cell);
    } else {
      drawPlaceholder(canvas, cell);
    }
  });

  if (shouldResetImages && existingPuzzleImages.length > puzzleState.cells.length) {
    const extras = existingPuzzleImages.slice(puzzleState.cells.length);
    canvas.remove(...extras);
  }
  canvas.requestRenderAll();
};

const deleteImageFromCell = (cellIndex) => {
  const canvas = unref(canvasRef);
  const objs = canvas.getObjects().filter(o =>
    (o.isPuzzleImage || o.isPuzzleController || o.isDeleteBtn) && o.cellIndex === cellIndex
  );
  canvas.remove(...objs);
  refreshPuzzleObjects();
  if (saveHistoryFn) saveHistoryFn();
};

const drawDeleteBtn = (canvas, cell) => {
  const btnRadius = 9;
  const padding = 6;

  const circle = new fabric.Circle({
    radius: btnRadius,
    fill: 'rgba(0, 0, 0, 0.6)',
    originX: 'center', originY: 'center'
  });

  const text = new fabric.Text('×', {
    fill: '#fff',
    fontSize: 18,
    fontFamily: 'Arial',
    originX: 'center', originY: 'center',
    top: -1
  });

  const group = new fabric.Group([circle, text], {
    left: cell.left + cell.width - btnRadius - padding,
    top: cell.top + btnRadius + padding,
    originX: 'center', originY: 'center',
    selectable: false,
    hoverCursor: 'pointer',
    isPuzzleItem: true,
    isDeleteBtn: true,
    cellIndex: cell.index
  });

  canvas.add(group);
  canvas.bringToFront(group);
};

const drawPlaceholder = (canvas, cell) => {
  const rect = new fabric.Rect({
    left: cell.left, top: cell.top, width: cell.width, height: cell.height,
    fill: '#f5f7fa', stroke: '#dcdfe6', strokeWidth: 1, strokeDashArray: [4, 4],
    rx: puzzleState.radius, ry: puzzleState.radius,
    selectable: false, evented: false, isPuzzleItem: true, isPlaceholder: true
  });
  const plus = new fabric.Text('+', {
    left: cell.left + cell.width / 2, top: cell.top + cell.height / 2,
    fontSize: 30, fill: '#909399', originX: 'center', originY: 'center',
    selectable: false, evented: false, isPuzzleItem: true, isPlaceholder: true
  });
  canvas.add(rect, plus);
  canvas.sendToBack(rect);
};

const getCellFromPoint = (x, y) => {
  return puzzleState.cells.find(cell =>
    x >= cell.left && x <= cell.left + cell.width &&
    y >= cell.top && y <= cell.top + cell.height
  );
};

// === 添加图片的终极修复 (强制居中) ===
export const addImageToCell = (url, cellIndex, options = {}) => {
  const canvas = unref(canvasRef);
  const oldObjs = canvas.getObjects().filter(o => (o.isPuzzleImage || o.isPuzzleController || o.isDeleteBtn) && o.cellIndex === cellIndex);
  canvas.remove(...oldObjs);

  fabric.Image.fromURL(url, (img) => {
    const cell = puzzleState.cells.find(c => c.index === cellIndex);
    if (!cell) return;

    let scale;
    // 逻辑：如果有 targetScale 就用，没有就自动 Cover
    if (options.targetScale) {
      scale = options.targetScale;
    } else {
      scale = Math.max(cell.width / img.width, cell.height / img.height) + 0.001;
    }

    // 【关键】设置居中
    img.set({
      // 1. 设置中心点坐标
      left: cell.left + cell.width / 2,
      top: cell.top + cell.height / 2,
      // 2. 设置 origin 为中心
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      selectable: false, evented: false, hasControls: false, hasBorders: false,
      isPuzzleItem: true, isPuzzleImage: true, cellIndex: cellIndex,
    });

    // 3. 立即更新坐标，防止后续计算出错
    img.setCoords();

    const controller = new fabric.Rect({
      left: cell.left, top: cell.top, width: cell.width, height: cell.height,
      fill: 'transparent', noScaleCache: false,
      transparentCorners: false, cornerSize: 8, borderOpacityWhenMoving: 0.5,
      selectable: true, evented: true, hasControls: true, hasBorders: true,
      lockMovementX: true, lockMovementY: true,
      lockRotation: true, lockScalingX: true, lockScalingY: true,
      isPuzzleItem: true, isPuzzleController: true, cellIndex: cellIndex,
    });

    canvas.add(img);
    canvas.add(controller);
    canvas.setActiveObject(controller);

    refreshPuzzleObjects(); // 这里会再次触发 constrain check，但因为已经居中且足够大，不会有副作用
    if (saveHistoryFn) saveHistoryFn();
  }, { crossOrigin: 'anonymous' });
};