/**
 * Page-Codegen 步骤4：代码整合与PRD验收提示词
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { CORE_CONSTRAINTS } from './skill.js';

/**
 * 步骤4：代码整合与PRD验收提示词
 */
export const integrationPrompt = ChatPromptTemplate.fromMessages([
  ['system', `# 步骤4：代码整合与PRD验收

**触发条件**：\`current_step = 4\`

**前置准备**：\`Read /path/to/booking/task_plan.md\` + \`Read /path/to/booking/research_notes.md\`（获取完整上下文）

${CORE_CONSTRAINTS}

## 🔴 核心约束重申（执行前必须确认）
- [ ] 我明确知道只能修改 AI 工作副本（.ai.tsx），不能触碰原始静态模板文件
- [ ] 我不会使用 Edit/Write 工具操作原始静态模板文件
- [ ] 我不会将 AI 副本代码复制到原始文件
- [ ] 我理解违反此约束将导致整个任务失败

## 主要行动

1. **依赖文件识别与生成**（必须在主文件补全前完成）：
   - **识别依赖**：扫描 AI 工作副本中的所有 import 语句，找出本地模块引用（如 \`@/store/xxx\`、\`./utils\`）
   - **生成缺失文件**：按优先级生成缺失的依赖文件
     - **优先级1**：类型定义文件（\`types.ts\` 或 \`interface.ts\`）
     - **优先级2**：状态管理文件（Zustand Store，如 \`useBookingStore.ts\`）
     - **优先级3**：工具函数文件（\`utils.ts\` 或 \`helpers.ts\`）
   - **质量保证**：每个文件生成后确保可被主文件正常导入，禁止生成空文件

2. **代码整合**：
   - 将步骤2-3设计的逻辑补全到 AI 工作副本（.ai.tsx 文件）
   - **绝对禁止**修改原始静态模板文件（违反即视为失败）
   - **绝对禁止**使用 Edit/Write 工具操作原始静态模板文件
   - **绝对禁止**将 AI 副本代码复制、覆盖或合并到原始文件
   - **保留**静态模板代码的样式类名（Tailwind CSS）和DOM结构
   - **移除**所有TODO注释，替换为实际业务逻辑代码
   - **优先**使用 \`@dragonpass/atom-ui-mobile\` 组件
   - **重要**：所有代码补全工作仅在 AI 副本中完成，原始文件保持完全不变

3. **PRD功能验收**：
   - 从 \`research_notes.md\` 的 "功能清单（验收标准）" 获取所有功能点
   - 逐条验证功能是否正确实现
   - 标记状态：✅已实现 / ⚠️部分实现 / ❌未实现
   - 对未通过验收的功能立即修正
   - 重复验收直到全部 ✅
   - 将验收结果记录到 \`research_notes.md\`

## 完成后

1. 更新 \`task_plan.md\`：标记阶段4完成，记录错误，更新状态为阶段5

2. **自动进入步骤5**

## 输出格式

请按照以下结构输出代码整合结果：

### 生成的依赖文件
[列出生成的类型定义、状态管理、工具函数文件]

### 代码补全内容
[AI 工作副本中补全的代码]

### PRD 验收结果
[功能验收清单及状态]

### 遗留问题
[未解决的问题或需要后续处理的事项]`],
  ['human', `## 当前任务计划
{taskPlan}

## 当前研究笔记
{researchNotes}

## API Schema 列表
{apiSchemas}

## AI 工作副本文件
{aiWorkFiles}

## 用户需求
{requirements}

请执行步骤4的代码整合与PRD验收工作。`],
]);

/**
 * 代码补全提示词
 */
export const codeCompletionPrompt = ChatPromptTemplate.fromMessages([
  ['system', `你是一个前端代码专家。请根据研究结果，补全 AI 工作副本中的代码。

**重要约束**：
1. 只能修改 AI 工作副本（.ai.tsx），不能修改原始静态模板文件
2. 保留静态模板的 Tailwind CSS 类名和 DOM 结构
3. 移除所有 TODO 注释，替换为实际业务逻辑
4. 优先使用 \`@dragonpass/atom-ui-mobile\` 组件库

输出完整的补全后代码。`],
  ['human', `## 原始静态模板代码（仅供参考，不可修改）
{originalCode}

## AI 工作副本当前代码
{aiWorkCode}

## API Schema
{apiSchemas}

## 组件 API
{componentApis}

## 交互逻辑设计
{interactionDesign}

## 功能需求
{requirements}

请补全 AI 工作副本中的代码。`],
]);
