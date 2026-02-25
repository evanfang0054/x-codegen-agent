# X-CodeGen-Agent

基于 LangChain.js 的前端代码生成工具集，采用 Monorepo 架构，支持多种 LLM 提供商和完整的工作流编排。

## 特性

- **Monorepo 架构**: 使用 pnpm workspaces + Turborepo 管理多包项目
- **CLI 工具**: 命令行直接运行，无需编写代码
- **多模型支持**: OpenAI、Anthropic、DeepSeek、智谱 GLM、通义千问、月之暗面、百川、MiniMax
- **Page-Codegen 7 步工作流**: 完整的前端页面胶水代码补全工作流
- **MCP 集成**: Figma 设计数据提取、知识库 PRD 查询、Apifox API Schema、One-day 代码上报
- **MCP 优先、本地回退**: 所有 MCP 调用都有本地回退策略，确保稳定性
- **沙箱环境**: 隔离的代码执行环境，支持 Git 克隆和依赖安装
- **LCEL 架构**: 使用 LangChain Expression Language 构建可组合的 Agent 链

## 架构设计

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
```

### 包依赖关系

```
types ──┬── config
        ├── sandbox
        └── models ──→ tools ──→ agents ──→ workflow ──→ sdk ──→ cli
```

## 技术栈

| Category | Technology |
|----------|------------|
| Runtime | Node.js >= 20 |
| Language | TypeScript 5.7+ |
| Framework | LangChain 1.2+, LangGraph |
| Monorepo | pnpm workspaces, Turborepo |
| CLI | commander, chalk, ora |
| Build | tsup (ESM only) |
| Test | Vitest |
| Lint | ESLint 9 + typescript-eslint |
| Package Manager | pnpm 10.27.0 |

## 安装

### 全局安装（推荐）

```bash
# 使用 pnpm
pnpm install -g @x-codegen/cli

# 或使用 npm
npm install -g @x-codegen/cli
```

### 从源码安装

```bash
git clone https://github.com/evanfang/x-codegen-agent.git
cd x-codegen-agent
pnpm install
pnpm build
cd apps/cli && pnpm link --global
```

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写你的 API Key：

```env
# 至少配置一个 LLM 提供商
OPENAI_API_KEY=your_openai_api_key
# 或
ANTHROPIC_API_KEY=your_anthropic_api_key
# 或国产模型
DEEPSEEK_API_KEY=your_deepseek_api_key
```

### 2. 使用 CLI 生成代码

```bash
# 基础用法
x-codegen generate \
  --figma https://www.figma.com/file/xxx/Design \
  --output ./output

# 完整参数
x-codegen generate \
  --figma https://www.figma.com/file/xxx/Design \
  --output ./output \
  --template https://github.com/example/react-tailwind-template \
  --project booking-app \
  --requirements "实现用户登录页面" \
  --max-retries 5 \
  --verbose

# 查看帮助
x-codegen --help
x-codegen generate --help
```

### CLI 命令选项

| 选项 | 简写 | 说明 | 必需 |
|------|------|------|------|
| `--figma <url>` | `-f` | Figma 设计链接 | 是 |
| `--output <dir>` | `-o` | 输出目录 | 是 |
| `--template <repo>` | `-t` | GitHub 模板仓库 URL | 否 |
| `--project <name>` | `-p` | 项目名称（Monorepo） | 否 |
| `--requirements <text>` | `-r` | 需求描述 | 否 |
| `--max-retries <n>` | | 最大重试次数（默认 3） | 否 |
| `--provider <name>` | | LLM 提供商 | 否 |
| `--model <name>` | | 模型名称 | 否 |
| `--verbose` | `-v` | 详细日志 | 否 |

## Page-Codegen 7 步工作流

Page-Codegen 工作流是一个完整的前端页面胶水代码补全流程：

```
START → init → research → api-design → ui-design → integration → validate → deliver → END
```

### 工作流步骤

| 步骤 | 名称 | 职责 |
|------|------|------|
| 0 | **init** | 创建沙箱、克隆模板仓库、安装依赖、创建 AI 工作副本 |
| 1 | **research** | PRD 查询、静态代码分析、技术规范阅读 |
| 2 | **api-design** | Apifox MCP 获取 API Schema、设计数据层 |
| 3 | **ui-design** | 组件 API 查询、交互逻辑设计 |
| 4 | **integration** | 代码整合、PRD 验收 |
| 5 | **validate** | pnpm check 验证、生成 final_code.md |
| 6 | **deliver** | 任务完成交付、上报 one-day-mcp |

### 核心约束

1. **原始文件只读**: 原始静态模板文件完全不被修改
2. **AI 副本可写**: 所有代码补全工作仅在 AI 工作副本（.ai.tsx）中完成
3. **三文件模式**: task_plan.md、research_notes.md、final_code.md

### 使用示例

```typescript
import { pageCodegen, pageCodegenStream } from '@x-codegen/sdk';

// 一次性执行
const result = await pageCodegen({
  figmaUrl: 'https://www.figma.com/file/xxx/Design',
  outputDir: '/path/to/output',
  templateRepo: 'https://github.com/example/react-tailwind-template',
  requirements: '实现预订页面',
  mcpServers: {
    knowledgeBase: { url: 'http://localhost:3000/mcp' },
    apifox: { apiKey: 'your-api-key' },
    oneDay: { url: 'http://localhost:3001/mcp' },
  },
});

// 流式执行（实时进度）
for await (const event of pageCodegenStream(options)) {
  console.log(`[${event.step}] ${event.message}`);
  if (event.data?.progress) {
    console.log(`进度: ${event.data.progress}%`);
  }
}
```

## SDK 用法

```typescript
import {
  // 模型管理
  createModel,
  createModelFromPreset,
  ModelFactory,
  // Agent
  BaseAgent,
  ToolAgent,
  createBaseAgent,
  createToolAgent,
  // 工作流
  generateCode,
  generateCodeStream,
  pageCodegen,
  pageCodegenStream,
  // 沙箱
  createSandbox,
  // 工具
  FigmaMCPClient,
  KnowledgeBaseMCPClient,
  ApifoxMCPClient,
  OneDayMCPClient,
  executeWithFallback,
} from '@x-codegen/sdk';
```

### 创建模型实例

```typescript
import { createModel, createModelFromPreset, ModelFactory } from '@x-codegen/sdk';

// 方式一：直接创建
const model = await createModel({
  provider: 'deepseek',
  model: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY,
});

// 方式二：从预设创建（自动读取环境变量）
const model = await createModelFromPreset('qwen');

// 方式三：缓存模式（相同 ID 复用实例）
const factory = ModelFactory.getInstance();
const model = await factory.getOrCreate('my-model', {
  provider: 'openai',
  model: 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});
```

### 使用 Agent

```typescript
import { createBaseAgent, createToolAgent } from '@x-codegen/sdk';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';

// 基础 Agent
const agent = createBaseAgent({
  name: 'my-agent',
  model,
  systemPrompt: '你是一个有帮助的助手。',
});

const result = await agent.execute({ input: '你好！' });
console.log(result.content);

// 工具调用 Agent
const weatherTool = new DynamicStructuredTool({
  name: 'get_weather',
  description: '获取指定城市的天气',
  schema: z.object({ city: z.string() }),
  func: async ({ city }) => `The weather in ${city} is sunny.`,
});

const toolAgent = createToolAgent({
  name: 'weather-agent',
  model,
  tools: [weatherTool],
});

const toolResult = await toolAgent.execute({
  input: '北京今天天气怎么样？',
});
```

### MCP 调用（带回退策略）

```typescript
import { executeWithFallback, createApifoxMCPClient } from '@x-codegen/sdk';

const client = createApifoxMCPClient({ apiKey: 'your-key' });

// MCP 优先，本地回退
const result = await executeWithFallback({
  mcpCall: async () => client.searchAPIs(['booking']),
  fallbackCall: async () => ({ success: true, data: [] }),
  retryConfig: { maxRetries: 5, retryInterval: 2000 },
  onError: (error, retryCount) => {
    console.warn(`MCP 调用失败 (${retryCount}): ${error.message}`);
  },
});
```

## 开发命令

```bash
pnpm install          # 安装依赖
pnpm build            # 构建所有包 (Turborepo)
pnpm dev              # 开发模式
pnpm test             # 运行测试
pnpm lint             # ESLint 检查
pnpm typecheck        # TypeScript 类型检查
pnpm check            # 完整检查（typecheck + lint + test）

# 发布管理
pnpm changeset        # 创建变更记录
pnpm version          # 版本升级
pnpm release          # 发布到 npm
```

## 支持的模型提供商

| Provider | 环境变量 | 默认模型 |
|----------|---------|---------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o |
| Anthropic | `ANTHROPIC_API_KEY` | claude-sonnet-4-20250514 |
| DeepSeek | `DEEPSEEK_API_KEY` | deepseek-chat |
| 智谱 GLM | `ZHIPU_API_KEY` | glm-4-plus |
| 通义千问 | `DASHSCOPE_API_KEY` | qwen-plus |
| 月之暗面 | `MOONSHOT_API_KEY` | moonshot-v1-8k |
| 百川 | `BAICHUAN_API_KEY` | Baichuan4 |
| MiniMax | `MINIMAX_API_KEY` | abab6.5s-chat |

## MCP 服务器支持

| MCP Server | 功能 | 环境变量 |
|------------|------|---------|
| Knowledge Base | PRD 查询、组件文档 | `KB_MCP_URL` |
| Apifox | API Schema 获取 | `APIFOX_API_KEY`, `APIFOX_PROJECT_ID` |
| One-day | 静态模板获取、代码完成上报 | `ONE_DAY_MCP_URL` |
| Figma | 设计数据提取 | `FIGMA_ACCESS_TOKEN` |

## 测试覆盖

| 包 | 测试用例 |
|----|---------|
| @x-codegen/types | 21 |
| @x-codegen/config | 24 |
| @x-codegen/sandbox | 29 |
| @x-codegen/models | 27 |
| @x-codegen/tools | 39 |
| @x-codegen/agents | 20 |
| @x-codegen/workflow | 25 |
| @x-codegen/cli | 41 |
| **总计** | **226** |

## License

MIT
