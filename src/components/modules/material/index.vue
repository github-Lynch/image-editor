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
    <div
      v-if="activeTab === 'template'"
      class="material-content"
    >
      <!-- 分类列表页面 -->
      <div
        v-if="!showCategoryDetail"
        class="categories-container"
      >
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
            >全部 ></span>
          </div>
          <div class="category-items">
            <div
              v-for="item in category.items"
              :key="item.id"
              class="material-item"
              @click="selectMaterial(item)"
            >
              <img
                :src="formatUrl(item.url)"
                :alt="item.name"
                class="material-image"
                @load="item.isLoading = false"
              />
              <div
                class="collect-icon"
                :class="{ 'filter-none': item.isCollect }"
                @click.stop="toggleCollect(item)"
              >
                ⭐
              </div>
              <div
                v-if="item.isLoading"
                class="loading-indicator"
              >
                <div class="spinner"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 分类详情页面 -->
      <div
        v-else
        class="category-detail"
      >
        <div class="detail-header">
          <span
            class="back-btn"
            @click="backToCategories"
          >{{ '<'
              }}
              {{
                currentCategory
              }}</span
            >
        </div>
        <div class="detail-items">
          <div
            v-for="item in templateTypeList"
            :key="item.id"
            class="material-item"
            @click="selectMaterial(item)"
          >
            <img
              :src="formatUrl(item.url)"
              :alt="item.name"
              class="material-image"
              @load="item.isLoading = false"
            />
            <div
              class="collect-icon"
              :class="{ 'filter-none': item.isCollect }"
              @click.stop="toggleCollect(item)"
            >
              ⭐
            </div>
            <div
              v-if="item.isLoading"
              class="loading-indicator"
            >
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最近 -->
    <div
      v-else-if="activeTab === 'latest'"
      class="material-content"
    >
      <div class="detail-items">
        <div
          v-for="item in latestList"
          :key="item.id"
          class="material-item"
          @click="selectMaterial(item)"
        >
          <img
            :src="formatUrl(item.url)"
            :alt="item.name"
            class="material-image"
            @load="item.isLoading = false"
          />
          <div
            class="collect-icon"
            :class="{ 'filter-none': item.isCollect }"
            @click.stop="toggleCollect(item)"
          >
            ⭐
          </div>
          <div
            v-if="item.isLoading"
            class="loading-indicator"
          >
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 收藏 -->
    <div
      v-else-if="activeTab === 'collect'"
      class="material-content"
    >
      <div class="detail-items">
        <div
          v-for="item in collectList"
          :key="item.id"
          class="material-item"
          @click="selectMaterial(item)"
        >
          <img
            :src="formatUrl(item.url)"
            :alt="item.name"
            class="material-image"
            @load="item.isLoading = false"
          />
          <div
            class="collect-icon"
            :class="{ 'filter-none': item.isCollect }"
            @click.stop="toggleCollect(item)"
          >
            ⭐
          </div>
          <div
            v-if="item.isLoading"
            class="loading-indicator"
          >
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的 -->
    <div
      v-else-if="activeTab === 'mine'"
      class="material-content"
    >
      <!-- 添加素材按钮 -->
      <div class="upload-section">
        <button
          class="upload-btn"
          @click="triggerFileUpload"
        >+添加素材</button>

        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          style="display: none;"
          @change="handleFileUpload"
        />
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
          <span>已选择{{ selectedIds.length }}条</span>
        </div>
        <div
          class="delete-btn"
          @click="del"
          :class="{ 'disabled': selectedIds.length === 0 }"
        >删除</div>
      </div>


      <!-- 素材列表 -->
      <div class="detail-items">
        <div
          v-for="item in mineList"
          :key="item.id"
          class="material-item"
          @click="addMaterial(formatUrl(item.url))"
        >
          <img
            :src="formatUrl(item.url)"
            :alt="item.name"
            class="material-image"
            @load="item.isLoading = false"
          />

          <!-- 选择框 -->
          <div
            class="selection-checkbox-default"
            @click.stop="toggleSelectItem(item.id)"
          ></div>
          <div
            v-if="selectedIds.includes(item.id)"
            class="selection-checkbox"
            @click.stop="toggleSelectItem(item.id)"
          >✔</div>

          <!-- 加载指示器 -->
          <div
            v-if="item.isLoading"
            class="loading-indicator"
          >
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, inject, onMounted, nextTick } from "vue";
  import { useEditorState } from "@/composables/useEditorState";
  import { registerMaterialModule, addMaterial } from "@/components/modules/material/useCanvasMaterial";
  import {
    templateListApi,
    templateTypeListApi,
    templateUseApi,
    latestListApi,
    collectListApi,
    addCollectApi,
    cancelCollectApi,
    createMaterialApi,
    delApi,
    mineListApi
  } from "@/api/material";

  // 获取canvasAPI实例
  const canvasAPI = inject('canvasAPI');

  onMounted(() => {
    getTemplateList();

    if (canvasAPI?.canvas) registerMaterialModule(canvasAPI.canvas, canvasAPI.saveHistory);
  });

  const { setActiveTab } = useEditorState();

  // Tab配置
  const tabs = [
    { key: 'template', label: '模板' },
    { key: 'latest', label: '最近' },
    { key: 'collect', label: '收藏' },
    { key: 'mine', label: '我的' }
  ];

  const activeTab = ref('template');

  // 切换Tab
  const switchTab = (tabKey) => {
    if (activeTab.value === tabKey) return;

    activeTab.value = tabKey;
    setActiveTab(tabKey);

    switch (tabKey) {
      case 'template':
        getTemplateList();
        break;
      case 'latest':
        getLatestList();
        break;
      case 'collect':
        getCollectList();
        break;
      case 'mine':
        getMineList();
        break;
      default:
        console.log('hi.. hello ?');
        break;
    }
  };

  // 处理图片 url
  const formatUrl = url => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    // start with '/profile/upload'
    return `/prod-api${url}`;
  };

  /** 模板 */
  const templateCategories = ref([]);

  // 控制分类详情页显示
  const showCategoryDetail = ref(false);
  const currentCategory = ref('');

  const categoryEnum = {
    1: '生日蛋糕',
    2: '生日帽',
    3: '圣诞节',
    4: '五彩纸屑',
    5: '容器',
    6: '新月',
    7: '烟花',
    8: '火焰',
    9: '礼品盒',
    10: '万圣节',
    11: 'Halloween~',
    12: '心',
    13: 'o-lantern',
    17: '销售',
  };
  // 模板列表
  const getTemplateList = async () => {
    templateCategories.value = [];
    const res = await templateListApi();

    if (res.code === 200) {
      const list = [];
      for (const key in res.data) {
        list.push({
          id: Number(key),
          name: categoryEnum[key],
          items: res.data[key].map(item => ({
            ...item,
            isCollect: item.state === 1,
            isLoading: true,
          }))
        });
      }

      templateCategories.value = list;
    }
  };

  // 全部 templateTypeListApi
  const templateTypeList = ref([]);

  // 模板类型列表
  const getTemplateTypeList = async templateType => {
    const res = await templateTypeListApi({ templateType });

    if (res.code === 200) {
      templateTypeList.value = res.data.map(item => ({
        ...item,
        isCollect: item.state === 1,
        isLoading: true,
      }));
    }
  };

  // 显示分类详情页
  const showCategoryDetailView = (category) => {
    showCategoryDetail.value = true;
    currentCategory.value = category.name;

    getTemplateTypeList(category.id);
  };

  // 返回分类列表
  const backToCategories = () => {
    showCategoryDetail.value = false;
    currentCategory.value = '';
    templateTypeList.value = [];
  };

  /** 最近 */
  const latestList = ref([]);

  // 最近列表
  const getLatestList = async () => {
    latestList.value = [];
    const res = await latestListApi();

    if (res.code === 200) {
      latestList.value = res.data.map(item => ({
        ...item,
        isCollect: item.state === 1,
        isLoading: true,
      }));
    }
  };

  /** 收藏 */
  const collectList = ref([]);

  // 收藏列表
  const getCollectList = async () => {
    collectList.value = [];
    const res = await collectListApi();

    if (res.code === 200) {
      collectList.value = res.data.map(item => ({
        ...item,
        isCollect: item.state === 1,
        isLoading: true,
      }));
    }
  };

  // 切换收藏状态
  const toggleCollect = (item) => {
    item.isCollect = !item.isCollect; // 前端效果

    const isLatest = activeTab.value === 'latest';
    const params = { id: item.id, isLatest };
    if (item.isCollect) {
      // 收藏
      addCollectApi(params);
    } else {
      // 取消收藏
      cancelCollectApi(params);
    }

    // 当前是 收藏 页，刷新收藏列表
    if (activeTab.value === 'collect') {
      getCollectList();
    }
  };

  /** 我的 */
  const mineList = ref([]);

  // 我的素材列表
  const getMineList = async () => {
    mineList.value = [];
    const res = await mineListApi();

    if (res.code === 200) {
      mineList.value = res.data.map(item => ({
        ...item,
        isLoading: true,
      }));
    }
  };

  // 文件输入引用
  const fileInput = ref(null);
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
      console.log('Uploading file:', file);

      // 添加素材图片到画布
      addMaterial(URL.createObjectURL(file));

      // 添加到我的素材列表
      createMaterialApi(file).then(res => {
        if (res.code === 200) {
          // 刷新我的素材列表
          getMineList();
        }
      });

      // 清空文件输入
      event.target.value = '';
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  // === 勾选 ===
  // 选中的素材
  const selectedIds = ref([]);

  // 全选状态计算属性
  const isAllSelected = computed(() => {
    return mineList.value.length > 0 && selectedIds.value.length === mineList.value.length;
  });

  // 切换全选
  const toggleSelectAll = () => {
    if (isAllSelected.value) {
      // 取消全选
      selectedIds.value = [];
    } else {
      // 全选所有素材
      selectedIds.value = [...mineList.value.map(item => item.id)];
    }
  };

  // 选择素材
  const selectMaterial = (material) => {
    // 添加素材图片到画布
    addMaterial(formatUrl(material.url));

    if (activeTab.value === 'mine') return;

    // 使用; 即添加到'最近'
    const isLatest = activeTab.value === 'latest';
    templateUseApi({ id: material.id, isLatest }).then(() => {
      if (activeTab.value === 'latest') {
        getLatestList();
      }
    });
  };

  // 切换选中状态
  const toggleSelectItem = (id) => {
    if (selectedIds.value.includes(id)) {
      selectedIds.value = selectedIds.value.filter(item => item !== id);
    } else {
      selectedIds.value.push(id);
    }
  };

  // 删除选中的素材
  const del = () => {
    if (selectedIds.value.length === 0) return;

    // 从我的素材列表中移除选中的项
    delApi({ ids: selectedIds.value.join(',') }).then(res => {
      if (res.code === 200) {
        // 刷新我的素材列表
        getMineList();
      }
    });

    // 清空选中列表
    selectedIds.value = [];
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

  .material-item:hover .collect-icon {
    opacity: 1;
  }

  .material-image {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .collect-icon {
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

  .collect-icon.filter-none {
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
    gap: 4px;
  }

  .select-all-checkbox {
    width: 17px;
    height: 17px;
    cursor: pointer;
    border-color: #999;
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
    border: 1px solid #d1d1d1;
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
