# Active Context & Development State

> **Version**: 4.2 (AI Features & Stretch-Transform)
> **Last Updated**: 2025-12-29
> **Current Focus**: AI 功能 (Inpaint/Rembg) 集成与 Resize 拉伸联动

## 1. 当前开发状态 (Current Status)

### ✅ 已完成模块 (Completed Modules)

#### 1.5 2025-12-29 开发日志 (Dev Log) **NEW**

- **智能消除 (Inpaint) 功能重构**
  - [x] **API 对接**: 改造 `inpaintFetch.js`，修复了因请求格式错误导致的后端 `UnicodeDecodeError` (500)，改用 JSON + base64 模式。
  - [x] **逻辑层实现**: 完整实现 `useCanvasInpaint.js`，包含离屏遮罩生成、画笔/框选双模式、自动调用 API 及结果回填。
  - [x] **UI 集成**: 更新 `AdjustInpaint.vue`，使其成为功能面板并接入新逻辑。
  - [x] **稳定性修复**: 修复了二次消除时因 `blob:` URL 失效导致的图片加载失败问题，改用 `data:` URL 方案确保可连续操作。

- **一键抠图 (Rembg) 功能改造**
  - [x] **API 适配**: 更新 `AdjustRembg.vue`，使其从操作画布选中对象（或自动选中主图）导出 `File` 对象，以适配新的 `removeBgFetch` 接口。

- **尺寸调整 (Resize) 拉伸联动**
  - [x] **功能实现**: 在 `useCanvasResize.js` 中增加了“失真/拉伸”模式下，文本、标尺等其它画布对象跟随主图进行非等比缩放的功能。
  - [x] **状态还原**: 修复了从“拉伸”切换回“保真”模式时，被联动对象未能还原的问题，确保了模式切换的逻辑完整性。

- **工程与规范**
  - [x] **CSS 对齐**: 修复了左侧边栏工具项因图标宽度不一导致的文字未对齐问题。
  - [x] **宪法更新**: 在 `.spec/project-charter.md` 中新增 `0.3.1 直接落盘优先策略`，明确了 AI 的交互与代码修改准则。

---

#### 1.1 核心编辑 (Core Editing)

- **剪裁 (Crop)**:
  - [x] **手动选区**: 实现了 `startManualSelection`，支持自定义框选区域。
  - [x] **比例锁定**: 支持原图比例、自由比例及常用预设 (1:1, 16:9 等)。
  - [x] **旋转翻转**: 90° 步进旋转与 XY 轴翻转。
- **尺寸调整 (Resize)**:
  - [x] **高清重制**: 引入 `useOffscreenHelper`，实现了基于原图分辨率的高清缩放。
  - [x] **保真模式**: 支持锁定长宽比计算。
  - [x] **通用锁集成**: 成功接入 `useCanvasLock`，锁定除主图外的一切对象。
- **补白 (White/Padding)**:
  - [x] **架构对齐**: 统一使用 `useCanvasLock` 管理交互锁。
  - [x] **母带重制**: 实现了基于原始分辨率的高清补白与视图比例修正。

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
- **图片翻译 (Image Translation)**:
  - [x] **UI 组件**: 实现了图片翻译功能的下拉面板，包含源语言和目标语言选择。
  - [x] **功能实现**: 完成了 handleTranslate 函数，支持将画布内容转为图片并调用 AI API 进行翻译。
- **滤镜与调色**:
  - [x] **ColorMatrix**: 实现亮度、对比度等 6 维调节。
  - [x] **LUT 模拟**: 内置“复古”、“电影”等滤镜预设。

#### 1.4 全局交互与标尺智能 `NEW`

- **全局手形模式 (Hand/Drag Mode)**:
  - [x] **状态管理**: 在 `useEditorState.js` 中新增全局 `isGlobalDragMode` 状态。
  - [x] **UI 部署**: 在 `Workspace.vue` 右下角部署手形按钮，实现模式实时切换。
  - [x] **时序修复**: 通过监听 `image:updated` 解决了异步加载导致的物理锁失效问题。
- **测量标尺 (AdjustRuler)**:
  - [x] **智能感知绘制**: 实现了“按下即绘制”逻辑。点击空白处（穿透主图）启动绘制，点击已有标尺则选中。
  - [x] **光标优先级**: 确立了 `grab` (手形) > `crosshair` (标尺) > `default` (默认) 的优先级体系。
  - [x] **对象反馈**: 锁定状态下的标尺对象强制显示 `hoverCursor: 'move'`，以明确其可编辑性。

---

## 2. 系统架构备忘 (Architecture Memo)

### 2.1 高清离屏渲染管线 (High-Res Offscreen Pipeline)

- **逻辑**: 获取原图原始分辨率 -> 创建临时 StaticCanvas -> 映射效果 -> 导出高清图。

### 2.2 物理约束系统 (Constraint System)

- **逻辑**: 计算对象相对于容器的溢出值，Resizing 时实时修正，Puzzle 拖拽时触发回弹。

### 2.3 身份识别标准 (Identity Standards) `NEW`

- **主图 (Main Image)**: 必须具备 `isMainImage: true` 标识。
- **标尺 (Ruler)**: 具备 `isRuler: true` 标识，用于豁免物理锁并切换 `hoverCursor`。

### 2.4 对象驱动路由架构 (Object-Driven Routing)

- **核心理念**: Canvas 是路由触发器，State 是控制器，Sidebar 是视图。
- **二级导航**: 支持通过 `customTab` 属性精确跳转至特定面板 (如标尺)。

### 2.5 配置驱动型物理锁 (Configuration-Driven Lock) `MAJOR UPGRADE`

- **File**: `src/composables/useCanvasLock.js`
- **核心逻辑**: 定义 `LOCK_CONFIG` 常量池作为唯一真相来源。
- **对称性**: 锁定阶段执行 `lockedValue`，豁免/解锁阶段执行 `interactiveValue`，二者共享同一套循环遍历。
- **原子备份**: 只有当 `WeakMap` 中不存在该对象记录时才备份，确保存储的是“最原始状态”。

### 2.6 交互协议 (Interaction Protocol) `NEW`

- **逻辑**: 废弃用户手动的“反问/文件索取”提醒，将其下放到 AI 的默认行为层。
- **执行准则**:
  1. 识别提议。
  2. 触发 `project-charter` 中的反问逻辑。
  3. 检索受影响的文件并向用户索取。

---

## 3. 故障排查与最佳实践 (Troubleshooting & Best Practices)

### 3.1 解决初始化后主图仍可拖动的问题

- **原因**: 异步加载的主图在 `onMounted` 锁执行后才被添加，覆盖了锁定态。
- **方案**: 采用“双重加锁”：`onMounted` 锁一次，并在 `image:updated` 事件中再次执行 `syncLockState`。

### 3.2 标尺模块语法错误 (startDrawMode 不存在)

- **原因**: 重构为智能感知模式后，删除了手动的绘制开关，合并入 `startRulerMode`。
- **方案**: 更新 `AdjustRuler.vue`，统一使用新的模式控制接口。

### 3.3 物理锁 (useCanvasLock) 失效预防

- **规范**: 模块初始化时必须显式设置 `mainImg.isMainImage = true`，否则主图会被误锁。

### 3.4 为什么切回模块后功能“残缺” (如能选但不能动)？

- **现象**: 标尺组件切回后出现蓝框，但无法移动。
- **原因**: 之前的物理锁在豁免逻辑中采用了“硬编码恢复”，只恢复了 `selectable`，却遗漏了 `lockMovementX/Y` 等属性。
- **终极解决方案**: 废弃硬编码，改用**配置驱动模式**。通过遍历属性池，确保每一项被锁定的属性在豁免时都能被精准解锁。
- **教训**: “可以用配置驱动的都不要用硬编码”，保持逻辑的高度对称性。

### 3.5 模块进入后主图仍可拖动的问题 `NEW`

- **现象**: 进入文本模块（或其他非 adjust 模块）后，主图仍然可以被拖动，即使策略配置正确（`allowMainImageDrag: false`）。
- **原因分析**:
  1. **时机问题**: `watch` 可能在模块组件挂载前触发，导致锁定逻辑执行时模块状态尚未完全更新。
  2. **选中状态**: 即使 `lockMovementX/Y` 为 `true`，如果主图被选中（`selectable: true`），Fabric.js 在选中状态下仍可能允许拖动。
  3. **策略覆盖**: 当 `isGlobalDragMode` 为 `true` 时，`dragPolicy` 会覆盖 `basePolicy`，导致主图可拖动。
- **解决方案**:
  1. **强制关闭手型模式**: 进入任何模块（非 resize）时，如果 `isGlobalDragMode` 为 `true`，强制关闭。
  2. **禁止选中主图**: 在模块内设置 `allowMainImageSelect: false`，防止 Fabric.js 在选中状态下允许拖动。
  3. **强制取消选中**: 如果主图已被选中，立即取消选中（在设置策略之前执行）。
  4. **使用 nextTick**: 在 `watch` 中使用 `nextTick` 确保状态更新后再执行锁定逻辑。
  5. **模块挂载时触发**: 在模块的 `onMounted` 中触发 `image:updated` 事件，确保模块挂载后立即锁定主图。
- **关键代码位置**:
  - `src/components/Workspace.vue`: `syncLockState` 函数中的模块锁定逻辑
  - `src/components/modules/text/index.vue`: `onMounted` 中触发 `image:updated` 事件
  - `src/composables/useCanvasLock.js`: 主图锁定状态的设置
- **参考行为**: 调整模块（`activeTool === 'adjust'`）在没有子模块时，主图不能被移动，除非用户手动启用手型。
- **教训**:
  - 时机问题很关键：使用 `nextTick` 确保状态更新完成后再执行锁定逻辑
  - 选中状态会影响拖动：即使 `lockMovementX/Y` 为 `true`，选中状态下的主图仍可能被拖动
  - 双重保障：既要在策略层面禁止，也要在对象层面强制取消选中