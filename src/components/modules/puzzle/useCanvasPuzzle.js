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
// 【关键保留】记录偏移量，修复拖拽时的瞬移问题
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

  puzzleState.isActive = true;
  puzzleState.width = canvas.width;
  puzzleState.height = canvas.height;

  bindEvents();

  // 1. 布局初始化
  const cells = initialTemplate ? parseTemplateToCells(initialTemplate) : generateGridCells(DEFAULTS.rows, DEFAULTS.cols);

  // 2. 应用布局 (内部会自动吸入普通图片，无需手动 addImageToCell)
  updateLayout(cells);

  canvas.requestRenderAll();
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
// 核心逻辑：计算合法的图片位置
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

  if (imgScaledW <= cell.width + 0.1) {
    targetLeft = cell.left + cell.width / 2;
  } else {
    if (imgLeftEdge > cellLeftEdge) targetLeft = cellLeftEdge + imgScaledW / 2;
    else if (imgRightEdge < cellRightEdge) targetLeft = cellRightEdge - imgScaledW / 2;
  }

  if (imgScaledH <= cell.height + 0.1) {
    targetTop = cell.top + cell.height / 2;
  } else {
    if (imgTopEdge > cellTopEdge) targetTop = cellTopEdge + imgScaledH / 2;
    else if (imgBottomEdge < cellBottomEdge) targetTop = cellBottomEdge - imgScaledH / 2;
  }

  return { scaleX: targetScale, scaleY: targetScale, left: targetLeft, top: targetTop };
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

  if (target && target.isPuzzleController) {
    isDragging = true;
    dragOriginCellIndex = target.cellIndex;
    canvas.setActiveObject(target);

    // 记录点击时的相对偏移，用于后续拖拽
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
    // === Pan 模式 (保持原样) ===
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
      img.set({ left: img.left + deltaX, top: img.top + deltaY });
      img.setCoords();
    }
  } else {
    // === Swap 模式 (创建幽灵) ===
    if (!dragProxy && !isCreatingProxy) {
      isCreatingProxy = true;
      createDragProxy(dragOriginCellIndex, pointer);
    }

    if (dragProxy) {
      // 使用偏移量，保证不跳动
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

    // 【关键】重新校准偏移量，确保生成的幽灵正好在当前图片位置
    // 即使图片因为卡在边缘没有跟随鼠标，这里也会重新计算正确的 offset
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

    const cellCenterX = cell.left + cell.width / 2;
    const cellCenterY = cell.top + cell.height / 2;
    const offsetX = (cellCenterX - img.left) / img.scaleX;
    const offsetY = (cellCenterY - img.top) / img.scaleY;

    // 幽灵的 ClipPath 保持相对定位，用于显示局部
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
// 动画逻辑：【完全还原】原来的 absolutePositioned 动画逻辑
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

  const createSyncAnimation = (img, targetCell) => {
    if (!img || !targetCell) return;

    // 计算目标位置
    const targetImgState = calculateValidPosition(img, targetCell);

    // 1. 动画主体 (Image)
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

    // 2. 动画裁剪框 (ClipPath) - 使用【绝对定位】
    // 这是您原版代码的逻辑，确保动画视觉效果一致
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
    refreshPuzzleObjects(); // 刷新以确保状态同步
    if (saveHistoryFn) saveHistoryFn();
  });
};

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

// === 刷新对象 (防重复 + 自动吸入) ===
const refreshPuzzleObjects = (shouldResetImages = false) => {
  const canvas = unref(canvasRef);
  const { radius } = puzzleState;

  const toRemove = canvas.getObjects().filter(o => o.isPlaceholder || o.isPuzzleController);
  canvas.remove(...toRemove);

  // 1. 过滤幽灵和代理
  const existingPuzzleImages = canvas.getObjects()
    .filter(o => o.isPuzzleImage && !o.isGhost && o !== dragProxy)
    .sort((a, b) => a.cellIndex - b.cellIndex);

  // 2. 自动吸入普通图片 (Fix 还原后切模板无效)
  if (shouldResetImages && existingPuzzleImages.length === 0) {
    const rawImages = canvas.getObjects().filter(o => o.type === 'image' && !o.isPuzzleItem);
    if (rawImages.length > 0) {
      const rawImg = rawImages[0];
      const src = rawImg.getSrc();
      canvas.remove(rawImg);
      addImageToCell(src, 0);
      puzzleState.cells.forEach(cell => drawPlaceholder(canvas, cell));
      canvas.requestRenderAll();
      return;
    }
  }

  // 3. 遍历格子
  puzzleState.cells.forEach((cell, index) => {
    let img = null;

    if (shouldResetImages) {
      if (index < existingPuzzleImages.length) {
        img = existingPuzzleImages[index];
        img.cellIndex = cell.index;
        img.set({ opacity: 1, visible: true });

        const minScale = Math.max(cell.width / img.width, cell.height / img.height) + 0.0001;
        img.set({
          scaleX: minScale, scaleY: minScale,
          left: cell.left + cell.width / 2,
          top: cell.top + cell.height / 2
        });
        img.setCoords();
      }
    } else {
      img = existingPuzzleImages.find(o => o.cellIndex === cell.index);
      if (img) {
        const validPos = calculateValidPosition(img, cell);
        img.set({
          left: validPos.left, top: validPos.top,
          scaleX: validPos.scaleX, scaleY: validPos.scaleY
        });
        img.setCoords();
      }
    }

    if (img) {
      // 还原为绝对定位的 ClipPath，保证动画兼容性
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