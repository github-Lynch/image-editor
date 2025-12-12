<template>
  <div class="tool-group">
    <div 
      class="tool-item" 
      :class="{ 'is-expanded': isExpanded }"
      @click="handleToggle"
    >
      <div class="left">
        <el-icon><Rank /></el-icon>
        <span>调整尺寸</span>
      </div>
      <div class="right-icon">
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      <div style="padding: 10px; color: #666; font-size: 14px;">
        尺寸调整功能开发中...
      </div>
    </div>
  </div>
</template>

<script setup>
import { Rank, ArrowRight } from '@element-plus/icons-vue';

// 接收父组件传递的展开状态
const props = defineProps({
  isExpanded: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['toggle']);

const handleToggle = () => {
  emit('toggle');
};
</script>