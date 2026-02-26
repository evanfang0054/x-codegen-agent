# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X-CodeGen-Agent 是基于 LangChain.js 的前端代码生成工具集，采用 pnpm workspaces + Turborepo 的 Monorepo 架构，支持多种 LLM 提供商（OpenAI、Anthropic、DeepSeek、智谱、通义千问等国产模型）。

## Commands

```bash
pnpm install          # 安装依赖
pnpm build            # 构建所有包 (Turborepo)
pnpm dev              # 开发模式
pnpm test             # 运行测试
pnpm lint             # ESLint 检查
pnpm typecheck        # TypeScript 类型检查
pnpm check            # 完整检查（typecheck + lint + test）
pnpm clean            # 清理构建产物

# 发布管理
pnpm changeset        # 创建变更记录
pnpm version          # 版本升级
pnpm release          # 发布到 npm
```

## Architecture

```
x-codegen-agent/
├── packages/           # 库包（可复用的核心能力）
│   ├── types/          # 共享类型定义 @x-codegen/types
│   ├── config/         # 配置加载 @x-codegen/config
│   ├── sandbox/        # 沙箱管理 @x-codegen/sandbox
│   ├── models/         # LLM 模型管理 @x-codegen/models
│   ├── tools/          # LangChain 工具 @x-codegen/tools
│   ├── agents/         # LCEL Agent @x-codegen/agents
│   ├── workflow/       # LangGraph 工作流 @x-codegen/workflow
│   └── sdk/            # 核心 SDK 聚合 @x-codegen/sdk
├── apps/               # 应用层（各种前端入口）
│   └── cli/            # CLI 应用 @x-codegen/cli
└── tools/              # 开发工具配置
    ├── tsconfig.base.json
    └── ...
```

### 包依赖关系

```
types ──┬── config
        ├── sandbox
        └── models ──→ tools ──→ agents ──→ workflow ──→ sdk ──→ cli
```

### 各包职责

| 包名 | 职责 |
|------|------|
| `@x-codegen/types` | 共享类型定义（ModelConfig, WorkflowState, SandboxConfig 等） |
| `@x-codegen/config` | 配置加载（JSON 文件 + 环境变量） |
| `@x-codegen/sandbox` | 沙箱生命周期管理、命令执行 |
| `@x-codegen/models` | ModelFactory 单例、提供商预设、配置验证 |
| `@x-codegen/tools` | MCP 客户端（Figma、知识库、Apifox、One-day）、组件生成器、回退策略 |
| `@x-codegen/agents` | BaseAgent、ToolAgent（LCEL chain 构建） |
| `@x-codegen/workflow` | LangGraph StateGraph、工作流节点、Page-Codegen 7 步工作流 |
| `@x-codegen/sdk` | 聚合导出所有模块 |
| `@x-codegen/cli` | 命令行工具入口 |

## Import 规范

Monorepo 架构下，使用包引用而非路径别名：

```typescript
// ✅ 推荐：使用包引用
import { ModelFactory } from '@x-codegen/models';
import type { ModelConfig } from '@x-codegen/types';
import { generateCode, pageCodegen } from '@x-codegen/workflow';

// ❌ 避免：使用相对路径跨包引用
import { ModelFactory } from '../models/index.js';
```

## Key Patterns

### 模型创建模式

```typescript
import { createModel, ModelFactory } from '@x-codegen/models';

// 直接创建
const model = await createModel({
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: '...'
});

// 从预设创建（自动读取环境变量）
const model = await ModelFactory.getInstance().createFromPreset('qwen');

// 缓存模式（相同 ID 复用实例）
const model = await ModelFactory.getInstance().getOrCreate('my-model', config);
```

### Page-Codegen 7 步工作流

```typescript
import { pageCodegen, pageCodegenStream } from '@x-codegen/sdk';

// 一次性执行
const result = await pageCodegen({
  figmaUrl: 'https://figma.com/file/xxx',
  outputDir: '/path/to/output',
  templateRepo: 'https://github.com/example/react-tailwind-template',
  requirements: '实现预订页面',
  mcpServers: {
    knowledgeBase: { url: 'http://localhost:3000/mcp' },
    apifox: { apiKey: 'your-key' },
    oneDay: { url: 'http://localhost:3001/mcp' },
  },
});

// 流式执行（进度回调）
for await (const event of pageCodegenStream(options)) {
  console.log(`[${event.step}] ${event.message}`);
}

// 工作流步骤说明：
// 0. init      - 创建沙箱、克隆模板仓库、安装依赖、创建 AI 工作副本
// 1. research  - PRD 查询、静态代码分析、技术规范阅读
// 2. api-design - Apifox MCP 获取 API Schema、设计数据层
// 3. ui-design  - 组件 API 查询、交互逻辑设计
// 4. integration - 代码整合、PRD 验收
// 5. validate   - pnpm check 验证、生成 final_code.md
// 6. deliver    - 任务完成交付、上报 one-day-mcp
```

### MCP 调用（MCP 优先、本地回退）

```typescript
import { executeWithFallback, createApifoxMCPClient } from '@x-codegen/sdk';

// 所有 MCP 调用都有本地回退策略
const result = await executeWithFallback({
  mcpCall: async () => {
    const client = createApifoxMCPClient({ apiKey: 'your-key' });
    return client.searchAPIs(['booking']);
  },
  fallbackCall: async () => {
    // 本地回退逻辑
    return { success: true, data: [] };
  },
  retryConfig: { maxRetries: 5, retryInterval: 2000 },
  onError: (error, retryCount) => {
    console.warn(`MCP 调用失败 (${retryCount}): ${error.message}`);
  },
});
```

### 测试文件位置

测试文件统一放在各包的 `src/__tests__/` 目录中：

```
packages/config/src/__tests__/config.test.ts
packages/sandbox/src/__tests__/sandbox.test.ts
packages/models/src/__tests__/models.test.ts
packages/tools/src/__tests__/mcp.test.ts
packages/tools/src/__tests__/page-mcp.test.ts
packages/tools/src/__tests__/codegen.test.ts
packages/agents/src/__tests__/agents.test.ts
packages/workflow/src/__tests__/workflow.test.ts
packages/workflow/src/__tests__/page-workflow.test.ts
apps/cli/src/__tests__/cli.test.ts
```

## LCEL (LangChain Expression Language) 编码规范

本项目使用 LangChain.js 的 LCEL 声明式语法进行开发。LCEL 是一种使用管道操作符 `|` 组合组件的编码方式。

### 核心概念

**Runnable 接口**：所有 LCEL 组件都实现 `Runnable` 接口，提供统一的方法：
- `invoke()` - 单次调用，返回完整响应
- `stream()` - 流式调用，异步迭代返回 token
- `batch()` - 批量处理多个输入
- `streamEvents()` - 获取详细的事件流

### LCEL 组合模式

```typescript
// ✅ 推荐：使用 pipe() 管道操作符组合组件
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

const chain = prompt.pipe(model).pipe(new StringOutputParser());
const result = await chain.invoke({ topic: 'cats' });

// ✅ 推荐：使用 RunnableSequence.from() 显式定义序列
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';

const ragChain = RunnableSequence.from([
  {
    context: retriever.pipe(formatDocs),
    question: new RunnablePassthrough(),
  },
  prompt,
  model,
  new StringOutputParser(),
]);

// ✅ 推荐：使用 RunnableLambda 封装自定义逻辑
import { RunnableLambda } from '@langchain/core/runnables';

const customChain = RunnableLambda.from(async (input: string, config) => {
  const result = await someProcess(input);
  return nextStep.invoke(result, config);
});
```

### 流式处理

```typescript
// 流式输出 token
for await (const chunk of await chain.stream({ topic: 'cats' })) {
  process.stdout.write(chunk);
}

// 流式事件（用于调试和监控）
for await (const event of await model.streamEvents('Hello')) {
  if (event.event === 'on_chat_model_stream') {
    console.log(`Token: ${event.data.chunk.text}`);
  }
}
```

### 配置和回调

```typescript
// 使用 withConfig 配置运行时参数
const configuredChain = chain.withConfig({ runName: 'MyCustomChain' });
await configuredChain.invoke({ input: 'test' });

// 传递配置到 invoke
await chain.invoke({ input: 'test' }, { runName: 'MyCustomChain' });
```

### 工具绑定

```typescript
// 使用 bindTools 绑定工具
const llmWithTools = model.bindTools([searchTool, calculatorTool]);
const chain = prompt.pipe(llmWithTools);
```

## OpenSpec 变更管理系统

本项目使用 OpenSpec 进行规格驱动的变更管理，确保新功能有清晰的设计、规格和任务定义。

### 工作流

```
proposal → specs → design → tasks → implement → archive
```

### 可用命令

| 命令 | 用途 |
|------|------|
| `/opsx:propose` | 创建新的变更提案 |
| `/opsx:explore` | 进入探索模式思考问题 |
| `/opsx:apply` | 实现变更中的任务 |
| `/opsx:archive` | 归档已完成的变更 |

### 开发流程

1. **创建提案** - 使用 `/opsx:propose "功能描述"` 创建变更提案
2. **探索设计** - 使用 `/opsx:explore` 深入思考实现方案
3. **实现任务** - 使用 `/opsx:apply <change-name>` 执行任务
4. **归档变更** - 完成后使用 `/opsx:archive <change-name>` 归档

### 目录结构

```
openspec/
├── config.yaml          # 项目上下文配置
├── changes/             # 活跃变更
│   └── archive/         # 已归档变更
└── specs/               # 规格说明
```

### 历史记录

- `task.json` - 保留为历史参考（27 个已完成功能，v1.4.0）
- `progress.txt` - 保留为进度日志
- 归档变更位于 `openspec/changes/archive/`

## Tech Stack

- Node.js >= 20, TypeScript 5.7+
- LangChain 1.2+ (`langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`)
- LangGraph (`@langchain/langgraph`) - 状态图工作流
- MCP Adapters (`@langchain/mcp-adapters`) - Model Context Protocol 集成
- Monorepo: pnpm workspaces, Turborepo
- Build: tsup (ESM only)
- Test: Vitest
- Lint: ESLint 9 + typescript-eslint
- Package Manager: pnpm 10.27.0

## 依赖安装规范

**重要**: 每次使用 `pnpm add` 新增包时，必须先搜索获取最新合适的版本，不要依赖记忆中的版本号。

推荐流程：
1. 使用 `pnpm search <package>` 或访问 npm 查询最新版本
2. 检查与现有依赖的兼容性（特别是 peer dependencies）
3. 安装指定版本：`pnpm add <package>@<version>` 或 `pnpm add <package>@<tag>`

示例：
```bash
# 搜索包信息
pnpm view eslint

# 安装特定版本（确保兼容性）
pnpm add -D @eslint/js@9
```
