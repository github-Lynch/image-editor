// src/components/modules/puzzle/useCanvasPuzzle.js
import { unref, reactive, toRaw, nextTick } from "vue";
import { fabric } from "fabric";
import { constrainObjectToRect, animateRebound } from '@/composables/useConstraint';
import { CANVAS_PROPS_WHITELIST } from "@/composables/useEditorState";

// === 内部变量 ===
let currentRenderToken = 0;
export let canvasRef = null;
let zoomToRectFn = null;
let prePuzzleVpt = null;
let uiCallbacks = { onCellClick: null, onImageSelect: null, onDeselect: null };
export let prePuzzleSnapshot = null;

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
  padding: 0,
  spacing: 10,
  radius: 0,
  width: 1000,
  height: 1000,
  bgColor: '#ffffff',
};

export const puzzleState = reactive({
  isActive: false,
  mode: 'grid', // 'grid' | 'join'
  joinDirection: 'horizontal', // 'horizontal' | 'vertical'
  cells: [],
  imagePool: [], // 在 Join 模式下，池的顺序即为拼接顺序
  padding: DEFAULTS.padding,
  spacing: DEFAULTS.spacing,
  radius: DEFAULTS.radius,
  width: DEFAULTS.width,
  height: DEFAULTS.height,
  bgColor: DEFAULTS.bgColor,
  startX: 0,
  startY: 0,
  originalBg: null,
  rawCells: []
});

export const registerPuzzleModule = (canvas, callbacks = {}, zoomToRect = null) => {
  canvasRef = canvas;
  uiCallbacks = { ...uiCallbacks, ...callbacks };
  zoomToRectFn = zoomToRect;
};

// === 状态捕获与恢复 ===

export const recordEntryState = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  // 锁：如果已经存过快照了，绝对不要覆盖它
  if (prePuzzleSnapshot) return;

  prePuzzleVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
  prePuzzleSnapshot = JSON.stringify(canvas.toJSON(CANVAS_PROPS_WHITELIST));
  puzzleState.originalBg = canvas.backgroundColor;
};

export const clearEntryState = () => {
  prePuzzleSnapshot = null;
  prePuzzleVpt = null;
};

export const zoomToPuzzleArea = () => {
  if (!zoomToRectFn) return;
  const rect = {
    left: puzzleState.startX,
    top: puzzleState.startY,
    width: puzzleState.width,
    height: puzzleState.height
  };
  // 增加视觉边距
  const paddedRect = {
    left: rect.left - 50,
    top: rect.top - 50,
    width: rect.width + 100,
    height: rect.height + 100
  };
  zoomToRectFn(paddedRect);
};

// === 初始化逻辑 ===

const prepareInit = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return false;
  recordEntryState();

  // 如果已经激活且有内容，不重置池，防止切换 Tab 时丢失数据
  if (puzzleState.isActive && puzzleState.imagePool.length > 0) return true;

  puzzleState.imagePool = [];
  // 提取主图
  const activeImg = canvas.getObjects().find(o => o.type === 'image' && !o.isPuzzleItem);
  if (activeImg) {
    puzzleState.imagePool[0] = {
      id: `img_main_${Date.now()}`,
      src: activeImg.getSrc(),
      width: activeImg.width,
      height: activeImg.height,
      metadata: {
        filters: activeImg.filters ? [...activeImg.filters] : [],
        opacity: activeImg.opacity || 1,
        scale: 1
      }
    };
    canvas.remove(activeImg);
  }
  puzzleState.isActive = true;
  bindEvents();
  return true;
};

// 1. 网格模式初始化
export const initPuzzleMode = () => {
  if (!prepareInit()) return;
  puzzleState.mode = 'grid';
  // 默认 1x1
  updateLayout([{ w: 1, h: 1, x: 0, y: 0, index: 0 }]);
  zoomToPuzzleArea();
};

// 2. 拼接模式初始化
export const initJoinMode = (direction = 'horizontal') => {
  if (!prepareInit()) return;

  puzzleState.mode = 'join';
  puzzleState.joinDirection = direction;

  // 设置默认基准尺寸
  if (direction === 'horizontal') {
    puzzleState.height = 1000; // 纵向拼接时，高度固定作为基准
    puzzleState.width = 1000;  // 初始值
  } else {
    puzzleState.width = 1000;  // 横向拼接时，宽度固定作为基准
    puzzleState.height = 1000;
  }
  puzzleState.spacing = 0; // 拼接默认无间距
  puzzleState.padding = 0;

  // 立即执行重排
  reflowJoinLayout();
};

// === 拼接模式核心引擎 (Reflow Engine) ===

export const reflowJoinLayout = () => {
  if (puzzleState.mode !== 'join') return;

  const { joinDirection, spacing, padding, imagePool } = puzzleState;
  // 过滤空槽
  const validImages = imagePool.filter(img => img && img.src);

  if (validImages.length === 0) {
    puzzleState.cells = [];
    refreshPuzzleObjects(false);
    return;
  }

  let currentPos = padding;
  const cells = [];

  // 方案B：等比适应
  if (joinDirection === 'horizontal') {
    // 横向拼接：高度固定，宽度动态延伸
    const fixedHeight = puzzleState.height - (padding * 2);

    validImages.forEach((img, index) => {
      // 防止除以0
      const h = img.height || 100;
      const w = img.width || 100;
      const ratio = w / h;

      const cellWidth = fixedHeight * ratio;

      cells.push({
        index: index, // 在 Join 模式下，index 对应 imagePool 的顺序
        left: puzzleState.startX + currentPos,
        top: puzzleState.startY + padding,
        width: cellWidth,
        height: fixedHeight,
        poolRef: img // 直接引用数据对象
      });

      currentPos += cellWidth + spacing;
    });

    // 更新总宽度
    puzzleState.width = Math.max(100, currentPos - spacing + padding);

  } else {
    // 纵向拼接：宽度固定，高度动态延伸
    const fixedWidth = puzzleState.width - (padding * 2);

    validImages.forEach((img, index) => {
      const h = img.height || 100;
      const w = img.width || 100;
      const ratio = h / w;

      const cellHeight = fixedWidth * ratio;

      cells.push({
        index: index,
        left: puzzleState.startX + padding,
        top: puzzleState.startY + currentPos,
        width: fixedWidth,
        height: cellHeight,
        poolRef: img
      });

      currentPos += cellHeight + spacing;
    });

    // 更新总高度
    puzzleState.height = Math.max(100, currentPos - spacing + padding);
  }

  puzzleState.cells = cells;

  // 重绘
  refreshPuzzleObjects(false);

  // 自动适配视口
  nextTick(() => {
    zoomToPuzzleArea();
  });
};

/**
 * 拼接模式：追加图片
 */
export const appendImageToJoin = (url) => {
  // 1. 获取图片元数据
  fabric.Image.fromURL(url, (img) => {
    const newImgData = {
      id: `img_join_${Date.now()}`,
      src: url,
      width: img.width,
      height: img.height,
      metadata: { filters: [], opacity: 1, scale: 1 }
    };

    // 2. 推入池
    puzzleState.imagePool.push(newImgData);

    // 3. 触发重排
    reflowJoinLayout();

  }, { crossOrigin: 'anonymous' });
};

// === 布局更新与管理 ===

const calculateCellsInternal = () => {
  const { width, height, padding, spacing, startX, startY } = puzzleState;
  const safeW = Math.max(0, width - (padding * 2));
  const safeH = Math.max(0, height - (padding * 2));

  puzzleState.cells = puzzleState.rawCells.map(cell => {
    const EPSILON = 0.01;
    const isLeftEdge = cell.x < EPSILON;
    const isTopEdge = cell.y < EPSILON;
    const isRightEdge = Math.abs((cell.x + cell.w) - 1.0) < EPSILON;
    const isBottomEdge = Math.abs((cell.y + cell.h) - 1.0) < EPSILON;

    let boxLeft = startX + Number(padding) + (cell.x * safeW);
    let boxTop = startY + Number(padding) + (cell.y * safeH);
    let boxWidth = cell.w * safeW;
    let boxHeight = cell.h * safeH;

    if (!isLeftEdge) { boxLeft += spacing / 2; boxWidth -= spacing / 2; }
    if (!isRightEdge) { boxWidth -= spacing / 2; }
    if (!isTopEdge) { boxTop += spacing / 2; boxHeight -= spacing / 2; }
    if (!isBottomEdge) { boxHeight -= spacing / 2; }

    return {
      index: cell.index,
      left: boxLeft,
      top: boxTop,
      width: Math.max(1, boxWidth),
      height: Math.max(1, boxHeight)
    };
  });
};

export const updateLayout = (cellDefinitions = null, config = {}) => {
  if (puzzleState.mode === 'join') {
    if (config.spacing !== undefined) puzzleState.spacing = config.spacing;
    if (config.padding !== undefined) puzzleState.padding = config.padding;
    if (config.bgColor) puzzleState.bgColor = config.bgColor;
    if (config.width) puzzleState.width = config.width;
    if (config.height) puzzleState.height = config.height;
    reflowJoinLayout();
    return;
  }

  const canvas = unref(canvasRef);
  if (!canvas) return;
  if (config.width !== undefined) puzzleState.width = config.width;
  if (config.height !== undefined) puzzleState.height = config.height;
  if (config.padding !== undefined) puzzleState.padding = config.padding;
  if (config.spacing !== undefined) puzzleState.spacing = config.spacing;
  if (config.radius !== undefined) puzzleState.radius = config.radius;
  if (config.bgColor) puzzleState.bgColor = config.bgColor;

  if (cellDefinitions) {
    puzzleState.rawCells = cellDefinitions;
    calculateCellsInternal();
    refreshPuzzleObjects(true);
  } else {
    calculateCellsInternal();
    refreshPuzzleObjects(false);
  }
};

// === 图片操作 ===

export const deleteImageFromCell = (cellIndex) => {
  if (puzzleState.mode === 'join') {
    puzzleState.imagePool.splice(cellIndex, 1);
    reflowJoinLayout();
  } else {
    if (puzzleState.imagePool[cellIndex]) {
      puzzleState.imagePool[cellIndex] = null;
    }
    refreshPuzzleObjects(false);
  }
};

/**
 * 向指定格子添加/替换图片
 * @param {string} url - 图片地址
 * @param {number} cellIndex - 格子索引
 */
export const addImageToCell = (url, cellIndex) => {
  // === 1. Join (拼接) 模式处理逻辑 ===
  if (puzzleState.mode === 'join') {
    // 拼接模式下，必须先获取图片尺寸，因为布局依赖于图片宽高比
    fabric.Image.fromURL(url, (img) => {
      const newImgData = {
        id: `img_join_${Date.now()}`,
        src: url,
        width: img.width,
        height: img.height,
        metadata: { filters: [], opacity: 1, scale: 1 }
      };

      // 核心修正：不再追加，而是替换指定位置的数据
      if (cellIndex >= 0 && cellIndex < puzzleState.imagePool.length) {
        puzzleState.imagePool[cellIndex] = newImgData;
      } else {
        // 兜底：如果索引异常，则追加
        puzzleState.imagePool.push(newImgData);
      }

      // 触发拼接布局重排 (自动适应新图片的宽高比)
      reflowJoinLayout();
    }, { crossOrigin: 'anonymous' });
    
    return;
  }

  // === 2. Grid (网格) 模式处理逻辑 (保持原有逻辑) ===
  fabric.Image.fromURL(url, (img) => {
    puzzleState.imagePool[cellIndex] = {
      id: `img_${Date.now()}`,
      src: url,
      width: img.width,
      height: img.height,
      metadata: { filters: [], opacity: 1, scale: 1 }
    };
    refreshPuzzleObjects(false);

    setTimeout(() => {
      const canvas = unref(canvasRef);
      const controller = canvas?.getObjects().find(
        o => o.isPuzzleController && o.cellIndex === cellIndex
      );
      if (controller) {
        canvas.setActiveObject(controller);
        canvas.requestRenderAll();
      }
    }, 100);
  }, { crossOrigin: 'anonymous' });
};

export const updatePuzzleImageParams = (cellIndex, params = {}) => {
  const canvas = unref(canvasRef);

  let poolItem;
  if (puzzleState.mode === 'join') {
    poolItem = puzzleState.imagePool[cellIndex];
  } else {
    poolItem = puzzleState.imagePool[cellIndex];
  }

  if (!canvas || !poolItem) return;

  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);

  if (img && cell) {
    if (params.opacity !== undefined) {
      img.set('opacity', params.opacity);
      poolItem.metadata.opacity = params.opacity;
    }
    if (params.scale !== undefined) {
      const fitState = calculateFitPosition(img, cell);
      const minScale = fitState.scaleX;

      let newScale = Math.max(minScale, params.scale);
      img.set({ scaleX: newScale, scaleY: newScale });
      poolItem.metadata.scale = newScale;

      constrainObjectToRect(img, { left: cell.left, top: cell.top, width: cell.width, height: cell.height }, canvas);
    }
    canvas.requestRenderAll();
  }
};

export const getPuzzleImageCount = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return 0;
  return canvas.getObjects().filter(o => o.isPuzzleImage && !o.isGhost && !o.isPuzzleBackground).length;
};

// === 核心渲染逻辑 ===

const calculateFitPosition = (img, cell) => {
  const iW = img.width || 1;
  const iH = img.height || 1;
  const cW = cell.width;
  const cH = cell.height;

  const scaleX = cW / iW;
  const scaleY = cH / iH;

  const fillScale = Math.max(scaleX, scaleY) + (puzzleState.mode === 'join' ? 0 : 0.01);

  return {
    scaleX: fillScale,
    scaleY: fillScale,
    left: cell.left + cW / 2,
    top: cell.top + cH / 2
  };
};

const refreshPuzzleObjects = (shouldResetImages = false) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const thisRenderToken = ++currentRenderToken;
  const { radius, startX, startY, width, height, bgColor } = puzzleState;

  // 1. 清理
  const toRemove = canvas.getObjects().filter(o =>
    o.isPlaceholder || o.isPuzzleController || o.isPuzzleBackground || o.isPuzzleImage
  );
  canvas.remove(...toRemove);

  // 2. 绘制背景
  const localBg = new fabric.Rect({
    left: startX, top: startY, width: width, height: height,
    fill: bgColor, rx: radius, ry: radius,
    selectable: false, evented: false, isPuzzleBackground: true, isPuzzleItem: true
  });
  canvas.add(localBg);
  localBg.sendToBack();

  // 3. 压实池 (Grid 模式)
  if (shouldResetImages && puzzleState.mode === 'grid') {
    puzzleState.imagePool = puzzleState.imagePool.filter(item => item && item.src);
  }

  // 4. 遍历格子渲染
  puzzleState.cells.forEach((cell, index) => {
    let poolData;
    if (puzzleState.mode === 'join') {
      poolData = cell.poolRef; // Join 模式直接读取引用
    } else {
      poolData = puzzleState.imagePool[index];
    }

    if (poolData && poolData.src) {
      fabric.Image.fromURL(poolData.src, (img) => {
        if (thisRenderToken !== currentRenderToken) return;

        const fitState = calculateFitPosition(img, cell);
        const autoScale = fitState.scaleX;
        const savedScale = poolData.metadata?.scale || 0;
        const finalScale = (puzzleState.mode === 'join') ? autoScale : Math.max(autoScale, savedScale);

        img.set({
          scaleX: finalScale,
          scaleY: finalScale,
          left: fitState.left,
          top: fitState.top,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          isPuzzleItem: true,
          isPuzzleImage: true,
          cellIndex: cell.index
        });

        if (poolData.metadata?.opacity !== undefined) img.set('opacity', poolData.metadata.opacity);

        canvas.add(img);
        img.setCoords();

        if (puzzleState.mode !== 'join') {
          const containerRect = { left: cell.left, top: cell.top, width: cell.width, height: cell.height };
          constrainObjectToRect(img, containerRect, canvas);
        }

        const clipRect = new fabric.Rect({
          left: cell.left, top: cell.top, width: cell.width, height: cell.height,
          rx: radius, ry: radius, absolutePositioned: true
        });
        img.set({ clipPath: clipRect });

        const controller = new fabric.Rect({
          left: cell.left, top: cell.top, width: cell.width, height: cell.height,
          fill: 'transparent', selectable: true, evented: true,
          hasControls: false, hasBorders: false, lockMovementX: true, lockMovementY: true,
          isPuzzleItem: true, isPuzzleController: true, cellIndex: cell.index
        });
        canvas.add(controller);
        controller.bringToFront();

        canvas.requestRenderAll();
      }, { crossOrigin: 'anonymous' });

    } else {
      if (puzzleState.mode === 'grid') {
        drawPlaceholder(canvas, cell);
      }
    }
  });

  canvas.requestRenderAll();
};

const drawPlaceholder = (canvas, cell) => {
  const rect = new fabric.Rect({
    left: cell.left,
    top: cell.top,
    width: cell.width,
    height: cell.height,
    fill: 'transparent',
    stroke: '#dcdfe6',
    strokeWidth: 1,
    strokeDashArray: [4, 4],
    rx: puzzleState.radius,
    ry: puzzleState.radius,
    selectable: false,
    evented: false,
    isPuzzleItem: true,
    isPlaceholder: true
  });
  const plus = new fabric.Text('+', {
    left: cell.left + cell.width / 2, top: cell.top + cell.height / 2,
    fontSize: 30, fill: '#909399', originX: 'center', originY: 'center',
    selectable: false, evented: false, isPuzzleItem: true, isPlaceholder: true
  });
  canvas.add(rect, plus);
};

// === 交互事件 ===

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

    // Join 模式也需要 dragOffset 用于拖拽代理显示
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
  }
  // 点击逻辑
  else if (dragOriginPoint) {
    const dist = Math.sqrt(
      Math.pow(pointer.x - dragOriginPoint.x, 2) +
      Math.pow(pointer.y - dragOriginPoint.y, 2)
    );

    if (dist < 5) {
      const clickedCell = getCellFromPoint(pointer.x, pointer.y);
      if (clickedCell) {
        const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === clickedCell.index);

        if (!img) {
          if (uiCallbacks.onCellClick) {
            uiCallbacks.onCellClick(clickedCell.index);
            canvas.discardActiveObject();
          }
        } else {
          const controller = canvas.getObjects().find(o => o.isPuzzleController && o.cellIndex === clickedCell.index);
          if (controller) canvas.setActiveObject(controller);

          if (uiCallbacks.onImageSelect) {
            uiCallbacks.onImageSelect(clickedCell.index, {
              opacity: img.opacity,
              scale: img.scaleX
            });
          }
        }
      } else {
        if (uiCallbacks.onDeselect) uiCallbacks.onDeselect();
      }
    } else {
      if (dragOriginCellIndex !== -1) animateSnapBack(dragOriginCellIndex);
    }
  }
  dragOriginCellIndex = -1;
  dragOriginPoint = null;
  canvas.requestRenderAll();
};

const getCellFromPoint = (x, y) => {
  return puzzleState.cells.find(cell =>
    x >= cell.left && x <= cell.left + cell.width &&
    y >= cell.top && y <= cell.top + cell.height
  );
};

const animateSnapBack = (cellIndex) => {
  const canvas = unref(canvasRef);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);
  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);

  if (img && cell) {
    const containerRect = {
      left: cell.left,
      top: cell.top,
      width: cell.width,
      height: cell.height
    };
    if (typeof animateRebound === 'function') {
      animateRebound(img, containerRect, canvas);
    } else {
      img.set({
        left: cell.left + cell.width / 2,
        top: cell.top + cell.height / 2
      });
      canvas.requestRenderAll();
    }
  }
};

const animateSwap = (idxA, idxB) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // ✨✨✨ 拼接模式下的特殊交换逻辑 ✨✨✨
  if (puzzleState.mode === 'join') {
    // 1. 物理交换数据
    const temp = puzzleState.imagePool[idxA];
    puzzleState.imagePool[idxA] = puzzleState.imagePool[idxB];
    puzzleState.imagePool[idxB] = temp;

    // 2. 触发重排 (流式布局会自动计算新坐标)
    reflowJoinLayout();

    // Join 模式不需要执行动画，因为位置通常会发生较大跳变
    return;
  }

  // --- 以下是网格模式的标准交换动画 ---
  const imgA = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxA);
  const imgB = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxB);
  const cellA = puzzleState.cells.find(c => c.index === idxA);
  const cellB = puzzleState.cells.find(c => c.index === idxB);

  const animations = [];
  const duration = 300;
  const easing = fabric.util.ease.easeOutQuart;

  if (imgA) imgA.bringToFront();
  if (imgB) imgB.bringToFront();

  const createSyncAnimation = (img, targetCell) => {
    if (!img || !targetCell) return;
    const targetImgState = calculateFitPosition(img, targetCell);
    animations.push(new Promise(resolve => {
      img.animate({
        left: targetImgState.left,
        top: targetImgState.top,
        scaleX: targetImgState.scaleX,
        scaleY: targetImgState.scaleY
      }, {
        duration, easing,
        onChange: () => canvas.requestRenderAll(),
        onComplete: () => {
          const containerRect = {
            left: targetCell.left, top: targetCell.top,
            width: targetCell.width, height: targetCell.height
          };
          constrainObjectToRect(img, containerRect, canvas);
          resolve();
        }
      });
    }));
  };

  createSyncAnimation(imgA, cellB);
  createSyncAnimation(imgB, cellA);

  Promise.all(animations).then(() => {
    const temp = puzzleState.imagePool[idxA];
    puzzleState.imagePool[idxA] = puzzleState.imagePool[idxB];
    puzzleState.imagePool[idxB] = temp;
    refreshPuzzleObjects(false);
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

  let zoom = img.scaleX;
  zoom *= 0.999 ** opt.e.deltaY;

  const minScale = Math.max(cell.width / img.width, cell.height / img.height);
  const maxScale = minScale * 5;
  if (zoom < minScale) zoom = minScale;
  if (zoom > maxScale) zoom = maxScale;

  img.set({ scaleX: zoom, scaleY: zoom });

  const containerRect = {
    left: cell.left, top: cell.top, width: cell.width, height: cell.height
  };
  constrainObjectToRect(img, containerRect, canvas);

  canvas.requestRenderAll();
};

// === 退出/导出逻辑 ===

export const completeExitPuzzle = (action = 'save') => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const savedVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

  if (action === 'save') {
    const hiddenObjs = canvas.getObjects().filter(o =>
      o.isPuzzleController ||
      o.isGhost ||
      (o.isPlaceholder && o.isPuzzleBackground)
    );
    hiddenObjs.forEach(o => o.visible = false);

    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    const dataURL = canvas.toDataURL({
      format: 'png', quality: 1, multiplier: 2,
      left: puzzleState.startX, top: puzzleState.startY,
      width: puzzleState.width, height: puzzleState.height
    });

    const allPuzzleObjs = canvas.getObjects().filter(o => o.isPuzzleItem);
    canvas.remove(...allPuzzleObjs);

    fabric.Image.fromURL(dataURL, (img) => {
      img.set({
        left: puzzleState.startX, top: puzzleState.startY,
        originX: 'left', originY: 'top',
        selectable: true
      });
      canvas.add(img);
      canvas.setViewportTransform(savedVpt);
      canvas.centerObject(img);

      exitPuzzleMode();
      canvas.requestRenderAll();
    }, { crossOrigin: 'anonymous' });

  } else {
    if (prePuzzleSnapshot) {
      canvas.loadFromJSON(prePuzzleSnapshot, () => {
        if (prePuzzleVpt) canvas.setViewportTransform(prePuzzleVpt);
        if (puzzleState.originalBg !== null) canvas.setBackgroundColor(puzzleState.originalBg);
        exitPuzzleMode();
        canvas.fire('image:updated');
        canvas.requestRenderAll();
      });
    } else {
      exitPuzzleMode();
    }
  }
};

export const exitPuzzleMode = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  puzzleState.isActive = false;
  puzzleState.cells = [];
  puzzleState.imagePool = [];
  unbindEvents();
  prePuzzleSnapshot = null;
  prePuzzleVpt = null;
};
