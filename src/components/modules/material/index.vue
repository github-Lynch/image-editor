<template>
  <div class="panel-material">
    <!-- Tab导航 -->
    <div class="material-tabs">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-item"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </div>
    </div>

    <!-- 模板Tab内容 -->
    <div v-if="activeTab === 'template'" class="material-content">
      <!-- 分类列表页面 -->
      <div v-if="!showCategoryDetail" class="categories-container">
        <div
          v-for="category in templateCategories"
          :key="category.id"
          class="material-category"
        >
          <div class="category-header">
            <span class="category-title">{{ category.name }}</span>
            <span
              class="category-more"
              @click="showCategoryDetailView(category)"
              >全部 ></span
            >
          </div>
          <div class="category-items">
            <div
              v-for="item in category.items"
              :key="item.id"
              class="material-item"
              @click="selectMaterial(item)"
            >
              <img
                :src="item.image"
                :alt="item.name"
                class="material-image"
                @load="item.isLoading = false"
              />
              <div
                class="favorite-icon"
                :class="{ 'filter-none': item.isFavorite }"
                @click.stop="toggleFavorite(item)"
              >
                ⭐
              </div>
              <div v-if="item.isLoading" class="loading-indicator">
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分类详情页面 -->
      <div v-else class="category-detail">
        <div class="detail-header">
          <span class="back-btn" @click="backToCategories"
            >{{ "<" }} {{ currentCategory?.name }}</span
          >
        </div>
        <div class="detail-items">
          <div
            v-for="item in currentCategory?.items"
            :key="item.id"
            class="material-item"
            @click="selectMaterial(item)"
          >
            <img
              :src="item.image"
              :alt="item.name"
              class="material-image"
              @load="item.isLoading = false"
            />
            <div
              class="favorite-icon"
              :class="{ 'filter-none': item.isFavorite }"
              @click.stop="toggleFavorite(item)"
            >
              ⭐
            </div>
            <div v-if="item.isLoading" class="loading-indicator">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近 -->
    <div v-else-if="activeTab === 'recent'" class="material-content">
      <div class="detail-items">
        <div
          v-for="item in templateCategories[0].items"
          :key="item.id"
          class="material-item"
          @click="selectMaterial(item)"
        >
          <img
            :src="item.image"
            :alt="item.name"
            class="material-image"
            @load="item.isLoading = false"
          />
          <div
            class="favorite-icon"
            :class="{ 'filter-none': item.isFavorite }"
            @click.stop="toggleFavorite(item)"
          >
            ⭐
          </div>
          <div v-if="item.isLoading" class="loading-indicator">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏 -->
    <div v-else-if="activeTab === 'favorite'" class="material-content">
      <div class="detail-items">
        <div
          v-for="item in templateCategories[0].items"
          :key="item.id"
          class="material-item"
          @click="selectMaterial(item)"
        >
          <img
            :src="item.image"
            :alt="item.name"
            class="material-image"
            @load="item.isLoading = false"
          />
          <div
            class="favorite-icon"
            :class="{ 'filter-none': item.isFavorite }"
            @click.stop="toggleFavorite(item)"
          >
            ⭐
          </div>
          <div v-if="item.isLoading" class="loading-indicator">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的 -->
    <div v-else-if="activeTab === 'mine'" class="material-content">
      <!-- 添加素材按钮 -->
      <div class="upload-section">
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleFileUpload"
        />
        <button class="upload-btn" @click="triggerFileUpload">+添加素材</button>
      </div>

      <!-- 选择状态和删除按钮 -->
      <div class="selection-bar">
        <div class="selection-info">
          <input
            type="checkbox"
            class="select-all-checkbox"
            :checked="isAllSelected"
            @change="toggleSelectAll"
          />
          <span>已选择{{ selectedItems.length }}条</span>
        </div>
        <div
          class="delete-btn"
          @click="deleteSelectedItems"
          :class="{ disabled: selectedItems.length === 0 }"
        >
          删除
        </div>
      </div>

      <!-- 素材列表 -->
      <div class="detail-items">
        <div v-for="item in myMaterials" :key="item.id" class="material-item">
          <img
            :src="item.image"
            :alt="item.name"
            class="material-image"
            @load="item.isLoading = false"
          />

          <!-- 选择框 -->
          <div
            class="selection-checkbox-default"
            @click="toggleSelectItem(item)"
          ></div>
          <div
            class="selection-checkbox"
            v-if="selectedItems.includes(item)"
            @click="toggleSelectItem(item)"
          >
            ✔
          </div>

          <!-- 加载指示器 -->
          <div v-if="item.isLoading" class="loading-indicator">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useEditorState } from "@/composables/useEditorState";

const { setActiveTab } = useEditorState();

// Tab配置
const tabs = [
  { key: "template", label: "模板" },
  { key: "recent", label: "最近" },
  { key: "favorite", label: "收藏" },
  { key: "mine", label: "我的" },
];

const activeTab = ref("template");

// 我的素材
const myMaterials = ref([
  // 初始模拟数据
  {
    id: 1001,
    name: "我的素材1",
    image: "https://picsum.photos/seed/mymaterial1/100/100",
    isLoading: true,
  },
  {
    id: 1002,
    name: "我的素材2",
    image: "https://picsum.photos/seed/mymaterial2/100/100",
    isLoading: true,
  },
  {
    id: 1003,
    name: "我的素材3",
    image: "https://picsum.photos/seed/mymaterial3/100/100",
    isLoading: true,
  },
]);

// 选中的素材
const selectedItems = ref([]);

// 文件输入引用
const fileInput = ref(null);

// 全选状态计算属性
const isAllSelected = computed(() => {
  return (
    myMaterials.value.length > 0 &&
    selectedItems.value.length === myMaterials.value.length
  );
});

// 切换全选
const toggleSelectAll = () => {
  if (isAllSelected.value) {
    // 取消全选
    selectedItems.value = [];
  } else {
    // 全选所有素材
    selectedItems.value = [...myMaterials.value];
  }
};

// 切换Tab
const switchTab = (tabKey) => {
  activeTab.value = tabKey;
  setActiveTab(tabKey);
};

// 模板分类数据
const templateCategories = ref([
  {
    id: 1,
    name: "生日蛋糕",
    items: [
      {
        id: 101,
        name: "蛋糕1",
        image: "https://picsum.photos/seed/cake1/100/100",
        isFavorite: false,
        isLoading: true,
      },
      {
        id: 102,
        name: "蛋糕2",
        image: "https://picsum.photos/seed/cake2/100/1002",
        isFavorite: false,
        isLoading: true,
      },
      {
        id: 103,
        name: "蛋糕3",
        image: "https://picsum.photos/seed/cake3/100/100",
        isFavorite: true,
        isLoading: true,
      },
    ],
  },
  {
    id: 2,
    name: "生日帽",
    items: [
      {
        id: 201,
        name: "帽子1",
        image: "https://picsum.photos/seed/hat1/100/100",
        isFavorite: false,
        isLoading: true,
      },
      {
        id: 202,
        name: "帽子2",
        image: "https://picsum.photos/seed/hat2/100/100",
        isFavorite: false,
        isLoading: true,
      },
      {
        id: 203,
        name: "帽子3",
        image: "https://picsum.photos/seed/hat3/100/100",
        isFavorite: false,
        isLoading: true,
      },
    ],
  },
  {
    id: 3,
    name: "圣诞节",
    items: [
      {
        id: 301,
        name: "圣诞装饰1",
        image: "https://picsum.photos/seed/christmas1/100/100",
        isFavorite: false,
        isLoading: true,
      },
      {
        id: 302,
        name: "圣诞装饰2",
        image: "https://picsum.photos/seed/christmas2/100/100",
        isFavorite: false,
        isLoading: true,
      },
    ],
  },
]);

// 控制分类详情页显示
const showCategoryDetail = ref(false);
const currentCategory = ref(null);

// 选择素材
const selectMaterial = (material) => {
  // 这里需要实现添加素材到画布的逻辑
};

// 切换收藏状态
const toggleFavorite = (material) => {
  material.isFavorite = !material.isFavorite;
};

// 显示分类详情页
const showCategoryDetailView = (category) => {
  showCategoryDetail.value = true;
  currentCategory.value = category;
};

// 返回分类列表
const backToCategories = () => {
  showCategoryDetail.value = false;
  currentCategory.value = null;
};

// 触发文件上传
const triggerFileUpload = () => {
  fileInput.value?.click();
};

// 处理文件上传
const handleFileUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    // 这里是模拟上传，实际项目中需要调用后端接口

    // 模拟上传成功，创建一个新的素材项
    const newMaterial = {
      id: Date.now(), // 使用时间戳作为临时ID
      name: file.name,
      image: URL.createObjectURL(file), // 创建本地URL用于预览
      isLoading: false,
    };

    // 添加到我的素材列表
    myMaterials.value.unshift(newMaterial);

    // 清空文件输入
    event.target.value = "";
  } catch (error) {
    console.error("File upload failed:", error);
  }
};

// 切换选中状态
const toggleSelectItem = (item) => {
  const index = selectedItems.value.indexOf(item);
  if (index > -1) {
    selectedItems.value.splice(index, 1);
  } else {
    selectedItems.value.push(item);
  }
};

// 删除选中的素材
const deleteSelectedItems = () => {
  if (selectedItems.value.length === 0) return;

  // 从我的素材列表中移除选中的项
  myMaterials.value = myMaterials.value.filter(
    (item) => !selectedItems.value.includes(item)
  );

  // 清空选中列表
  selectedItems.value = [];
};
</script>

<style scoped>
.panel-material {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--ie-bg-color);
  color: var(--ie-text-color);
}

.material-tabs {
  display: flex;
  border: 1px solid var(--ie-primary-color);
  border-radius: 4px;
  overflow: hidden;
  margin: 16px;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
}

.tab-item.active {
  background-color: var(--ie-primary-color);
  color: #fff;
}

.material-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}

.material-category {
  margin-bottom: 24px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.category-title {
  font-size: 16px;
  font-weight: 500;
}

.category-more {
  font-size: 12px;
  color: #999;
  cursor: pointer;
}

.category-items {
  display: grid;
  grid-template-columns: repeat(3, 81px);
  grid-auto-rows: 81px;
  gap: 12px;
}

.material-item {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  border: 1px solid var(--ie-border-color);
}

.material-item:hover {
  border-color: var(--ie-primary-color);
}

.material-item:hover .favorite-icon {
  opacity: 1;
}

.material-image {
  width: 100%;
  height: 100%;
  display: block;
}

.favorite-icon {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  font-size: 16px;
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  filter: grayscale(0.9);
  transition: all 0.3s;
}

.favorite-icon.filter-none {
  filter: none;
}

/* Loading indicator styles */
.loading-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(64, 158, 255, 0.2);
  border-top-color: var(--ie-primary-color);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #999;
  font-size: 14px;
}

/* 分类详情页样式 */
.category-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  padding: 12px 4px;
  margin-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.back-btn {
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  align-items: center;
}

.detail-items {
  display: grid;
  grid-template-columns: repeat(3, 81px);
  grid-auto-rows: 81px;
  gap: 12px;
  flex: 1;
  overflow-y: auto;
}

/* 我的素材页样式 */
.upload-section {
  margin-bottom: 16px;
  text-align: center;
}

.upload-btn {
  width: 100%;
  padding: 12px;
  border: 1px dashed var(--ie-primary-color);
  border-radius: 8px;
  background-color: transparent;
  color: var(--ie-primary-color);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-btn:hover {
  background-color: rgba(64, 158, 255, 0.1);
}

.selection-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  margin-bottom: 12px;
  font-size: 14px;
  color: #333;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.select-all-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.delete-btn {
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
}

.delete-btn.disabled {
  color: #ccc;
  cursor: not-allowed;
  background-color: transparent;
}

/* 选择框样式 */
.selection-checkbox-default {
  display: none;
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background-color: white;
  border-radius: 4px;
  cursor: pointer;
}

.material-item:hover .selection-checkbox-default {
  display: block;
}

.selection-checkbox {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background-color: var(--ie-primary-color);
  color: white;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}
</style>
