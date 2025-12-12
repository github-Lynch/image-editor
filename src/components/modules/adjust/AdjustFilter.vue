<template>
  <div class="tool-group">
    <div 
      class="tool-item" 
      :class="{ 'is-expanded': isExpanded }"
      @click="handleToggle"
    >
      <div class="left">
        <el-icon><EditPen /></el-icon>
        <span>滤镜</span>
      </div>
      <div class="right-icon">
        <el-icon class="arrow"><ArrowRight /></el-icon>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content">
      <div style="padding: 10px; color: #666; font-size: 14px;">
        滤镜功能区域...
      </div>
    </div>
  </div>
</template>

<script setup>
import { EditPen, ArrowRight } from '@element-plus/icons-vue';

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