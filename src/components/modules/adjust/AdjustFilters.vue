<template>
  <div class="tool-group">
    <div class="tool-item" :class="{ 'is-expanded': isExpanded }" @click="$emit('toggle')">
      <div class="left">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m19 2 2 2-2 2-2-2Z"/><path d="m13 2 2 2-2 2-2-2Z"/><path d="m6 6 2 2-2 2-2-2Z"/>
          <path d="m3 21 9-9"/><path d="M12.22 7.28a3 3 0 0 0-4.24 0L3.5 11.76a3 3 0 0 0 0 4.24l4.48 4.48a3 3 0 0 0 4.24 0l4.48-4.48a3 3 0 0 0 0-4.24Z"/>
        </svg>
        <span>滤镜效果</span>
      </div>
      <div class="right-icon">
        <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 18 6-6-6-6"/>
        </svg>
      </div>
    </div>

    <div v-if="isExpanded" class="tool-content filter-panel">
      <div v-for="cat in categories" :key="cat.name" class="filter-category">
        <div class="cat-title">{{ cat.name }}</div>
        <div class="filter-grid">
          <div 
            v-for="item in cat.list" 
            :key="item.key" 
            class="filter-item"
            :class="{ active: currentFilter === item.key }"
            @click="selectFilter(item.key)"
          >
            <div class="thumb-container">
              <img v-if="thumbnailMap[item.key]" :src="thumbnailMap[item.key]" class="filter-thumb">
              <div v-else class="thumb-placeholder loading"></div>
            </div>
            <span class="filter-label">{{ item.label }}</span>
          </div>
        </div>
      </div>

      <div class="intensity-box" v-if="currentFilter !== 'original'">
        <div class="label-row">
          <span>强度：{{ intensity }}</span>
        </div>
        <input type="range" v-model.number="intensity" min="0" max="100" class="ie-slider" @input="updateIntensity">
      </div>

      <div class="action-buttons">
        <button class="ie-btn ie-primary full" @click="handleConfirm">确定</button>
        <button class="ie-btn full" @click="handleCancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, inject, onMounted, watch } from 'vue';
import { 
    registerFilterModule, applyFilterPreset, loadThumbnailsTask, 
    backupCurrentFilters, commitFilterChange, cancelFilterChange 
} from './useCanvasFilters';

const props = defineProps({ isExpanded: Boolean });
const emit = defineEmits(['toggle']);
const canvasAPI = inject('canvasAPI');

const currentFilter = ref('original');
const intensity = ref(100);
const thumbnailMap = reactive({});

const categories = [
  { name: '基础', list: [{key:'original', label:'原图'}, {key:'natural', label:'自然'}, {key:'bright', label:'鲜亮'}, {key:'whitening', label:'净白'}] },
  { name: '复古', list: [{key:'v8090', label:'8090'}, {key:'modern', label:'摩登'}, {key:'cool_space', label:'烈空'}] },
  { name: '风景', list: [{key:'snow', label:'初雪'}, {key:'sunset', label:'垦丁'}, {key:'hot_sun', label:'烈日'}] },
  { name: '电影', list: [{key:'smoke', label:'尘烟'}, {key:'spring', label:'春风'}, {key:'lalaland', label:'爱乐之城'}] },
];

const selectFilter = (key) => {
  currentFilter.value = key;
  applyFilterPreset(key, intensity.value);
};

const updateIntensity = () => applyFilterPreset(currentFilter.value, intensity.value);

const handleConfirm = () => {
    commitFilterChange();
    emit('toggle');
};

const handleCancel = () => {
    cancelFilterChange();
    emit('toggle');
};

const refreshThumbnails = () => {
    loadThumbnailsTask((map) => Object.assign(thumbnailMap, map));
};

// 核心优化：仅在面板展开时监听，并执行备份
watch(() => props.isExpanded, (expanded) => {
    const canvas = canvasAPI?.canvas?.value;
    const bgImage = canvas?.getObjects().find(o => o.type === 'image');
    
    if (expanded && bgImage) {
        // ✅ 1. 展开瞬间，根据图片上存储的元数据同步 UI 高亮和强度
        currentFilter.value = bgImage._lastFilterKey || 'original';
        intensity.value = bgImage._lastFilterIntensity ?? 100;

        // 2. 执行备份逻辑 (用于取消回滚)
        backupCurrentFilters(); 
        
        // 3. 加载缩略图及注册监听
        refreshThumbnails();
        canvas.on('image:updated', refreshThumbnails);
    } else if (!expanded && canvas) {
        canvas.off('image:updated', refreshThumbnails);
    }
});

onMounted(() => {
    if (canvasAPI?.canvas) registerFilterModule(canvasAPI.canvas, canvasAPI.saveHistory);
});
</script>

<style scoped>
/* 样式保留原有的网格布局和主题色定义 */
.filter-panel { padding: 12px; max-height: 520px; overflow-y: auto; }
.cat-title { font-size: 13px; font-weight: bold; margin: 12px 0 8px; color: #333; }
.filter-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.filter-item { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.thumb-container { width: 70px; height: 70px; border-radius: 4px; overflow: hidden; border: 2px solid transparent; transition: 0.2s; background: #eee; }
.filter-thumb { width: 100%; height: 100%; object-fit: cover; }
.thumb-placeholder.loading { width: 100%; height: 100%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading-skeleton 1.5s infinite; }
@keyframes loading-skeleton { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.filter-item.active .thumb-container { border-color: var(--ie-primary-color); }
.filter-label { font-size: 11px; margin-top: 6px; color: #666; }
.intensity-box { margin-top: 20px; padding: 12px 0; border-top: 1px solid #f0f0f0; }
.label-row { display: flex; justify-content: space-between; font-size: 12px; color: #606266; margin-bottom: 8px; }
.action-buttons { display: flex; gap: 10px; margin-top: 16px; }
.full { flex: 1; }
</style>