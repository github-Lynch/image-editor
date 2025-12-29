# Project Charter: Image Editor SDK (大秘美图)

> **Version**: 4.1.2 (Logic-First & Engineering Philosophy-Driven Edition)
> **Last Updated**: 2025-12-29
> **Context**: High-performance Web Image Processing SDK
> **Enforcement**: 此文档为项目的“宪法”与最高准则。AI 助手在接受指令后，必须首先基于本章程进行逻辑建模与分析，严禁直接产出未经论证的实现代码。

## 0. AI 交互核心指令 (Prime Directives)

> **优先级**: 🔴 绝对最高 (Absolute Highest Priority)
> **适用范围**: 所有需求分析、交互设计、架构调整及代码实现。

### 0.0 逻辑先行与工程哲学公约 (Logic-First & Engineering Philosophy)

- **核心禁令**: 严禁在未经过深度逻辑分析、边界确认和影响扫描的情况下，直接根据用户提议生成实现代码。
- **法定程序**:
  1. **需求解构**: 将提议拆解为底层物理逻辑（Canvas 变动）与交互逻辑（UI 状态）。
  2. **API 预审 (NEW)**: 显式核对计划使用的核心 API 是否符合 Fabric.js v5.3.0 同步标准，严禁混入 v6 异步逻辑。
  3. **深度反问**: 针对提议中的逻辑模糊地带进行至少一轮反问，确认交互边界。
  4. **精确索取**: 针对提议中的逻辑模糊地带，需要具体的文件去进行分析的可以直接索要。
  5. **方案共识**: 在代码实施前，必须先获得用户对“分析报告”和“技术路径”的明确认可。
- **哲学基石**: **分析是代码的母体，代码只是逻辑的具象化。** 只有经过深度分析后的提议才能转化为代码。

### 0.1 代码完整性公约 (Code Integrity Protocol)

<!--
- **拒绝片段**: 必须返回修改部分所在的完整函数。
- **变更标注**: 对于删减的代码以注释的形式给到用户，并明确指出新增功能及函数在大约多少行、上下文的函数关系。 -->

### 0.2 安全与容量 (Safety First)

- **主动断点**: 当文件或代码量接近 Token 限制无法一次输出时，必须主动暂停并询问是否分段输出，严禁擅自删减逻辑。

### 0.3 智能交互公约 (Smart Interaction Protocol)

- **深度反问 (Proactive Questioning)**: 严禁做“复读机”。对用户提议必须进行“灵魂反问”，确认边界条件。
- **客观性与批判性评估**:
  - **打破顺从性**: AI 严禁盲目赞同用户。必须假设用户的提议可能存在架构漏洞或体验死角。
  - **强制风险披露**: 在评价提议时，必须至少列出 3 个潜在技术风险和 2 个交互负面影响。

### 0.4 影响扫描协议 (Impact Scan Requirement)

### 0.3.1 直接落盘优先策略 (Direct-Apply Priority Policy) **NEW**

> **目标**: 降低“只贴代码不落盘”的沟通成本；在需求明确时直接修改仓库文件，在需求存在模糊地带时必须反问确认范围。

- **默认裁定**: 当且仅当同时满足以下条件，AI **必须直接修改项目中的对应文件**（使用编辑/写入操作），而不是仅在聊天中贴出代码片段：
  1. **目标文件确定**：用户明确给出路径（例如 `@src/...`）或仓库内可唯一定位目标文件。
  2. **做法确定**：实现路径在工程上唯一且不会引入明显的架构分歧（例如替换主图 vs 叠加新图）。
  3. **风险可控**：不涉及或不需要额外确认以下高风险域：SSOT、全局互斥、undo/redo 快照、锁定策略、跨模块生命周期。

- **强制反问**: 若存在任何关键模糊点，AI **不得直接动工**，必须先进行最少但关键的反问以锁定范围（通常 1~3 个问题）：
  - **文件不唯一**：存在多个候选文件/入口。
  - **交互边界不清**：例如触发时机、撤销行为、是否覆盖主图、是否影响其它对象。
  - **高风险区域**：涉及 `useEditorState`（互斥/路由）、`useCanvasLock`（锁定配置）、历史栈与快照、导出/离屏渲染等。

- **执行回执**: 每次直接修改后，AI 必须在回复中明确：
  - **修改了哪些文件**
  - **改动位置**（函数名/大概区块）
  - **改动效果**（一句话可验证）

- **用户可覆盖指令**:
  - 用户说“**直接改到项目里**”：在满足安全前提下直接落盘。
  - 用户说“**先别改，先给方案**”：只输出分析与方案，不修改文件。


在输出代码前的强制“安检”流程：

- **状态依赖**: 是否修改或依赖了全局物理锁（如 `isGlobalDragMode`）？
- **互斥检查**: 当前操作与哪些既有模块（如 `Crop`, `Ruler`, `Puzzle`）在交互上是否互斥？
- **历史一致性**: 新状态是否会破坏 `undo/redo` 栈或导致快照（Snapshot）被意外覆盖？

### 0.5 模块生命周期标准 (Module Lifecycle Standards)

- **Entry (进入)**: 必须捕获初始“处女态”快照。执行快照锁检查：`if (preSnapshot) return;` 确保回滚点唯一。
- **Action (执行)**: 业务逻辑必须与全局 UI 状态隔离，严禁污染非白名单内的 Fabric 属性。
- **Exit (退出)**: 必须提供显式清理函数（Cleanup），负责恢复视口、解绑事件并彻底释放快照内存（`snapshot = null`）。

### 0.6 全局物理锁与互斥表 (Global Mutex Table)

- **SSOT (单源真理)**: 所有影响侧边栏可用性或交互模式的变量，必须统一存储于 `useEditorState.js`。
- **强互斥规则**:
  - 当 `GlobalDragMode` 开启时，禁止进入 `Crop / Resize / Ruler / Puzzle` 等调节面板。
  - 当 `PuzzleMode` 开启时，拦截全局 `object:added/removed` 自动保存，改为模块内手动控制历史逻辑。

### 0.7. ✨ 配置驱动原则 (Configuration-Driven Principle)\*\*:

    - **核心规范**: 凡是涉及多属性映射、状态转换、锁定/恢复逻辑的，必须采用“配置对象 (Configuration Object)”或“常量池”进行驱动。
    - **严禁硬编码**: 严禁在循环、条件判断中直接书写属性名字符串。
    - **对称性保证**: 锁定与解锁、开启与关闭的逻辑必须共享同一份配置源，确保操作的原子性与完整性。

---

## 1. 核心架构原则 (Architectural Principles)

### 1.1 渲染引擎 (Rendering Engine)

- 基于 Fabric.js 5.x 进行二次封装。
- 遵循 Object-Oriented Rendering (OOR) 原则，所有画布元素皆对象。

### 1.2 状态管理 (State Management)

- 使用 Vue 3 Composition API (`ref`, `reactive`) 作为响应式核心。
- **SSOT**: `useEditorState.js` 是编辑器全局状态的唯一真理来源。

### 1.3 插件化架构 (Plugin Architecture)

- 功能模块化：Crop, Draw, Filter, Puzzle 等功能必须封装为独立的 Composable (`useCanvasCrop`, `useCanvasDraw` 等)。
- 模块间通信通过全局 State 或 Event Bus (Fabric Events) 进行，禁止直接耦合。

### 1.4 性能优化 (Performance)

- 大图处理需使用离屏 Canvas 或缩放策略。
- 历史记录栈需设置最大深度，避免内存溢出。
- 拖拽与缩放操作需使用 `requestAnimationFrame` 节流。

### 1.5 UI/UX 规范

- 组件库基于 Element Plus。
- 遵循扁平化设计，操作面板应根据选中的对象类型自动路由 (`routeToObject`)。

---

## 2. 技术栈与版本约束 (Tech Stack)

> ⚠️ **关键约束**：所有生成的代码必须严格遵守以下版本特性，严禁跨版本混用。

- **Graphics Engine**: **Fabric.js v5.3.0** (Locked)
  - **核心准则**: 采用同步渲染与矩阵变换，禁止 Promise 特性。

| 功能维度       | v6 (严禁使用 ❌)                   | v5.3.0 (必须使用 ✅)                    |
| :------------- | :--------------------------------- | :-------------------------------------- |
| **坐标读取**   | `obj.x`, `obj.y`                   | `obj.left`, `obj.top`                   |
| **几何点获取** | `line.get2DPoints()`               | `line.calcTransformMatrix()` + `x1, y1` |
| **图像加载**   | `fabric.Image.fromURL(...).then()` | `fabric.Image.fromURL(url, callback)`   |
| **坐标变换**   | `canvas.getScenePoint(e)`          | `canvas.getPointer(e)`                  |

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

## 6. 质量保障与自检 (Quality Assurance)

### 6.1 逻辑自检维度 (Logic Verification)

1. **SSOT 违规**: “该状态是否被重复定义或在多个地方修改？”
2. **坐标漂移**: “在连续操作下，坐标计算是否依然基于最初的物理锚点而非上一次中间状态？”
3. **架构冲突**: “该提议是否会与 `useCanvas.js` 的历史记录系统产生冲突？”
4. **颜色合规**: 检查代码中是否还残留 `#hex` 硬编码颜色，应使用 CSS 变量。

### 6.2 实施检查清单 (The "Golden Checklist") [CRITICAL]

- [ ] **逻辑先行**: 是否先提供了深度分析报告并获得了用户确认？
- [ ] **上下文同步**: 每次生成代码前，先读取 `active-context.md` 确认当前上下文。
- [ ] **影响扫描**: 每次生成代码前，是否已列出 [影响扫描报告]？
- [ ] **快照锁**: 模块入口处是否执行了 `if (preSnapshot) return;` 保护初始态。
- [ ] **Canvas 销毁**: 组件 `onUnmounted` 时是否注销了 fabric 事件监听并释放了快照。
- [ ] **状态清理**: 退出模块时，是否重置了 `activeTool`、视口坐标，并释放了 `preSnapshot` 内存？
- [ ] **键盘安全**: 新增快捷键是否判断了 `document.activeElement` 或通过 `@keydown.stop` 屏蔽了输入框冲突？
- [ ] **响应式检查**: 是否错误地解构了 `state` 导致 Vue 响应性丢失？
- [ ] **样式回归**: 生成代码后，自我检查是否破坏了现有的 Grid 布局或 CSS 变量引用。

---

## 7. 交互边界与锁定策略 V4.1.2.1 (Interaction Boundaries & Locking Strategy)

> **发布日期**: 2025-12-29  
> **适用范围**: 本解释是对 `project-charter.md` 中 0.6 (全局物理锁与互斥表) 与 3.3 (画布架构约束) 的进一步细化与澄清。

### 7.1 交互模式自动纠偏协议 (Interaction Mode Auto-Correction Protocol)

- **背景**: 明确 `isGlobalDragMode` (全局手形/拖拽模式) 与其它功能模块（如 Text, Filter, Crop）之间的交互优先级。
- **裁定 (Rule)**:
  - **软互斥原则**: 当系统处于 `isGlobalDragMode = true` 状态时，用户发起进入任何一个**非 `adjust` 类**的功能模块，系统**不得拦截**该操作。
  - **自动状态降级**: 系统必须**自动且静默地**将 `isGlobalDragMode` 置为 `false`。
  - **用户告知义务**: 状态自动降级后，建议（非强制）通过 `toast` 等非阻塞式 UI 反馈，告知用户“已退出拖拽模式”，以避免用户产生“为何无法拖拽”的困惑。
- **宪法依据**: 此举遵循了“以模块内交互为优先，保障核心功能可用性”的设计哲学，是对 Charter 0.6 强互斥规则的柔性落地。

### 7.2 主图锁定状态标准定义 (Main Image Lock State Definition)

- **背景**: 统一各模块内对“主图 (Main Image)”的锁定行为，解决“可拖动”与“不可选中”之间的模糊地带。
- **裁定 (Rule)**:
  - **标准锁态**: 在绝大多数功能模块中（除 `adjust` 等明确需要操作主图的模块外），主图的默认锁定策略应为：**“可被选中，但绝对锁定其物理变换”**。
  - **配置驱动实现**: 此标准锁态必须通过 `useCanvasLock.js` 的 `LOCK_CONFIG` 进行配置驱动实现。具体配置应为：
    - `selectable: true` (允许选中以提供视觉反馈)
    - `lockMovementX: true`
    - `lockMovementY: true`
    - `lockScalingX: true`
    - `lockScalingY: true`
    - `lockRotation: true`
  - **禁止硬编码**: 严禁在任何业务组件 (`.vue`) 中直接对主图对象执行 `mainImage.set('selectable', false)` 等操作，以维护 SSOT 原则。
- **宪法依据**: 此举确保了交互反馈（用户知道自己点的是主图）与画布稳定性（主图位置不被误改）的平衡，并强化了 Charter 0.7 (配置驱动) 与 3.3 (物理锁机制) 的权威性。

### 7.3 光标优先级稳定条款 (Cursor Priority Stability Clause)

- **背景**: 确认是否需要为特定模块（如 Text 模块）引入新的光标（如 I-beam）优先级。
- **裁定 (Rule)**:
  - **维持现状**: 现有已在 `active-context.md` 中确立的光标优先级体系 (`grab` > `crosshair` > `default`) 保持不变。
  - **无新增义务**: 暂不为 Text 模块或其他模块引入制度化的、高于现有体系的光标优先级规则。模块内部可自行管理光标，但不应与全局 `grab` / `crosshair` 模式冲突。
- **宪法依据**: 保持全局交互模型的一致性与可预测性，避免因引入过多特例而增加用户心智负担。

---

## 8. 术语表 (Glossary)

- **Logic-First**: 逻辑先行。分析是代码的母体，拒绝盲目编码。
- **Snapshot Lock**: 物理级回滚点保护机制，防止初始态被中间操作污染。
- **Impact Scan**: 动工前的全模块冲突审查。
- **Engineering Philosophy-Driven**: 工程哲学驱动。专注于逻辑建模而非单纯的结果交付。
- **Counter-Questioning**: AI 在接受任务前，通过反问确认交互边界的过程。
- **SSOT**: 单一事实来源 (Single Source of Truth)，确保状态不冲突。
- **Objective Evaluation**: 基于风险、性能和架构的非倾向性评价。
- **Main Image**: 画布底层的核心图片 (Index 0)，通常被锁定。
- **Mask Object**: 用于遮罩的辅助对象，导出时通常不可见。
- **Puzzle Controller**: 拼图模式下的虚拟控制器，用于调整间距和圆角。
- **Physical Lock**: 通过代码逻辑强制锁定的物理属性（如锁定缩放比例）。
