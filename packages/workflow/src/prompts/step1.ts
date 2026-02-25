/**
 * Page-Codegen 步骤1：需求与代码研究提示词
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { CORE_CONSTRAINTS } from './skill.js';

/**
 * 步骤1：需求与代码研究提示词
 */
export const researchPrompt = ChatPromptTemplate.fromMessages([
  ['system', `# 步骤1：需求与代码研究

**触发条件**：\`current_step = 1\`

**前置准备**：\`Read /path/to/booking/task_plan.md\`（路径占位符替换为实际目录）

${CORE_CONSTRAINTS}

## 🔴 核心约束重申
- 禁止查询组件文档（步骤3专属）
- 禁止补充在 \`research_notes.md\` 组件API查询结果（步骤3专属）

## 主要行动

1. **理解PRD/需求**：业务流程、核心功能点、用户操作流程（使用Gherkin语法描述）

2. **理解静态代码**：UI结构、组件层级、待补全逻辑点（TODO）

3. **阅读技术规范**：\`codingspec.md\`、\`api-request.md\`、\`jsbridge.md\`

4. **检索PRD文档**（优先 MCP，回退本地代码库）：
   - **优先方案**：使用 \`retrieve-knowledgeBase-mcp\` 查询 \`PRD: [一句话概要]\`
     - **必须**在 task_plan.md 记录每次检索失败
     - 3次重试失败后进入本地回退方案
   - **回退方案**（MCP失败时）：
     - 使用 \`Glob\` 搜索 PRD 文档：\`**/*prd*.md\`、\`**/PRD*.md\`、\`**/docs/requirements/**/*.md\`
     - 使用 \`Grep\` 搜索 PRD 中的关键业务术语
     - **禁止**在未检索PRD文档情况下假设业务逻辑
     - 如果两次方案均失败，记录错误并使用用户需求描述

5. **检索代码片段**（优先 MCP，回退本地代码库）：
   - **优先方案**：使用 \`retrieve-knowledgeBase-mcp\` 查询 \`代码片段: [一句话概要]\`
     - **必须**记录每次检索失败
     - 3次重试失败后进入本地回退方案
   - **回退方案**（MCP失败时）：
     - 使用 \`Grep\` 搜索代码库中的相似实现：\`Grep(pattern="关键词", type="tsx")\`
     - 使用 \`Glob\` 查找相关示例文件：\`**/examples/**/*.tsx\`、\`**/demos/**/*.tsx\`
     - 搜索技术栈相关代码模式
     - **禁止**直接复制粘贴，必须理解后修改整合
     - 如果两次方案均失败，基于React最佳实践实现

6. **主动澄清模糊需求**（使用 AskUserQuestion）：

   **发现方法**：
   - 从静态模板：TODO注释、未完成逻辑、缺失props、数据来源不明确、事件处理缺失、状态管理不清晰
   - 从PRD：模糊描述、缺失细节、多种实现方式、边界情况、用户路径不完整
   - 技术角度：性能、缓存、错误处理、状态管理、国际化、可访问性

   **执行原则**：
   - 优先级1：实际问题 > 优先级2：参考场景
   - 呈现2-6个选项，分批询问
   - 达到95%需求理解度

## 完成后

1. 更新 \`research_notes.md\`(仅限更新以下内容)：
   - 用户需求澄清
   - PRD理解与拆解（**必须使用Gherkin语法描述用户操作流程**）
   - 代码片段参考
   - 编码规范理解
   - 综合发现

2. 更新 \`task_plan.md\`：标记阶段1完成，记录决策，更新状态为阶段2

3. **自动进入步骤2**

## 输出格式

请按照以下结构输出研究结果：

### 用户需求理解
[对用户需求的理解和澄清]

### PRD 分析结果
[使用 Gherkin 语法描述的业务场景]

### 静态代码分析
[UI结构、组件层级、待补全逻辑点]

### 技术规范理解
[编码规范、API请求规范、JSBridge规范]

### 代码片段参考
[找到的相关代码片段及其用途]

### 待澄清问题
[需要用户进一步确认的问题列表]`],
  ['human', `## 当前任务计划
{taskPlan}

## 当前研究笔记
{researchNotes}

## 原始静态模板文件
{originalFiles}

## AI 工作副本文件
{aiWorkFiles}

## 用户需求
{requirements}

请执行步骤1的研究工作。`],
]);

/**
 * 步骤1输出解析提示词
 */
export const researchOutputPrompt = ChatPromptTemplate.fromMessages([
  ['system', `请将研究结果整理为结构化的 JSON 格式，包含以下字段：
- prdAnalysis: PRD 分析结果，包含 coreObjective 和 gherkinScenarios
- codeAnalysis: 静态代码分析结果
- techSpecs: 技术规范理解
- codeSnippets: 代码片段参考
- clarifications: 待澄清问题
- decisions: 做出的决策`],
  ['human', `{researchOutput}`],
]);
