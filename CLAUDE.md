# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

X-CodeGen-Agent 是基于 LangChain.js 的页面代码生成 Agent SDK，支持多种 LLM 提供商（OpenAI、Anthropic、DeepSeek、智谱、通义千问等国产模型）。

## Commands

```bash
pnpm install          # 安装依赖
pnpm dev              # 开发模式 (tsx 运行)
pnpm build            # 生产构建 (tsup)
pnpm test             # 运行测试 (vitest)
pnpm test -- --run    # 单次测试运行
pnpm test:coverage    # 测试覆盖率
pnpm lint             # ESLint 检查
pnpm lint:fix         # 自动修复 lint 问题
pnpm typecheck        # TypeScript 类型检查
pnpm check            # 项目检查（建议添加: pnpm typecheck && pnpm lint && pnpm test -- --run）
```

## Architecture

```
src/
├── models/           # LLM 模型管理（核心模块）
│   ├── factory.ts    # ModelFactory 单例，创建/缓存模型实例
│   ├── providers.ts  # 提供商预设（OpenAI/Anthropic/DeepSeek/智谱/通义千问等）
│   └── helpers.ts    # 配置验证、ID生成、哈希计算
├── config/           # 配置加载
│   └── loader.ts     # 支持 JSON 文件 + 环境变量
├── types/            # TypeScript 类型定义
│   ├── models.ts     # ModelConfig, ProviderPreset, ModelInstance 等
│   ├── workflow.ts   # 工作流状态类型 (CodeGenState, CodeGenOptions 等)
│   ├── sandbox.ts    # 沙箱类型 (SandboxConfig, CommandResult 等)
│   └── mcp.ts        # MCP 配置类型 (FigmaMCPConfig, KnowledgeBaseMCPConfig 等)
├── workflow/         # LangGraph 工作流（核心模块）
│   ├── graph.ts      # StateGraph 构建和编译
│   ├── index.ts      # 对外 API (generateCode, generateCodeStream)
│   └── nodes/        # 工作流节点函数
│       ├── init.ts       # 沙箱初始化、克隆模板、安装依赖
│       ├── template.ts   # Figma MCP 获取设计 → 生成静态代码
│       ├── completion.ts # 知识库 MCP 获取 PRD → 补全业务逻辑
│       └── validate.ts   # pnpm check → 验证通过则输出到宿主
├── sandbox/          # 沙箱管理
│   ├── manager.ts    # 沙箱生命周期管理
│   └── executor.ts   # 命令执行器
├── tools/            # LangChain 工具
│   ├── mcp/          # MCP 集成
│   │   ├── figma-client.ts      # Figma MCP 客户端
│   │   └── knowledge-base.ts    # 知识库 MCP 客户端
│   └── codegen/      # 代码生成工具
│       └── generate-component.ts # React + Tailwind 组件生成器
├── agents/           # Agent 实现（待开发）
└── index.ts          # 统一导出入口
```

## Path Aliases (tsconfig.json)

项目配置了路径别名，方便模块引用：

| 别名 | 映射路径 |
|------|---------|
| `@/*` | `src/*` |
| `@models/*` | `src/models/*` |
| `@config/*` | `src/config/*` |
| `@types/*` | `src/types/*` |
| `@agents/*` | `src/agents/*` |
| `@tools/*` | `src/tools/*` |
| `@utils/*` | `src/utils/*` |

**引用规范**: 项目内部引用必须使用路径别名，保持一致性。

```typescript
// ✅ 推荐：使用路径别名
import { ModelFactory } from '@models/factory.js';
import type { ModelConfig } from '@types/models.js';
import { loadConfig } from '@config/loader.js';

// ❌ 避免：使用相对路径
import { ModelFactory } from '../models/factory.js';
```

## Key Patterns

### 模型创建模式（外部使用）
```typescript
// 外部包引用方式
import { createModel, ModelFactory } from 'x-codegen-agent';

// 直接创建
const model = await createModel({ provider: 'deepseek', model: 'deepseek-chat', apiKey: '...' });

// 从预设创建（自动读取环境变量）
const model = await ModelFactory.getInstance().createFromPreset('qwen');

// 缓存模式（相同 ID 复用实例）
const model = await ModelFactory.getInstance().getOrCreate('my-model', config);
```

### 项目内部引用模式
```typescript
// 内部模块间引用使用路径别名
import { ModelFactory } from '@models/index.js';
import type { ModelConfig } from '@types/index.js';
import { validateModelConfig } from '@models/helpers.js';
```

### 国产模型支持
通过 OpenAI 兼容 API 支持：DeepSeek、智谱 GLM、通义千问、月之暗面、百川、MiniMax。预设配置在 `src/models/providers.ts`，环境变量名见 `.env.example`。

### 代码生成工作流使用
```typescript
import { generateCode, generateCodeStream } from 'x-codegen-agent';

// 一次性执行
const result = await generateCode({
  figmaUrl: 'https://figma.com/file/xxx',
  templateRepo: 'https://github.com/example/react-template', // 可选
  outputDir: '/path/to/output',
  requirements: '实现用户登录页面',
  maxRetries: 3,
});

// 流式执行（进度回调）
for await (const event of generateCodeStream(options)) {
  console.log(`[${event.step}] ${event.message}`);
}

// 工作流步骤说明：
// 1. init      - 创建沙箱、克隆模板、安装依赖
// 2. template  - Figma MCP 获取设计 → LLM 生成静态代码
// 3. completion - 知识库 MCP 获取 PRD → LLM 补全业务逻辑
// 4. validate  - pnpm check → 验证通过则输出到宿主环境
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

## Long-Running Agent 工作流程

本项目采用 Anthropic 推荐的长时间运行 Agent 工作流程，解决跨多个上下文窗口的一致性进度问题。

参考文章：[Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

### 核心问题

长时间运行的 Agent 面临两个主要挑战：
1. **一次性完成过多** - Agent 尝试一次性完成所有任务，导致上下文耗尽时功能半成品
2. **过早宣布完成** - Agent 看到一些进展后过早认为任务已完成

### 解决方案：双 Agent 架构

#### 1. 初始化 Agent (Initializer Agent)
首次运行时设置环境：
- 创建 `task.json` - 功能需求列表，所有功能初始标记为 `passes: false`
- 创建 `progress.txt` - 进度日志文件
- 创建初始 git commit 记录文件变更

#### 2. 编码 Agent (Coding Agent)
每次后续会话的工作流程：

```
┌─────────────────────────────────────────────────────────────┐
│                    Coding Agent 工作流程                      │
├─────────────────────────────────────────────────────────────┤
│  1. 获取上下文                                                 │
│     ├─ 运行 pwd 确认工作目录                                    │
│     ├─ 读取 git log 了解最近工作                                │
│     ├─ 读取 progress.txt 了解进度                              │
│     └─ 读取 task.json 选择下一个待完成功能                       │
│                                                              │
│  2. 验证环境                                                   │
│     ├─ 运行 init.sh 启动开发服务                                │
│     └─ 执行基础端到端测试确保环境正常                             │
│                                                              │
│  3. 增量开发                                                   │
│     ├─ 一次只处理一个功能                                       │
│     ├─ 编写代码并测试                                           │
│     └─ 端到端验证功能完整性                                      │
│                                                              │
│  4. 清理状态                                                   │
│     ├─ 确保代码无重大 bug                                       │
│     ├─ 更新 task.json 标记完成状态                              │
│     ├─ git commit 提交变更                                     │
│     └─ 更新 progress.txt 记录进度                               │
└─────────────────────────────────────────────────────────────┘
```

### 关键文件

| 文件 | 用途 |
|------|------|
| `task.json` | 功能需求列表，JSON 格式（比 Markdown 更不易被误改） |
| `progress.txt` | 会话进度日志，记录每次工作内容 |
| `init.sh` | 环境初始化脚本，启动开发服务器等 |

### task.json 结构

```json
{
  "project": "项目名称",
  "features": [
    {
      "id": "feat-001",
      "category": "functional",
      "description": "功能描述",
      "priority": "high",
      "steps": ["步骤1", "步骤2", "步骤3"],
      "passes": false,
      "notes": "备注信息"
    }
  ]
}
```

**重要规则**：
- 只允许修改 `passes` 字段来标记完成状态
- 不允许删除或编辑测试/功能描述
- 只有经过完整端到端测试后才能标记 `passes: true`

### progress.txt 格式

```
## [YYYY-MM-DD HH:MM] Session Summary
- 完成了什么
- 正在进行什么
- 下一步需要做什么
- 任何阻塞或问题
```

### 失败模式与解决方案

| 问题 | 解决方案 |
|------|---------|
| 过早宣布项目完成 | 使用 task.json 明确列出所有功能 |
| 留下 bug 或未记录的进度 | 会话结束时 git commit + 更新 progress.txt |
| 过早标记功能完成 | 必须端到端测试后才能标记 passes: true |
| 花时间弄清楚如何运行应用 | init.sh 脚本标准化启动流程 |

### 会话启动检查清单

每次新会话开始时：
1. ✅ `pwd` - 确认工作目录
2. ✅ 读取 `progress.txt` - 了解之前做了什么
3. ✅ 读取 `task.json` - 选择下一个高优先级功能
4. ✅ `git log --oneline -20` - 查看最近提交
5. ✅ 运行 `init.sh` - 启动开发环境
6. ✅ 执行基础测试 - 确保环境正常

## Tech Stack

- Node.js >= 20, TypeScript 5.7+
- LangChain 1.2+ (`langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`)
- LangGraph (`@langchain/langgraph`) - 状态图工作流
- MCP Adapters (`@langchain/mcp-adapters`) - Model Context Protocol 集成
- simple-git - Git 操作
- nanoid - ID 生成
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
