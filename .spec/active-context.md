# Active Context & Development State

> **Version**: 2.0 (Codebase Sync)
> **Last Updated**: 2025-12-22
> **Current Focus**: Global Interaction Polish & Text/Draw Modules

## 1. 当前开发状态 (Current Status)

### ✅ 已完成模块 (Completed Modules)

#### 1.1 核心编辑 (Core Editing)

- **剪裁 (Crop)**:
  - [x] **手动选区**: 实现了 `startManualSelection`，支持自定义框选区域。
  - [x] **比例锁定**: 支持原图比例、自由比例及常用预设 (1:1, 16:9 等)。
  - [x] **旋转翻转**: 90° 步进旋转与 XY 轴翻转。
- **尺寸调整 (Resize)**:
  - [x] **高清重制**: 引入 `useOffscreenHelper`，实现了基于原图分辨率的高清缩放，而非简单的 Canvas 缩放。
  - [x] **保真模式**: 支持锁定长宽比计算。
- **补白 (White/Padding)**:
  - [x] **社媒预设**: 集成 Instagram/Youtube 等常用尺寸模板。
  - [x] **智能吸色**: 支持背景色吸取及透明背景设置。

#### 1.2 拼图系统 (Puzzle System) `Major Feature`

- **网格布局**:
  - [x] **动态模板**: 基于 `config.js` 实现了 1-16 张图片的网格布局解析 (`parseTemplateToCells`)。
  - [x] **自动布局**: 图片拖入自动计算 Cover 裁剪，保证填满格子不留白。
- **交互逻辑**:
  - [x] **拖拽交换**: 实现了平滑的交换动画 (`animateSwap`) 和失败回弹 (`animateRebound`)。
  - [x] **物理约束**: 在网格内缩放/移动图片时，应用 `useConstraint` 防止图片脱离格子可视区。
- **样式调整**:
  - [x] **全局参数**: 支持动态调整间距 (Spacing)、边距 (Padding) 和圆角 (Radius)。

#### 1.3 智能与特效 (AI & Effects)

- **智能消除 (Inpaint)**:
  - [x] **离屏遮罩**: 解决了涂抹时的闪烁问题，通过离屏 Canvas 生成纯黑白 Mask 传给后端。
  - [x] **双模交互**: 支持画笔涂抹 (Brush) 和 矩形框选 (Rect) 两种触发方式。
- **一键抠图 (Rembg)**:
  - [x] **API 集成**: 封装了 `src/api/ai.js`，支持一键移除背景。
- **马赛克 (Mosaic)**:
  - [x] **无损处理**: 采用“预览层 + 离屏应用”策略，确保马赛克应用到原图时依然清晰。
- **滤镜与调色**:
  - [x] **ColorMatrix**: 实现了亮度、对比度、饱和度、色温等 6 维调节。
  - [x] **LUT 模拟**: 内置了“复古”、“电影”等 4 大类滤镜预设。

#### 1.4 辅助工具 (Tools & Helpers)

- **测量标尺 (Ruler)**:
  - [x] **交互绘制**: 支持拖拽创建测量线，自动计算长度。
  - [x] **单位系统**: 支持 px, cm, mm, inch 等多单位实时转换。
- **快捷键 (Shortcuts)**:
  - [x] **可视化面板**: 实现了 Keycap 风格的快捷键速查表。
  - [x] **键盘流**: 覆盖了复制粘贴、图层移动 (`[` `]`)、锁定 (`Shift+Ctrl+L`) 等操作。

---

## 2. 系统架构备忘 (Architecture Memo)

### 2.1 高清离屏渲染管线 (High-Res Offscreen Pipeline)

> **Pattern**: `src/composables/useOffscreenHelper.js`

- **问题**: 直接在 Fabric Canvas 上 `toDataURL` 会受限于当前的缩放级别 (`zoom`)，导致导出图片模糊。
- **方案**:
  1. 获取原图的原始分辨率 (`originalElement.width/height`)。
  2. 创建一个临时的 `StaticCanvas` (不可见)。
  3. 将原图和效果（滤镜、裁剪框）按原始比例映射到临时 Canvas。
  4. 导出高清图并替换主画布上的对象。
- **应用**: Resize, Crop, Inpaint, Mosaic 均采用了此模式。

### 2.2 物理约束系统 (Constraint System)

> **Pattern**: `src/composables/useConstraint.js`

- **逻辑**: 核心算法 `calculateConstraintOffset` 计算“对象”相对于“容器”的溢出值。
- **行为**:
  - **Resizing**: 实时修正坐标，防止图片小于容器导致露底。
  - **Puzzle**: 拖拽松手时，如果图片位置不合法，触发 `animateRebound` 弹性回弹动画。

### 2.3 状态管理策略 (State Strategy)

- **Singleton**: 放弃 Pinia，使用 `useEditorState.js` (Reactive 单例) 管理全局工具状态 (`activeTool`) 和 Loading 状态。
- **Events**: 模块间通信主要依赖 Fabric 的事件总线（如 `canvas.fire('image:updated')`），减少了 Vue 组件间的强耦合。

### 2.4 强制类型安全原则 (Type Safety)

- **问题记录**：UI 输入控件（Slider/Input）绑定的响应式数据，在用户交互后会自动退化为 String 类型，导致数学计算（尤其是 + 运算）出错。

- **强制规范**：

    1. 在 Vue 模板中，所有数值型输入必须严格使用 v-model.number 修饰符。

    2. 在 JS 逻辑处理计算前，必须对所有来自 UI 的变量进行防御性转换，例如 Number(value) 或 parseFloat(value)。

    3. 禁止直接信任 UI 绑定的变量类型。

---

## 3. 待办事项 (Backlog & Roadmap)

### 📅 近期计划 (Next Sprint)

1.  **文本模块 (Text Module)**:
    - [ ] 实现 `TextAdd.vue`：添加标题/正文。
    - [ ] 实现 `TextStyle.vue`：字体、颜色、描边、阴影控制。
2.  **绘制模块 (Draw Module)**:
    - [ ] 完善 `DrawBrush`：扩展画笔类型（荧光笔、喷枪）。
    - [ ] 实现 `DrawShape`：添加基础几何图形（矩形、箭头、圆）。
3.  **水印模块 (Watermark)**:
    - [ ] 实现全屏平铺水印逻辑。

### 🐛 已知优化点 (Refactoring)

- **Performance**: 拼图模块在拖拽高分辨率图片时，`onMouseMove` 中的计算量较大，考虑增加 `requestAnimationFrame` 节流。
- **TS Migration**: 当前为纯 JS，部分复杂逻辑（如 Puzzle）类型提示不足，计划逐步引入 JSDoc 或迁移至 TS。
