<template>
  <div class="panel-adjust">
    <div class="tool-list">
      <AdjustCrop
        :is-expanded="activeCollapse === 'crop'"
        @toggle="toggle('crop')"
      />
      <AdjustResize
        :is-expanded="activeCollapse === 'resize'"
        @toggle="toggle('resize')"
      />
      <AdjustInpaint
        :is-expanded="activeCollapse === 'inpaint'"
        @toggle="toggle('inpaint')"
      />
      <AdjustRembg
        :is-expanded="activeCollapse === 'rembg'"
        @toggle="toggle('rembg')"
      />

      <AdjustRuler
        :is-expanded="activeCollapse === 'ruler'"
        @toggle="toggle('ruler')"
      />

      <AdjustWhite
        :is-expanded="activeCollapse === 'white'"
        @toggle="toggle('white')"
      />
      <AdjustColor
        :is-expanded="activeCollapse === 'color'"
        @toggle="toggle('color')"
      />
      <AdjustColorOverlay
        :is-expanded="activeCollapse === 'overlay'"
        @toggle="toggle('overlay')"
      />
      <AdjustFilters
        :is-expanded="activeCollapse === 'filters'"
        @toggle="toggle('filters')"
      />
      <AdjustMosaic
        :is-expanded="activeCollapse === 'mosaic'"
        @toggle="toggle('mosaic')"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent, watch } from "vue";
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
// ✨ 获取 setActiveTab 方法
const { state, setActiveTab } = useEditorState();

// 监听路由变化，自动展开对应面板
watch(
  () => state.activeTab,
  (newTab) => {
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

    // 只有当 newTab 有效时才展开
    // 如果 newTab 被置空，这里不处理，由 toggle 逻辑接管
    if (newTab && validTabs.includes(newTab)) {
      console.log("[AdjustPanel] Auto expanding:", newTab);
      activeCollapse.value = newTab;
    }
  },
  { immediate: true }
);

// 手动切换折叠状态
const toggle = (id) => {
  if (activeCollapse.value === id) {
    // 动作：手动关闭
    activeCollapse.value = "";

    // ✨✨✨ 修复点：使用官方方法清理状态 ✨✨✨
    // 如果当前全局状态正指着这个面板，必须把它清理掉
    // 否则下次点击同一个物体时，状态从 'ruler' 变 'ruler'，watch 不会触发
    if (state.activeTab === id) {
      setActiveTab(""); // ✅ 合法修改，不会被 readonly 拦截
    }
  } else {
    // 动作：手动展开
    activeCollapse.value = id;
    // 保持同步
    setActiveTab(id);
  }
};
</script>
