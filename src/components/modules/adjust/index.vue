<template>
  <div class="panel-adjust">
    <div class="tool-list">
      <AdjustCrop :is-expanded="activeCollapse === 'crop'" @toggle="toggle('crop')" />
      <AdjustResize :is-expanded="activeCollapse === 'resize'" @toggle="toggle('resize')" />
      <AdjustInpaint :is-expanded="activeCollapse === 'inpaint'" @toggle="toggle('inpaint')" />
      <AdjustRembg :is-expanded="activeCollapse === 'rembg'" @toggle="toggle('rembg')" />

      <AdjustRuler :is-expanded="activeCollapse === 'ruler'" @toggle="toggle('ruler')" />

      <AdjustWhite :is-expanded="activeCollapse === 'white'" @toggle="toggle('white')" />
      <AdjustColor :is-expanded="activeCollapse === 'color'" @toggle="toggle('color')" />
      <AdjustColorOverlay :is-expanded="activeCollapse === 'overlay'" @toggle="toggle('overlay')" />
      <AdjustFilters :is-expanded="activeCollapse === 'filters'" @toggle="toggle('filters')" />
      <AdjustMosaic :is-expanded="activeCollapse === 'mosaic'" @toggle="toggle('mosaic')" />
    </div>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent, watch, inject } from "vue";
import { useEditorState } from "@/composables/useEditorState";

// 异步组件加载
const AdjustCrop = defineAsyncComponent(() => import("./AdjustCrop.vue"));
const AdjustResize = defineAsyncComponent(() => import("./AdjustResize.vue"));
const AdjustInpaint = defineAsyncComponent(() => import("./AdjustInpaint.vue"));
const AdjustRembg = defineAsyncComponent(() => import("./AdjustRembg.vue"));
const AdjustWhite = defineAsyncComponent(() => import("./AdjustWhite.vue"));
const AdjustColor = defineAsyncComponent(() => import("./AdjustColor.vue"));
const AdjustFilters = defineAsyncComponent(() => import("./AdjustFilters.vue"));
const AdjustColorOverlay = defineAsyncComponent(() =>
  import("./AdjustColorOverlay.vue")
);
const AdjustMosaic = defineAsyncComponent(() => import("./AdjustMosaic.vue"));
const AdjustRuler = defineAsyncComponent(() => import("./AdjustRuler.vue"));

const activeCollapse = ref("");
const { state, setActiveTab } = useEditorState();
const canvasRef = inject("canvas");

// === 标尺面板关闭收口策略 ===
// 需求：只要“测量标尺”工具栏发生关闭（不论手动/自动/路由清空/切到其他 tab），
// 若当前标尺对象处于选中态，则清空选中态。
const clearRulerSelectionIfNeeded = () => {
  const canvas = canvasRef?.value;
  const activeObj = canvas?.getActiveObject?.();
  if (activeObj?.isRuler) {
    canvas.discardActiveObject();
    canvas.requestRenderAll();
  }
};

// 监听路由变化，自动展开对应面板
watch(
  () => state.activeTab,
  (newTab, oldTab) => {
    const validTabs = [
      "crop",
      "resize",
      "inpaint",
      "rembg",
      "ruler",
      "white",
      "color",
      "overlay",
      "filters",
      "mosaic",
    ];

    // ✅ 统一处理：ruler 面板关闭（oldTab===ruler 且 newTab!==ruler）就清选中
    if (oldTab === "ruler" && newTab !== "ruler") {
      clearRulerSelectionIfNeeded();
    }

    if (newTab && validTabs.includes(newTab)) {
      console.log("[AdjustPanel] Auto expanding:", newTab);
      activeCollapse.value = newTab;
    }
    // 当全局路由清空时，同步清空局部折叠状态
    else if (!newTab) {
      console.log("[AdjustPanel] Auto collapsing due to empty activeTab");
      activeCollapse.value = "";
    }
  },
  { immediate: true }
);

// 手动切换折叠状态
const toggle = (id) => {
  if (activeCollapse.value === id) {
    // 动作：手动关闭
    activeCollapse.value = "";

    if (state.activeTab === id) {
      // 手动关闭 ruler 同样走统一逻辑
      if (id === "ruler") {
        clearRulerSelectionIfNeeded();
      }
      setActiveTab("");
    }
  } else {
    // 动作：手动展开
    activeCollapse.value = id;
    setActiveTab(id);
  }
};
</script>
