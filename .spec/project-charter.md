# Project Charter: Image Editor SDK (大秘美图)

> **Version**: 3.8.0 (Integrated Edition)
> **Last Updated**: 2025-12-22
> **Context**: High-performance Web Image Processing SDK
> **Enforcement**: 此文档为最高准则，AI 生成代码必须严格查阅并遵循。

## 1. 项目愿景 (Vision)

构建一个**模块化、高性能**的 Web 端图像处理 SDK。核心架构采用“轻量级核心 (Core) + 功能插件化 (Modules)”的设计模式，支持从基础的裁剪旋转到复杂的 AI 消除、拼图和滤镜处理。

---

## 2. 技术栈与版本约束 (Tech Stack)

> ⚠️ **关键约束**：所有自动生成的代码必须严格遵守以下版本特性。

- **Core Framework**: Vue 3.3+ (Composition API, `<script setup>`)
- **Graphics Engine**: **Fabric.js v5.3.0** (Locked)
  - ❌ **严禁**: 使用 Fabric v6 的 `Canvas` 类名或 Promise-based 渲染。
  - ✅ **必须**: 使用 `new fabric.Canvas()` 等 v5 风格 API。
- **Build Tool**: Vite 7.x
- **Style System**: **Native CSS (Scoped) + CSS Variables**
  - **Color Source**: 遵循 SSOT 原则，颜色必须定义在 `src/config/theme.js`。
  - **Isolation**: 所有样式必须包裹在 `.image-editor-sdk-container` 作用域内。
- **State Management**: **Custom Reactive Singleton**
  - 必须保持响应性，严禁直接解构 State 对象。

---

## 3. 核心架构模式 (Core Architecture Patterns) `Critical`

### 3.1 颜色管理策略 (Color Strategy)

> **原则**: 解决 Canvas (JS) 与 UI (CSS) 颜色不同步问题。

1.  **真理源**: 所有颜色值定义在 `src/config/theme.js` 的 `THEME` 对象中。
2.  **注入机制**: App 挂载时 (`onMounted`)，必须调用 `applyTheme(containerRef)` 将 JS 变量注入为 CSS 变量。
3.  **使用规范**:
    - **UI (Vue/CSS)**: 使用 `var(--ie-primary-color)`。
    - **Canvas (JS)**: 引入 `THEME` 对象，使用 `THEME.colors.primary`。
    - **禁止**: 代码中出现 `#409eff` 等硬编码颜色。

### 3.2 高清离屏渲染 (Offscreen Rendering)

- 所有涉及**导出图片**或**生成 AI 遮罩**的操作，必须使用 `src/composables/useOffscreenHelper.js`，严禁直接对主 Canvas 进行 `toDataURL`。

### 3.3 模块通信 (Event Bus)

- 使用 Fabric Canvas 实例 (`canvas.fire`) 作为唯一事件总线。

---

## 4. 目录结构规范 (Directory Structure)

| 路径                      | 说明                 | 规则                                                                    |
| :------------------------ | :------------------- | :---------------------------------------------------------------------- |
| `src/components/modules/` | **独立功能模块**     | 包含完整业务逻辑 (UI + Canvas 交互)，如 `Crop/`, `Puzzle/`, `Filter/`。 |
| `src/components/tools/`   | **纯 Canvas 工具**   | 仅包含 Fabric.js 的自定义类或交互逻辑，如 `RulerTool.js`。              |
| `src/components/common/`  | **通用 UI 组件**     | 无业务逻辑的纯 UI，如 Slider, Button, Modal。                           |
| `src/composables/`        | **逻辑复用 (Hooks)** | 必须以 `use` 开头，如 `useKeyboardShortcuts.js`。                       |
| `src/config/`             | **静态配置**         | 快捷键定义、拼图模板数据、滤镜参数矩阵、`theme.js`。                    |

---

## 5. UI 开发规范 (UI Design System)

> **原则**: 使用 Scoped CSS 和 CSS 变量，统一视觉风格。

### 5.1 通用类名表 (Common Classes)

| 组件类型       | 类名 (Class Name)  | 样式特征 (Style Specs)                                               |
| :------------- | :----------------- | :------------------------------------------------------------------- |
| **面板容器**   | `.tool-panel`      | `bg: var(--panel-bg)`, 固定宽 280px，白底/深色模式适配，绝对定位右侧 |
| **面板标题**   | `.panel-title`     | 14px, 600 weight, 底部 Margin                                        |
| **控制组**     | `.control-group`   | 包含标签和控件的容器，底部 Margin (24px)                             |
| **属性行**     | `.label-row`       | Flex 布局 (两端对齐)，用于显示 "属性名 - 数值"                       |
| **主要按钮**   | `.btn-primary`     | 100% 宽度，`bg: var(--primary)`，圆角 (4px)                          |
| **次要按钮**   | `.btn-secondary`   | `border: var(--border)`，用于取消或次要操作                          |
| **滑动条**     | `.slider-input`    | 统一宽度的 range input                                               |
| **数值输入框** | `.ie-input-number` | 固定宽 50px，高 28px，居中对齐，无原生箭头，常配合 Slider 使用       |

---

## 6. 开发工作流 (OpenSpec Workflow)

### 6.1 提议 (Proposal)

在开发新功能前，必须在 `.spec/proposals/` 下创建文档，并回答以下“灵魂三问”：

1.  **复用检查**: “我要写的这个辅助函数，`src/utils` 里有没有？UI 组件在 `common` 里有没有？架构模式在 `Section 3` 里有没有？”
2.  **UI 位置**: 在 `ToolPanel` 的哪个位置增加入口？
3.  **交互逻辑**: 拖入画布后的默认行为（居中？自动缩放？）。

### 6.2 实施检查清单 (The "Golden Checklist") [CRITICAL]

- [ ] **Canvas 销毁**: 组件 `onUnmounted` 时是否注销了 fabric 事件监听？
- [ ] **状态清理**: 退出模块时，是否重置了 `activeTool` 和临时图层？
- [ ] **键盘安全**: 新增快捷键是否判断了 `document.activeElement` 以防止输入框冲突？
- [ ] **响应式检查**: 是否错误地使用了 `const { state } = useStore()` 导致响应性丢失？
- [ ] **颜色合规**: 检查代码中是否还残留 `#hex` 硬编码颜色？

---

## 7. 禁区 (Forbidden Zones)

1.  **DOM 操作**: 严禁使用 jQuery 操作 Canvas 内部。
2.  **重型计算**: 严禁在 `mousemove` 中直接运行高开销算法。
3.  **硬编码颜色**: 严禁写死颜色值，必须引用 `THEME` 或 CSS 变量。
