<template>
  <div class="panel-content">
    <h3 style="margin: 20px 0;">文字工具</h3>
    <el-button style="width:100%" @click="addText">添加标题</el-button>
  </div>
</template>
<script setup>
import { inject } from 'vue';
const canvasAPI = inject('canvasAPI');
const addText = () => canvasAPI?.addText();
</script>