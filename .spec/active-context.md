# Active Context & Development State

> **Version**: 3.0 (Hand Mode & Smart Sensing Integration)
> **Last Updated**: 2025-12-24
> **Current Focus**: 全局交互状态切换、标尺智能感知与光标优先级体系

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
