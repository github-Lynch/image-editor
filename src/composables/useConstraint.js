import { fabric } from 'fabric';

/**
 * 获取对象在画布上的逻辑矩形（消除缩放和视口偏移的影响）
 * @param {fabric.Object} obj 
 * @param {fabric.Canvas} canvas 
 */
export const getLogicRect = (obj, canvas) => {
    if (!obj || !canvas) return { left: 0, top: 0, width: 0, height: 0 };

    const zoom = canvas.getZoom();
    const vpt = canvas.viewportTransform;

    // getBoundingRect 返回的是屏幕坐标（受 zoom 和 viewport 影响）
    const rawRect = obj.getBoundingRect();

    return {
        left: (rawRect.left - vpt[4]) / zoom,
        top: (rawRect.top - vpt[5]) / zoom,
        width: rawRect.width / zoom,
        height: rawRect.height / zoom
    };
};

/**
 * 核心算法：计算“对象”相对于“容器”的越界修正值
 * 返回具体的 deltaX 和 deltaY，不直接修改对象
 */
export const calculateConstraintOffset = (targetRect, containerRect) => {
    let deltaX = 0;
    let deltaY = 0;

    // 1. 左边界检测
    if (targetRect.left > containerRect.left) {
        deltaX = containerRect.left - targetRect.left;
    }

    // 2. 上边界检测
    if (targetRect.top > containerRect.top) {
        deltaY = containerRect.top - targetRect.top;
    }

    // 3. 右边界检测
    const targetRight = targetRect.left + targetRect.width;
    const containerRight = containerRect.left + containerRect.width;

    // 如果当前已经在右边界内，就不需要修正（除非左边修正导致的连锁反应，但这里简化处理）
    // 逻辑：只有当右边“出界”了（targetRight < containerRight 是指图片没填满右边）
    // 注意：这里的语义是“图片必须覆盖容器”，所以图片右边必须 >= 容器右边
    if (targetRight < containerRight) {
        // 优先保证左对齐，如果左边没问题，才修正右边
        if (deltaX === 0) {
            deltaX = containerRight - targetRight;
        }
    }

    // 4. 下边界检测
    const targetBottom = targetRect.top + targetRect.height;
    const containerBottom = containerRect.top + containerRect.height;

    if (targetBottom < containerBottom) {
        if (deltaY === 0) {
            deltaY = containerBottom - targetBottom;
        }
    }

    return { deltaX, deltaY };
};

/**
 * 动作：瞬间修正对象位置（通常用于 Resize 过程中，或者 mouse:up 不需要动画时）
 */
export const constrainObjectToRect = (obj, containerRect, canvas) => {
    if (!obj || !containerRect || !canvas) return false;

    const objRect = getLogicRect(obj, canvas);
    const boxRect = containerRect.type ? getLogicRect(containerRect, canvas) : containerRect;

    const { deltaX, deltaY } = calculateConstraintOffset(objRect, boxRect);

    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
        obj.left += deltaX;
        obj.top += deltaY;
        obj.setCoords(); // 重要：更新点击区域
        return true; // 发生了修正
    }
    return false; // 无需修正
};

/**
 * 动作：带动画的平滑回弹（完善版）
 * 适用场景：拼图拖拽松手、图片移动松手
 */
export const animateRebound = (obj, containerRect, canvas) => {
    if (!obj || !containerRect || !canvas) return;

    // 1. 计算需要的修正值
    const objRect = getLogicRect(obj, canvas);
    const boxRect = containerRect.type ? getLogicRect(containerRect, canvas) : containerRect;

    const { deltaX, deltaY } = calculateConstraintOffset(objRect, boxRect);

    // 2. 如果偏移量很小，忽略
    if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

    // 3. 计算目标坐标
    const targetLeft = obj.left + deltaX;
    const targetTop = obj.top + deltaY;

    // 4. 执行 Fabric 动画
    obj.animate({
        left: targetLeft,
        top: targetTop
    }, {
        duration: 300, // 动画时长 300ms
        onChange: canvas.requestRenderAll.bind(canvas), // 每一帧都重绘
        onComplete: () => {
            obj.setCoords(); // 动画结束必须更新坐标，否则点击区域会错位
            canvas.requestRenderAll();
        },
        // 使用指数缓动，物理感更强 (easeOutExpo)
        easing: fabric.util.ease.easeOutExpo
    });
};