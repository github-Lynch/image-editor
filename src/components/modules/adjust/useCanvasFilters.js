// src/components/modules/adjust/useCanvasFilters.js
import { unref } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;
let thumbnailTimer = null;
let backupFilters = [];
let backupKey = 'original'; // 用于备份滤镜 Key
let backupIntensity = 100;   // 用于备份强度


export const registerFilterModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;
};

// 滤镜矩阵配置（模拟店小秘的四大分类）
export const filterDefinitions = {
    // 基础类
    natural: [1, 0, 0, 0, 0,  0, 1.05, 0, 0, 0,  0, 0, 1.02, 0, 0,  0, 0, 0, 1, 0], // 自然
    bright: [1.1, 0, 0, 0, 0,  0, 1.1, 0, 0, 0,  0, 0, 1.1, 0, 0,  0, 0, 0, 1, 0],   // 鲜亮
    whitening: [1.05, 0, 0, 0, 0.05,  0, 1.05, 0, 0, 0.05,  0, 0, 1.05, 0, 0.05,  0, 0, 0, 1, 0], // 净白

    // 复古类
    v8090: [0.35, 0.25, 0.25, 0, 0,  0.25, 0.35, 0.25, 0, 0,  0.25, 0.25, 0.35, 0, 0,  0, 0, 0, 1, 0], // 8090
    modern: [0.393, 0.769, 0.189, 0, 0,  0.349, 0.686, 0.168, 0, 0,  0.272, 0.534, 0.131, 0, 0,  0, 0, 0, 1, 0], // 摩登
    cool_space: [1, 0, 0, 0.1, -0.1,  0, 1, 0, 0.1, -0.1,  0, 0, 1.2, 0.2, -0.1,  0, 0, 0, 1, 0], // 烈空

    // 风景类
    snow: [1, 0, 0, 0, 0.1,  0, 1, 0, 0, 0.1,  0, 0, 1.1, 0, 0.15,  0, 0, 0, 1, 0], // 初雪
    sunset: [1.2, 0, 0, 0, 0,  0, 1, 0, 0, 0,  0, 0, 0.8, 0, 0,  0, 0, 0, 1, 0],     // 垦丁
    hot_sun: [1.1, 0, 0, 0.1, 0,  0, 1, 0, 0.1, 0,  0, 0, 0.9, 0, 0,  0, 0, 0, 1, 0], // 烈日

    // 电影类
    smoke: [0.8, 0.1, 0.1, 0, 0,  0.1, 0.8, 0.1, 0, 0,  0.1, 0.1, 0.8, 0, 0,  0, 0, 0, 1, 0], // 尘烟
    spring: [0.9, 0, 0, 0, 0,  0, 1.1, 0, 0, 0,  0, 0, 0.9, 0, 0,  0, 0, 0, 1, 0], // 春风
    lalaland: [1, 0, 0, 0, 0,  0, 0.9, 0, 0, 0,  0, 0, 1.2, 0, 0,  0, 0, 0, 1, 0], // 爱乐之城
};

// 备份当前滤镜状态
export const backupCurrentFilters = () => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    if (bgImage) {
        // 深拷贝滤镜数组
        backupFilters = [...bgImage.filters];
        backupKey = bgImage._lastFilterKey || 'original';
        backupIntensity = bgImage._lastFilterIntensity ?? 100;
    }
};

/**
 * 应用滤镜预设
 * @param {string} filterKey 滤镜配置键名
 * @param {number} intensity 强度 (0-100)
 */
export const applyFilterPreset = (filterKey, intensity = 100) => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    if (!bgImage) return;

    // 记录当前选中的滤镜信息到对象上，以便重新打开面板时同步 UI
    bgImage._lastFilterKey = filterKey;
    bgImage._lastFilterIntensity = intensity;

    bgImage.filters = bgImage.filters.filter(f => !f._isArtFilter);

    if (filterKey !== 'original') {
        const matrix = filterDefinitions[filterKey];
        if (matrix) {
            const filter = new fabric.Image.filters.ColorMatrix({
                matrix: matrix,
                alpha: intensity / 100
            });
            filter._isArtFilter = true;
            bgImage.filters.push(filter);
        }
    }

    bgImage.applyFilters();
    canvas.requestRenderAll();
};

// 确定：保存历史记录并清理备份
export const commitFilterChange = () => {
    if (saveHistoryFn) saveHistoryFn();
    backupFilters = [];
};

/**
 * 取消修改：核心逻辑回归 —— 恢复到备份状态
 */
export const cancelFilterChange = () => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    if (bgImage) {
        bgImage.filters = [...backupFilters];
        // ✅ 还原元数据
        bgImage._lastFilterKey = backupKey;
        bgImage._lastFilterIntensity = backupIntensity;
        
        bgImage.applyFilters();
        canvas.requestRenderAll();
    }
    backupFilters = [];
};

/**
 * 生成所有滤镜的预览缩略图
 * @returns {Promise<Object>} 返回一个对象，键是滤镜key，值是Base64图片数据
 */
export const generateFilterThumbnails = () => {
  return new Promise((resolve, reject) => {
    const canvas = unref(canvasRef);
    if (!canvas) {
      reject("Canvas not initialized");
      return;
    }

    const bgImage = canvas.getObjects().find(o => o.type === 'image');
    if (!bgImage) {
      resolve({}); // 没有图片时返回空
      return;
    }

    const originalSrc = bgImage.getSrc();
    const thumbSize = 80; // 缩略图大小，越小生成越快

    // 1. 创建一个后台小型离屏画布
    const tempCanvas = new fabric.StaticCanvas(null, {
      width: thumbSize,
      height: thumbSize,
      backgroundColor: 'transparent'
    });

    // 2. 加载原图
    fabric.Image.fromURL(originalSrc, (thumbImg) => {
        // 3. 将图片缩放并居中填满小画布
        const scale = Math.max(thumbSize / thumbImg.width, thumbSize / thumbImg.height);
        thumbImg.set({
            originX: 'center',
            originY: 'center',
            left: thumbSize / 2,
            top: thumbSize / 2,
            scaleX: scale,
            scaleY: scale
        });
        tempCanvas.add(thumbImg);

        const resultMap = {};

        // 4. 定义一个辅助函数来生成单个滤镜图
        const renderOne = (matrix) => {
            thumbImg.filters = []; // 清空旧滤镜
            if (matrix) {
                const filter = new fabric.Image.filters.ColorMatrix({ matrix: matrix });
                thumbImg.filters.push(filter);
            }
            thumbImg.applyFilters();
            tempCanvas.renderAll();
            // 使用较低质量导出，提高速度
            return tempCanvas.toDataURL({ format: 'jpeg', quality: 0.7 });
        };

        // 5. 生成【原图】缩略图
        resultMap['original'] = renderOne(null);

        // 6. 循环生成所有【滤镜】缩略图
        for (const key in filterDefinitions) {
            resultMap[key] = renderOne(filterDefinitions[key]);
        }
        
        // 清理内存
        tempCanvas.dispose();
        resolve(resultMap);
    }, { crossOrigin: 'anonymous' }); // 确保跨域加载
  });
};

/**
 * 优化的缩略图加载逻辑（带内部防抖）
 * @param {Function} callback - 成功生成后的回调
 */
export const loadThumbnailsTask = (callback) => {
    if (thumbnailTimer) clearTimeout(thumbnailTimer);

    // 设置 200ms 防抖，防止面板快速切换或图片连续变换时的计算浪费
    thumbnailTimer = setTimeout(async () => {
        try {
            const map = await generateFilterThumbnails(); // 调用之前定义的生成函数
            if (callback) callback(map);
        } catch (e) {
            console.error("生成缩略图失败:", e);
        }
    }, 200);
};