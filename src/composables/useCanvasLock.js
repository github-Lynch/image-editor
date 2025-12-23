// src/composables/useCanvasLock.js
import { unref } from 'vue';

/**
 * 通用画布锁定钩子
 * 用于在特定模式下（如测量、抠图）锁定背景或特定元素，避免误触
 */
export function useCanvasLock() {
    
    /**
     * 切换背景图的锁定状态
     * @param {Object} canvasInstance - Fabric canvas 实例 (ref 或 raw object)
     * @param {Boolean} shouldLock - true: 锁定; false: 解锁
     */
    const setBackgroundLock = (canvasInstance, shouldLock) => {
        const canvas = unref(canvasInstance);
        if (!canvas) return;

        // 获取背景对象 (根据您的 1B 选择，我们只针对 backgroundImage)
        const bgObject = canvas.backgroundImage;

        if (bgObject) {
            // 锁定核心属性
            // selectable: 是否可被选中
            // evented: 是否响应鼠标事件 (设为 false 可让点击“穿透”背景，直接画出标尺)
            bgObject.set({
                selectable: !shouldLock,
                evented: !shouldLock,
                hoverCursor: shouldLock ? 'default' : null // 锁定时鼠标不变手型
            });
            
            canvas.requestRenderAll();
        } else {
            console.warn('[useCanvasLock] 未检测到 canvas.backgroundImage，锁定未生效。请确认主图是否已设置为背景。');
        }
    };

    return {
        setBackgroundLock
    };
}