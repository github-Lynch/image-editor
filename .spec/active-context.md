# Active Context & Development State

> **Version**: 2.3 (Object-Driven Navigation & Routing)
> **Last Updated**: 2025-12-23
> **Current Focus**: Global Navigation Architecture & Event-Driven UI, Fix Ruler Navigation

## 1. 当前开发状态 (Current Status)

### ✅ 已完成模块 (Completed Modules)

#### 1.1 核心编辑 (Core Editing)

- **剪裁 (Crop)**:
  - [x] **手动选区**: 实现了 `startManualSelection`，支持自定义框选区域。
  - [x] **比例锁定**: 支持原图比例、自由比例及常用预设 (1:1, 16:9 等)。
  - [x] **旋转翻转**: 90° 步进旋转与 XY 轴翻转。
- **尺寸调整 (Resize)**:
  - [x] **高清重制**: 引入 `useOffscreenHelper`，实现了基于原图分辨率的高清缩放。
  - [x] **保真模式**: 支持锁定长宽比计算。
  - [x] **通用锁集成**: 成功接入 `useCanvasLock`，解决了标尺在调整尺寸时仍可被选中的 Bug。
  - [x] **时序优化**: 通过 `nextTick` 解决了预览框创建导致的加锁失效问题。
- **补白 (White/Padding)**:
  - [x] **架构对齐**: 移除了模块内手动的 `originalSelectable` 逻辑，统一使用 `useCanvasLock`。
- **补白 (White/Padding)**:
  - [x] **社媒预设**: 集成 Instagram/Youtube 等常用尺寸模板。
  - [x] **智能吸色**: 支持背景色吸取及透明背景设置。


#### 1.2 拼图系统 (Puzzle System)

- **网格布局**:
  - [x] **动态模板**: 基于 `config.js` 实现了 1-16 张图片的网格布局解析。
  - [x] **自动布局**: 图片拖入自动计算 Cover 裁剪，保证填满格子不留白。
- **交互逻辑**:
  - [x] **拖拽交换**: 实现了平滑的交换动画 (`animateSwap`) 和失败回弹。
  - [x] **物理约束**: 应用 `useConstraint` 防止图片脱离格子可视区。
- **样式调整**:
  - [x] **全局参数**: 支持动态调整间距、边距和圆角。

#### 1.3 智能与特效 (AI & Effects)

- **智能消除 (Inpaint)**:
  - [x] **离屏遮罩**: 解决闪烁问题，通过离屏 Canvas 生成 Mask。
  - [x] **双模交互**: 支持画笔 (Brush) 和 矩形框选 (Rect)。
- **一键抠图 (Rembg)**:
  - [x] **API 集成**: 封装 `src/api/ai.js` 支持一键移除背景。
- **马赛克 (Mosaic)**:
  - [x] **无损处理**: 采用“预览层 + 离屏应用”策略。
- **滤镜与调色**:
  - [x] **ColorMatrix**: 实现亮度、对比度等 6 维调节。
  - [x] **LUT 模拟**: 内置“复古”、“电影”等滤镜预设。

#### 1.4 辅助工具与交互 (Tools & Interaction)

- **快捷键系统 (Shortcuts)**:
  - [x] **可视化面板**: 实现 Keycap 风格的侧边抽屉速查表 (`ShortcutsPanel`)。
  - [x] **通用操作**: 覆盖复制粘贴、图层移动、锁定等。
- **测量工具 (Measure)**:
  - [x] **精准路由**: 点击标尺组件自动跳转至 `Adjust -> Ruler` 面板。
  - [x] **交互绘制**: 支持拖拽创建测量线，自动计算长度。
- **交互优化 (Interaction Polish)**:
  - [x] **右键菜单**: 修复粘贴坐标偏移，实现基于鼠标位置的左上角对齐。
  - [x] **悬浮菜单**: 实现事件隔离，防止在悬浮条上操作时误触底层 Canvas。
  - [x] **剪贴板**: 重构为单例模式 (`clipboardState`)。

#### 1.5 全局导航系统 (Global Navigation System) `Major Upgrade`

- **对象驱动路由 (Object-Driven Routing)**:
  - [x] **智能分发**: 实现了 `useEditorState` 中的 `routeToObject`，根据 Canvas 选中对象自动切换 UI。
  - [x] **二级导航 (Level 2 Support)**: 支持精确跳转至特定折叠面板 (如 `Tool: Adjust` + `Tab: Ruler`)。
  - [x] **元数据注入 (Metadata Injection)**: 支持通过 `customTab` / `customTool` 属性覆盖默认路由行为。
  - [x] **Fix Ruler Navigation**: 修复点击标尺组件自动触发侧边栏跳转的 Bug。
  - [x] **Fix Ruler Selection Visibility**: 修复标尺跳转后因竞态条件导致自动进入绘制模式而丢失选区控制框的问题。
  - [x] **Fix Crop/Rotate Navigation**: 修复点击裁剪/旋转模块跳转到边框模块的 Bug。
- **视图解耦**:
  - [x] **状态监听**: 侧边栏组件 (`index.vue`) 通过 `watch` 监听全局路由状态自动展开对应模块。
  - [x] **去除残影**: 移除了未选中时的 Sidebar Disabled 状态，保持界面始终可用。

---

## 2. 系统架构备忘 (Architecture Memo)

### 2.1 高清离屏渲染管线 (High-Res Offscreen Pipeline)

> **Pattern**: `src/composables/useOffscreenHelper.js`

- **逻辑**: 获取原图原始分辨率 -> 创建临时 StaticCanvas -> 映射效果 -> 导出高清图。

### 2.2 物理约束系统 (Constraint System)

> **Pattern**: `src/composables/useConstraint.js`

- **逻辑**: 计算对象相对于容器的溢出值，Resizing 时实时修正，Puzzle 拖拽时触发回弹。

### 2.3 状态与快捷键 (State & Shortcuts)

- **State**: 使用 `useEditorState.js` (Reactive 单例) 管理全局状态。
- **Shortcuts**: 采用配置化策略，`ShortcutsPanel` UI 与 `useKeyboardShortcuts` 逻辑共用同一份配置源。

### 2.4 对象驱动路由架构 (Object-Driven Routing Architecture) `NEW`

> **Core Philosophy**: Canvas 是路由触发器，State 是控制器，Sidebar 是视图。

- **配置层 (Configuration)**:
  - `OBJECT_TO_TOOL_MAP` (in `useEditorState.js`): 定义类型到面板的映射 (e.g., `'i-text' -> { tool: 'text', tab: 'style' }`)。
- **感知层 (Sensor)**:
  - `useCanvas.js`: 监听 `mouse:up`, `selection:created`, `selection:updated`。
  - 过滤多选 (`activeSelection`) 和特殊对象，提取 `customTab` 信标。
- **注入层 (Injection)**:
  - 在创建特殊对象 (如标尺、素材) 时，注入 `{ customTab: 'ruler' }` 属性实现精确跳转。
- **视图层 (View)**:
  - 左侧菜单高亮 `state.activeTool`。
  - 二级面板 (如 AdjustPanel) 监听 `state.activeTab` 并自动展开对应模块。

### 2.4 通用物理锁 (Universal Physical Lock)
- **File**: `src/composables/useCanvasLock.js`
- **逻辑**: 遍历 `allObjects`，排除 `isMainImage`。通过 `WeakMap` 实现无损状态恢复。
### 2.5 强制类型安全原则 (Type Safety)

- **问题记录**：UI 输入控件（Slider/Input）绑定的响应式数据，在用户交互后会自动退化为 String 类型，导致数学计算（尤其是 + 运算）出错。

- **强制规范**：

    1. 在 Vue 模板中，所有数值型输入必须严格使用 v-model.number 修饰符。

    2. 在 JS 逻辑处理计算前，必须对所有来自 UI 的变量进行防御性转换，例如 Number(value) 或 parseFloat(value)。

    3. 禁止直接信任 UI 绑定的变量类型。

---

## 3. 故障排查与最佳实践 (Troubleshooting & Best Practices)

### 3.1 为什么通用锁 (useCanvasLock) 会失效？
在开发 `AdjustResize` 模块时，曾遇到通用锁失效的情况。复盘结论如下：
1.  **身份识别问题**: 模块内部找图用 `type === 'image'`，而通用锁用 `isMainImage`。若初始化时未补齐 `isMainImage` 属性，主图会被误锁。
2.  **异步竞态**: 标尺或预览对象在 `setBackgroundLock` 之后才渲染完成。
3.  **解决方案**: 
    - 初始化时显式设置 `mainImg.isMainImage = true`。
    - 采用“双重加锁”：模块 `init` 锁一次，`nextTick` (预览渲染后) 再锁一次。
