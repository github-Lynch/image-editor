# Feature Spec: High-Precision Ruler & Global Interaction System
# 功能确认书：高精标尺与通用交互系统

> **Version**: 1.0
> **Status**: Execution Phase 1 (Infrastructure)
> **Goal**: 建立以“对象”为中心的全局导航体验，并实现工程级测量标注。

## 1. 核心功能规格 (Core Specifications)

### 1.1 高精测量标尺 (Measurement Ruler)
* **定位**: 全局常驻的标注对象，数值与物理长度解耦（定标逻辑）。
* **交互**:
    * **创建模式**: 全屏锁定，拦截点击用于画线。
    * **编辑模式**: 选中后面板显示属性，支持端点/样式修改。
* **样式**: 提供“实心圆/箭头”预设，支持颜色、字号、背景自定义。

### 1.2 上下文感知导航 (Context-Aware Navigation)
* **智能路由**: 点击画布对象（标尺/文字/贴纸） -> 侧边栏自动跳转对应模块。
* **防误触**: 拖拽不跳转，仅纯点击（Click）跳转；多选不跳转。
* **全局开关**: 顶部 NavBar 增加标尺显隐按钮。

### 1.3 通用悬浮菜单 (Floating Object Menu)
* **形态**: HTML DOM 悬浮层，跟随选中对象移动。
* **功能**:
    * **通用**: 复制、删除、锁定、图层调整 (置顶/底/上/下)。
    * **扩展**: 提供 Slot 插槽，允许标尺（切换单位）或文字（编辑）插入特有按钮。

---

## 2. 实施路线图 (Implementation Roadmap)

### ✅ 阶段一：基础设施 (Infrastructure)
* [ ] `useObjectActions.js`: 封装通用的对象操作逻辑 (Copy/Paste/Lock/Layer)。
* [ ] `FloatingObjectMenu.vue`: 实现 DOM 跟随算法与通用 UI。
* [ ] `Workspace.vue`: 集成悬浮菜单。

### 📅 阶段二：标尺核心 (Ruler Core)
* [ ] `useCanvasRuler.js`: 标尺对象模型与绘制逻辑。
* [ ] `AdjustRuler.vue`: 标尺面板与预设系统。

### 📅 阶段三：全局集成 (Global Integration)
* [ ] `useCanvas.js`: 全局智能跳转侦听器。
* [ ] `NavBar.vue`: 全局标尺开关。