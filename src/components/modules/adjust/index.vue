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

      <AdjustRembg />

      <div class="tool-group">
        <div class="tool-item" @click="notImplemented">
          <div class="left"><el-icon><MagicStick /></el-icon><span>滤镜</span></div>
          <div class="right-icon"><el-icon class="arrow"><ArrowRight /></el-icon></div>
        </div>
      </div>

      <div class="tool-group">
        <div class="tool-item" @click="notImplemented">
          <div class="left"><el-icon><PictureFilled /></el-icon><span>图片补白</span></div>
          <div class="right-icon"><el-icon class="arrow"><ArrowRight /></el-icon></div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, defineAsyncComponent } from 'vue';
import { ElMessage } from 'element-plus';
import { MagicStick, PictureFilled, ArrowRight } from '@element-plus/icons-vue';

// 异步组件引入
const AdjustCrop = defineAsyncComponent(() => import('./AdjustCrop.vue'));
const AdjustResize = defineAsyncComponent(() => import('./AdjustResize.vue'));
const AdjustInpaint = defineAsyncComponent(() => import('./AdjustInpaint.vue'));
const AdjustRembg = defineAsyncComponent(() => import('./AdjustRembg.vue'));

const activeCollapse = ref(''); 

const toggle = (id) => {
  activeCollapse.value = activeCollapse.value === id ? '' : id;
};

const notImplemented = () => {
  ElMessage.info('功能开发中');
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

</style>