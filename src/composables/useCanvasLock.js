import { unref } from 'vue';

const LOCK_CONFIG = {
  selectable: [false, true],
  evented: [false, true],
  hasControls: [false, true],
  hasBorders: [false, true],
  lockMovementX: [true, false],
  lockMovementY: [true, false],
  lockRotation: [true, false],
  lockScalingX: [true, false],
  lockScalingY: [true, false],
};

// ✅ 模块级单例：确保备份与锁逻辑在整个应用生命周期内一致
const objectStates = new WeakMap();

const forceEnableObject = (obj, isRulerMode) => {
  Object.keys(LOCK_CONFIG).forEach((prop) => {
    const [, interactiveValue] = LOCK_CONFIG[prop];
    obj.set(prop, interactiveValue);
  });
  obj.set('hoverCursor', isRulerMode ? 'move' : 'default');
};

const lockAndStoreObject = (obj) => {
  const backup = {};

  Object.keys(LOCK_CONFIG).forEach((prop) => {
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

const restoreObjectFromBackup = (obj) => {
  const backup = objectStates.get(obj);
  if (!backup) return;

  Object.keys(LOCK_CONFIG).forEach((prop) => {
    if (Object.prototype.hasOwnProperty.call(backup, prop)) {
      obj.set(prop, backup[prop]);
    }
  });

  obj.set('hoverCursor', obj.hoverCursor || 'default');
};

const applyControlVisibility = (obj, shouldShow) => {
  obj.set({
    hasControls: !!shouldShow,
    hasBorders: !!shouldShow,
  });
};

export function useCanvasLock() {
  const setBackgroundLock = (canvasInstance, shouldLock, options = {}) => {
    const canvas = unref(canvasInstance);
    if (!canvas) return;

    const {
      dragMode = false,
      isRulerMode = false,
      isResizeMode = false,
      isCropMode = false,

      allowMainImageSelect = false,
      allowMainImageDrag = false,
      showMainImageControls = false,

      allowRulerSelect = false,
      allowRulerDrag = false,
      showRulerControls = true,

      allowNormalObjectSelect = false,
      allowNormalObjectDrag = false,
      showNormalObjectControls = true,

      cropMainImageAnchored = false,
      discardActiveObject = false,

      debugName = '',
    } = options;

    const objects = canvas.getObjects();

    if (shouldLock) {
      if (discardActiveObject) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }

      canvas.selection = false;
      canvas.defaultCursor = dragMode ? 'grab' : (isRulerMode ? 'crosshair' : 'default');

      objects.forEach((obj) => {
        const isMain = obj.isMainImage || obj.id === 'main-image' || (obj.type === 'image' && objects.indexOf(obj) === 0);
        const isRuler = !!obj.isRuler;

        if (isMain) {
          if (isCropMode && cropMainImageAnchored) {
            obj.set({
              selectable: false,
              evented: true,
              lockMovementX: true,
              lockMovementY: true,
              hoverCursor: 'default',
              hasControls: false,
              hasBorders: false,
            });
            return;
          }

          obj.set({
            selectable: !!allowMainImageSelect,
            evented: !!allowMainImageSelect,
            lockMovementX: !allowMainImageDrag,
            lockMovementY: !allowMainImageDrag,
            hoverCursor: allowMainImageDrag ? (dragMode ? 'grab' : 'move') : 'default',
          });
          applyControlVisibility(obj, showMainImageControls);
          return;
        }

        if (isRuler) {
          if (allowRulerSelect || allowRulerDrag) {
            forceEnableObject(obj, true);
            if (!allowRulerDrag) obj.set({ lockMovementX: true, lockMovementY: true });
            applyControlVisibility(obj, showRulerControls);
            obj.setCoords();
            return;
          }

          lockAndStoreObject(obj);
          return;
        }

        if (allowNormalObjectSelect || allowNormalObjectDrag) {
          forceEnableObject(obj, false);
          if (!allowNormalObjectDrag) obj.set({ lockMovementX: true, lockMovementY: true });
          applyControlVisibility(obj, showNormalObjectControls);
          obj.setCoords();
          return;
        }

        lockAndStoreObject(obj);
      });

      // ✅ 最终态收敛：强制把 activeObject 按当前策略同步一次
      const active = canvas.getActiveObject();
      if (active) {
        const isMain = active.isMainImage || active.id === 'main-image' || active.type === 'image';
        if (active.isRuler && (allowRulerSelect || allowRulerDrag)) {
          forceEnableObject(active, true);
          if (!allowRulerDrag) active.set({ lockMovementX: true, lockMovementY: true });
          applyControlVisibility(active, showRulerControls);
          active.setCoords();
        } else if (!isMain && (allowNormalObjectSelect || allowNormalObjectDrag)) {
          forceEnableObject(active, false);
          if (!allowNormalObjectDrag) active.set({ lockMovementX: true, lockMovementY: true });
          applyControlVisibility(active, showNormalObjectControls);
          active.setCoords();
        } else if (isMain) {
          active.set({
            selectable: !!allowMainImageSelect,
            evented: !!allowMainImageSelect,
            lockMovementX: !allowMainImageDrag,
            lockMovementY: !allowMainImageDrag,
          });
          applyControlVisibility(active, showMainImageControls);
          active.setCoords();
        }
      }


      canvas.requestRenderAll();
    } else {
      canvas.selection = !dragMode && !isResizeMode && !isCropMode;
      objects.forEach((obj) => restoreObjectFromBackup(obj));
      if (!isRulerMode) {
        objects.forEach((obj) => {
          if (obj.isRuler) obj.set('hoverCursor', 'default');
        });
      }
      canvas.requestRenderAll();
    }
  };

  return { setBackgroundLock };
}
