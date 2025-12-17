<template>
  <div class="panel-adjust">
    <div class="tool-list">

      <AdjustCrop :is-expanded="activeCollapse === 'crop'" @toggle="toggle('crop')" />

      <AdjustResize :is-expanded="activeCollapse === 'resize'" @toggle="toggle('resize')" />

      <AdjustInpaint :is-expanded="activeCollapse === 'inpaint'" @toggle="toggle('inpaint')" />

      <AdjustRembg :is-expanded="activeCollapse === 'rembg'" @toggle="toggle('rembg')" />

      <AdjustWhite :is-expanded="activeCollapse === 'white'" @toggle="toggle('white')" />

      <div class="tool-group">
        <div class="tool-item" @click="notImplemented">
          <div class="left">
            <svg width="18" height="18" viewBox="0 0 1024 1024" style="margin-right: 8px; fill: currentColor">
              <path
                d="M128.896 736H32a32 32 0 0 1 0-64h96.896a32 32 0 0 1 0 64zM480 864h-64a32 32 0 0 1 0-64h64a32 32 0 0 1 0 64zM320 544h-64a32 32 0 0 1 0-64h64a32 32 0 0 1 0 64zM160 352h-64a32 32 0 0 1 0-64h64a32 32 0 0 1 0 64z m558.144 266.112L453.696 353.664a32 32 0 0 0-45.248 0l-226.304 226.24a32 32 0 0 0 0 45.248l264.448 264.512a32 32 0 0 0 45.248 0l226.304-226.304a32 32 0 0 0 0-45.248zM921.152 250.56l-90.56-90.496a32 32 0 0 0-45.248 0l-90.496 90.496a32 32 0 0 0 0 45.248l90.496 90.56a32 32 0 0 0 45.248 0l90.56-90.56a32 32 0 0 0 0-45.248z" />
            </svg>
            <span>滤镜</span>
          </div>
          <div class="right-icon">
            <svg class="arrow" width="14" height="14" viewBox="0 0 1024 1024" style="fill: currentColor">
              <path
                d="M340.864 149.312a30.592 30.592 0 0 0 0 42.752L652.736 512 340.864 831.872a30.592 30.592 0 0 0 0 42.752 29.12 29.12 0 0 0 41.728 0L714.24 534.336a32 32 0 0 0 0-44.672L382.592 149.376a29.12 29.12 0 0 0-41.728 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- <div class="tool-group">
        <div class="tool-item" @click="notImplemented">
          <div class="left">
            <svg width="18" height="18" viewBox="0 0 1024 1024" style="margin-right: 8px; fill: currentColor">
              <path
                d="M96 896a32 32 0 0 1-32-32V160a32 32 0 0 1 32-32h832a32 32 0 0 1 32 32v704a32 32 0 0 1-32 32H96z m315.52-228.48l-68.928-114.88a32 32 0 0 0-54.784 0l-68.928 114.88L158.72 768h316.16l-60.16-100.48zM288 384a64 64 0 1 0 0-128 64 64 0 0 0 0 128z m261.12 216.96l-78.72-118.08a32 32 0 0 0-53.12 0l-78.72 118.08L483.2 697.6h126.72l-54.4-96.64z m208.64-106.88l-98.56-147.84a32 32 0 0 0-53.12 0l-98.56 147.84L652.8 697.6h209.92l-104.96-157.44z" />
            </svg>
            <span>图片补白</span>
          </div>
          <div class="right-icon">
            <svg class="arrow" width="14" height="14" viewBox="0 0 1024 1024" style="fill: currentColor">
              <path
                d="M340.864 149.312a30.592 30.592 0 0 0 0 42.752L652.736 512 340.864 831.872a30.592 30.592 0 0 0 0 42.752 29.12 29.12 0 0 0 41.728 0L714.24 534.336a32 32 0 0 0 0-44.672L382.592 149.376a29.12 29.12 0 0 0-41.728 0z" />
            </svg>
          </div>
        </div>
      </div> -->

    </div>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from 'vue';
import { Toast } from '@/utils/toast';

// 异步组件引入
const AdjustCrop = defineAsyncComponent(() => import('./AdjustCrop.vue'));
const AdjustResize = defineAsyncComponent(() => import('./AdjustResize.vue'));
const AdjustInpaint = defineAsyncComponent(() => import('./AdjustInpaint.vue'));
const AdjustRembg = defineAsyncComponent(() => import('./AdjustRembg.vue'));
const AdjustWhite = defineAsyncComponent(() => import('./AdjustWhite.vue'));
const activeCollapse = ref('');

const toggle = (id) => {
  activeCollapse.value = activeCollapse.value === id ? '' : id;
};

const notImplemented = () => {
  Toast.info('功能开发中');
};
</script>

<style scoped>
.panel-adjust {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #fff;
  box-sizing: border-box;
}

/* 简单的 hover 动画 */
.tool-item:hover .arrow {
  transform: translateX(2px);
  transition: transform 0.2s;
}
</style>