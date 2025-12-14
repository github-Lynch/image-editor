<template>
  <EditorLayout />
</template>

<script setup>
import EditorLayout from './components/layout/EditorLayout.vue';
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  /* 防止出现滚动条 */
}

#app {
  width: 100%;
  height: 100%;
}

.app-wrapper {
  width: 100vw;
  /* 强制视口宽度 */
  height: 100vh;
  /* 强制视口高度 */
  display: flex;
  flex-direction: column;
}
</style>