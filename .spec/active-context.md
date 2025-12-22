# Active Context & Development State

> **Last Updated**: 2025-12-22
> **Current Focus**: Feature Stabilization & Module Documentation

## 1. 当前开发状态 (Current Status)

### ✅ 已完成 (Completed)

#### 1.1 智能调整模块 (Smart AI Features)
* **智能消除笔 (Smart Inpaint)**:
    * [x] **交互重构**: 实现了“所见即所得”的自动触发机制（画笔 1秒防抖 / 框选松手即发）。
    * [x] **对象锁定系统 (Hard Lock)**: 解决了 Fabric.js 底层图片抢占鼠标事件的问题，实现了进入模块即强制锁定底图交互。
    * [x] **防闪烁渲染**: 采用 **离屏渲染 (Offscreen Rendering)** 技术生成黑白遮罩，消除了 AI 处理前的屏幕闪烁 (ADR-004)。
    * [x] **状态管理**: 引入 **备忘录模式 (Memento Pattern)**，进入模块自动保存快照，支持“恢复原图”。

#### 1.2 基础编辑模块 (Basic Editing)
* **剪裁/旋转 (Crop & Rotate)** `AdjustCrop.vue`:
    * [x] **自由剪裁**: 支持拖拽 8 个控制点调整剪裁框，内置常用比例 (1:1, 16:9, 4:3 等)。
    * [x] **任意旋转**: 支持 -45° 至 45° 的微调旋转以及 90° 步进旋转。
    * [x] **交互逻辑**: 进入模块时自动添加覆盖层 (Overlay)，剪裁操作基于 Viewport 变换实现，非破坏性编辑。
* **调整尺寸 (Resize)** `AdjustResize.vue`:
    * [x] **像素控制**: 支持手动输入宽/高像素值。
    * [x] **比例锁定**: 实现了“宽高比锁定”开关，调整一边自动计算另一边。
    * [x] **单位转换**: (预留) 目前基于像素 (px) 处理。
* **图片补白 (AdjustWhite)** `AdjustWhite.vue`:
    * [x] **画布扩展**: 支持以图片为中心向四周扩展画布。
    * [x] **背景填充**: 扩展区域支持填充自定义颜色 (默认白色)。
    * [x] **比例缩放**: 提供了通过滑块 (0-100%) 快速调整留白比例的交互。

#### 1.3 色彩与滤镜模块 (Color & Filters)
* **色彩调节 (Color Adjust)** `AdjustColor.vue`:
    * [x] **全能参数**: 实现了 6 维调节：亮度 (Brightness)、对比度 (Contrast)、饱和度 (Saturation)、模糊/锐化 (Blur/Sharpen)、色温 (Temperature)、色调 (Hue)。
    * [x] **性能优化**: 基于 WebGL 滤镜后端，滑块拖动时实时渲染。
    * [x] **撤销支持**: 调节过程支持原子级撤销/重做。
* **颜色叠加 (Color Overlay)** `AdjustColorOverlay.vue`:
    * [x] **混合模式**: 基于 `BlendColor` 滤镜实现，支持自定义 HEX 颜色和透明度 (Alpha) 混合。
    * [x] **预设吸管**: 提供了常用色块预设和原生取色器。
* **滤镜效果 (Filters)** `AdjustFilters.vue`:
    * [x] **预设库**: 集成了黑白 (Grayscale)、怀旧 (Sepia/Vintage)、柯达 (Kodachrome) 等经典滤镜。
    * [x] **一键应用**: 点击即用，支持叠加其他色彩调节操作。

#### 1.4 基础设施与交互框架 (Infrastructure & Interaction)
* **画布工作区 (Workspace)** `Workspace.vue`:
    * [x] **动态画布**: 基于 `canvasAPI` 注入，实现了响应式宽高的 Fabric.js 画布初始化。
    * [x] **双向缩放 (Zoom)**: 实现了 Canvas 缩放与 UI 百分比的实时同步，监听 `zoom:change` 和 `mouse:wheel` 事件。
* **快捷键系统 (Keyboard Shortcuts)** `New!`:
    * [x] **配置化驱动**: 建立了 `src/config/shortcuts.js` 作为单一数据源，统一管理键位映射。
    * [x] **全局监听**: 实现了 `useKeyboardShortcuts`，支持通用快捷键 (Ctrl+C/V/Z, Delete) 和图层操作 ( `[` `]` )。
    * [x] **可视化面板**: 新增 **侧边抽屉组件 (ShortcutsPanel)**，采用 Keycap 风格展示快捷键列表，支持点击导航栏 **Command图标** 唤起。
    * [x] **UI 集成**: 悬浮菜单 (`FloatingObjectMenu`) 新增了快捷键文字提示 (Tooltips)。
* **右键菜单 (Context Menu)** `CanvasContextMenu.vue`:
    * [x] **坐标修正**: 修复了粘贴位置偏移问题，现在鼠标指针即为粘贴对象的**左上角 (Top-Left)**。
    * [x] **交互互斥**: 实现了点击画布空白处或菜单外区域自动关闭菜单的逻辑。
* **悬浮对象菜单 (Floating Menu)** `FloatingObjectMenu.vue`:
    * [x] **事件隔离**: 实现了防误触逻辑，在悬浮条上点击右键不会触发底层的 Canvas 右键菜单。
    * [x] **组件集成**: 完成了组件挂载与基础显隐控制。

---

## 3. 技术细节备忘 (Technical Memo)

### 3.1 基础编辑实现逻辑
* **剪裁 (Crop)**:
    * **核心**: 不直接切割图片像素，而是通过 `canvas.setViewportTransform` 改变可视窗口，并在导出 (`toDataURL`) 时指定 `left/top/width/height` 参数来实现物理剪裁。
    * **遮罩**: 使用半透明的 `fabric.Path` 或组合图形构建“挖空”的视觉效果，让用户聚焦于保留区域。
* **补白 (White/Padding)**:
    * **逻辑**: 修改 `canvas.width` / `canvas.height`，保持 `activeObject` (图片) 居中，并设置 `canvas.backgroundColor`。

### 3.2 色彩滤镜流水线
* **Filter Backend**: 强制开启 `fabric.textureSize = 4096` 以支持高分图 WebGL 处理。
* **滤镜栈管理**:
    * `AdjustColor` 使用固定的滤镜索引 (如 index 0=Brightness, 1=Contrast)，确保多次调节滑块是更新同一个滤镜实例，而不是无限叠加。
    * `AdjustColorOverlay` 独占一个 `BlendImage` 滤镜实例。
    * 状态恢复时，需检查 `image.filters` 数组并反序列化回 UI 控件数值。

### 3.3 智能消除笔 (`useCanvasInpaint.js`)
* **防抖逻辑**: 画笔模式下，`path:created` 事件触发 `setTimeout(execute, 1000)`。如果期间产生新路径，清除旧 Timer。
* **快照恢复**: 使用 `canvas.toJSON(['id', 'selectable', 'name'])` 保存轻量级快照。恢复时需重新应用锁定状态。
* **锁定机制**: 见 **ADR-005**，通过遍历对象设置 `evented: false` 实现事件穿透。

### 3.4 剪贴板与粘贴策略 (Clipboard & Paste Strategy) `New!`
* **单例模式 (Singleton)**: 废弃了函数内部的局部变量，改用 `clipboardState` (Reactive Object) 存储剪贴板数据。
    * **目的**: 解决了跨组件（如右键菜单 vs 快捷键监听器）调用时数据不互通的问题。
* **双模粘贴逻辑 (Dual Mode)**:
    * **右键粘贴**: 传入 `pointer` 坐标，强制对象 `left/top` 等于鼠标位置 (Origin: Top-Left)。
    * **键盘粘贴 (Ctrl+V)**: 不传坐标，逻辑自动应用 `offset (+20px)`，防止新对象完全覆盖旧对象，符合桌面软件习惯。

### 3.5 快捷键架构 (Shortcut Architecture) `New!`
* **防误触**: 在 `handleKeydown` 中严格检测 `document.activeElement`，若为 `INPUT` 或 `TEXTAREA` 则自动阻断快捷键触发。
* **行业标准键位**:
    * **图层移动**: 采用 Figma/PS 标准，`[` (下移)、`]` (上移)、`Shift + [` (置底)、`Shift + ]` (置顶)。
    * **锁定**: 采用 `Ctrl + Shift + L`，避免与浏览器地址栏快捷键冲突。
* **数据源**: `ShortcutsPanel` 和 `useKeyboardShortcuts` 共享同一份 `config/shortcuts.js` 配置，确保文档与行为永远同步。

### 3.6 坐标系与交互事件 (Coordinates & Events)
* **坐标获取 (Pointer Capture)**:
    * **原则**: 必须使用 `canvas.getPointer(e)` 获取鼠标坐标。
    * **原因**: `e.clientX/Y` 是屏幕物理坐标，无法响应 Canvas 的 `setZoom` (缩放) 和 `viewportTransform` (平移)。`getPointer` 能自动转换为 Canvas 内部逻辑坐标。
* **事件监听生命周期**:
    * **Zoom 同步**: `fabricCanvas.on('zoom:change', updateZoomState)` 必须在 `onUnmounted` 中通过 `.off()` 移除，否则组件销毁后会导致内存泄漏或控制台报错。
    * **菜单隔离**: `handleRightClick` 中使用 `e.target.closest('.floating-wrapper')` 判断点击源，实现 UI 层级事件过滤。

---

## 4. 下一步计划 (Next Steps)
### 📅 阶段二：标尺核心 (Ruler Core)
* [ ] `useCanvasRuler.js`: 标尺对象模型与绘制逻辑。
* [ ] `AdjustRuler.vue`: 标尺面板与预设系统。

### 📅 阶段三：全局集成 (Global Integration)
* [ ] `useCanvas.js`: 全局智能跳转侦听器。
* [ ] `NavBar.vue`: 全局标尺开关。