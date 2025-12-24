// src/components/modules/puzzle/useCanvasPuzzle.js
import { unref, reactive, toRaw } from "vue";
import { fabric } from "fabric";
import { constrainObjectToRect, animateRebound } from '@/composables/useConstraint';

// === 内部变量 ===
let canvasRef = null;
let zoomToRectFn = null;
let uiCallbacks = { onCellClick: null, onImageSelect: null, onDeselect: null };
let prePuzzleSnapshot = null;

// Snapshot variables for the "Cancel" feature
let snapshotBeforeLayout = null;
let stateBackup = null;

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

const puzzleState = reactive({
  isActive: false,
  cells: [],
  padding: DEFAULTS.padding,
  spacing: DEFAULTS.spacing,
  radius: DEFAULTS.radius,
  width: DEFAULTS.width,
  height: DEFAULTS.height,
  bgColor: DEFAULTS.bgColor,
  startX: 0,
  startY: 0,
  originalBg: null,
  rawCells: [] // 存储原始格子定义
});

export const registerPuzzleModule = (canvas, callbacks = {}, zoomToRect = null) => {
  canvasRef = canvas;
  uiCallbacks = { ...uiCallbacks, ...callbacks };
  zoomToRectFn = zoomToRect;
};

// === 新增：保存选择网格前的状态 ===
export const saveSnapshotBeforeLayout = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  // 1. Save Canvas visual state (includes images, text, existing puzzle items)
  snapshotBeforeLayout = JSON.stringify(canvas.toJSON(["id", "selectable", "name", "isPuzzleItem", "cellIndex", "isPuzzleController", "isPuzzleBackground", "originalSrc"]));
  // 2. Save Reactive State (grid config, padding, spacing)
  stateBackup = JSON.parse(JSON.stringify(toRaw(puzzleState)));
};

// === 新增：恢复选择网格前的状态 ===
export const restoreSnapshotBeforeLayout = () => {
  const canvas = unref(canvasRef);
  if (!canvas || !snapshotBeforeLayout) return;

  // 1. Restore Canvas objects
  canvas.loadFromJSON(snapshotBeforeLayout, () => {
    // 2. Restore Reactive State
    if (stateBackup) {
      Object.assign(puzzleState, stateBackup);
    }
    
    // 3. Reset interactions
    unbindEvents(); // Prevent double binding
    
    canvas.requestRenderAll();
  });
};

export const zoomToPuzzleArea = () => {
  if (!zoomToRectFn) return;
  const rect = {
    left: puzzleState.startX,
    top: puzzleState.startY,
    width: puzzleState.width,
    height: puzzleState.height
  };
  zoomToRectFn(rect);
};

export const initPuzzleMode = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  puzzleState.originalBg = canvas.backgroundColor;
  prePuzzleSnapshot = JSON.stringify(canvas.toJSON(["id", "selectable", "name"]));

  if (puzzleState.savedHistoryData && puzzleState.savedHistoryData.length > 0) {
    restorePuzzleData();
    bindEvents();
    return;
  }

  puzzleState.isActive = true;

  const activeImg = canvas.getObjects().find(o => o.type === 'image');
  if (activeImg) {
    const rect = activeImg.getBoundingRect();
    puzzleState.width = rect.width;
    puzzleState.height = rect.height;
    puzzleState.startX = rect.left;
    puzzleState.startY = rect.top;
  } else {
    const center = canvas.getCenter();
    puzzleState.width = 1000;
    puzzleState.height = 1000;
    puzzleState.startX = center.left - 500;
    puzzleState.startY = center.top - 500;
  }

  bindEvents();

  const cells = [{
    w: 1,
    h: 1,
    x: 0,
    y: 0,
    index: 0
  }]
  updateLayout(cells);

  zoomToPuzzleArea();
};

export const completeExitPuzzle = (action = 'save') => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const savedVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

  exitPuzzleMode();

  if (action === 'save') {
    const hiddenObjs = canvas.getObjects().filter(o =>
      o.isPuzzleController || o.isPlaceholder || o.isGhost || o.isPuzzleBackground
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
      img.scaleToWidth(puzzleState.width);
      canvas.add(img);
      canvas.setViewportTransform(savedVpt);
      canvas.requestRenderAll();
    }, { crossOrigin: 'anonymous' });

  } else {
    if (prePuzzleSnapshot) {
      canvas.loadFromJSON(prePuzzleSnapshot, () => {
        canvas.setViewportTransform(savedVpt);
        if (puzzleState.originalBg !== null) {
          canvas.setBackgroundColor(puzzleState.originalBg, () => canvas.requestRenderAll());
        } else {
          canvas.requestRenderAll();
        }
      });
    }
  }
};

export const exitPuzzleMode = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  puzzleState.isActive = false;

  if (puzzleState.originalBg !== null) {
    canvas.setBackgroundColor(puzzleState.originalBg, () => canvas.requestRenderAll());
  }

  unbindEvents();
};

export const restorePuzzleData = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const historyData = puzzleState.savedHistoryData;
  const savedSettings = puzzleState.savedSettings;

  if (!historyData || historyData.length === 0) return;

  if (savedSettings) {
    puzzleState.width = savedSettings.width;
    puzzleState.height = savedSettings.height;
    puzzleState.padding = savedSettings.padding;
    puzzleState.spacing = savedSettings.spacing;
    puzzleState.radius = savedSettings.radius;
    if (savedSettings.bgColor) {
      puzzleState.bgColor = savedSettings.bgColor;
    }
  }

  let loadedCount = 0;

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
        originX: item.originX || 'center',
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

      if (loadedCount === historyData.length) {
        puzzleState.isActive = true;
        refreshPuzzleObjects(false);
        zoomToPuzzleArea();
        canvas.requestRenderAll();
      }
    }, { crossOrigin: 'anonymous' });
  });
};

export const getPuzzleImageCount = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return 0;
  return canvas.getObjects().filter(o => o.isPuzzleImage && !o.isGhost && !o.isPuzzleBackground).length;
};

export const updatePuzzleImageParams = (cellIndex, params = {}) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);
  
  if (img && cell) {
    if (params.opacity !== undefined) {
      img.set('opacity', params.opacity);
    }

    if (params.scale !== undefined) {
      const minScale = Math.max(cell.width / img.width, cell.height / img.height);
      let newScale = Math.max(minScale, params.scale); 
      
      img.set({ scaleX: newScale, scaleY: newScale });
      
      const containerRect = {
        left: cell.left, top: cell.top, width: cell.width, height: cell.height
      };
      constrainObjectToRect(img, containerRect, canvas);
    }
    canvas.requestRenderAll();
  }
};

const calculateFitPosition = (img, cell) => {
  const iW = img.width || 1;
  const iH = img.height || 1;
  const cW = Math.max(1, cell.width);
  const cH = Math.max(1, cell.height);

  const minScaleX = cW / iW;
  const minScaleY = cH / iH;
  const minScale = Math.max(minScaleX, minScaleY) + 0.0001;
  return {
    scaleX: minScale,
    scaleY: minScale,
    left: cell.left + cW / 2,
    top: cell.top + cH / 2
  };
};

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
  // 正常点击逻辑
  else if (dragOriginPoint) {
    const dist = Math.sqrt(
      Math.pow(pointer.x - dragOriginPoint.x, 2) +
      Math.pow(pointer.y - dragOriginPoint.y, 2)
    );

    // 判断为点击而非拖拽
    if (dist < 5) {
      const clickedCell = getCellFromPoint(pointer.x, pointer.y);
      if (clickedCell) {
        // 判断格子内是否有图片
        const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === clickedCell.index);
        
        if (!img) {
            // A. 点击空格子：上传
            if (uiCallbacks.onCellClick) {
                uiCallbacks.onCellClick(clickedCell.index);
                canvas.discardActiveObject();
            }
        } else {
            // B. 点击有图片的格子：选中并进入配置
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
        // 点击空白处（网格外的区域）
        if (uiCallbacks.onDeselect) uiCallbacks.onDeselect();
      }
    } else {
      // 拖拽了但没产生交换（原地回弹）
      if (dragOriginCellIndex !== -1) animateSnapBack(dragOriginCellIndex);
    }
  }
  dragOriginCellIndex = -1;
  dragOriginPoint = null;
  canvas.requestRenderAll();
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
  const imgA = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxA);
  const imgB = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxB);
  const cellA = puzzleState.cells.find(c => c.index === idxA);
  const cellB = puzzleState.cells.find(c => c.index === idxB);
  const animations = [];
  const duration = 300;
  const easing = fabric.util.ease.easeOutQuart;

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

export const updateLayout = (cellDefinitions = null, config = {}) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;
  if (config.width !== undefined) puzzleState.width = config.width;
  if (config.height !== undefined) puzzleState.height = config.height;
  if (config.padding !== undefined) puzzleState.padding = config.padding;
  if (config.spacing !== undefined) puzzleState.spacing = config.spacing;
  if (config.radius !== undefined) puzzleState.radius = config.radius;

  if (config.bgColor) puzzleState.bgColor = config.bgColor;

  if (cellDefinitions) puzzleState.rawCells = cellDefinitions;

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

    if (!isLeftEdge) {
      boxLeft += spacing / 2;
      boxWidth -= spacing / 2;
    }
    if (!isRightEdge) {
      boxWidth -= spacing / 2;
    }

    if (!isTopEdge) {
      boxTop += spacing / 2;
      boxHeight -= spacing / 2;
    }
    if (!isBottomEdge) {
      boxHeight -= spacing / 2;
    }

    return {
      index: cell.index,
      left: boxLeft,
      top: boxTop,
      width: Math.max(1, boxWidth),
      height: Math.max(1, boxHeight)
    };
  });

  refreshPuzzleObjects(!!cellDefinitions);
};

const refreshPuzzleObjects = (shouldResetImages = false) => {
  const canvas = unref(canvasRef);
  const { radius, startX, startY, width, height, bgColor } = puzzleState;

  const toRemove = canvas.getObjects().filter(o =>
    o.isPlaceholder || o.isPuzzleController || o.isPuzzleBackground
  );
  canvas.remove(...toRemove);

  const localBg = new fabric.Rect({
    left: startX,
    top: startY,
    width: width,
    height: height,
    fill: bgColor,
    rx: radius,
    ry: radius,
    selectable: false,
    evented: false,
    isPuzzleBackground: true,
    isPuzzleItem: true
  });
  canvas.add(localBg);
  canvas.sendToBack(localBg);

  const existingPuzzleImages = canvas.getObjects()
    .filter(o => o.isPuzzleImage && !o.isGhost && o !== dragProxy && !o.isPuzzleBackground)
    .sort((a, b) => a.cellIndex - b.cellIndex);

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

  puzzleState.cells.forEach((cell, index) => {
    let img = null;

    if (shouldResetImages) {
      if (index < existingPuzzleImages.length) {
        img = existingPuzzleImages[index];
        img.cellIndex = cell.index;
        img.set({ opacity: 1, visible: true });
        const fitState = calculateFitPosition(img, cell);
        img.set({
          scaleX: fitState.scaleX,
          scaleY: fitState.scaleY,
          left: fitState.left,
          top: fitState.top
        });
        img.setCoords();
      }
    } else {
      img = existingPuzzleImages.find(o => o.cellIndex === cell.index);
      if (img) {
        const newCellCenterX = cell.left + cell.width / 2;
        const newCellCenterY = cell.top + cell.height / 2;

        let targetLeft = newCellCenterX;
        let targetTop = newCellCenterY;

        if (img.clipPath && img.clipPath.absolutePositioned) {
          const oldCell = img.clipPath;
          const oldCellCenterX = oldCell.left + oldCell.width / 2;
          const oldCellCenterY = oldCell.top + oldCell.height / 2;

          const offsetX = img.left - oldCellCenterX;
          const offsetY = img.top - oldCellCenterY;

          if (!isNaN(offsetX) && Math.abs(offsetX) < 3000) {
            targetLeft = newCellCenterX + offsetX;
            targetTop = newCellCenterY + offsetY;
          }
        }

        img.set({ left: targetLeft, top: targetTop });

        const iW = img.width || 100;
        const iH = img.height || 100;
        const minScale = Math.max(cell.width / iW, cell.height / iH) + 0.0001;

        if (img.scaleX < minScale) {
          img.set({ scaleX: minScale, scaleY: minScale });
        }

        img.setCoords();

        const containerRect = {
          left: cell.left,
          top: cell.top,
          width: cell.width,
          height: cell.height
        };
        constrainObjectToRect(img, containerRect, canvas);

        if (!img.intersectsWithObject(new fabric.Rect(containerRect))) {
          img.set({ left: newCellCenterX, top: newCellCenterY });
          img.setCoords();
        }
      }
    }

    if (img) {
      const clipRect = new fabric.Rect({
        left: cell.left,
        top: cell.top,
        width: cell.width,
        height: cell.height,
        rx: radius,
        ry: radius,
        absolutePositioned: true
      });
      img.set({ clipPath: clipRect, opacity: img.opacity || 1 });
      img.dirty = true;
      img.setCoords();

      const controller = new fabric.Rect({
        left: cell.left,
        top: cell.top,
        width: cell.width,
        height: cell.height,
        fill: 'transparent',
        transparentCorners: false,
        selectable: true,
        evented: true,
        // 🔥 关键修改：禁用控件和边框显示
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        isPuzzleItem: true,
        isPuzzleController: true,
        cellIndex: cell.index
      });
      canvas.add(controller);
      // 🔥 已移除 drawDeleteBtn 调用
    } else {
      drawPlaceholder(canvas, cell);
    }
  });

  if (shouldResetImages && existingPuzzleImages.length > puzzleState.cells.length) {
    const extras = existingPuzzleImages.slice(puzzleState.cells.length);
    canvas.remove(...extras);
  }

  if (localBg) canvas.sendToBack(localBg);

  canvas.requestRenderAll();
};

export const deleteImageFromCell = (cellIndex) => {
  const canvas = unref(canvasRef);
  const objs = canvas.getObjects().filter(o =>
    (o.isPuzzleImage || o.isPuzzleController) && o.cellIndex === cellIndex
  );
  canvas.remove(...objs);
  refreshPuzzleObjects();
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
};

const getCellFromPoint = (x, y) => {
  return puzzleState.cells.find(cell =>
    x >= cell.left && x <= cell.left + cell.width &&
    y >= cell.top && y <= cell.top + cell.height
  );
};

export const addImageToCell = (url, cellIndex, options = {}) => {
  const canvas = unref(canvasRef);
  const oldObjs = canvas.getObjects().filter(o => (o.isPuzzleImage || o.isPuzzleController) && o.cellIndex === cellIndex);
  canvas.remove(...oldObjs);

  fabric.Image.fromURL(url, (img) => {
    const cell = puzzleState.cells.find(c => c.index === cellIndex);
    if (!cell) return;

    let scale;
    if (options.targetScale) {
      scale = options.targetScale;
    } else {
      scale = Math.max(cell.width / img.width, cell.height / img.height) + 0.001;
    }

    img.set({
      left: cell.left + cell.width / 2,
      top: cell.top + cell.height / 2,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
      selectable: false, evented: false, hasControls: false, hasBorders: false,
      isPuzzleItem: true, isPuzzleImage: true, cellIndex: cellIndex,
    });

    img.setCoords();

    const controller = new fabric.Rect({
      left: cell.left, top: cell.top, width: cell.width, height: cell.height,
      fill: 'transparent', noScaleCache: false,
      transparentCorners: false, cornerSize: 8, borderOpacityWhenMoving: 0.5,
      selectable: true, evented: true, 
      hasControls: false, // 禁用
      hasBorders: false,  // 禁用
      lockMovementX: true, lockMovementY: true,
      lockRotation: true, lockScalingX: true, lockScalingY: true,
      isPuzzleItem: true, isPuzzleController: true, cellIndex: cellIndex,
    });

    canvas.add(img);
    canvas.add(controller);
    canvas.setActiveObject(controller);

    refreshPuzzleObjects();
  }, { crossOrigin: 'anonymous' });
};