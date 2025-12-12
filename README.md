1. 项目简介Image Editor 是一个基于浏览器的纯前端图片编辑应用（部分 AI 功能依赖后端）。它提供了类似移动端修图软件的操作体验，支持图片上传、裁剪、旋转、翻转、撤销/重做以及 AI 辅助功能（如一键抠图）。项目架构清晰，采用了 Composable (组合式函数) 的设计模式将 Canvas 操作逻辑与 UI 分离，具有良好的扩展性。
2. 技术栈 (Tech Stack)类别技术/库说明核心框架Vue 3 (Script Setup)使用组合式 API 进行开发构建工具Vite 7极速的开发服务器和构建工具Canvas 引擎Fabric.js (v5.3)处理核心的图形绘制、交互和图片操作UI 组件库Element Plus提供界面基础组件 (按钮、图标、布局等)状态管理Pinia管理应用全局状态 (当前工具、历史记录状态)网络请求Axios用于与 AI 服务后端进行通信工具库File-Saver用于图片导出下载
3. 项目结构分析Plaintextsrc/
├── api/                # API 接口定义
│   └── ai.js           # AI 相关接口 (抠图、消除笔)
├── assets/             # 静态资源 (默认图片、SVG)
├── components/         # Vue 组件
│   ├── layout/         # 布局组件 (导航栏、侧边栏)
│   ├── modules/        # 功能模块 (调整、绘制、文本等)
│   │   ├── adjust/     # "调整"模块 (裁剪、尺寸、抠图)
│   │   └── ...         # 其他模块 (目前多为占位)
│   ├── panels/         # 动态工具面板容器
│   └── Workspace.vue   # 核心画布容器
├── composables/        # 核心逻辑封装
│   └── useCanvas.js    # ⭐️ Fabric.js 核心操作逻辑 (初始化、裁剪、历史记录)
├── stores/             # Pinia 状态管理
│   └── editorStore.js  # 管理当前激活工具、Undo/Redo 状态
├── App.vue             # 根组件
└── main.js             # 入口文件 (挂载 Pinia, ElementPlus)

4. 画布操作核心 (useCanvas.js)这是项目的“大脑”，封装了所有对 Fabric.js 的操作，主要功能包括：初始化与加载：支持加载本地图片或 URL 图片，具备自适应画布大小的逻辑。历史记录系统：实现了 undo (撤销) 和 redo (重做) 功能，通过监听对象变化自动保存状态栈。图片操作：裁剪 (Crop)：自定义实现的裁剪逻辑。支持拖拽裁剪框，并处理了裁剪后的图片坐标重置、旋转后的裁剪边界计算等复杂逻辑。几何变换：支持图片的 90 度旋转 (rotateActive) 和水平/垂直翻转 (flipActive)。导出：支持将当前画布导出为 PNG 图片。
5.  调整模块 (Modules/Adjust)这是目前完成度最高的模块，包含以下子功能：裁剪/旋转 (AdjustCrop)：提供预设比例：原比例、自由比例、1:1、4:3、16:9。支持手动输入尺寸进行裁剪。集成旋转和翻转按钮。调整尺寸 (AdjustResize)：UI 菜单已实现，逻辑待接入。一键抠图 (AdjustRembg)：调用 src/api/ai.js 中的接口。将当前选中的图片发送至后端（默认 localhost:3000/ai/rembg），接收处理后的透明背景图并替换原图。消除笔 (AdjustInpaint)：UI 菜单已实现，逻辑待接入。4.3 界面布局 (Layout)NavBar：顶部导航，包含文件上传（打开图片）、撤销/重做控制、保存/导出按钮。LeftSidebar：左侧一级菜单，用于切换不同的工具模式（调整、绘制、文本等）。ToolPanel：左侧二级面板，根据一级菜单的选择动态加载对应的组件（如选择“调整”时显示裁剪面板）。Workspace：右侧画布区域，包含 Canvas 容器和缩放控制（UI）。
6.  待完善/开发中功能根据代码分析，以下模块目前仅有基础结构或占位符：绘制 (Draw)：DrawBrush.vue 仅为模板，useCanvas 中已有画笔基础逻辑，需对接 UI。文本 (Text)：TextStyle.vue 仅为模板，useCanvas 中已有添加文本逻辑，需对接 UI。滤镜、素材、水印、拼图：目前主要体现为菜单入口，具体功能尚未实现。
7.   运行指南前端启动确保你的环境已安装 Node.js (推荐 v23+)。</br>
    pnpm install</br>
    pnpm run dev</br>
    pnpm run build</br>
