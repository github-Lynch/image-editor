// src/components/modules/puzzle/useCanvasPuzzle.js
import { unref, reactive, toRaw } from "vue";
import { fabric } from "fabric";
import { constrainObjectToRect, animateRebound } from '@/composables/useConstraint';
import { CANVAS_PROPS_WHITELIST } from "@/composables/useEditorState";

// === 内部变量 ===
// 1. 新增一个内部变量，用于标识当前的渲染任务
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
  cells: [],
  imagePool: [],
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

// --- 全新增加 ---
/**
 * 捕获进入模块时的绝对初始状态
 */
/**
 * ✨ 核心：捕获进入模块时的“处女态”快照
 * 增加了 prePuzzleSnapshot 的存在检查，确保连续切换模板不会覆盖初始快照
 */
export const recordEntryState = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 🔒 锁：如果已经存过快照了，绝对不要覆盖它
  if (prePuzzleSnapshot) {
    console.log("[Puzzle] 快照已存在，保留初始状态，不进行覆盖");
    return;
  }

  console.log("[Puzzle] 📸 捕获初始状态快照");
  prePuzzleVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];
  prePuzzleSnapshot = JSON.stringify(canvas.toJSON(CANVAS_PROPS_WHITELIST));
  puzzleState.originalBg = canvas.backgroundColor;
};

/**
 * 清理初始快照引用
 */
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
  zoomToRectFn(rect);
};


/**
 * 改进 initPuzzleMode：使其具有幂等性，防止重复初始化
 */
export const initPuzzleMode = () => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  recordEntryState();

  // ✨ 改进：如果已经处于拼图激活状态，不要重新提取主图，防止池被意外清空或重复
  if (puzzleState.isActive && puzzleState.imagePool.length > 0) {
    console.log("[Puzzle] 模块已激活，跳过重复初始化");
    return;
  }

  puzzleState.imagePool = []; 

  const activeImg = canvas.getObjects().find(o => o.type === 'image' && !o.isPuzzleItem);
  if (activeImg) {
    console.log("[Puzzle] 📸 正在提取唯一主图入池...");
    puzzleState.imagePool[0] = {
      id: `img_main_${Date.now()}`,
      src: activeImg.getSrc(),
      metadata: {
        filters: activeImg.filters ? [...activeImg.filters] : [],
        opacity: activeImg.opacity || 1,
        // ✨ 新增：捕获当前缩放，防止初始化时图片缩小
        scale: activeImg.scaleX 
      }
    };
    canvas.remove(activeImg);
}

  puzzleState.isActive = true;
  bindEvents();
  
  // 默认 1x1
  updateLayout([{ w: 1, h: 1, x: 0, y: 0, index: 0 }]);
  zoomToPuzzleArea();
};

// 提供给 index.vue 使用的 getter
export const getInitialState = () => ({
  snapshot: prePuzzleSnapshot,
  vpt: prePuzzleVpt
});

export const completeExitPuzzle = (action = 'save') => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 1. 记录当前相机视口，用于 save 后的恢复（导出时需要重置视口）
  const savedVpt = canvas.viewportTransform ? [...canvas.viewportTransform] : [1, 0, 0, 1, 0, 0];

  if (action === 'save') {
    // === 保存逻辑 ===
    const hiddenObjs = canvas.getObjects().filter(o =>
      o.isPuzzleController ||
      o.isGhost ||
      (o.isPlaceholder && o.isPuzzleBackground)
    );
    hiddenObjs.forEach(o => o.visible = false);

    // 重置视口到 1:1 进行精准区域导出
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
      
      // 还原导出前的相机位置
      canvas.setViewportTransform(savedVpt);
      
      // ✨ 关键：最后执行清理并释放初始快照
      exitPuzzleMode(); 
      canvas.requestRenderAll();
    }, { crossOrigin: 'anonymous' });

  } else {
   // === 取消逻辑 ===
    if (prePuzzleSnapshot) {
      console.log("[Puzzle] 🔄 正在回滚至初始状态...");
      
      canvas.loadFromJSON(prePuzzleSnapshot, () => {
        // 1. 恢复视口和缩放
        if (prePuzzleVpt) {
          canvas.setViewportTransform(prePuzzleVpt);
        }
        // 2. 恢复背景
        if (puzzleState.originalBg !== null) {
          canvas.setBackgroundColor(puzzleState.originalBg);
        }

        // 3. ✨ 只有在 loadFromJSON 彻底完成后，才清理模式和释放快照
        exitPuzzleMode(); 
        
        canvas.fire('image:updated');
        canvas.requestRenderAll();
        console.log("[Puzzle] ✅ 已成功回滚。");
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
  unbindEvents();
  // 彻底释放快照，允许下一次进入模块时重新捕获
  prePuzzleSnapshot = null;
  prePuzzleVpt = null;
  console.log("[Puzzle] 🧹 模块状态已完全清理。");
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

// useCanvasPuzzle.js 中的 updatePuzzleImageParams
export const updatePuzzleImageParams = (cellIndex, params = {}) => {
  const canvas = unref(canvasRef);
  const poolItem = puzzleState.imagePool[cellIndex];
  if (!canvas || !poolItem) return;

  const img = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === cellIndex);
  const cell = puzzleState.cells.find(c => c.index === cellIndex);

  if (img && cell) {
    if (params.opacity !== undefined) {
      img.set('opacity', params.opacity);
      poolItem.metadata.opacity = params.opacity; // 同步到池
    }
    if (params.scale !== undefined) {
      const minScale = Math.max(cell.width / img.width, cell.height / img.height);
      let newScale = Math.max(minScale, params.scale);
      img.set({ scaleX: newScale, scaleY: newScale });
      poolItem.metadata.scale = newScale; // ✨ 同步到池，防止刷新重置
      
      constrainObjectToRect(img, { left: cell.left, top: cell.top, width: cell.width, height: cell.height }, canvas);
    }
    canvas.requestRenderAll();
  }
};

// useCanvasPuzzle.js

const calculateFitPosition = (img, cell) => {
  const iW = img.width || 1;
  const iH = img.height || 1;
  const cW = cell.width;
  const cH = cell.height;

  const scaleX = cW / iW;
  const scaleY = cH / iH;

  // ✨ 必须取最大值确保“覆盖(Cover)”全格
  // 添加 0.01 补偿，解决边缘可能出现的 1px 留白问题
  const fillScale = Math.max(scaleX, scaleY) + 0.01;

  return {
    scaleX: fillScale,
    scaleY: fillScale,
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

/**
 * 执行格子交换动画，并同步更新图片池数据
 */
const animateSwap = (idxA, idxB) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const imgA = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxA);
  const imgB = canvas.getObjects().find(o => o.isPuzzleImage && o.cellIndex === idxB);
  const cellA = puzzleState.cells.find(c => c.index === idxA);
  const cellB = puzzleState.cells.find(c => c.index === idxB);

  const animations = [];
  const duration = 300;
  const easing = fabric.util.ease.easeOutQuart;

  // 提升层级，防止动画过程中被遮挡
  if (imgA) imgA.bringToFront();
  if (imgB) imgB.bringToFront();

// useCanvasPuzzle.js 内部 animateSwap 部分
const createSyncAnimation = (img, targetCell) => {
  if (!img || !targetCell) return;
  
  // 这里计算的目标 scale 就是铺满后的 scale
  const targetImgState = calculateFitPosition(img, targetCell);
  
  animations.push(new Promise(resolve => {
    img.animate({
      left: targetImgState.left,
      top: targetImgState.top,
      scaleX: targetImgState.scaleX,
      scaleY: targetImgState.scaleY
    }, {
      duration, 
      easing,
      onChange: () => {
        // 动画过程中实时更新裁剪区域（如果需要）
        canvas.requestRenderAll();
      },
      onComplete: () => {
        // 动画完成后强制执行一次物理对齐，防止浮点数误差导致缝隙
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

  // ✨ 核心修复：动画完成后更新数据池
  Promise.all(animations).then(() => {
    console.log(`[Puzzle] 执行数据池索引交换: ${idxA} <-> ${idxB}`);

    // 1. 同步交换图片池中的数据对象
    const temp = puzzleState.imagePool[idxA];
    puzzleState.imagePool[idxA] = puzzleState.imagePool[idxB];
    puzzleState.imagePool[idxB] = temp;

    // 2. 调用刷新函数，由于此时池数据已更新，图片将保持在新的位置
    // 传入 false，因为这只是位置交换，不需要执行“重排压缩”
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

/**
 * ✨ 内部辅助函数：计算格子的物理坐标
 * 从原 updateLayout 中提取，负责将 rawCells 转换为物理 cells
 */
const calculateCellsInternal = () => {
  const { width, height, padding, spacing, startX, startY } = puzzleState;
  
  // 计算安全区域（扣除四周内边距）
  const safeW = Math.max(0, width - (padding * 2));
  const safeH = Math.max(0, height - (padding * 2));

  puzzleState.cells = puzzleState.rawCells.map(cell => {
    const EPSILON = 0.01;
    const isLeftEdge = cell.x < EPSILON;
    const isTopEdge = cell.y < EPSILON;
    const isRightEdge = Math.abs((cell.x + cell.w) - 1.0) < EPSILON;
    const isBottomEdge = Math.abs((cell.y + cell.h) - 1.0) < EPSILON;

    // 基础坐标计算
    let boxLeft = startX + Number(padding) + (cell.x * safeW);
    let boxTop = startY + Number(padding) + (cell.y * safeH);
    let boxWidth = cell.w * safeW;
    let boxHeight = cell.h * safeH;

    // 应用间距（Spacing）逻辑：非边缘处扣除间距的一半
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
};

/**
 * 更新拼图布局及其参数
 */
export const updateLayout = (cellDefinitions = null, config = {}) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 1. 同步配置参数至响应式状态
  if (config.width !== undefined) puzzleState.width = config.width;
  if (config.height !== undefined) puzzleState.height = config.height;
  if (config.padding !== undefined) puzzleState.padding = config.padding;
  if (config.spacing !== undefined) puzzleState.spacing = config.spacing;
  if (config.radius !== undefined) puzzleState.radius = config.radius;
  if (config.bgColor) puzzleState.bgColor = config.bgColor;

  // 2. 更新原始格子定义
  if (cellDefinitions) {
    puzzleState.rawCells = cellDefinitions;
    
    // 3. 执行物理坐标计算
    calculateCellsInternal();
    
    // 4. ✨ 核心：若是切换模板（带了定义），执行压缩重排填充
    refreshPuzzleObjects(true);
  } else {
    // 仅调整参数（如间距、圆角），不涉及图片顺序变动
    calculateCellsInternal();
    refreshPuzzleObjects(false);
  }
};



export const deleteImageFromCell = (cellIndex) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 1. ✨ 更新池状态：将对应索引置为 null
  // 注意：此处不使用 splice，以保持数组长度和索引位置，防止补位
  if (puzzleState.imagePool[cellIndex]) {
    puzzleState.imagePool[cellIndex] = null;
    console.log(`[Puzzle] 已从池中标记删除索引为 ${cellIndex} 的图片`);
  }

  // 2. 触发刷新（非重置模式，保留当前空位状态）
  refreshPuzzleObjects(false);
};

// 上传图片时
export const addImageToPool = (url, cellIndex) => {
  puzzleState.imagePool[cellIndex] = {
    id: `img_${Date.now()}`,
    src: url,
    metadata: { filters: [], opacity: 1 }
  };
  refreshPuzzleObjects(false);
};

const drawPlaceholder = (canvas, cell) => {
  const rect = new fabric.Rect({
    left: cell.left,
    top: cell.top,
    width: cell.width,
    height: cell.height,
    // ✨ 核心修改：去掉原来的 #f5f7fa，改为透明
    fill: 'transparent',
    stroke: '#dcdfe6',
    strokeWidth: 1,
    strokeDashArray: [4, 4],
    rx: puzzleState.radius,
    ry: puzzleState.radius,
    selectable: false,
    evented: false,
    isPuzzleItem: true,
    isPlaceholder: true,
    // 注意：这里保留 isPuzzleBackground 标记是为了保存时统一处理
    isPuzzleBackground: true
  });
  const plus = new fabric.Text('+', {
    left: cell.left + cell.width / 2, top: cell.top + cell.height / 2,
    fontSize: 30, fill: '#909399', originX: 'center', originY: 'center',
    selectable: false, evented: false, isPuzzleItem: true, isPlaceholder: true
  });
  canvas.add(rect, plus);
  rect.sendToBack();
};

const getCellFromPoint = (x, y) => {
  return puzzleState.cells.find(cell =>
    x >= cell.left && x <= cell.left + cell.width &&
    y >= cell.top && y <= cell.top + cell.height
  );
};

/**
 * 将图片添加到指定格子的图片池中
 * 该函数不再直接创建 Fabric 对象，而是通过驱动图片池数据来触发画布更新
 * @param {String} url 图片地址
 * @param {Number} cellIndex 格子索引
 */
export const addImageToCell = (url, cellIndex) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  // 1. 【数据逻辑先行】更新图片池 (SSOT)
  // 创建新的池对象，初始化元数据（metadata）以支持后续的属性继承
  puzzleState.imagePool[cellIndex] = {
    id: `img_${Date.now()}`,
    src: url,
    metadata: {
      filters: [],  // 新上传图片默认滤镜为空
      opacity: 1    // 默认不透明度
    }
  };

  console.log(`[Puzzle] 图片已压入池索引: ${cellIndex}`);

  // 2. 【渲染调度】触发基于池的刷新逻辑
  // 传入 false 表示非模板切换，不执行池压缩（即保留当前所有格子的空位状态）
  refreshPuzzleObjects(false);

  // 3. 【UI 交互处理】自动选中新生成的控制器
  // 由于 refreshPuzzleObjects 内部的 fabric.Image.fromURL 是异步回调，
  // 我们需要稍微延迟以确保对象已添加到画布
  setTimeout(() => {
    const controller = canvas.getObjects().find(
      o => o.isPuzzleController && o.cellIndex === cellIndex
    );
    if (controller) {
      canvas.setActiveObject(controller);
      canvas.requestRenderAll();
    }
  }, 100); // 100ms 足够处理大多数本地或缓存图片的加载回调
};

/**
 * 强制让图片铺满指定的格子
 * @param {Object} imgObj - Canvas中的图片对象
 * @param {Object} cellRect - 格子的坐标和宽高信息
 */
const fitImageToCell = (imgObj, cellRect) => {
  // 1. 获取原始尺寸
  const imgW = imgObj.width;
  const imgH = imgObj.height;

  // 2. 计算覆盖(Cover)所需的最小缩放比例
  const scaleX = cellRect.width / imgW;
  const scaleY = cellRect.height / imgH;
  const fillScale = Math.max(scaleX, scaleY);

  // 3. 应用缩放
  imgObj.set({
    scaleX: fillScale,
    scaleY: fillScale,
    // 居中对齐（可选）
    left: cellRect.left + (cellRect.width - imgW * fillScale) / 2,
    top: cellRect.top + (cellRect.height - imgH * fillScale) / 2
  });

  // 4. 重新渲染画布
  canvas.renderAll();
};



const refreshPuzzleObjects = (shouldResetImages = false) => {
  const canvas = unref(canvasRef);
  if (!canvas) return;

  const thisRenderToken = ++currentRenderToken;
  const { radius, startX, startY, width, height, bgColor } = puzzleState;

  // 1. 彻底清理画布
  const toRemove = canvas.getObjects().filter(o =>
    o.isPlaceholder || o.isPuzzleController || o.isPuzzleBackground || o.isPuzzleImage
  );
  canvas.remove(...toRemove);

  // 2. 绘制拼图底座
  const localBg = new fabric.Rect({
    left: startX, top: startY, width: width, height: height,
    fill: bgColor, rx: radius, ry: radius,
    selectable: false, evented: false, isPuzzleBackground: true, isPuzzleItem: true
  });
  canvas.add(localBg);
  localBg.sendToBack();

  // 3. ✨ 解决“模板切换不填充”：压实图片池
  // 过滤掉 null/undefined，确保剩下的图片按顺序填入新模板的格子
  if (shouldResetImages) {
    puzzleState.imagePool = puzzleState.imagePool.filter(item => item && item.src);
  }

  // 4. 遍历当前布局的格子
  puzzleState.cells.forEach((cell, index) => {
    const poolData = puzzleState.imagePool[index];

    if (poolData && poolData.src) {
      fabric.Image.fromURL(poolData.src, (img) => {
        if (thisRenderToken !== currentRenderToken) return;

        // ✨ 解决“不铺满”：立即计算当前格子的 Cover 参数
        const fitState = calculateFitPosition(img, cell);

        // 确定缩放：优先保留手动调整过的缩放，但绝不小于铺满所需的最小值
        const autoScale = fitState.scaleX;
        const savedScale = poolData.metadata?.scale || 0;
        const finalScale = Math.max(autoScale, savedScale);

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

        // 持久化当前的缩放值到池中
        if (poolData.metadata) poolData.metadata.scale = finalScale;

        // 继承属性
        if (poolData.metadata?.opacity !== undefined) img.set('opacity', poolData.metadata.opacity);

        // --- 关键顺序：先入场，再执行物理约束 ---
        canvas.add(img); 
        img.setCoords(); // 必须调用，让 getBoundingRect 生效

        // 执行物理约束（修正位置偏移，防止留边）
        const containerRect = { left: cell.left, top: cell.top, width: cell.width, height: cell.height };
        if (typeof constrainObjectToRect === 'function') {
          constrainObjectToRect(img, containerRect, canvas);
        }

        // 裁剪区域
        const clipRect = new fabric.Rect({
          left: cell.left, top: cell.top, width: cell.width, height: cell.height,
          rx: radius, ry: radius, absolutePositioned: true
        });
        img.set({ clipPath: clipRect });

        // 顶层控制器（确保可以拖动）
        const controller = new fabric.Rect({
          left: cell.left, top: cell.top, width: cell.width, height: cell.height,
          fill: 'transparent', selectable: true, evented: true,
          hasControls: false, hasBorders: false, lockMovementX: true, lockMovementY: true,
          isPuzzleItem: true, isPuzzleController: true, cellIndex: cell.index
        });
        canvas.add(controller);
        controller.bringToFront(); // 确保控制器在最顶层
        
        canvas.requestRenderAll();
      }, { crossOrigin: 'anonymous' });

    } else {
      drawPlaceholder(canvas, cell);
    }
  });

  canvas.requestRenderAll();
};