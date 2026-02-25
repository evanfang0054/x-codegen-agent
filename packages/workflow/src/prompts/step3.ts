/**
 * Page-Codegen 步骤3：UI组件与交互逻辑设计提示词
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { CORE_CONSTRAINTS } from './skill.js';

/**
 * 步骤3：UI组件与交互逻辑设计提示词
 */
export const uiDesignPrompt = ChatPromptTemplate.fromMessages([
  ['system', `# 步骤3：UI组件与交互逻辑设计

**触发条件**：\`current_step = 3\`

**前置准备**：\`Read /path/to/booking/task_plan.md\` + \`Read /path/to/booking/research_notes.md\`（刷新目标和上下文）

${CORE_CONSTRAINTS}

## 主要行动

1. **组件文档检索**（优先使用 retrieve-knowledgeBase-mcp）：
   - 充分结合静态模板、\`research_notes.md\`中的PRD和代码片段中理解调用mcp获取组件（Button、Form、Input、DatePicker、TimePicker、Picker、Stepper等）
   - **组件库优先级**：
     1. **优先**使用 \`@dragonpass/atom-ui-mobile\` 组件库
   - 查询：\`组件文档: [组件名称]\`
   - **禁止**未查询组件文档情况下假设属性
   - **必须**在 task_plan.md 记录每次查询失败
   - **必须**保留静态模板代码的样式类名（Tailwind CSS）和DOM结构
   - **必须**优先在 AI 工作副本（.ai.tsx）中引入 \`@dragonpass/atom-ui-mobile\` 组件
   - 3次重试失败后记录错误并使用默认配置

2. **阅读JSBridge文档**：\`jsbridge.md\`，掌握 \`openWebview\`、\`navigateBack\` 等方法

3. **设计交互逻辑**：
   - 日期/时间选择器联动（选择日期 → 重置时间 → 获取时段）
   - "Continue to checkout" 按钮状态控制（表单验证未通过时置灰）
   - 路由跳转逻辑（保存数据到Store → 调用JSBridge跳转）

## 完成后

1. 更新 \`research_notes.md\`：组件API查询结果、交互逻辑设计

2. 更新 \`task_plan.md\`：标记阶段3完成，记录决策和错误，更新状态为阶段4

3. **自动进入步骤4**

## 输出格式

请按照以下结构输出 UI 设计结果：

### 组件 API 查询结果
[从 MCP 或本地文档获取的组件 API]

### 交互逻辑设计
[用户交互响应逻辑、状态流转]

### JSBridge 调用设计
[需要调用的 JSBridge 方法及其参数]

### 表单验证设计
[表单验证规则、错误提示方式]`],
  ['human', `## 当前任务计划
{taskPlan}

## 当前研究笔记
{researchNotes}

## AI 工作副本文件
{aiWorkFiles}

## 用户需求
{requirements}

请执行步骤3的 UI 组件与交互逻辑设计工作。`],
]);

/**
 * 组件文档查询提示词
 */
export const componentQueryPrompt = ChatPromptTemplate.fromMessages([
  ['system', `你是一个组件库专家。请根据静态模板代码，识别需要查询文档的组件列表。

输出格式为 JSON 数组，包含需要查询的组件名称。例如：
["Button", "Form", "Input", "DatePicker", "TimePicker", "Picker", "Stepper"]

优先使用 \`@dragonpass/atom-ui-mobile\` 组件库。`],
  ['human', `## 静态模板代码
{staticTemplateCode}

## 功能需求
{requirements}

请识别需要查询文档的组件列表。`],
]);
