<template>
  <div class="workspace-container">
    <div
      class="canvas-center"
      ref="canvasContainer"
      @contextmenu.prevent="handleRightClick"
    >
      <canvas id="c"></canvas>
    </div>

    <FloatingObjectMenu />
    <CanvasContextMenu
      :visible="showContextMenu"
      :position="contextMenuPos"
      @close="closeContextMenu"
      @paste="handleMenuPaste"
    />
    <ShortcutsPanel :visible="showShortcuts" @close="showShortcuts = false" />

    <div v-if="showJoinAddBtn" class="join-action-dock">
      <button class="add-image-btn" @click="handleJoinAdd">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        继续添加
      </button>
      <input
        type="file"
        ref="joinFileInput"
        accept="image/*"
        style="display: none"
        @change="onJoinFileSelected"
      />
    </div>

    <div class="zoom-controls">
      <button
        class="ie-btn ie-btn-circle control-btn"
        :class="{ 'is-active': state.isGlobalDragMode }"
        @click="toggleDragMode"
        :title="
          state.isGlobalDragMode ? '退出拖拽模式' : '进入拖拽模式 (空格键)'
        "
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5" />
          <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v10" />
          <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
          <path
            d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"
          />
        </svg>
      </button>

      <button
        class="ie-btn ie-btn-circle"
        title="快捷键列表"
        @click="showShortcuts = true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
          <path d="M6 8h.01"></path>
          <path d="M10 8h.01"></path>
          <path d="M14 8h.01"></path>
          <path d="M18 8h.01"></path>
          <path d="M6 12h.01"></path>
          <path d="M18 12h.01"></path>
          <path d="M7 16h10"></path>
          <path d="M12 12v-1"></path>
        </svg>
      </button>

      <div class="divider"></div>

      <button class="ie-btn ie-btn-circle" title="缩小" @click="handleZoomOut">
        <svg viewBox="0 0 1024 1024" width="16" height="16">
          <path
            d="M128 544h768a32 32 0 1 0 0-64H128a32 32 0 1 0 0 64z"
            fill="currentColor"
          />
        </svg>
      </button>

      <span class="zoom-text" @click="handleReset" title="点击重置为100%">
        {{ zoomPercentage }}%
      </span>

      <button class="ie-btn ie-btn-circle" title="放大" @click="handleZoomIn">
        <svg viewBox="0 0 1024 1024" width="16" height="16">
          <path
            d="M480 480H160a32 32 0 0 0 0 64h320v320a32 32 0 0 0 64 0V544h320a32 32 0 0 0 0-64H544V160a32 32 0 0 0-64 0v320z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import {
  onMounted,
  inject,
  ref,
  watch,
  computed,
  onUnmounted,
  unref,
  nextTick,
} from "vue";
import FloatingObjectMenu from "./common/FloatingObjectMenu.vue";
import CanvasContextMenu from "./common/CanvasContextMenu.vue";
import { useObjectActions } from "@/composables/useObjectActions";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";
import ShortcutsPanel from "@/components/common/ShortcutsPanel.vue";
import { useEditorState } from "@/composables/useEditorState";
import { useCanvasLock } from "@/composables/useCanvasLock";
import {
  puzzleState,
  appendImageToJoin,
} from "./modules/puzzle/useCanvasPuzzle"; // ✨ 引入 puzzle 逻辑

const { state, setGlobalDragMode } = useEditorState();
const { setBackgroundLock } = useCanvasLock();

const props = defineProps({
  imageUrl: { type: String, default: "" },
});
const canvasAPI = inject("canvasAPI");
const canvasContainer = ref(null);
const pastePosition = ref(null);
const showShortcuts = ref(false);

const zoomPercentage = computed(() => {
  return canvasAPI?.zoom?.value ? Math.round(canvasAPI.zoom.value * 100) : 100;
});

const handleZoomIn = () => canvasAPI?.zoomIn && canvasAPI.zoomIn();
const handleZoomOut = () => canvasAPI?.zoomOut && canvasAPI.zoomOut();
const handleReset = () => canvasAPI?.zoomReset && canvasAPI.zoomReset();
const updateZoomState = () => {
  const fabricCanvas = canvasAPI?.canvas?.value;
  if (fabricCanvas && canvasAPI.zoom)
    canvasAPI.zoom.value = fabricCanvas.getZoom();
};

// === ✨ 配置驱动：交互锁策略表（四类闭环：default/crop/resize/ruler） ===
const TAB_LOCK_POLICIES = {
  default: {
    isRulerMode: false,
    isResizeMode: false,
    isCropMode: false,
    cropMainImageAnchored: false,
    discardActiveObject: false,

    allowMainImageSelect: true,
    allowMainImageDrag: false,
    showMainImageControls: false,

    allowNormalObjectSelect: true,
    allowNormalObjectDrag: true,
    showNormalObjectControls: true,

    allowRulerSelect: true,
    allowRulerDrag: true,
    showRulerControls: true,
    debugName: "default",
  },
  crop: {
    isRulerMode: false,
    isResizeMode: false,
    isCropMode: true,
    cropMainImageAnchored: true,
    discardActiveObject: true,

    allowMainImageSelect: false,
    allowMainImageDrag: false,
    showMainImageControls: false,

    allowNormalObjectSelect: false,
    allowNormalObjectDrag: false,
    showNormalObjectControls: false,

    allowRulerSelect: false,
    allowRulerDrag: false,
    showRulerControls: false,
    debugName: "crop",
  },
  resize: {
    isRulerMode: false,
    isResizeMode: true,
    isCropMode: false,
    cropMainImageAnchored: false,
    discardActiveObject: true,

    allowMainImageSelect: true,
    allowMainImageDrag: true,
    showMainImageControls: true,

    allowNormalObjectSelect: false,
    allowNormalObjectDrag: false,
    showNormalObjectControls: false,

    allowRulerSelect: false,
    allowRulerDrag: false,
    showRulerControls: false,
    debugName: "resize",
  },
  ruler: {
    isRulerMode: true,
    isResizeMode: false,
    isCropMode: false,
    cropMainImageAnchored: false,
    discardActiveObject: false,

    allowMainImageSelect: false,
    allowMainImageDrag: false,
    showMainImageControls: false,

    allowNormalObjectSelect: false,
    allowNormalObjectDrag: false,
    showNormalObjectControls: false,

    // 标尺模式：必须允许标尺对象被选中与接收事件，否则无法显示选中框/无法拖动
    allowRulerSelect: true,
    allowRulerDrag: true,
    showRulerControls: true,
    debugName: "ruler",
  },
};

const getLockPolicyByTab = (tab) => {
  if (tab === "crop") return TAB_LOCK_POLICIES.crop;
  if (tab === "resize") return TAB_LOCK_POLICIES.resize;
  if (tab === "ruler") return TAB_LOCK_POLICIES.ruler;
  return TAB_LOCK_POLICIES.default;
};

const syncLockState = () => {
  const canvas = unref(canvasAPI.canvas);
  if (!canvas) return;

  const basePolicy = getLockPolicyByTab(state.activeTab);

  // ✨ 规则：进入任何模块时，必须强制关闭全局手型模式，确保主图被锁定
  // 主图的拖动开关只能在全局手型图标上触发，模块内禁止拖动主图
  // 排除 resize 模式（resize 模式允许拖动主图，这是其特殊功能）
  // 判断是否在模块中：
  // - activeTool !== 'adjust'：肯定在模块中（如 text, draw, puzzle 等）
  // - activeTool === 'adjust' && activeTab !== ''：在调整模块的子模块中（如 crop, resize, ruler 等）
  const isInModule =
    state.activeTool !== "adjust" ||
    (state.activeTool === "adjust" && state.activeTab !== "");
  const isResizeMode = state.activeTab === "resize";

  // ✨ 关键修复：进入任何模块（非 resize）时，必须强制关闭全局手型模式
  // 参考调整模块的行为：主图不能被移动，除非用户手动启用手型
  // 边框模块例外：允许在边框模块内继续使用手型拖动（主图可拖动）
  const isBorderModule = state.activeTool === "border";

  if (
    isInModule &&
    !isResizeMode &&
    !isBorderModule &&
    state.isGlobalDragMode
  ) {
    setGlobalDragMode(false);
  }

  // ✨ 关键修复：如果进入了模块（非 resize），即使手型模式开启，也不允许拖动主图
  // 使用局部变量来确保逻辑正确执行
  const isDragModeActive =
    isInModule && !isResizeMode && !isBorderModule
      ? false
      : state.isGlobalDragMode;

  const dragPolicy = isDragModeActive
    ? {
        dragMode: true,
        isRulerMode: false,
        isResizeMode: false,
        isCropMode: false,
        cropMainImageAnchored: false,
        discardActiveObject: true,

        allowMainImageSelect: true,
        allowMainImageDrag: true,
        showMainImageControls: false,

        // 拖拽模式下避免误触：禁止直接点选普通对象/标尺
        allowNormalObjectSelect: false,
        allowNormalObjectDrag: false,
        showNormalObjectControls: false,

        allowRulerSelect: false,
        allowRulerDrag: false,
        showRulerControls: false,
      }
    : { dragMode: false };

  const finalPolicy = {
    ...basePolicy,
    ...dragPolicy,
  };

  // ✨ 强制规则：进入任何模块（非 resize）时，主图必须被锁定
  // 参考调整模块的行为：主图不能被移动，除非用户手动启用手型
  // 即使手型模式开启，也不允许在模块内拖动主图
  // 这是最终保障，确保主图拖动开关只能在全局手型图标上触发
  if (isInModule && !isResizeMode && !isBorderModule) {
    // ✨ 强制取消选中主图：如果主图当前被选中，立即取消选中（必须在设置策略之前执行）
    const activeObj = canvas.getActiveObject();
    if (activeObj && (activeObj.isMainImage || activeObj.id === "main-image")) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }

    // ✨ 强制锁定主图：禁止拖动和选中
    finalPolicy.allowMainImageDrag = false;
    finalPolicy.dragMode = false;
    // ✨ 关键修复：禁止选中主图，防止 Fabric.js 在选中状态下允许拖动
    // 即使 lockMovementX/Y 为 true，选中状态下的主图仍可能被拖动
    finalPolicy.allowMainImageSelect = false;
  }

  // ✨ 确保 debugName 被传递，以便 useCanvasLock 输出调试信息
  if (!finalPolicy.debugName) {
    finalPolicy.debugName = basePolicy.debugName || "unknown";
  }

  setBackgroundLock(canvas, true, finalPolicy);
};

const toggleDragMode = () => {
  const newMode = !state.isGlobalDragMode;
  setGlobalDragMode(newMode);
  syncLockState();
};

const actions = useObjectActions();
useKeyboardShortcuts(actions);
const showContextMenu = ref(false);
const contextMenuPos = ref({ x: 0, y: 0 });
const closeContextMenu = () => {
  showContextMenu.value = false;
};
const onGlobalClick = () => {
  if (showContextMenu.value) closeContextMenu();
};
const handleRightClick = (e) => {
  if (e.target.closest(".floating-wrapper")) return;
  contextMenuPos.value = { x: e.clientX, y: e.clientY };
  const canvas = unref(canvasAPI.canvas);
  if (canvas) pastePosition.value = canvas.getPointer(e);
  showContextMenu.value = true;
};
const handleMenuPaste = () => {
  actions.pasteActive(pastePosition.value);
};

const joinFileInput = ref(null);

const showJoinAddBtn = computed(() => {
  return state.isPuzzleMode && puzzleState.mode === "join";
});

const handleJoinAdd = () => {
  if (joinFileInput.value) joinFileInput.value.click();
};

const onJoinFileSelected = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    const url = URL.createObjectURL(file);
    appendImageToJoin(url);
    e.target.value = "";
  }
};

onMounted(() => {
  window.addEventListener("click", onGlobalClick);
  if (canvasAPI && canvasAPI.init) {
    const width = canvasContainer.value.clientWidth || 1900;
    const height = canvasContainer.value.clientHeight || 1000;
    canvasAPI.init("c", width, height);
    const fabricCanvas = canvasAPI.canvas.value;
    if (fabricCanvas) {
      fabricCanvas.on("zoom:change", updateZoomState);
      fabricCanvas.on("mouse:wheel", updateZoomState);
      fabricCanvas.on("image:updated", syncLockState);
      window.canvas = fabricCanvas;
    }
  }
  syncLockState();
});

watch(
  () => state.activeTab,
  () => {
    // ✨ 使用 nextTick 确保状态更新后再执行锁定逻辑
    // 参考页面初始化逻辑：onMounted 中调用 syncLockState 确保主图被锁定
    // 这样可以确保模块组件挂载完成后再执行锁定，避免时机问题
    nextTick(() => {
      syncLockState();
    });
  }
);
watch(
  () => state.activeTool,
  () => {
    // ✨ 使用 nextTick 确保状态更新后再执行锁定逻辑
    // 参考页面初始化逻辑：onMounted 中调用 syncLockState 确保主图被锁定
    // 这样可以确保模块组件挂载完成后再执行锁定，避免时机问题
    nextTick(() => {
      syncLockState();
    });
  }
);

// ✨ 空格键/按钮切换手型模式时，需要同步刷新锁策略
watch(
  () => state.isGlobalDragMode,
  () => {
    nextTick(() => {
      syncLockState();
    });
  }
);

onUnmounted(() => {
  const fabricCanvas = canvasAPI?.canvas?.value;
  if (fabricCanvas) {
    fabricCanvas.off("zoom:change", updateZoomState);
    fabricCanvas.off("mouse:wheel", updateZoomState);
    fabricCanvas.off("image:updated", syncLockState);
  }
  window.removeEventListener("click", onGlobalClick);
  const canvas = unref(canvasAPI.canvas);
  if (canvas) setBackgroundLock(canvas, true, { dragMode: false });
});
</script>

<style scoped>
.workspace-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  background-color: #f0f2f5;
  overflow: hidden;
}

.canvas-center {
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  width: 95%;
  height: 95%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.zoom-controls {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: white;
  padding: 8px 12px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.zoom-text {
  font-size: 13px;
  color: #606266;
  min-width: 45px;
  text-align: center;
  user-select: none;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 0.2s;
}

.zoom-text:hover {
  color: var(--ie-primary-color);
}

.ie-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #606266;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.ie-btn:hover {
  color: var(--ie-primary-color);
  background-color: #ecf5ff;
}

.ie-btn-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.control-btn.is-active {
  background: var(--ie-primary-color);
  color: white;
  border-color: var(--ie-primary-color);
}

.zoom-controls .divider {
  width: 1px;
  height: 16px;
  background: #ebeef5;
  margin: 0 4px;
}

.join-action-dock {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 101;
  background: white;
  padding: 6px;
  border-radius: 30px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  display: flex;
  animation: slideUp 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

.add-image-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 24px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 20px;
  color: #606266;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-image-btn:hover {
  color: var(--ie-primary-color);
  border-color: var(--ie-primary-color);
  background: #ecf5ff;
}

@keyframes slideUp {
  from {
    transform: translate(-50%, 100%);
    opacity: 0;
  }

  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}
</style>
