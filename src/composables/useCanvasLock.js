import { unref } from 'vue';

/**
 * ✨ 1. 定义 LOCKABLE_PROPERTIES 静态常量列表
 * 所有的锁定和豁免动作都必须严格遵循此列表，确保逻辑一一对应
 */
const LOCK_CONFIG = {
  // 属性名: [锁定值, 交互值]
  'selectable': [false, true],
  'evented': [false, true],
  'hasControls': [false, true],
  'hasBorders': [false, true],
  'lockMovementX': [true, false],
  'lockMovementY': [true, false],
  'lockRotation': [true, false],
  'lockScalingX': [true, false],
  'lockScalingY': [true, false],
};

export function useCanvasLock() {
  // 状态记忆库 (WeakMap)
  const objectStates = new WeakMap();

  /**
   * 🛡️ 内部函数：ObjectFunctions.enable(obj)
   * 强制将对象恢复到全功能状态，用于豁免逻辑 (策略 B)
   */
  const forceEnableObject = (obj, isRulerMode) => {
    Object.keys(LOCK_CONFIG).forEach(prop => {
      const [_, interactiveValue] = LOCK_CONFIG[prop];
      obj.set(prop, interactiveValue);
    });
    // 特殊光标处理
    obj.set('hoverCursor', isRulerMode ? 'move' : 'default');
  };

  /**
   * 🛡️ 内部函数：实施物理锁定并备份
   */
  const lockAndStoreObject = (obj) => {
    const backup = {};
    Object.keys(LOCK_CONFIG).forEach(prop => {
      // ✨ 只有第一次锁定该对象时才备份，防止多层记忆覆盖原始状态
      if (!objectStates.has(obj)) {
        backup[prop] = obj[prop];
      }
      const [lockedValue] = LOCK_CONFIG[prop];
      obj.set(prop, lockedValue);
    });
    
    if (Object.keys(backup).length > 0) {
      objectStates.set(obj, backup);
    }
    obj.set('hoverCursor', 'default');
  };

  /**
   * 🛡️ 主函数：智能物理锁控制
   */
const setBackgroundLock = (canvasInstance, shouldLock, options = {}) => {
    const canvas = unref(canvasInstance);
    if (!canvas) return;

    const { excludeRulers = true, dragMode = false, isRulerMode = false } = options;
    const objects = canvas.getObjects();
    
    if (shouldLock) {
      canvas.selection = false; 
      canvas.defaultCursor = dragMode ? 'grab' : (isRulerMode ? 'crosshair' : 'default');

      objects.forEach(obj => {
        const isMain = obj.isMainImage || obj.id === 'main-image' || (obj.type === 'image' && objects.indexOf(obj) === 0);
        
        if (isMain) {
          obj.set({
            selectable: dragMode, 
            evented: dragMode,
            hoverCursor: dragMode ? 'grab' : (isRulerMode ? 'crosshair' : 'default'),
            moveCursor: dragMode ? 'grabbing' : 'default'
          });
          return;
        }

        // ✨ 响应提议 Q2：如果处于拖拽模式 (dragMode === true)，强制锁定所有组件
        // 只有在非拖拽模式下的标尺模式，才允许豁免标尺
        const shouldExempt = !dragMode && excludeRulers && obj.isRuler;

        if (shouldExempt) {
          forceEnableObject(obj, isRulerMode);
          return;
        }

        // 标准锁定
        lockAndStoreObject(obj);
      });

      if (!dragMode && canvas.getActiveObject()?.isMainImage) {
        canvas.discardActiveObject();
      }
    } else {
      // 解锁阶段保持不变...
      canvas.selection = true;
      canvas.defaultCursor = 'default';
      objects.forEach(obj => {
        const originalState = objectStates.get(obj);
        if (originalState) {
          obj.set(originalState);
          objectStates.delete(obj);
        } else {
          forceEnableObject(obj, false);
        }
      });
    }
    canvas.requestRenderAll();
  };

  return { setBackgroundLock };
}