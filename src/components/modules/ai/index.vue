<template>
  <div class="panel-ai">
    <div class="tool-group">
      <div
        class="tool-item"
        :class="{ 'is-expanded': isExpanded }"
        @click="handleToggle"
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
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span>图片翻译</span>
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
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </div>
      </div>

      <div v-if="isExpanded" class="tool-content">
        <div class="control-group">
          <label class="control-label">源语言</label>
          <select v-model="sourceLanguage" class="ie-select">
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
        </div>

        <div class="control-group">
          <label class="control-label">目标语言</label>
          <select v-model="targetLanguage" class="ie-select">
            <option value="ru">俄语</option>
          </select>
        </div>

        <div class="confirm-row">
          <button class="ie-btn ie-primary full-btn" @click="handleTranslate">
            立即翻译
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from "vue";
import { aiApi } from "@/api/ai";

const isExpanded = ref(false);
const sourceLanguage = ref("zh");
const targetLanguage = ref("ru");
const canvasAPI = inject("canvasAPI");

const handleToggle = () => {
  isExpanded.value = !isExpanded.value;
};

const handleTranslate = async () => {
  // 从canvasAPI获取画布实例
  const canvas = canvasAPI?.canvas.value;
  if (!canvas) return console.error("Canvas实例不存在");

  // Canvas内容转File
  const dataURL = canvas.toDataURL("image/png");
  const blob = await (await fetch(dataURL)).blob();
  const file = new File([blob], "canvas-image.png", { type: "image/png" });

  // 语言参数
  const languageParams = {
    sourceLanguage: sourceLanguage.value,
    targetLanguage: targetLanguage.value,
  };

  try {
    const res = await aiApi.imageTranslate(file, languageParams);
    // 清除画布上所有元素并替换为翻译结果图片
    if (res.data[0].newImage && canvasAPI.initImage) {
      canvasAPI.initImage(res.data[0].newImage);
    }
  } catch (error) {
    console.error("图片翻译失败:", error);
  }
};
</script>

<style scoped>
.panel-ai {
  padding: 10px;
}

.tool-group {
  margin-bottom: 12px;
}

.tool-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.tool-item .left {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
}

.right-icon {
  display: flex;
  align-items: center;
}

.right-icon .arrow {
  transition: transform 0.2s;
}

.tool-content {
  padding: 16px;
  background-color: #fff;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  margin-top: 4px;
}

.control-group {
  margin-bottom: 20px;
}

.control-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.ie-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  color: #606266;
  background-color: #fff;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.ie-select:focus {
  outline: none;
  border-color: var(--ie-primary-color);
}

.confirm-row {
  margin-top: 24px;
}

.full-btn {
  width: 100%;
}

.ie-btn {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ie-btn.ie-primary {
  background-color: var(--ie-primary-color);
  color: white;
}
</style>
