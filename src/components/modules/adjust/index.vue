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
import { ref, defineAsyncComponent } from 'vue';
import { toast } from '@/utils/toast';

// 异步组件引入
const AdjustCrop = defineAsyncComponent(() => import('./AdjustCrop.vue'));
const AdjustResize = defineAsyncComponent(() => import('./AdjustResize.vue'));
const AdjustInpaint = defineAsyncComponent(() => import('./AdjustInpaint.vue'));
const AdjustRembg = defineAsyncComponent(() => import('./AdjustRembg.vue'));
const AdjustWhite = defineAsyncComponent(() => import('./AdjustWhite.vue'));
const AdjustColor = defineAsyncComponent(() => import('./AdjustColor.vue'));
const AdjustFilters = defineAsyncComponent(() => import('./AdjustFilters.vue'));
const AdjustColorOverlay = defineAsyncComponent(() => import('./AdjustColorOverlay.vue'));
const AdjustMosaic = defineAsyncComponent(() => import('./AdjustMosaic.vue'));
const AdjustRuler = defineAsyncComponent(() => import('./AdjustRuler.vue'));

const activeCollapse = ref('');

const toggle = (id) => {
  activeCollapse.value = activeCollapse.value === id ? '' : id;
};

const notImplemented = () => {
  toast.info('功能开发中');
};
</script>

<style scoped>
.panel-adjust {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  background-color: #fff;
  box-sizing: border-box;
}
</style>