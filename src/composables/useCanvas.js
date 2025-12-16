// src/composables/useCanvas.js
import { ref, shallowRef, markRaw, toRaw } from "vue";
import { fabric } from "fabric";
import { useEditorState, ZOOM_PADDING } from "./useEditorState";

// 引入剪裁模块
import { 
  registerCropModule, 
  constrainCrop, 
  cropObject, 
  cancelCrop,
  rotateActive as rotateCrop, 
  flipActive as flipCrop
} from "@/components/modules/adjust/useCanvasCrop";

export function useCanvas() {
  const canvas = shallowRef(null);
  const { setHistoryState } = useEditorState();
  const zoom = ref(1);

  // === 历史记录 ===
  const history = [];
  let historyIndex = -1;
  let historyProcessing = false;

  const saveHistory = () => {
    if (!canvas.value || historyProcessing) return;
    if (historyIndex < history.length - 1) {
      history.splice(historyIndex + 1);
    }
    const json = JSON.stringify(
      canvas.value.toJSON(["id", "selectable", "name"])
    );
    history.push(json);
    historyIndex++;
    if (history.length > 50) {
      history.shift();
      historyIndex--;
    }
    updateStoreHistory();
  };

  const updateStoreHistory = () => {
    // 【修复】canRedo 应该是当前索引小于历史记录总长度减 1
    setHistoryState(historyIndex > 0, historyIndex < history.length - 1);
  };
  
// === 撤销 (Undo) ===
  const undo = () => {
    if (!canvas.value || historyIndex <= 0 || historyProcessing) return;
    
    if (cropObject.value) cancelCrop(); 
    
    historyProcessing = true;
    historyIndex--;
    const content = history[historyIndex];
    
    canvas.value?.loadFromJSON(content, () => {
      canvas.value?.renderAll();
      historyProcessing = false;
      updateStoreHistory();
    });
  };

// === 重做 (Redo) ===
  const redo = () => {
    if (!canvas.value || historyIndex >= history.length - 1 || historyProcessing) return;
    
    if (cropObject.value) cancelCrop();

    historyProcessing = true;
    historyIndex++; 
    const content = history[historyIndex];
    
    canvas.value?.loadFromJSON(content, () => {
      canvas.value?.renderAll();
      historyProcessing = false;
      updateStoreHistory();
    });
  };

  const zoomToRect = (rect) => {
    if (!canvas.value) return;
    const width = canvas.value.width;
    const height = canvas.value.height;

    // 1. 计算目标缩放 (留 10% 边距，看着更舒服)
    let targetZoom = Math.min(width / rect.width, height / rect.height) * ZOOM_PADDING;

    // 限制最大缩放倍数 (与你 setZoom 中的逻辑保持一致，防止放太大)
    targetZoom = Math.max(0.1, Math.min(targetZoom, 50));

    // 2. 计算 Pan (偏移量)
    // 目标：将选区中心点 (rectCenterX, rectCenterY) 移动到 画布中心
    // 公式：CanvasCenter = ObjectCenter * Zoom + Pan
    // 所以：Pan = CanvasCenter - ObjectCenter * Zoom
    const rectCenterX = rect.left + rect.width / 2;
    const rectCenterY = rect.top + rect.height / 2;

    const panX = (width / 2) - (rectCenterX * targetZoom);
    const panY = (height / 2) - (rectCenterY * targetZoom);

    // 3. 应用视口变换 (这是 Fabric.js 改变视图的核心方法)
    // 数组参数: [scaleX, skewY, skewX, scaleY, translateX, translateY]
    canvas.value.setViewportTransform([targetZoom, 0, 0, targetZoom, panX, panY]);

    // 4. 同步 zoom 状态 (让 UI 百分比更新)
    zoom.value = targetZoom;
    
    canvas.value.requestRenderAll();
  };

  // === 初始化与事件 ===
  const init = (id, width, height) => {
    const c = new fabric.Canvas(id, {
      width: width,
      height: height,
      backgroundColor: "#f3f3f3",
      preserveObjectStacking: true,
    });
    canvas.value = markRaw(c);

    registerCropModule(canvas, saveHistory,zoomToRect);

    const checkConstraint = () => {
      if (cropObject.value) {
        constrainCrop(toRaw(cropObject.value));
      }
    };
    c.on("object:modified", (e) => {
      checkConstraint(); 
      if (e.target && e.target.type !== "rect") saveHistory();
    });
    c.on("object:added", (e) => {
      if (e.target && e.target.type !== "rect") saveHistory();
    });
    c.on("object:removed", (e) => {
      if (e.target && e.target.type !== "rect") saveHistory();
    });

    // Zoom 事件
    const canvasEl = c.upperCanvasEl;
    canvasEl.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY;
        let newZoom = c.getZoom();
        newZoom *= 0.999 ** delta;
        if (newZoom > 50) newZoom = 50;
        if (newZoom < 0.1) newZoom = 0.1;
        c.zoomToPoint({ x: e.offsetX, y: e.offsetY }, newZoom);
        zoom.value = newZoom;
      },
      { passive: false }
    );

    saveHistory();
  };

  // === 通用 API ===
  const addImage = (url) => {
    fabric.Image.fromURL(
      url,
      (img) => {
        const canvasWidth = canvas.value.width;
        const canvasHeight = canvas.value.height;
        if (img.width > canvasWidth || img.height > canvasHeight) {
          const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * ZOOM_PADDING;
          img.scale(scale);
        }
        zoom.value = canvas.value.getZoom();
        historyProcessing = true;
        canvas.value?.add(img);
        canvas.value?.centerObject(img);
        canvas.value?.setActiveObject(img);
        historyProcessing = false;
        saveHistory();
      },
      { crossOrigin: "anonymous" }
    );
  };

  const setZoom = (value) => {
    if (!canvas.value) return;
    let newZoom = value;
    if (newZoom > 50) newZoom = 50;
    if (newZoom < 0.1) newZoom = 0.1;
    const center = canvas.value.getCenter();
    canvas.value.zoomToPoint({ x: center.left, y: center.top }, newZoom);
    zoom.value = newZoom;
  };

  const zoomIn = () => setZoom(zoom.value + 0.1);
  const zoomOut = () => setZoom(zoom.value - 0.1);
  const zoomReset = () => setZoom(1);

  const initImage = (url) => {
    if (!canvas.value) return;
    // 重置相机视角
    canvas.value.setViewportTransform([1, 0, 0, 1, 0, 0]);
    zoom.value = 1;
    historyProcessing = true;
    canvas.value.clear();
    canvas.value.setBackgroundColor("#f3f3f3", () => {
      canvas.value.renderAll();
    });
    historyProcessing = false;
    history.length = 0;
    historyIndex = -1;
    updateStoreHistory();
    addImage(url);
  };
  
  const rotateActive = (angle) => {
    const handled = rotateCrop(angle); 
    if (!handled) {
      const activeObj = canvas.value?.getActiveObject();
      if (activeObj) {
        activeObj.rotate((activeObj.angle || 0) + angle);
        canvas.value.requestRenderAll();
        saveHistory();
      }
    }
  };

  const flipActive = (axis) => {
    const handled = flipCrop(axis); 
    if (!handled) {
      const activeObj = canvas.value?.getActiveObject();
      if (activeObj) {
        if (axis === "X") activeObj.set("flipX", !activeObj.flipX);
        if (axis === "Y") activeObj.set("flipY", !activeObj.flipY);
        canvas.value.requestRenderAll();
      }
    }
  };

  const toggleDrawing = (enable) => {
    if (!canvas.value) return;
    canvas.value.isDrawingMode = enable;
    if (enable) {
      const brush = new fabric.PencilBrush(canvas.value);
      brush.color = "rgba(255, 0, 0, 0.5)";
      brush.width = 30;
      canvas.value.freeDrawingBrush = brush;
    }
  };

  const exportMask = () => {
    if (!canvas.value) return null;
    const originalBg = canvas.value.backgroundColor;
    const objects = canvas.value.getObjects();
    objects.forEach((obj) => {
      if (obj.type === "path") {
        obj._originalStroke = obj.stroke;
        obj.set({ stroke: "#ffffff" });
      } else {
        obj._originalOpacity = obj.opacity;
        obj.set({ opacity: 0 });
      }
    });
    canvas.value.setBackgroundColor("#000000", null);
    canvas.value.renderAll();
    const dataURL = canvas.value.toDataURL({ format: "png", multiplier: 1 });
    objects.forEach((obj) => {
      if (obj.type === "path") {
        obj.set({ stroke: obj._originalStroke || "rgba(255, 0, 0, 0.5)" });
      } else {
        obj.set({ opacity: obj._originalOpacity ?? 1 });
      }
    });
    canvas.value.setBackgroundColor(originalBg, null);
    canvas.value.renderAll();
    return dataURL;
  };

  const replaceActiveImage = (newUrl) => {
    const activeObj = canvas.value?.getActiveObject();
    if (!activeObj || activeObj.type !== "image") return;
    activeObj.setSrc(
      newUrl,
      () => {
        canvas.value.renderAll();
        saveHistory();
      },
      { crossOrigin: "anonymous" }
    );
  };

  const addText = (textStr = "双击编辑") => {
    if (!canvas.value) return;
    const text = new fabric.IText(textStr, {
      left: 100,
      top: 100,
      fontSize: 40,
      fill: "#333",
    });
    canvas.value.add(text);
    canvas.value.setActiveObject(text);
  };

  return {
    canvas,
    zoom,
    init,
    initImage,
    addImage,
    zoomIn,
    zoomOut,
    zoomReset,
    setZoom,
    undo,
    redo,
    saveHistory,
    toggleDrawing,
    exportMask,
    replaceActiveImage,
    addText,
    rotateActive, 
    flipActive   
  };
}