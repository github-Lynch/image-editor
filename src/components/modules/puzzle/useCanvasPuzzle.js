// [文件: src/components/modules/puzzle/useCanvasPuzzle.js]
import { unref } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;
let selectionFrame = null;
let allCells = [];
let mouseDownPoint = null;

export const registerPuzzleModule = (canvas, saveHistory) => {
  canvasRef = canvas;
  saveHistoryFn = saveHistory;
};

/**
 * 初始化选择框
 */
const initSelectionFrame = (canvas) => {
  if (selectionFrame) canvas.remove(selectionFrame);
  selectionFrame = new fabric.Rect({
    fill: 'transparent',
    stroke: '#409eff',
    strokeWidth: 2,
    strokeDashArray: [5, 5],
    selectable: false,
    evented: false,
    visible: false,
    name: 'puzzle-selection-frame',
    excludeFromExport: true
  });
  canvas.add(selectionFrame);
};

/**
 * 核心：应用网格模板并保留现有内容 [遵循全景报告]
 */
export const applyGridTemplate = (template, settings, mainImage) => {
  const canvas = unref(canvasRef);
  if (!canvas || !template) return;

  // 1. 提取当前图片，用于滑块联动时保留内容
  const existingImages = canvas.getObjects()
    .filter(o => o.data?.type === 'puzzle-image')
    .map(obj => ({ src: obj.getSrc(), index: obj.data.index, opacity: obj.opacity }));

  // 2. 设置画布底色（即边框和间距的颜色）
  canvas.setDimensions({ width: settings.size.width, height: settings.size.height });
  canvas.clear();
  canvas.setBackgroundColor(settings.background);
  allCells = []; 
  
  // 3. 初始化蓝色选框 (针对每个窗口)
  selectionFrame = new fabric.Rect({
    fill: 'transparent', stroke: '#409eff', strokeWidth: 4,
    strokeDashArray: [8, 4], selectable: false, evented: false, visible: false,
    absolutePositioned: true, excludeFromExport: true
  });
  canvas.add(selectionFrame);

  // 4. 解析行列
  const colMatch = template.wrapStyle['grid-template-columns'].match(/repeat\((\d+)/);
  const rowMatch = template.wrapStyle['grid-template-rows'].match(/repeat\((\d+)/);
  const totalCols = colMatch ? parseInt(colMatch[1]) : 1;
  const totalRows = rowMatch ? parseInt(rowMatch[1]) : 1;

  // 计算单元格基础大小（减去外边框和内部间距）
  const cellBaseW = (settings.size.width - (settings.spacing * (totalCols - 1)) - (settings.border * 2)) / totalCols;
  const cellBaseH = (settings.size.height - (settings.spacing * (totalRows - 1)) - (settings.border * 2)) / totalRows;

  template.gridAreas.forEach((area, index) => {
    const parts = area.split('/').map(s => parseInt(s.trim()));
    // rowStart, colStart, rowEnd, colEnd
    const spanCol = parts[3] - parts[1];
    const spanRow = parts[2] - parts[0];

    const w = spanCol * cellBaseW + (spanCol - 1) * settings.spacing;
    const h = spanRow * cellBaseH + (spanRow - 1) * settings.spacing;
    const x = settings.border + (parts[1] - 1) * (cellBaseW + settings.spacing);
    const y = settings.border + (parts[0] - 1) * (cellBaseH + settings.spacing);

    // 单元格占位矩形
    const cellRect = new fabric.Rect({
      left: x, top: y, width: w, height: h,
      fill: '#f8f9fa', selectable: false, evented: true,
      data: { type: 'cell-placeholder', index }
    });
    canvas.add(cellRect);
    allCells.push(cellRect);

    // 5. 填充图片逻辑
    const savedImg = existingImages.find(img => img.index === index);
    if (index === 0 && mainImage && !savedImg) {
      fillCellWithImage(mainImage, cellRect, index);
    } else if (savedImg) {
      fabric.Image.fromURL(savedImg.src, (img) => {
        img.set({ opacity: savedImg.opacity });
        fillCellWithImage(img, cellRect, index);
      });
    } else {
      drawPlaceholderIcon(cellRect);
    }
  });

  bindPuzzleEvents(canvas);
  canvas.requestRenderAll();
};

/**
 * 填充图片到单元格（Object-fit: cover 效果）
 */
export const fillCellWithImage = (imgObj, cellRect, index) => {
  const canvas = unref(canvasRef);
  const scale = Math.max(cellRect.width / imgObj.width, cellRect.height / imgObj.height);
  
  // ✅ 核心修复：创建一个完全重合的克隆矩形作为 clipPath
  // 必须开启 absolutePositioned 解决“跑偏”和“黑边”问题
  const clipBox = new fabric.Rect({
    left: cellRect.left,
    top: cellRect.top,
    width: cellRect.width,
    height: cellRect.height,
    absolutePositioned: true
  });

  imgObj.set({
    scaleX: scale, scaleY: scale,
    left: cellRect.left + cellRect.width / 2,
    top: cellRect.top + cellRect.height / 2,
    originX: 'center', originY: 'center',
    clipPath: clipBox,
    selectable: true,
    hasControls: false,
    hasBorders: false,
    strokeWidth: 0, // ✅ 消除可能导致黑边的描边
    data: { type: 'puzzle-image', cellRect, index }
  });

  canvas.add(imgObj);
  imgObj.bringToFront();
  if (selectionFrame) selectionFrame.bringToFront();
};

const drawPlaceholderIcon = (rect) => {
  const canvas = unref(canvasRef);
  const text = new fabric.Text('+', {
    left: rect.left + rect.width / 2, top: rect.top + rect.height / 2,
    fontSize: 40, fill: '#adb5bd', originX: 'center', originY: 'center',
    selectable: false, evented: false
  });
  canvas.add(text);
};

const swapImages = (draggedImg, targetCell) => {
  const canvas = unref(canvasRef);
  const oldRect = draggedImg.data.cellRect;
  const targetIndex = targetCell.data.index;

  const targetImg = canvas.getObjects().find(o => 
    o.data?.type === 'puzzle-image' && o.data.index === targetIndex
  );

  fillCellWithImage(draggedImg, targetCell, targetIndex);
  canvas.remove(draggedImg); 

  if (targetImg) {
    fillCellWithImage(targetImg, oldRect, draggedImg.data.index);
    canvas.remove(targetImg);
  }

  if (saveHistoryFn) saveHistoryFn();
  canvas.requestRenderAll();
};

// 新增：通用的复位函数
const snapToCenter = (imgObj) => {
  const cellRect = imgObj.data.cellRect;
  if (!cellRect) return;

  imgObj.animate({
    left: cellRect.left + cellRect.width / 2,
    top: cellRect.top + cellRect.height / 2
  }, {
    duration: 200,
    onChange: canvasRef.requestRenderAll.bind(canvasRef),
    easing: fabric.util.ease.easeOutBack // 带有轻微回弹效果，视觉更好
  });
};

/**
 * 拼图事件绑定：支持拖动互换
 */
const bindPuzzleEvents = (canvas) => {
  canvas.off('mouse:down');
  canvas.off('mouse:up');

  canvas.on('mouse:down', (opt) => {
    const pointer = canvas.getPointer(opt.e);
    mouseDownPoint = new fabric.Point(pointer.x, pointer.y);
  });

  canvas.on('mouse:up', (opt) => {
    if (!mouseDownPoint) return;

    const obj = opt.target;
    const pointer = canvas.getPointer(opt.e);
    const moveDistance = mouseDownPoint.distanceFrom(pointer);

    // --- 核心优化点 ---
    
    // 1. 如果位移极小，视为单击，完全交给 index.vue 处理，这里不做逻辑响应
    if (moveDistance < 5) {
      mouseDownPoint = null;
      return;
    }

    // 2. 如果是图片对象被拖动
    if (obj && obj.data?.type === 'puzzle-image') {
      const targetCell = allCells.find(cell => 
        pointer.x >= cell.left && pointer.x <= cell.left + cell.width &&
        pointer.y >= cell.top && pointer.y <= cell.top + cell.height
      );

      // 判定是否跨格交换
      if (targetCell && targetCell.data.index !== obj.data.index) {
        swapImages(obj, targetCell);
      } else {
        // 【边缘矫正】位移了但没换格子，平滑弹回原位
        snapToCenter(obj);
      }
    }
    
    mouseDownPoint = null;
    canvas.requestRenderAll();
  });

  canvas.on('selection:created', handleSelection);
  canvas.on('selection:updated', handleSelection);
  canvas.on('selection:cleared', () => {
    if (selectionFrame) selectionFrame.set({ visible: false });
    canvas.requestRenderAll();
  });
};

const handleSelection = (opt) => {
  const target = opt.selected ? opt.selected[0] : opt.target;
  if (target?.data?.type === 'puzzle-image' && selectionFrame) {
    const cell = target.data.cellRect;
    selectionFrame.set({
      left: cell.left, top: cell.top, width: cell.width, height: cell.height, visible: true
    });
    selectionFrame.bringToFront();
    unref(canvasRef).requestRenderAll();
  }
};