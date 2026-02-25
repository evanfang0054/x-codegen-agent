/**
 * Page-Codegen 步骤2：接口与数据逻辑设计提示词
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { CORE_CONSTRAINTS } from './skill.js';

/**
 * 步骤2：接口与数据逻辑设计提示词
 */
export const apiDesignPrompt = ChatPromptTemplate.fromMessages([
  ['system', `# 步骤2：接口与数据逻辑设计

**触发条件**：\`current_step = 2\`

**前置准备**：\`Read /path/to/booking/task_plan.md\` + \`Read /path/to/booking/research_notes.md\`（刷新目标和上下文）

${CORE_CONSTRAINTS}

## 主要行动

1. **阅读接口文档**：\`api-request.md\`

2. **获取接口Schema**（优先 MCP，回退本地文档）：
   - **优先方案**：调用 Apifox MCP 工具
     - 调用 \`mcp__apifox-api-docs-mcp__apifox_get_api_list\` 获取接口列表
     - 筛选相关接口（关键字：\`booking\`、\`reservation\`、\`lounge\`、\`resources\`、\`available\`）
     - 调用 \`mcp__apifox-api-docs-mcp__apifox_get_api_detail\` 获取详细文档
     - **禁止**在未查询到接口文档情况下假设参数和响应
     - **必须**重试最多5次，每次间隔2秒
     - **必须**在 task_plan.md 记录每次MCP调用失败

   - **回退方案**（MCP失败5次后）：
     - 使用 \`Glob\` 搜索本地 API 文档：\`**/swagger.json\`、\`**/openapi.yaml\`、\`**/api-docs/**/*.md\`
     - 使用 \`Grep\` 搜索 API 定义：\`Grep(pattern="booking.*api|reservation.*endpoint", type="ts")\`
     - 搜索类型定义文件中的接口声明
     - 查找 Postman collection 或其他 API 文档

   - **如果两种方案均失败**：记录错误，基于 \`api-request.md\` 规范推断接口结构

   **重试策略**：
   - 等待2秒后重试
   - ApiFox Key无效时不传key直接调用
   - 最多重试5次
   - 每次失败记录错误到 task_plan.md

3. **设计数据层**：
   - 基于 \`api-request.md\` 设计接口请求函数
   - 规划页面初始化数据加载流程
   - 使用 \`useProductConfig()\` 获取 \`api\` 实例，调用 \`api.api.xxx\` 方法

## 完成后

1. 更新 \`research_notes.md\`：API文档查询结果、数据流设计、状态管理方案

2. 更新 \`task_plan.md\`：标记阶段2完成，记录决策和错误，更新状态为阶段3

3. **自动进入步骤3**

## 输出格式

请按照以下结构输出 API 设计结果：

### API 文档查询结果
[从 MCP 或本地文档获取的 API Schema]

### 数据层设计
[接口请求函数设计、数据加载流程]

### 状态管理方案
[使用的状态管理方式、状态结构设计]

### 错误处理策略
[API 调用失败的处理方式]`],
  ['human', `## 当前任务计划
{taskPlan}

## 当前研究笔记
{researchNotes}

## 已获取的 API Schema
{apiSchemas}

## 用户需求
{requirements}

请执行步骤2的接口与数据逻辑设计工作。`],
]);

/**
 * Apifox API 查询提示词
 */
export const apifoxQueryPrompt = ChatPromptTemplate.fromMessages([
  ['system', `你是一个 API 文档分析专家。请根据用户需求，生成用于查询 Apifox MCP 的关键词列表。

输出格式为 JSON 数组，包含要查询的接口关键词。例如：
["booking", "reservation", "lounge", "resources", "available"]`],
  ['human', `## 页面名称
{pageName}

## 功能需求
{requirements}

## 已识别的数据模型
{dataModels}

请生成用于查询 Apifox 的关键词列表。`],
]);
