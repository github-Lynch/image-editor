// src/components/modules/puzzle/useCanvasPuzzle.js
import { unref, reactive } from "vue";
import { fabric } from "fabric";
import { parseTemplateToCells, generateGridCells } from "./config";

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

const puzzleState = reactive({
  isActive: false,
  cells: [],
  padding: 20,
  spacing: 10,
  radius: 0,
  width: 1000,
  height: 1000,
  bgColor: '#ffffff'
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

  puzzleState.isActive = true;
  puzzleState.width = canvas.width;
  puzzleState.height = canvas.height;

  bindEvents();

  const existingImages = canvas.getObjects().filter(o => o.type === 'image');
  const cells = initialTemplate ? parseTemplateToCells(initialTemplate) : generateGridCells(2, 2);
  updateLayout(cells);

  if (existingImages.length > 0) {
    const imgObj = existingImages[0];
    const src = imgObj.getSrc();
    canvas.remove(imgObj);
    addImageToCell(src, 0);
  } else {
    canvas.requestRenderAll();
  }
};

export const exitPuzzleMode = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  puzzleState.isActive = false;
  unbindEvents();
  const puzzleObjs = canvas.getObjects().filter(o => o.isPuzzleItem);
  canvas.remove(...puzzleObjs);
  canvas.requestRenderAll();
};

// =========================================================================
// 核心逻辑：计算合法的图片位置 (防止露白)
// =========================================================================
const calculateValidPosition = (img, cell) => {
  const minScaleX = cell.width / img.width;
  const minScaleY = cell.height / img.height;
  const minScale = Math.max(minScaleX, minScaleY) + 0.0001;

  let targetScale = img.scaleX;
  if (targetScale < minScale) targetScale = minScale;

  const imgScaledW = img.width * targetScale;
  const imgScaledH = img.height * targetScale;

  let targetLeft = img.left;
  let targetTop = img.top;

  const imgLeftEdge = targetLeft - imgScaledW / 2;
  const imgRightEdge = targetLeft + imgScaledW / 2;
  const imgTopEdge = targetTop - imgScaledH / 2;
  const imgBottomEdge = targetTop + imgScaledH / 2;

  const cellLeftEdge = cell.left;
  const cellRightEdge = cell.left + cell.width;
  const cellTopEdge = cell.top;
  const cellBottomEdge = cell.top + cell.height;

  // X轴约束
  if (imgScaledW <= cell.width + 0.1) {
    targetLeft = cell.left + cell.width / 2;
  } else {
    if (imgLeftEdge > cellLeftEdge) targetLeft = cellLeftEdge + imgScaledW / 2;
    else if (imgRightEdge < cellRightEdge) targetLeft = cellRightEdge - imgScaledW / 2;
  }

  // Y轴约束
  if (imgScaledH <= cell.height + 0.1) {
    targetTop = cell.top + cell.height / 2;
  } else {
    if (imgTopEdge > cellTopEdge) targetTop = cellTopEdge + imgScaledH / 2;
    else if (imgBottomEdge < cellBottomEdge) targetTop = cellBottomEdge - imgScaledH / 2;
  }

  return { scaleX: targetScale, scaleY: targetScale, left: targetLeft, top: targetTop };
};

// === 事件监听 ===
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

// 1. Mouse Down
const onMouseDown = (opt) => {
  if (!puzzleState.isActive) return;
  const canvas = unref(canvasRef);
  const target = opt.target;
  dragOriginPoint = opt.absolutePointer;
  const pointer = canvas.getPointer(opt.e);
  dragLastPoint = { x: pointer.x, y: pointer.y };

  if (target && target.isPuzzleController) {
    isDragging = true;
    dragOriginCellIndex = target.cellIndex;
    canvas.setActiveObject(target);
  } else {
    isDragging = false;
    dragOriginCellIndex = -1;
  }
};

// 2. Mouse Move
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
    // === Pan 模式 (格子内) ===
    if (dragProxy) {
      canvas.remove(dragProxy);
      dragProxy = null;
      const originImg = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === dragOriginCellIndex);
      if (originImg) originImg.set('opacity', 1);
    }
    const deltaX = pointer.x - dragLastPoint.x;
    const deltaY = pointer.y - dragLastPoint.y;
    const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === dragOriginCellIndex);
    if (img) {
      img.set({ left: img.left + deltaX, top: img.top + deltaY });
      img.setCoords();
    }
  } else {
    // === Swap 模式 (拖出格子) ===
    if (!dragProxy) createDragProxy(dragOriginCellIndex);
    if (dragProxy) {
      dragProxy.set({ left: pointer.x, top: pointer.y });
      dragProxy.setCoords();
    }
  }

  dragLastPoint = { x: pointer.x, y: pointer.y };
  canvas.requestRenderAll();
};

// 创建幽灵对象
const createDragProxy = (cellIndex) => {
  const canvas = unref(canvasRef);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);

  if (!cell || !img) return;

  img.set('opacity', 0.4); // 降低原图不透明度

  img.clone((cloned) => {
    dragProxy = cloned;

    // 设置幽灵样式
    dragProxy.set({
      opacity: 0.8, evented: false, selectable: false,
      originX: 'center', originY: 'center',
      left: canvas.getPointer(null).x, top: canvas.getPointer(null).y,
      hasControls: false, hasBorders: false,
      stroke: '#409eff', strokeWidth: 2
    });

    // 计算幽灵的 ClipPath (相对)
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
  });
};

// 3. Mouse Up
const onMouseUp = (opt) => {
  if (!puzzleState.isActive) return;
  const canvas = unref(canvasRef);
  const pointer = canvas.getPointer(opt.e);
  isDragging = false;

  if (dragProxy) {
    const dropCell = getCellFromPoint(pointer.x, pointer.y);
    const originCellIndex = dragOriginCellIndex;

    canvas.remove(dragProxy);
    dragProxy = null;

    const originImg = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === originCellIndex);
    if (originImg) originImg.set('opacity', 1);

    if (dropCell && dropCell.index !== originCellIndex) {
      animateSwap(originCellIndex, dropCell.index);
    } else {
      animateSnapBack(originCellIndex);
    }
  } else if (dragOriginPoint) {
    const dist = Math.sqrt(
      Math.pow(pointer.x - dragOriginPoint.x, 2) +
      Math.pow(pointer.y - dragOriginPoint.y, 2)
    );

    if (dist < 5) {
      const clickedCell = getCellFromPoint(pointer.x, pointer.y);
      if (clickedCell) {
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
      if (dragOriginCellIndex !== -1) animateSnapBack(dragOriginCellIndex);
    }
  }

  dragOriginCellIndex = -1;
  dragOriginPoint = null;
  canvas.requestRenderAll();
};

// =========================================================================
// 【核心重写】动画逻辑：交换 (同时动画化图片和其绝对定位的 ClipPath)
// =========================================================================
const animateSwap = (idxA, idxB) => {
  const canvas = unref(canvasRef);

  const imgA = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxA);
  const imgB = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxB);

  const cellA = puzzleState.cells.find(c => c.index === idxA);
  const cellB = puzzleState.cells.find(c => c.index === idxB);

  const animations = [];
  const duration = 300;
  const easing = fabric.util.ease.easeOutQuart;

  // --- 动画生成器 ---
  // 同时移动图片本体和它的绝对定位裁剪框
  const createSyncAnimation = (img, targetCell) => {
    if (!img || !targetCell) return;

    // 1. 计算图片本体的目标位置 (Cover 模式)
    const targetImgState = calculateValidPosition(img, targetCell);

    // 2. 动画化图片本体
    animations.push(new Promise(resolve => {
      img.animate({
        left: targetImgState.left,
        top: targetImgState.top,
        scaleX: targetImgState.scaleX,
        scaleY: targetImgState.scaleY
      }, {
        duration, easing,
        onChange: canvas.requestRenderAll.bind(canvas), // 每帧刷新
        onComplete: resolve
      });
    }));

    // 3. 动画化绝对定位裁剪框 (从当前格子形状 -> 目标格子形状)
    // 我们的 ClipPath 是 absolutePositioned: true 的 Rect
    if (img.clipPath) {
      animations.push(new Promise(resolve => {
        img.clipPath.animate({
          left: targetCell.left,
          top: targetCell.top,
          width: targetCell.width,
          height: targetCell.height,
          // 如果圆角不同也可以动画
          rx: puzzleState.radius,
          ry: puzzleState.radius
        }, {
          duration, easing,
          // 这里不需要 onChange，因为外层的图片 animate 已经触发了
          onComplete: resolve
        });
      }));
    }
  };

  // 执行 A -> B
  createSyncAnimation(imgA, cellB);
  // 执行 B -> A
  createSyncAnimation(imgB, cellA);

  Promise.all(animations).then(() => {
    // 交换索引数据
    if (imgA) imgA.cellIndex = idxB;
    if (imgB) imgB.cellIndex = idxA;

    const ctrlA = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === idxA);
    const ctrlB = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === idxB);
    if (ctrlA) ctrlA.cellIndex = idxB;
    if (ctrlB) ctrlB.cellIndex = idxA;

    // 刷新一次以修正所有状态
    refreshPuzzleObjects();
    if (saveHistoryFn) saveHistoryFn();
  });
};

// =========================================================================
// 动画逻辑：回弹
// =========================================================================
const animateSnapBack = (cellIndex) => {
  const canvas = unref(canvasRef);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);

  if (img && cell) {
    const validPos = calculateValidPosition(img, cell);
    const dist = Math.sqrt(Math.pow(img.left - validPos.left, 2) + Math.pow(img.top - validPos.top, 2));

    if (dist > 0.5) {
      img.animate({
        left: validPos.left, top: validPos.top
      }, {
        duration: 200, easing: fabric.util.ease.easeOutQuad,
        onChange: canvas.requestRenderAll.bind(canvas),
        onComplete: () => { img.setCoords(); if (saveHistoryFn) saveHistoryFn(); }
      });
    }
  }
};

// === 滚轮缩放 (保持不变) ===
const onMouseWheel = (opt) => {
  const canvas = unref(canvasRef);
  const target = canvas.getActiveObject();
  if (!target || !target.isPuzzleController) return;

  opt.e.preventDefault(); opt.e.stopPropagation();

  const cell = puzzleState.cells.find(c => c.index === target.cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === target.cellIndex);
  if (!cell || !img) return;

  let zoom = img.scaleX;
  zoom *= 0.999 ** opt.e.deltaY;
  const minScale = Math.max(cell.width / img.width, cell.height / img.height);
  const maxScale = minScale * 5;
  if (zoom < minScale) zoom = minScale;
  if (zoom > maxScale) zoom = maxScale;

  img.set({ scaleX: zoom, scaleY: zoom });
  const validPos = calculateValidPosition(img, cell);
  img.set({ left: validPos.left, top: validPos.top });
  canvas.requestRenderAll();
};

// === 布局刷新 (保持不变) ===
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

  // 标记是否发生了结构性变化 (行列变化/模板切换)
  // 如果 cellDefinitions 存在，说明是切换了模板，需要重置图片缩放
  // 如果是 null (仅调整间距)，则保留用户之前的缩放操作
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

  // 传入标志位
  refreshPuzzleObjects(isTemplateChange);

  if (saveHistoryFn) saveHistoryFn();
};

/**
 * 刷新所有对象
 * @param {Boolean} shouldResetImages 是否强制重置图片位置和缩放 (用于模板切换时)
 */
const refreshPuzzleObjects = (shouldResetImages = false) => {
  const canvas = unref(canvasRef);
  const { radius } = puzzleState;
  const placeholders = canvas.getObjects().filter(o => o.isPlaceholder);
  canvas.remove(...placeholders);

  puzzleState.cells.forEach(cell => {
    const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cell.index);
    const controller = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === cell.index);

    if (img && controller) {
      // 1. 恢复绝对定位 ClipPath
      const clipRect = new fabric.Rect({
        left: cell.left, top: cell.top, width: cell.width, height: cell.height,
        rx: radius, ry: radius, absolutePositioned: true
      });
      img.set({ clipPath: clipRect, opacity: 1 });
      img.setCoords();

      // 2. 控制器: 归位并锁定
      controller.set({
        left: cell.left, top: cell.top, width: cell.width, height: cell.height,
        rx: radius, ry: radius,
        lockMovementX: true, lockMovementY: true,
        lockRotation: true, lockScalingX: true, lockScalingY: true,
        hasControls: true, hasBorders: true
      });
      controller.setCoords();

      // 3. 位置与缩放调整策略
      if (shouldResetImages) {
        // === 策略 A: 模板切换 ===
        // 强制重置为“最佳填充 (Cover)”并居中
        // 这样从 2格 切到 9格 时，图片会自动缩小以展示更多内容
        const minScale = Math.max(cell.width / img.width, cell.height / img.height) + 0.0001;

        img.set({
          scaleX: minScale,
          scaleY: minScale,
          left: cell.left + cell.width / 2,
          top: cell.top + cell.height / 2
        });
      } else {
        // === 策略 B: 样式微调 (如拖动间距滑块) ===
        // 尽量保留用户之前的平移和缩放，只做合法性校验 (calculateValidPosition)
        const validPos = calculateValidPosition(img, cell);
        img.set({
          left: validPos.left,
          top: validPos.top,
          scaleX: validPos.scaleX,
          scaleY: validPos.scaleY
        });
      }

    } else {
      drawPlaceholder(canvas, cell);
    }
  });
  canvas.requestRenderAll();
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

export const addImageToCell = (url, cellIndex) => {
  const canvas = unref(canvasRef);
  const oldObjs = canvas.getObjects().filter(o => (o.isPuzzleImage || o.isPuzzleController) && o.cellIndex === cellIndex);
  canvas.remove(...oldObjs);
  fabric.Image.fromURL(url, (img) => {
    const cell = puzzleState.cells.find(c => c.index === cellIndex);
    if (!cell) return;
    const scale = Math.max(cell.width / img.width, cell.height / img.height) + 0.001;
    img.set({
      left: cell.left + cell.width / 2, top: cell.top + cell.height / 2,
      originX: 'center', originY: 'center',
      scaleX: scale, scaleY: scale,
      selectable: false, evented: false, hasControls: false, hasBorders: false,
      isPuzzleItem: true, isPuzzleImage: true, cellIndex: cellIndex,
    });
    const controller = new fabric.Rect({
      left: cell.left, top: cell.top, width: cell.width, height: cell.height,
      fill: 'transparent', noScaleCache: false,
      transparentCorners: false, cornerSize: 8, borderOpacityWhenMoving: 0.5,
      selectable: true, evented: true, hasControls: true, hasBorders: true,
      lockMovementX: true, lockMovementY: true,
      lockRotation: true, lockScalingX: true, lockScalingY: true,
      isPuzzleItem: true, isPuzzleController: true, cellIndex: cellIndex,
    });
    canvas.add(img); canvas.add(controller); canvas.setActiveObject(controller);
    refreshPuzzleObjects();
    if (saveHistoryFn) saveHistoryFn();
  }, { crossOrigin: 'anonymous' });
};