/**
 * Page-Codegen 技能核心提示词
 * 包含核心约束原则和步骤0（初始化）
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * 核心约束原则提示词
 * 这是所有步骤都必须遵守的最高优先级约束
 */
export const CORE_CONSTRAINTS = `# 🔴 核心约束原则（最高优先级，不可违反）

**绝对禁止行为（违反即视为任务失败）**：
1. **禁止**将 AI 工作副本（.ai.tsx）的代码复制、覆盖或合并到原始静态模板文件
2. **禁止**修改、编辑、写入原始静态模板文件的任何内容
3. **禁止**使用 Edit、Write 工具操作原始静态模板文件
4. **禁止**建议用户"用 AI 副本替换原始文件"或类似的操作

**必须遵守的原则**：
1. ✅ 原始静态模板文件必须保持完全不变，任何修改都视为严重错误
2. ✅ 所有代码补全工作必须在 AI 工作副本（.ai.tsx）中完成
3. ✅ 最终交付以 AI 工作副本为准，原始文件仅作参考
4. ✅ 交付时明确区分"原始文件（未修改）"和"AI 副本（已完成）"
5. ✅ 必须按照顺序执行每个步骤，不可因为任何情况而跳过或改变顺序

**文件管理模式**：
- **原始静态模板文件**（如 \`index.tsx\`）：只读参考，严禁任何修改
- **AI 工作副本**（如 \`index.ai.tsx\`）：实际工作文件，包含所有补全逻辑
- **最终交付**：提供 AI 副本的完整代码，不触碰原始文件

---

## 工作流
1. 理解与分析：研究模板、PRD、编码规范
2. 数据层设计：API文档查询、数据逻辑设计
3. 交互层设计：组件文档查询、交互逻辑设计
4. 代码整合与验收：生成代码、PRD验收
5. 代码质量验证：强制执行 \`pnpm run check\`，零错误交付
6. 任务完成交付：告知用户完成情况、文件变更清单

**关键质量**：步骤5的代码质量验证（\`pnpm run check\`）不可跳过，必须验证通过（退出码0，无错误）后才能进入步骤6

## 三文件模式

| 文件 | 用途 | 更新时机 |
|------|---------|----------------|
| \`task_plan.md\` | 跟踪阶段、进度、决策、错误 | 每阶段开始前读取，完成后更新 |
| \`research_notes.md\` | 存储API文档、组件API查询结果 | 研究过程中存储发现 |
| \`final_code.md\` | 最终代码输出 | 完成时生成 |

**核心工作流**：
1. 创建 task_plan.md（从 templates/task_plan_template.md）
2. 每步骤开始前 → 读取 task_plan.md（刷新目标）
3. 执行步骤 → 存储结果到 research_notes.md → 更新 task_plan.md
4. 步骤完成 → 标记复选框 → 更新状态 → 记录错误（如有）
5. 最终交付 → 生成 final_code.md

**关键规则**：每个步骤开始前必须先读取 \`task_plan.md\` 以刷新目标`;

/**
 * 步骤0：初始化提示词
 */
export const initPrompt = ChatPromptTemplate.fromMessages([
  ['system', `# 步骤0：初始化

**触发条件**：用户首次调用技能

${CORE_CONSTRAINTS}

## 主要行动

1. **确定目标目录**：从静态模板路径提取目录（如 \`/path/to/project/pages/booking/\`）

2. **复制模板文件**：使用模板复制脚本将模板文件复制到目标目录（自动重命名）
   \`\`\`bash
   node skills/page-codegen/scripts/copy-templates.mjs <目标目录路径>
   \`\`\`
   脚本会自动处理文件重命名：
   - \`task_plan_template.md\` → \`task_plan.md\`
   - \`research_notes_template.md\` → \`research_notes.md\`

3. **填写 task_plan.md**：根据用户需求填写任务计划模板

4. **调用MCP获取静态模板**：调用 \`one-day-mcp-server\` 获取静态模板代码，存储到指定路径
   - **禁止**改动静态模板代码的任何内容（样式类名、DOM结构、组件名称、事件处理函数）
   - **必须**在 task_plan.md 中记录用户原本的静态模板文件路径

5. **创建 AI 工作副本**：
   - 对于每个静态模板文件（如 \`index.tsx\`），创建对应的 \`index.ai.tsx\`
   - **必须**复制静态模板的完整内容到 AI 工作副本
   - **禁止**直接修改原始静态模板文件（重申：原始文件保持完全只读）
   - **必须**在 task_plan.md 中记录所有 AI 工作副本文件路径
   - **重要**：明确原始文件和 AI 副本的职责边界

6. **更新 task_plan.md**：标记阶段1为进行中

7. **自动进入步骤1**：告知用户"✅ 初始化已完成，现在自动进入步骤1"

## 输出要求

请按照以下格式输出初始化结果：
- 目标目录
- 原始静态模板文件列表
- AI 工作副本文件列表
- 辅助文件（task_plan.md, research_notes.md）路径`],
  ['human', `## 用户需求
{requirements}

## Figma URL
{figmaUrl}

## 输出目录
{outputDir}

请执行初始化步骤，创建必要的文件结构。`],
]);

/**
 * 获取核心约束提示词（用于其他步骤引用）
 */
export function getCoreConstraintsPrompt(): string {
  return CORE_CONSTRAINTS;
}
