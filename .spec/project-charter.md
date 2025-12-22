# Project Charter: Image Editor SDK (大秘美图)

> **Version**: 3.5.0 (Final)
> **Last Updated**: 2025-12
> **Context**: High-performance Web Image Processing SDK

## 1. 项目愿景 (Vision)

构建一个**模块化、高性能**的 Web 端图像处理 SDK。核心架构采用“轻量级核心 (Core) + 功能插件化 (Modules)”的设计模式，支持从基础的裁剪旋转到复杂的 AI 消除、拼图和滤镜处理，确保在移动端和桌面端均有流畅的 Canvas 交互体验。

## 2. 技术栈与版本约束 (Tech Stack)

> ⚠️ **关键约束**：所有自动生成的代码必须严格遵守以下版本特性，严禁混用不同版本的 API。

- **Core Framework**: Vue 3.3+ (Composition API, `<script setup>`)
- **Graphics Engine**: **Fabric.js v5.3.0**
  - ❌ **严禁**: 使用 Fabric v6 的 `Canvas` 类名（v6 变更为 `Canvas`，v5 是 `fabric.Canvas`）或 v6 的 Promise-based 渲染方法。
  - ✅ **必须**: 使用 `new fabric.Canvas()`, `new fabric.Image.fromURL()` 等 v5 风格 API。
- **Build Tool**: Vite 7.x
- **State Management**: **Custom Reactive Singleton**
  - 本项目**未使用** Pinia/Vuex。
  - 全局状态必须通过 `src/composables/useEditorState.js` 管理。
- **Styling**: Standard CSS (BEM 命名规范) + Scoped CSS。

## 3. 架构设计规范 (Architecture)

### 3.1 目录与模块化标准 (The "Module Pattern")

项目采用**功能垂直分层**结构，所有独立业务功能（Feature）必须遵循此目录范式：

- **UI 组件**: `src/components/modules/{featureName}/index.vue` (负责 UI 交互，如滑块、按钮)。
- **逻辑 Hook**: `src/components/modules/{featureName}/useCanvas{FeatureName}.js` (负责 Fabric.js 对象操作)。
- **注册机制**: 必须在 `useCanvas.js` 或主组件中显式挂载逻辑，保持核心 `useCanvas` 的纯净。

### 3.2 状态管理与通信 (State & Events)

- **全局状态**: 仅通过 `useEditorState.js` 管理工具激活 (`activeTool`) 和历史状态 (`canUndo/Redo`)。
- **局部状态**: 具体的参数（如滤镜强度、画笔颜色）应保留在各自的 `useCanvas{Feature}.js` 闭包或 Vue 组件内部。
- **事件总线**: 使用 Fabric 自带的事件系统进行解耦通信：
  - **触发**: `canvas.value.fire('image:updated')` (用于通知滤镜重新计算预览等)。
  - **监听**: `canvas.on('image:updated', callback)`。

### 3.3 画布生命周期与性能 (Performance)

- **响应式陷阱 (Critical)**:
  - ✅ **必须**: 初始化 Canvas 时使用 `markRaw(new fabric.Canvas(...))`。
  - ❌ **严禁**: 将 Fabric 对象放入 `ref()` 或 `reactive()` 的深层代理中。Fabric 对象极其复杂，Vue 的深度代理会导致严重的性能卡顿甚至浏览器崩溃。
- **渲染循环**: 批量修改对象属性后，必须调用 `canvas.requestRenderAll()` 而非 `renderAll()`，以利用帧这一级的节流优化。

## 4. 通用资源与复用规范 (Shared Resources & Utilities)

> 🎯 **原则**: DRY (Don't Repeat Yourself)。**任何功能如果不依赖 `this`、Vue 实例或特定的 Canvas 对象，它就是一个工具函数，必须被提取。**

### 4.1 纯工具函数 (Pure Utils)

- **位置**: `src/utils/`
- **定义**: 纯 JavaScript 函数，**无状态**，不依赖 Vue 组件实例。
- **强制执行**:
  - ❌ **严禁**: 在 Vue 组件或 Composable 中直接编写复杂的辅助算法函数（如 HEX 转 RGB、距离计算）。
  - ✅ **必须**: 将其封装到 `src/utils/` 下的对应文件（如 `math.js`, `file.js`, `color.js`），并导出使用。
  - **现有资源**: 消息提示必须调用 `src/utils/toast.js`。

### 4.2 通用 UI 组件 (Common Components)

- **位置**: `src/components/common/`
- **定义**: 跨模块复用的“哑组件” (Dumb Components)，如弹窗 (Modal)、加载 Spinner、通用滑块。
- **约束**: 通用组件不应包含具体的 Canvas 业务逻辑，只通过 `props` 和 `emits` 通信。

### 4.3 核心逻辑复用 (Core Composables)

- **位置**: `src/composables/`
- **定义**: 涉及 Canvas 核心操作或全局编辑器状态的有状态逻辑。
- **现有资源**:
  - `useConstraint.js`: 拖拽限制逻辑。
  - `useOffscreenHelper.js`: 离屏渲染逻辑。
  - **规则**: 凡是涉及多个模块共享的**业务逻辑**（如“水印生成”、“离屏导出”），必须提升至此目录，禁止在模块间复制代码。

## 5. 核心功能实施标准 (Implementation Standards)

### 5.1 坐标系与缩放 (Coordinates)

- **逻辑坐标**: 所有的业务逻辑（如裁剪框位置、拼图网格）必须基于**原始图片尺寸**计算。
- **视图坐标**: 仅在视口变换（Zoom/Pan）时使用 `setViewportTransform`。
- **Zoom 限制**: 锁定在 `0.1` ~ `50` 之间，且必须保留 `ZOOM_PADDING = 0.921` 的安全边距。

### 5.2 历史记录 (History Stack)

- **快照策略**: 基于 `canvas.toJSON(['id', 'selectable', 'name'])`。
- **排除对象**: 辅助线、幽灵节点、裁剪框（type: 'rect' / 'crop-zone'）**不应**被计入历史记录堆栈。
- **触发时机**: 必须在 `object:modified` (用户操作结束) 时保存，严禁在 `object:moving` (拖拽中) 频繁保存。

### 5.3 AI 与异步任务 (Async & AI)

- **API 位置**: 所有后端交互封装在 `src/api/` 目录 (如 `src/api/ai.js`)。
- **Loading 状态**: 调用 AI 接口（如抠图、去噪）期间，必须通过 `useEditorState` 的 `setLoading(true)` 展示遮罩，并临时禁用 Canvas 交互，防止用户在处理期间进行画布操作。

## 6. UI/UX 设计规范 (Design System)

> 🎯 **原则**: 新增模块的 UI 必须与现有模块（如滤镜、裁剪）保持视觉统一。**严禁硬编码颜色值。**

### 6.1 色彩系统 (Color Palette)

所有组件必须使用 `src/style.css` 中定义的 CSS 变量：

- **主色调**: `var(--primary-color)` (通常为蓝色 #007bff)
- **背景色**:
  - 面板背景: `var(--panel-bg, #ffffff)`
  - 页面背景: `var(--app-bg, #1e1e1e)`
- **文本色**:
  - 标题: `var(--text-main, #333333)`
  - 次要/标签: `var(--text-sub, #666666)`
- **边框**: `var(--border-color, #e0e0e0)`

### 6.2 通用组件样式 (Standard UI Classes)

所有功能面板 (`.vue`) 必须复用以下标准类名，保持布局一致：

| 组件部分 | 标准类名 | 样式特征 |
| :--- | :--- | :--- |
| **面板容器** | `.tool-panel-content` | 统一的 Padding (16px) |
| **模块标题** | `.panel-title` | 14px, 600 weight, 底部 Margin |
| **控制组** | `.control-group` | 包含标签和控件的容器，底部 Margin (24px) |
| **属性行** | `.label-row` | Flex 布局 (两端对齐)，用于显示 "属性名 - 数值" |
| **主要按钮** | `.btn-primary` | 100% 宽度，主色背景，圆角 (4px) |
| **次要按钮** | `.btn-secondary` | 灰色背景/描边，用于取消或次要操作 |
| **滑动条** | `.slider-input` | 统一宽度的 range input |
| **数值输入框** | `.ie-input-number` | 固定宽 50px，高 28px，居中对齐，无原生箭头，常配合 Slider 使用 |

## 7. 开发工作流 (OpenSpec Workflow)

### 7.1 提议 (Proposal)

在开发新功能前，必须在 `.spec/proposals/` 下创建文档，并回答以下“灵魂三问”：

1.  **复用检查**: “我要写的这个辅助函数，`src/utils` 里有没有？UI 组件在 `common` 里有没有？”
2.  **UI 位置**: 在 `ToolPanel` 的哪个位置增加入口？
3.  **交互逻辑**: 拖入画布后的默认行为（居中？自动缩放？）。

### 7.2 实施检查清单 (The "Golden Checklist") [CRITICAL]

> 🛑 **Code Review 必过项**：生成代码前，必须作为最后一步逐一核对。

#### 🛡️ 稳定性与规范

- [ ] **Fabric 版本**: 确认使用的是 `new fabric.Canvas` (v5) 而非 `new Canvas` (v6)？
- [ ] **状态管理**: 确认**没有**引入 `pinia` 或 `vuex`？是否复用了 `useEditorState`？
- [ ] **性能安全**: `fabric.Canvas` 实例是否被 `markRaw()` 包装？（防止 Vue 深度代理导致卡顿）
- [ ] **渲染优化**: 是否使用了 `requestRenderAll()` 替代 `renderAll()`？

#### 🧩 复用与解耦

- [ ] **DRY (Utils)**: 是否有纯计算逻辑？如果有，是否提取到了 `src/utils/`？
- [ ] **DRY (UI)**: 错误提示是否调用了 `toast.js`？确认弹窗是否复用了 `Modal.vue`？
- [ ] **模块化**: 新增的 Fabric 操作逻辑是否封装在独立的 Hook 中，而不是塞进 `useCanvas.js`？

#### 🎨 UI/UX 一致性

- [ ] **色彩变量**: 确认代码中**不存在**十六进制颜色值 (如 `#007bff`)，而是使用了 `var(--primary-color)`？
- [ ] **标准类名**: 按钮是否使用了 `.btn-primary`？面板标题是否使用了 `.panel-title`？
- [ ] **异步反馈**: 调用 AI 或耗时操作前，是否调用了 `setLoading(true)`？
