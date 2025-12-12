<template>
  <div class="panel-adjust">
    <div class="panel-title">调整</div>
    
    <div class="tool-list">
      
      <div class="tool-group">
        <div class="tool-header hover-only" @click="handleUpload">
          <div class="left">
            <el-icon><UploadFilled /></el-icon>
            <span>上传图片</span>
          </div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>

      <div class="tool-group">
        <div 
          class="tool-header" 
          :class="{ 'is-expanded': activeCollapse === 'crop' }"
          @click="toggleCollapse('crop')"
        >
          <div class="left">
            <el-icon><Crop /></el-icon>
            <span>裁剪/旋转</span>
          </div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>

        <div v-show="activeCollapse === 'crop'" class="tool-content">
          
          <div class="ratio-grid">
            <div class="ratio-item" @click="resetCrop">
              <div class="icon-box"><RefreshLeft /></div>
              <span>初始化</span>
            </div>
            
            <div class="ratio-item" @click="startCrop(null, true)"> <div class="shape-rect" style="width: 14px; height: 14px; border:1px solid #666"></div>
              <span>原比例</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio==='free'}" @click="startCrop(null)">
              <div class="shape-rect" style="width: 14px; height: 14px; border:1px dashed #409eff"></div>
              <span>自由比例</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio===1}" @click="startCrop(1)">
              <div class="shape-rect" style="width: 14px; height: 14px;"></div>
              <span>1:1</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio===3/2}" @click="startCrop(3/2)">
              <div class="shape-rect" style="width: 18px; height: 12px;"></div>
              <span>3:2</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio===2/3}" @click="startCrop(2/3)">
              <div class="shape-rect" style="width: 12px; height: 18px;"></div>
              <span>2:3</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio===4/3}" @click="startCrop(4/3)">
              <div class="shape-rect" style="width: 16px; height: 12px;"></div>
              <span>4:3</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio===3/4}" @click="startCrop(3/4)">
              <div class="shape-rect" style="width: 12px; height: 16px;"></div>
              <span>3:4</span>
            </div>

            <div class="ratio-item" :class="{active: currentRatio===16/9}" @click="startCrop(16/9)">
              <div class="shape-rect" style="width: 18px; height: 10px;"></div>
              <span>16:9</span>
            </div>
            
            <div class="ratio-item" :class="{active: currentRatio===9/16}" @click="startCrop(9/16)">
              <div class="shape-rect" style="width: 10px; height: 18px;"></div>
              <span>9:16</span>
            </div>
          </div>

          <div class="custom-size-box">
            <div class="input-row">
              <el-input-number 
                v-model="cropW" 
                :controls="false" 
                size="small" 
                class="size-input" 
                @change="updateCropSize"
              >
                <template #suffix>W</template>
              </el-input-number>
              
              <div class="link-icon">
                <el-icon><Link /></el-icon>
              </div>

              <el-input-number 
                v-model="cropH" 
                :controls="false" 
                size="small" 
                class="size-input"
                @change="updateCropSize"
              >
                <template #suffix>H</template>
              </el-input-number>
            </div>
          </div>

          <div class="rotate-actions">
            <el-tooltip content="向左旋转90°" placement="top">
              <div class="action-btn" @click="rotate(-90)"><el-icon><RefreshLeft /></el-icon></div>
            </el-tooltip>
            <el-tooltip content="向右旋转90°" placement="top">
              <div class="action-btn" @click="rotate(90)"><el-icon><RefreshRight /></el-icon></div>
            </el-tooltip>
            <div class="divider"></div>
            <el-tooltip content="水平翻转" placement="top">
              <div class="action-btn" @click="flip('X')"><el-icon><Switch /></el-icon></div>
            </el-tooltip>
            <el-tooltip content="垂直翻转" placement="top">
              <div class="action-btn" @click="flip('Y')"><el-icon><Sort /></el-icon></div>
            </el-tooltip>
          </div>

          <div class="confirm-row">
            <el-button type="primary" class="full-btn" @click="applyCrop">应用</el-button>
            <el-button class="full-btn" @click="cancelCrop">取消</el-button>
          </div>
        </div>
      </div>

      <div class="tool-group">
        <div class="tool-header" :class="{ 'is-expanded': activeCollapse === 'resize' }" @click="toggleCollapse('resize')">
          <div class="left">
            <el-icon><FullScreen /></el-icon>
            <span>调整尺寸</span>
          </div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
        
        <div v-show="activeCollapse === 'resize'" class="tool-content">
          <div class="size-inputs">
            <el-input v-model="resizeW" size="small" placeholder="宽">
              <template #suffix>px</template>
            </el-input>
            <div style="padding:0 8px; color:#999">×</div>
            <el-input v-model="resizeH" size="small" placeholder="高">
              <template #suffix>px</template>
            </el-input>
          </div>
          <el-button type="primary" size="small" style="width:100%; margin-top:10px">调整</el-button>
        </div>
      </div>

      <div class="tool-group">
        <div class="tool-header" :class="{ 'is-expanded': activeCollapse === 'inpaint' }" @click="toggleCollapse('inpaint')">
          <div class="left">
            <el-icon><EditPen /></el-icon>
            <span>消除笔</span>
          </div>
          <div v-if="store.isDrawing" class="status-dot"></div>
          <el-icon v-else class="arrow"><ArrowRight /></el-icon>
        </div>

        <div v-show="activeCollapse === 'inpaint'" class="tool-content">
          <div class="ai-tips">
            <el-icon color="#409eff"><InfoFilled /></el-icon>
            <span>涂抹画面中需要消除的人或物，AI 将自动填充背景。</span>
          </div>
          
          <div class="slider-row">
            <span class="label">笔刷大小</span>
            <el-slider v-model="brushSize" :min="5" :max="100" size="small" @input="updateBrush" />
          </div>

          <div class="confirm-row">
            <el-button size="small" class="full-btn" @click="toggleCollapse('')">取消</el-button>
            <el-button type="primary" size="small" class="full-btn" :loading="loading" @click="handleInpaintConfirm">
              开始消除
            </el-button>
          </div>
        </div>
      </div>

      <div class="tool-group">
        <div class="tool-header hover-only" @click="handleRembg">
          <div class="left">
            <el-icon><Scissor /></el-icon>
            <span>一键抠图</span>
          </div>
          <el-icon v-if="loading" class="is-loading"><Loading /></el-icon>
          <el-icon v-else class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>

      <div class="tool-group">
        <div class="tool-header hover-only" @click="notImplemented">
          <div class="left">
            <el-icon><MagicStick /></el-icon>
            <span>滤镜</span>
          </div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>

      <div class="tool-group">
        <div class="tool-header hover-only" @click="notImplemented">
          <div class="left">
            <el-icon><PictureFilled /></el-icon>
            <span>图片补白</span>
          </div>
          <el-icon class="arrow"><ArrowRight /></el-icon>
        </div>
      </div>

    </div>

    <input type="file" ref="fileInput" @change="onFileSelected" style="display:none" accept="image/*" />
  </div>
</template>

<script setup>
import { ref, inject, watch } from 'vue';
import { useEditorStore } from '../../stores/editorStore';
import { aiApi } from '../../api/ai';
import { 
  UploadFilled, Crop, FullScreen, EditPen, PictureFilled, Scissor, MagicStick, 
  ArrowRight, RefreshLeft, RefreshRight, Link, Switch, Sort, InfoFilled, Loading
} from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';

const store = useEditorStore();
const canvasAPI = inject('canvasAPI'); 
const loading = ref(false);
const fileInput = ref(null);

// 状态控制
const activeCollapse = ref(''); 
const currentRatio = ref('free'); // 当前选中的比例
const cropW = ref(1000);
const cropH = ref(1000);
const resizeW = ref(800);
const resizeH = ref(600);
const brushSize = ref(30);

// === 展开/折叠逻辑 ===
const toggleCollapse = (id) => {
  activeCollapse.value = activeCollapse.value === id ? '' : id;
};

watch(activeCollapse, (newVal) => {
  // 1. 消除笔逻辑
  if (newVal === 'inpaint') {
    store.toggleDrawing(true);
    canvasAPI?.toggleDrawing(true);
    updateBrush();
  } else {
    store.toggleDrawing(false);
    canvasAPI?.toggleDrawing(false);
  }

  // 2. 裁剪逻辑：面板关闭时取消裁剪
  if (newVal !== 'crop') {
    canvasAPI?.cancelCrop();
  } else {
    // 展开时默认进入自由裁剪模式
    startCrop(null);
  }
});

// === 裁剪核心逻辑 ===
const startCrop = (ratio, isOriginal = false) => {
  // 1. 设置当前选中的比例高亮状态
  currentRatio.value = ratio || 'free';
  if (isOriginal) currentRatio.value = 'original';

  if (!canvasAPI) return;

  // 2. 如果是“原比例”，我们需要计算当前图片的宽高比
  let targetRatio = ratio;
  if (isOriginal) {
    const activeObj = canvasAPI.canvas.value?.getActiveObject();
    if (activeObj && activeObj.type === 'image') {
      // 计算原图比例
      targetRatio = activeObj.width / activeObj.height;
    }
  }

  // 3. 调用 Canvas 方法生成裁剪框
  canvasAPI.startCrop(targetRatio);

  // 4. (可选) 更新输入框的值为当前裁剪框的大小
  const cropObj = canvasAPI.canvas.value?.getObjects().find(o => o.type === 'rect'); // 简单查找
  if (cropObj) {
    cropW.value = Math.round(cropObj.width);
    cropH.value = Math.round(cropObj.height);
  }
};

const updateCropSize = () => {
  // 当输入框数字改变时，更新画布上的裁剪框大小
  if (canvasAPI && canvasAPI.setCropBoxSize) {
    canvasAPI.setCropBoxSize(cropW.value, cropH.value);
  }
};

const applyCrop = () => {
  canvasAPI?.confirmCrop();
  activeCollapse.value = ''; // 收起面板
};

const cancelCrop = () => {
  canvasAPI?.cancelCrop();
  activeCollapse.value = ''; // 收起面板
};

const resetCrop = () => {
  // 重新初始化：默认进入自由模式
  startCrop(null);
  currentRatio.value = 'free';
};

// === 旋转/翻转 ===
const rotate = (angle) => {
  // 如果正在裁剪，通常旋转的是图片而不是裁剪框
  // 或者你希望旋转整个画布
  canvasAPI?.rotateActive(angle);
};

const flip = (axis) => {
  canvasAPI?.flipActive(axis);
};

// === 其他逻辑 (上传、AI) 保持不变 ===
const handleUpload = () => fileInput.value.click();
const onFileSelected = (e) => {
  const file = e.target.files?.[0];
  if (file) {
    canvasAPI?.addImage(URL.createObjectURL(file));
    e.target.value = '';
  }
};

const updateBrush = () => {
  if (canvasAPI?.canvas.value) {
    canvasAPI.canvas.value.freeDrawingBrush.width = brushSize.value;
  }
};

const handleInpaintConfirm = async () => {
  loading.value = true;
  canvasAPI?.toggleDrawing(false); 
  try {
    const maskDataUrl = canvasAPI.exportMask();
    const maskBlob = await (await fetch(maskDataUrl)).blob();
    const imageBlob = await (await fetch(canvasAPI.exportImg())).blob();
    const newUrl = await aiApi.inpaint(imageBlob, maskBlob);
    canvasAPI.replaceActiveImage(newUrl);
    canvasAPI.clearPaths();
    ElMessage.success('消除完成');
    toggleCollapse(''); 
  } catch (e) {
    console.error(e);
    ElMessage.error('消除失败');
    canvasAPI?.toggleDrawing(true);
  } finally {
    loading.value = false;
  }
};

const handleRembg = async () => {
  const activeObj = canvasAPI?.canvas.value?.getActiveObject();
  if (!activeObj || activeObj.type !== 'image') return ElMessage.warning('请先选中图片');
  loading.value = true;
  try {
    const src = activeObj.getSrc();
    const blob = await (await fetch(src)).blob();
    const newUrl = await aiApi.removeBackground(new File([blob], "img.png"));
    canvasAPI.replaceActiveImage(newUrl);
    ElMessage.success('抠图完成');
  } catch(e) {
    console.error(e);
    ElMessage.error('抠图失败');
  } finally {
    loading.value = false;
  }
};

const notImplemented = () => ElMessage.info('功能开发中');
</script>

<style scoped>
.panel-adjust {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  background-color: #fff;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.tool-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-group {
  border-radius: 8px;
  background-color: #f5f7fa;
  overflow: hidden;
  transition: all 0.3s;
}

/* 头部样式 */
.tool-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  color: #333;
  font-size: 14px;
  user-select: none;
  transition: background 0.2s;
}
.tool-header:hover { background-color: #e6e8eb; }
.tool-header.is-expanded { background-color: #e6f7ff; color: #409eff; }
.tool-header .left { display: flex; align-items: center; gap: 10px; }
.tool-header .el-icon { font-size: 18px; }
.arrow { font-size: 12px; color: #909399; transition: transform 0.3s; }
.is-expanded .arrow { transform: rotate(90deg); color: #409eff; }

/* 展开内容区 */
.tool-content {
  background-color: #fff;
  padding: 16px;
  border-top: 1px solid #eee;
  animation: slideDown 0.2s ease-out;
}

/* === 裁剪网格 (Grid Layout) === */
.ratio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3列 */
  gap: 8px;
  margin-bottom: 16px;
}

.ratio-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border: 1px solid #f2f2f2;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #666;
  background: #fff;
  transition: all 0.2s;
  height: 60px;
}

.ratio-item:hover {
  background-color: #f9f9f9;
  border-color: #dcdfe6;
}

.ratio-item.active {
  border-color: #409eff;
  color: #409eff;
  background-color: #ecf5ff;
}

.icon-box { font-size: 16px; margin-bottom: 6px; }
/* 用CSS画的小方块图标 */
.shape-rect { 
  border: 1px solid currentColor; 
  margin-bottom: 6px; 
  box-sizing: border-box;
}

/* === 自定义尺寸输入 === */
.custom-size-box {
  margin-bottom: 16px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
}
.input-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.size-input { width: 45%; }
.link-icon { color: #909399; cursor: pointer; }

/* === 旋转操作栏 === */
.rotate-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}
.action-btn {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  color: #606266;
  font-size: 18px;
  background-color: #f5f7fa;
  transition: all 0.2s;
}
.action-btn:hover { background-color: #e6e8eb; color: #333; }
.divider { width: 1px; height: 20px; background-color: #eee; }

/* 底部按钮 */
.confirm-row { display: flex; gap: 10px; }
.full-btn { flex: 1; }

/* 其他样式 */
.size-inputs { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; color: #999; }
.ai-tips {
  font-size: 12px; color: #e6a23c; background: #fdf6ec; padding: 8px; border-radius: 4px; margin-bottom: 12px; display: flex; gap: 6px;
}
.slider-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; font-size: 12px; color: #666; }
.slider-row .el-slider { flex: 1; }
.status-dot { width: 8px; height: 8px; background-color: #409eff; border-radius: 50%; }

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>