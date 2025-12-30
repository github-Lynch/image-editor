<template>
  <!-- 高清修复工具项 -->
  <div class="tool-group">
    <div
      class="tool-item"
      :class="{ 'is-expanded': isExpanded }"
      @click="$emit('toggle')"
    >
      <div class="left">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="margin-right: 8px"
        >
          <path
            d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"
          />
          <path d="M16 2v4" />
          <path d="M8 2v4" />
          <path d="M3 10h5" />
          <path d="M17.5 17.5 16 16.25V14" />
          <path d="M22 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
        </svg>
        <span>高清修复</span>
      </div>

      <div class="right-icon">
        <svg
          class="arrow"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>

    <!-- 高清修复选项面板 -->
    <div v-if="isExpanded" class="tool-content filter-panel">
      <div class="hd-option-item">
        <span>放大倍数</span>
        <select v-model="hdScale" class="hd-select">
          <option :value="2">2倍</option>
          <option :value="4">4倍</option>
        </select>
      </div>
      <button class="hd-process-btn" @click="processHDImage">
        {{ "开始处理" }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, inject, computed } from "vue";
import { removeBg } from "@/api/removeBgFetch";
import { hdRestore } from "@/api/hdRestoreFetch";
import { toast } from "@/utils/toast";
import { useEditorState } from "@/composables/useEditorState";

const canvasAPI = inject("canvasAPI");
const loading = ref(false);
const hdScale = ref(2);
const { setLoading } = useEditorState();
const props = defineProps({ isExpanded: Boolean });

// 处理高清图片
const processHDImage = async () => {
  const canvas = canvasAPI?.canvas.value;
  if (!canvas) {
    return toast.warning("画布未初始化");
  }

  // 1) 优先取当前选中的对象
  let activeObj = canvas.getActiveObject();

  // 2) 若未选中图片，则自动兜底选择主图
  if (!activeObj || activeObj.type !== "image") {
    const mainImage = canvas
      .getObjects()
      .find((o) => o?.isMainImage === true || o?.id === "main-image");

    if (!mainImage) {
      return toast.warning("请先选中一张图片，或确保画布中有主图");
    }

    canvas.setActiveObject(mainImage);
    activeObj = mainImage;
  }

  // 3) 最终兜底校验
  if (!activeObj || activeObj.type !== "image") {
    return toast.warning("请选择一个图片对象");
  }

  setLoading(true, "高清修复中...");

  try {
    // 导出当前图片为Blob
    const imageBlob = await exportImageBlob(activeObj);
    const imageFile = new File([imageBlob], "image-for-hd.png", {
      type: "image/png",
    });

    // 调用高清修复API
    const { url: hdImageUrl } = await hdRestore(imageFile, hdScale.value);

    // 直接覆盖原图，并传入 center: true 选项让其居中
    canvasAPI.replaceActiveImage(hdImageUrl, { center: true });
    toast.success("高清修复完成");
  } catch (error) {
    console.error("HD Remaster Error:", error);
    toast.error(`高清修复失败: ${error.message || "未知错误"}`);
  } finally {
    setLoading(false);
  }
};

// 导出图片为Blob的辅助函数
const exportImageBlob = async (imageObject) => {
  if (!imageObject || imageObject.type !== "image") {
    throw new Error("请选择有效的图片对象");
  }

  return new Promise((resolve, reject) => {
    const src = imageObject.getSrc();
    fabric.Image.fromURL(
      src,
      (img, isError) => {
        if (isError || !img) {
          return reject(new Error(`加载图片失败: ${src.substring(0, 100)}...`));
        }

        const tempCanvas = new fabric.StaticCanvas(null, {
          width: img.width,
          height: img.height,
        });

        // 应用滤镜（如果有）
        if (imageObject.filters?.length > 0) {
          img.filters = [...imageObject.filters];
          img.applyFilters();
        }

        tempCanvas.add(img);
        tempCanvas.renderAll();

        // 导出为Blob
        tempCanvas.getElement().toBlob(
          (blob) => {
            tempCanvas.dispose();
            if (!blob) {
              return reject(new Error("转换图片失败"));
            }
            resolve(blob);
          },
          "image/png",
          1 // 最高质量
        );
      },
      { crossOrigin: "anonymous" }
    );
  });
};
</script>

<style scoped>
.loading-icon {
  animation: rotating 1s linear infinite;
  color: var(--ie-primary-color);
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.filter-panel {
  padding: 16px;
}

.hd-option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.hd-select {
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--ie-border-color);
  background-color: var(--ie-bg-color);
  color: var(--ie-text-color);
  outline: none;
}

.hd-process-btn {
  height: 32px;
  width: 100%;
  padding: 6px 12px;
  background-color: var(--ie-primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.hd-process-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.hd-process-btn:disabled {
  background-color: var(--ie-disabled-bg);
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
