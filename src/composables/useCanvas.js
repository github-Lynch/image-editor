import { ref, shallowRef, markRaw, toRaw } from "vue";
import { fabric } from "fabric";
import { useEditorStore } from "../stores/editorStore"; // 引入 Store
let aspectRatioValue = null;
export function useCanvas() {
  // 使用 shallowRef 避免 Vue 深度代理导致 Fabric 对象移除失败
  const canvas = shallowRef(null);
  const cropObject = shallowRef(null);
  const store = useEditorStore(); // 获取 store 实例

  // === 历史记录状态 ===
  const history = []; // 存放 JSON 字符串
  let historyIndex = -1; // 当前历史记录指针
  let historyProcessing = false; // 锁：防止撤销重做时触发保存

  // === 1. 保存历史记录 ===
  const saveHistory = () => {
    if (!canvas.value || historyProcessing) return;

    // 如果当前处于历史记录中间，丢弃指针后面的记录（产生新分支）
    if (historyIndex < history.length - 1) {
      history.splice(historyIndex + 1);
    }

    // 保存当前画布状态为 JSON
    // propertiesToInclude 确保自定义属性也能被保存
    const json = JSON.stringify(
      canvas.value.toJSON(["id", "selectable", "name"])
    );
    history.push(json);
    historyIndex++;

    // 限制历史记录长度（例如 50 步），防止内存溢出
    if (history.length > 50) {
      history.shift();
      historyIndex--;
    }

    updateStoreHistory();
  };

  // 更新 Store 按钮状态
  const updateStoreHistory = () => {
    store.setHistoryState(
      historyIndex > 0, // canUndo
      historyIndex < history.length - 1 // canRedo
    );
  };

  // === 2. 撤销 ===
  const undo = () => {
    if (historyIndex <= 0) return; // 初始状态在 index 0，不能再退了
// [新增] 撤销时强制退出裁剪模式，防止 bug
    if (cropObject.value) {
        cancelCrop(); 
    }
    historyProcessing = true; // 加锁
    historyIndex--;

    const content = history[historyIndex];
    canvas.value.loadFromJSON(content, () => {
      canvas.value.renderAll();
      historyProcessing = false; // 解锁
      updateStoreHistory();
    });
  };

  // === 3. 重做 ===
  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    // [新增] 重做时也强制退出裁剪模式
    if (cropObject.value) {
        cancelCrop();
    }
    historyProcessing = true; // 加锁
    historyIndex++;

    const content = history[historyIndex];
    canvas.value.loadFromJSON(content, () => {
      canvas.value.renderAll();
      historyProcessing = false; // 解锁
      updateStoreHistory();
    });
  };

  // === 核心限制逻辑：确保裁剪框不超出底图 ===
  const constrainCrop = (activeObj) => {
    if (!canvas.value || !activeObj) return;

    // 只有当前操作的是裁剪框时才生效
    const cropRect = toRaw(cropObject.value);
    if (!cropRect || activeObj !== cropRect) return;

    // 找到底图作为边界
    const bgImage = canvas.value.getObjects().find((o) => o.type === "image");
    if (!bgImage) return;

    // [修复 1] 获取底图的视觉边界（支持旋转后）
    // 原来使用 getScaledWidth() 在旋转后会导致边界计算错误
    const rect = bgImage.getBoundingRect();
    const bgWidth = rect.width;
    const bgHeight = rect.height;
    const bgLeft = rect.left;
    const bgTop = rect.top;

    // 获取裁剪框的当前状态
    let top = activeObj.top;
    let left = activeObj.left;
    const scaleX = activeObj.scaleX;
    const scaleY = activeObj.scaleY;
    const width = activeObj.width * scaleX;
    const height = activeObj.height * scaleY;

    // --- 1. 限制移动 (Moving) ---
    // 限制左边
    if (left < bgLeft) activeObj.set("left", bgLeft);
    // 限制上边
    if (top < bgTop) activeObj.set("top", bgTop);
    // 限制右边 (左坐标 + 宽度 > 背景右边界)
    if (left + width > bgLeft + bgWidth)
      activeObj.set("left", bgLeft + bgWidth - width);
    // 限制下边
    if (top + height > bgTop + bgHeight)
      activeObj.set("top", bgTop + bgHeight - height);

    // --- 2. 限制缩放 (Scaling) ---
    // 如果缩放导致宽高超过了底图，强制修正 scale
    const currentWidth = activeObj.getScaledWidth();
    const currentHeight = activeObj.getScaledHeight();

    if (currentWidth > bgWidth) activeObj.scaleToWidth(bgWidth);
    if (currentHeight > bgHeight) activeObj.scaleToHeight(bgHeight);

    // 二次检查位置（防止缩放后位置偏移出界）
    if (activeObj.left < bgLeft) activeObj.set("left", bgLeft);
    if (activeObj.top < bgTop) activeObj.set("top", bgTop);
  };

  // 初始化
  const init = (id, width, height) => {
    const c = new fabric.Canvas(id, {
      width: width,
      height: height,
      backgroundColor: "#f3f3f3",
      preserveObjectStacking: true,
    });
    canvas.value = markRaw(c);

    // === 绑定事件监听 ===
    // 在移动和缩放时触发限制逻辑
    c.on("object:moving", (e) => constrainCrop(e.target));
    c.on("object:scaling", (e) => constrainCrop(e.target));

    // === 绑定历史记录事件 ===
    // 监听对象的修改、添加、移除
    c.on("object:modified", (e) => {
      if (e.target && e.target.type !== "rect") saveHistory();
    });
    c.on("object:added", (e) => {
      // 排除剪裁框本身被添加时触发保存，避免逻辑混乱
      if (e.target && e.target.type !== "rect") saveHistory();
    });
    c.on("object:removed", (e) => {
      if (e.target && e.target.type !== "rect") saveHistory();
    });

    // 初始化时保存一次“空白/初始”状态
    saveHistory();
  };

  const addImage = (url) => {
    fabric.Image.fromURL(url, (img) => {
      // [优化] 移除或调大这个限制。
      // 如果是为了让大图能完整显示在画布里，建议使用 zoom (缩放画布) 而不是 scale (缩放图片对象)。
      // 这里为了简单，我们先调大限制，或者根据画布容器大小动态缩放
      
      // 方案 A：简单调大限制
      // if (img.width > 2048) img.scaleToWidth(2048); 
      
      // 方案 B (推荐)：自适应画布大小，但记录 scale，导出时可恢复
      const canvasWidth = canvas.value.width;
      const canvasHeight = canvas.value.height;
      
      // 如果图片比画布还大，就缩小它以适应屏幕显示
      if (img.width > canvasWidth || img.height > canvasHeight) {
          const scale = Math.min(canvasWidth / img.width, canvasHeight / img.height) * 0.8; 
          img.scale(scale);
      }

      canvas.value?.add(img);
      canvas.value?.centerObject(img);
      canvas.value?.setActiveObject(img);
    }, { crossOrigin: 'anonymous' });
  };

  // === 裁剪模式 ===
  const startCrop = (aspectRatio = null) => {
    if (!canvas.value) return;
    aspectRatioValue = aspectRatio || null;
    // 1. 查找底图
    let activeObj = canvas.value
      .getObjects()
      .find((obj) => obj.type === "image");
    if (!activeObj) return;

    cancelCrop(); // 移除旧框

    // [修复 2] 使用 getBoundingRect 计算初始位置和大小
    // 确保在图片已旋转的情况下，剪裁框能正确匹配视觉大小
    const rect = activeObj.getBoundingRect();
    const imgWidth = rect.width;
    const imgHeight = rect.height;

    let width = imgWidth * 0.8;
    let height = imgHeight * 0.8;

    if (aspectRatio) {
      height = width / aspectRatio;
      // 如果算出高度溢出，改用高度基准
      if (height > imgHeight) {
        height = imgHeight;
        width = height * aspectRatio;
      }
    }

    const cropZone = new fabric.Rect({
      left: rect.left + (imgWidth - width) / 2, // 基于 bounding rect 居中
      top: rect.top + (imgHeight - height) / 2,
      width: width,
      height: height,
      fill: "rgba(0,0,0,0.3)", // 半透明蒙版
      stroke: "#409eff",
      strokeWidth: 2,
      cornerColor: "white",
      cornerStrokeColor: "#409eff",
      cornerSize: 10,
      transparentCorners: false,
      lockRotation: true, // 裁剪框不旋转
      hasRotatingPoint: false,
    });

    if (aspectRatio) {
      cropZone.set({ lockUniScaling: true });
      cropZone.set("height", width / aspectRatio);
    } else {
      cropZone.set({ lockUniScaling: false });
    }

    canvas.value.add(cropZone);
    canvas.value.setActiveObject(cropZone);
    cropObject.value = cropZone; // shallowRef 存储原始对象
    canvas.value.renderAll();
  };

  const setCropBoxSize = (width, height) => {
    if (!cropObject.value || !canvas.value) return;
    cropObject.value.set({ width, height });
    cropObject.value.setCoords();
    canvas.value.renderAll();
  };

  // === 确认裁剪 (含蒙版修复) ===
  const confirmCrop = () => {
    if (!canvas.value || !cropObject.value) return;

    const cropRect = cropObject.value;
    const bgImage = canvas.value.getObjects().find((o) => o.type === "image");
    if (!bgImage) return cancelCrop();

    // 1. 隐藏裁剪框以进行截图
    cropRect.visible = false;

    // 2. 截图（生成的新图已经是旋转/翻转后的最终视觉效果）
    const croppedDataUrl = canvas.value.toDataURL({
      left: cropRect.left,
      top: cropRect.top,
      width: cropRect.getScaledWidth(),
      height: cropRect.getScaledHeight(),
      format: "png",
      multiplier: 1,
    });

    // 3. 替换原图
    bgImage.setSrc(croppedDataUrl, () => {
      // [核心修复] 必须重置所有变换属性，防止叠加
      bgImage.set({
        originX: "left", // 强制左上角原点，防止因 center origin 导致图片跑偏
        originY: "top",
        left: cropRect.left,
        top: cropRect.top,
        scaleX: 1,
        scaleY: 1,
        angle: 0, // 重置角度 (因为新图已经是转好的了)
        flipX: false, // [修复] 重置水平翻转 (防止新图再次被翻转)
        flipY: false, // [修复] 重置垂直翻转
        width: cropRect.getScaledWidth(),
        height: cropRect.getScaledHeight(),
      });

      // 恢复图片坐标系，防止下次操作异常
      bgImage.setCoords();

      cancelCrop();
      canvas.value.renderAll();

      // 4. 保存历史记录
      saveHistory();
    });
  };

  const cancelCrop = () => {
    if (canvas.value && cropObject.value) {
      const rawObj = toRaw(cropObject.value);
      canvas.value.remove(rawObj);
      cropObject.value = null;
      canvas.value.renderAll();
    }
  };

  // === 其他功能 ===
  const rotateActive = (angle) => {
    // [修复 4] 如果处于裁剪模式，旋转的是“底图”，而不是裁剪框
    if (cropObject.value) {
      const bgImage = canvas.value.getObjects().find((o) => o.type === "image");
      if (bgImage) {
        bgImage.rotate((bgImage.angle || 0) + angle);
        canvas.value.centerObject(bgImage); // 保持居中
        bgImage.setCoords();
        canvas.value.renderAll();
        // 旋转后，重新初始化裁剪框以适应新的图片边界
        startCrop(aspectRatioValue);
      }
      return;
    }

    // 正常模式：旋转选中的对象
    const activeObj = canvas.value?.getActiveObject();
    if (activeObj) {
      activeObj.rotate((activeObj.angle || 0) + angle);
      canvas.value.requestRenderAll();
      saveHistory();
    }
  };

  const flipActive = (axis) => {
    if (cropObject.value) {
      const bgImage = canvas.value
        ?.getObjects()
        .find((o) => o.type === "image");
      if (bgImage) {
        if (axis === "X") bgImage.set("flipX", !bgImage.flipX);
        if (axis === "Y") bgImage.set("flipY", !bgImage.flipY);
        canvas.value.requestRenderAll();
      }
      return;
    }
    const activeObj = canvas.value?.getActiveObject();
    if (activeObj) {
      if (axis === "X") activeObj.set("flipX", !activeObj.flipX);
      if (axis === "Y") activeObj.set("flipY", !activeObj.flipY);
      canvas.value.requestRenderAll();
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
    init,
    addImage,
    startCrop,
    setCropBoxSize,
    confirmCrop,
    cancelCrop,
    rotateActive,
    flipActive,
    toggleDrawing,
    exportMask,
    replaceActiveImage,
    addText,
    undo,
    redo,
    saveHistory,
  };
}
