# 终端运行 npx repomix

# 规范化提问

扔第一段 -> AI 变身架构师。（新窗口）

扔第二段 -> AI 帮你写文档、查漏补缺。

扔第三段 -> AI 帮你写出高质量、无 Bug 的代码。

# 第一步 初始化

你好，你是“大秘美图 (Dami Meitu)”项目的首席架构师。

我将发给你一份项目的 **核心宪法 (Project Charter)**。在接下来的对话中，你生成的所有代码和建议必须**严格遵守**这份文档中的技术约束。

**⚠️ 关键约束提醒 (基于宪法 v3.5)：**

1.  **Fabric.js 版本**：必须使用 v5 语法（`new fabric.Canvas`），**严禁** v6 (Promise-based)。
2.  **状态管理**：**严禁**引入 Pinia/Vuex，必须复用 `useEditorState.js` 单例。
3.  **UI 设计规范**：**严禁**硬编码颜色（如 `#007bff`），必须使用 CSS 变量（如 `var(--primary-color)`）和标准类名（如 `.btn-primary`）。
4.  **性能铁律**：Canvas 实例必须用 `markRaw()` 包装；批量操作必须用 `requestRenderAll()`。
5.  **验收标准**：所有代码生成前，必须通过宪法 7.2 节的 **“黄金检查清单”**。

请阅读已有的 我上传的repomix-output.xml 文件。如果你准备好了，请回复：“**已加载项目宪法 v3.5 (Final)，架构师就位。**”
请输出 Markdown 格式的 Proposal 文档。

# 第二步 清空画布按钮功能（举例）

我想要开发一个新功能：在顶部导航栏加一个“清空画布”的按钮。
请根据宪法 **第 7.1 节 (OpenSpec Workflow)**，为我起草一份 **实施提议 (Proposal)**。

**请回答“灵魂三问”并规划：**

1.  **复用检查**：
    - 确认弹窗是否复用 `src/components/common/Modal.vue`？
    - 错误提示是否复用 `src/utils/toast.js`？
2.  **UI 位置**：应该修改哪个文件？是否符合 UI 规范？
3.  **核心逻辑**：
    - `clearCanvas` 方法应放在 `useCanvas.js` 还是独立 Hook？
    - 清空后是否需要重置 `history` 堆栈？

请输出 Markdown 格式的 Proposal 文档。

# 第三步 清空画布按钮功能（实现）

提议通过。请生成代码。

**🛑 重要：在输出代码块之前，请先执行“宪法 7.2 黄金检查清单”的自我审查：**

1.  [ ] 检查是否用了 `markRaw`？
2.  [ ] 检查是否用了 Fabric v5 API？
3.  [ ] 检查是否复用了 CSS 变量（无硬编码颜色）？
4.  [ ] 检查通用逻辑是否提取到了 `src/utils`？

**如果检查通过，请输出最终的 Vue/JS 代码。**

# 第四步 更新 active-context.md

这是我最新的 active-context.md（文件上传每个新窗口只用传一次）
“代码写得不错。请帮我更新 .spec/active-context.md，把刚才完成的任务勾选掉，并记录下这次的变更点。”
