# X-CodeGen-Agent

基于 LangChain.js 的前端代码生成工具集，采用 Monorepo 架构，支持多种 LLM 提供商和完整的工作流编排。

## 特性

- **Monorepo 架构**: 使用 pnpm workspaces + Turborepo 管理多包项目
- **CLI 工具**: 命令行直接运行，无需编写代码
- **多模型支持**: OpenAI、Anthropic、DeepSeek、智谱 GLM、通义千问、月之暗面、百川、MiniMax
- **LangGraph 工作流**: 多步骤代码生成工作流，支持检查点持久化和恢复
- **MCP 集成**: Figma 设计数据提取、知识库 PRD 查询
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
  --template https://github.com/example/react-template \
  --requirements "实现用户登录页面" \
  --provider deepseek \
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
| `--template <repo>` | `-t` | 模板仓库 URL | 否 |
| `--requirements <text>` | `-r` | 需求描述 | 否 |
| `--max-retries <n>` | | 最大重试次数（默认 3） | 否 |
| `--provider <name>` | | LLM 提供商 | 否 |
| `--model <name>` | | 模型名称 | 否 |
| `--verbose` | `-v` | 详细日志 | 否 |

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
  // 沙箱
  createSandbox,
  // 工具
  FigmaMCPClient,
  KnowledgeBaseMCPClient,
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

### 代码生成工作流

```typescript
import { generateCode, generateCodeStream } from '@x-codegen/sdk';

// 一次性执行
const result = await generateCode({
  figmaUrl: 'https://www.figma.com/file/xxx/Design',
  templateRepo: 'https://github.com/example/react-template',
  outputDir: '/path/to/output',
  requirements: '实现用户登录页面',
  maxRetries: 3,
});

if (result.success) {
  console.log('生成的文件:', result.generatedFiles);
}

// 流式执行（实时进度）
for await (const event of generateCodeStream({
  figmaUrl: 'https://www.figma.com/file/xxx/Design',
  outputDir: '/path/to/output',
  requirements: '实现用户登录页面',
})) {
  console.log(`[${event.step}] ${event.message}`);
}
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

## 工作流节点说明

| 节点 | 职责 |
|------|------|
| `init` | 创建沙箱、克隆模板、安装依赖 |
| `template` | Figma MCP 获取设计 → 生成静态代码 |
| `completion` | 知识库 MCP 获取 PRD → LLM 补全逻辑 |
| `validate` | pnpm check → 验证通过则复制到宿主 |

## License

MIT
