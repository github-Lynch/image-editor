// src/components/modules/adjust/useCanvasColorOverlay.js
import { unref } from "vue";
import { fabric } from "fabric";

let canvasRef = null;
let saveHistoryFn = null;
let backupFilters = [];
let backupColor = null;    // ✅ 新增：备份颜色
let backupOpacity = 30;


export const registerColorOverlayModule = (canvas, saveHistory) => {
    canvasRef = canvas;
    saveHistoryFn = saveHistory;
};


/**
 * 备份当前状态（包含滤镜数组和元数据）
 */
export const backupCurrentColorOverlay = () => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    if (bgImage) {
        // 深拷贝滤镜数组
        backupFilters = [...bgImage.filters];
        // 备份元数据
        backupColor = bgImage._lastOverlayColor || null;
        backupOpacity = bgImage._lastOverlayOpacity ?? 30;
    }
};

/**
 * 应用颜色叠加：记录元数据到图片对象
 */
export const applyColorOverlay = (color, opacity = 30) => {
    const canvas = unref(canvasRef);
    if (!canvas) return;

    const bgImage = canvas.getObjects().find(o => o.type === 'image');
    if (!bgImage) return;

    // 记录元数据，用于 UI 状态同步
    bgImage._lastOverlayColor = color;
    bgImage._lastOverlayOpacity = opacity;

    const existingIndex = bgImage.filters.findIndex(f => f instanceof fabric.Image.filters.BlendColor);

    if (!color) {
        if (existingIndex > -1) {
            bgImage.filters.splice(existingIndex, 1);
        }
    } else {
        const filter = new fabric.Image.filters.BlendColor({
            color: color,
            mode: 'tint',
            alpha: opacity / 100
        });

        if (existingIndex > -1) {
            bgImage.filters[existingIndex] = filter;
        } else {
            bgImage.filters.push(filter);
        }
    }

    bgImage.applyFilters();
    canvas.requestRenderAll();
};

/**
 * 取消修改：还原滤镜数组和元数据
 */
export const cancelColorOverlayChange = () => {
    const canvas = unref(canvasRef);
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    if (bgImage) {
        bgImage.filters = [...backupFilters];
        // 还原元数据
        bgImage._lastOverlayColor = backupColor;
        bgImage._lastOverlayOpacity = backupOpacity;
        
        bgImage.applyFilters();
        canvas.requestRenderAll();
    }
    backupFilters = [];
};

export const commitColorOverlay = () => {
    if (saveHistoryFn) saveHistoryFn(); // 保存历史记录
    backupFilters = [];
};