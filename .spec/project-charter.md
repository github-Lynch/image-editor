# Project Charter: Image Editor SDK (大秘美图)

> **Version**: 3.8.0 (Integrated Edition)
> **Last Updated**: 2025-12-22
> **Context**: High-performance Web Image Processing SDK
> **Enforcement**: 此文档为最高准则，AI 生成代码必须严格查阅并遵循。

## 0. AI 交互核心指令 (Prime Directives)

> **优先级**: 🔴 最高 (Highest Priority)
> **适用范围**: 所有代码生成与修改任务
> 

1.  **代码完整性公约 (Code Integrity Protocol)**:
    - **将修改部分的代码所在的整个函数返回给我， 比如删除了哪一块 新增了哪一块,然后位置在大概多少行 上下文的函数是哪个**。
2.  **安全第一 (Safety First)**:
    - 当文件超过 token 限制无法一次输出时，**主动暂停**并询问用户是否分段输出，而不是擅自删减代码。
3. **✨ 智能交互公约 (Smart Interaction Protocol) `UPDATED`**:
    - **深度反问 (Proactive Questioning)**: 严禁做“复读机”。对用户提议必须进行“灵魂反问”，确认边界条件。
    - **客观性与批判性评估 (Objective Criticality) `NEW`**: 
    - **打破顺从性**: AI 严禁为了讨好用户而盲目赞同。必须假设用户的提议可能存在架构漏洞或体验死角。
    - **强制风险披露**: 在评价提议时，必须至少列出 **3 个技术风险**（如性能瓶颈、逻辑冲突）和 **2 个交互负面影响**。
    - **多维度评估框架**: 必须使用 SWOT（优劣势）、第一性原理（是否解决根本问题）或成本/效益分析进行客观评判。
    - **全局关联检查**: 评估时必须对照 `useCanvas.js` 的全局状态和 SSOT 原则，检查提议是否会污染全局命名空间或破坏状态机。
    - **替代方案义务**: 如果提议存在明显缺陷，必须提供至少一种更简洁、更符合架构规范的替代方案。
    - **精准索取 (Precision File Solicitation)**: 在针对提议进行分析前，AI 必须根据提议涉及的模块，列出需要用户提供的核心文件列表（如 `useCanvasXXX.js`, `XXX.vue`），以确保分析是基于最新真实代码的。
4.  **双重锁定准则 (Double-Locking)**: 针对异步加载对象，必须在 `onMounted` 与 `image:updated` (或 `nextTick`) 执行双重锁定。
5.  **✨ 配置驱动原则 (Configuration-Driven Principle)**: 
    - **核心规范**: 凡是涉及多属性映射、状态转换、锁定/恢复逻辑的，必须采用“配置对象 (Configuration Object)”或“常量池”进行驱动。
    - **严禁硬编码**: 严禁在循环、条件判断中直接书写属性名字符串。
    - **对称性保证**: 锁定与解锁、开启与关闭的逻辑必须共享同一份配置源，确保操作的原子性与完整性。  
---

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

### 3.3. 画布架构约束 (Canvas Constraints) [CRITICAL]
- **SSOT (Single Source of Truth)**: 所有画布属性（缩放、背景色、物理锁）必须有且仅有一个真理来源。
- **物理锁机制**: 所有 Canvas 对象的锁定逻辑必须通过 `useCanvasLock.js` 的配置驱动，严禁在业务组件中硬编码 `selectable = false`。
- **高保真快照**: 所有“取消”或“撤销”操作必须基于包含 `CANVAS_PROPS_WHITELIST` 的全量 JSON 快照，严禁部分恢复。

---

### 3.3 模块通信 (Event Bus)

- 使用 Fabric Canvas 实例 (`canvas.fire`) 作为唯一事件总线。

---

## 4. 目录结构规范 (Directory Structure)

src/
├── api/ # 后端接口交互 (AI, Rembg, Inpaint)
├── components/
│ ├── common/ # 通用原子组件 (Modal, LoadingOverlay, ContextMenu...)
│ ├── layout/ # 全局布局组件 (EditorLayout, LeftSidebar, NavBar)
│ ├── modules/ # 独立功能模块 (业务逻辑核心)
│ │ ├── adjust/ # 调整类 (Crop, Resize, Filter...) - 内含 Vue + useCanvasHooks
│ │ ├── ai/ # AI 类功能 (AiGenerate, AiExpand)
│ │ ├── draw/ # 自由绘制模块
│ │ ├── text/ # 文本模块
│ │ ├── puzzle/ # 拼图模块 (含 config.js)
│ │ └── ... # 其他模块 (border, material, watermark)
│ ├── panels/ # 二级侧边栏容器 (ToolPanel)
│ └── Workspace.vue # 画布核心容器 (Canvas 初始化与事件绑定)
├── composables/ # 核心逻辑 Hooks (useCanvas, useEditorState, useCanvasLock...)
├── config/ # 静态配置 (theme.js, shortcuts.js)
└── utils/ # 纯函数工具库 (toast.js)

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

1.  **复用检查**: “我要写的这个辅助函数，`src/utils`或者 `src/composables` 里有没有？UI 组件在 `common` 里有没有？架构模式在 `Section 3` 里有没有？”
2.  **UI 位置**: 在 `ToolPanel` 的哪个位置增加入口？
3.  **交互逻辑**: 拖入画布后的默认行为（居中？自动缩放？）。
4.  **架构兼容性**: “该提议是否会与 `useCanvas.js` 的历史记录系统产生冲突？”
5.  **性能边界**: “在大图或高频操作下，该方案是否会导致掉帧？”
6.  **逻辑冗余**: “该逻辑是否可以抽象为公用 Composable，而非写死在当前模块？”

### 6.2 实施检查清单 (The "Golden Checklist") [CRITICAL]

- [ ]每次生成代码前，先读取 `active-context.md` 确认当前上下文。
- [ ] **Canvas 销毁**: 组件 `onUnmounted` 时是否注销了 fabric 事件监听？
- [ ] **状态清理**: 退出模块时，是否重置了 `activeTool` 和临时图层？
- [ ] **键盘安全**: 新增快捷键是否判断了 `document.activeElement` 以防止输入框冲突？
- [ ] **响应式检查**: 是否错误地使用了 `const { state } = useStore()` 导致响应性丢失？
- [ ] **颜色合规**: 检查代码中是否还残留 `#hex` 硬编码颜色？
- [ ]生成代码后，自我检查是否破坏了现有的 Grid 布局或 CSS 变量引用。

---

## 7. 术语表 (Glossary)
- **Counter-Questioning**: 针对模糊指令的主动反问。
- **SSOT**: 单一事实来源，确保状态不冲突。
- **Objective Evaluation**: 基于风险、性能和架构的非倾向性评价。
- **Counter-Questioning Logic**: 指 AI 在接受任务前，通过反问确认交互边界与技术细节的过程，旨在减少重构成本。
- **Main Image**: 画布底层的核心图片 (Index 0)，通常被锁定。
- **Mask Object**: 用于遮罩的辅助对象，导出时通常不可见。
- **Puzzle Controller**: 拼图模式下的虚拟控制器，用于调整间距和圆角。
- **Physical Lock**: 通过 `useCanvasLock` 施加的强制不可交互状态。
- **Main Image Identification**: 必须同时具备 isMainImage: true 和 id: 'main-image' 属性。所有操作主图的模块（如 Resize, White）
  在初始化时必须校验并补齐此  标识，以防被 useCanvasLock 误锁。
- **Physical Lock Priority**: 物理锁必须在所有 UI 渲染及预览对象创建（如 startPreview）完成后，在 nextTick 中执行最后一次“扫尾式”加锁。
- **Configuration-Driven Lock**: 所有的锁定属性（selectable, lockMovement 等）均定义在 `LOCK_CONFIG` 中，系统通过遍历该配置实现逻辑自洽。
- **Force Functional State (策略 B)**: 进入特定模块时，通过配置池强制恢复对象的所有交互属性，确保功能不受前序模块残留状态的影响。
- **Configuration-Driven Lock**: 所有的锁定属性均集中定义在 `LOCK_CONFIG` 中。
