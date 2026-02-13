# X-CodeGen-Agent

基于 LangChain.js 的前端代码生成 CLI 工具，支持多种 LLM 提供商和完整的工作流编排。

## 特性

- **CLI 工具**: 命令行直接运行，无需编写代码
- **多模型支持**: OpenAI、Anthropic、DeepSeek、智谱 GLM、通义千问、月之暗面、百川、MiniMax
- **LangGraph 工作流**: 多步骤代码生成工作流，支持检查点持久化和恢复
- **MCP 集成**: Figma 设计数据提取、知识库 PRD 查询
- **沙箱环境**: 隔离的代码执行环境，支持 Git 克隆和依赖安装
- **LCEL 架构**: 使用 LangChain Expression Language 构建可组合的 Agent 链

## 技术栈

| Category | Technology |
|----------|------------|
| Runtime | Node.js >= 20 |
| Language | TypeScript 5.7+ |
| Framework | LangChain 1.2+, LangGraph |
| CLI | commander, chalk, ora |
| Build | tsup (ESM only) |
| Test | Vitest |
| Lint | ESLint 9 + typescript-eslint |
| Package Manager | pnpm 10.27.0 |

## 安装

### 全局安装（推荐）

```bash
# 使用 pnpm
pnpm install -g x-codegen-agent

# 或使用 npm
npm install -g x-codegen-agent
```

### 从源码安装

```bash
git clone https://github.com/evanfang/x-codegen-agent.git
cd x-codegen-agent
pnpm install
pnpm build
pnpm link --global
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

你也可以作为 SDK 在代码中使用：

### 创建模型实例

```typescript
import { createModel, createModelFromPreset, ModelFactory } from 'x-codegen-agent';

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

### 3. 使用 Agent

```typescript
import { BaseAgent, ToolAgent, createBaseAgent, createToolAgent } from 'x-codegen-agent';
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

### 4. 代码生成工作流

```typescript
import { generateCode, generateCodeStream } from 'x-codegen-agent';

// 一次性执行
const result = await generateCode({
  figmaUrl: 'https://www.figma.com/file/xxx/Design',
  templateRepo: 'https://github.com/example/react-template',
  outputDir: '/path/to/output',
  requirements: '实现用户登录页面',
  maxRetries: 3,
});

if (result.success) {
  console.log('生成的文件:', result.files);
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

## API 文档

### 模型管理

| 函数 | 说明 |
|------|------|
| `createModel(config)` | 创建模型实例 |
| `createModelFromPreset(preset)` | 从预设创建模型 |
| `getOrCreateModel(id, config)` | 获取或创建缓存模型 |
| `ModelFactory.getInstance()` | 获取工厂单例 |

### Agent

| 类/函数 | 说明 |
|---------|------|
| `BaseAgent` | 基础 Agent，支持 LCEL chain 构建 |
| `ToolAgent` | 工具调用 Agent，支持 bindTools |
| `createBaseAgent(config)` | 创建基础 Agent |
| `createToolAgent(config)` | 创建工具调用 Agent |

### 工作流

| 函数 | 说明 |
|------|------|
| `generateCode(options)` | 一次性执行代码生成 |
| `generateCodeStream(options)` | 流式执行（返回 AsyncGenerator） |
| `createCodeGenGraph()` | 创建带检查点的 StateGraph |
| `createCodeGenGraphWithoutCheckpointer()` | 创建无检查点的 StateGraph |

### 沙箱

| 类/函数 | 说明 |
|---------|------|
| `SandboxManager` | 沙箱生命周期管理 |
| `CommandExecutor` | 命令执行器 |
| `createSandbox(config)` | 创建沙箱实例 |
| `createExecutor(config)` | 创建命令执行器 |

### MCP 工具

| 类/函数 | 说明 |
|---------|------|
| `FigmaMCPClient` | Figma 设计数据提取 |
| `KnowledgeBaseMCPClient` | 知识库 PRD 查询 |

## 项目结构

```
x-codegen-agent/
├── src/
│   ├── cli/              # CLI 模块
│   │   ├── index.ts        # CLI 入口
│   │   ├── commands/       # 命令实现
│   │   │   ├── generate.ts # generate 命令
│   │   │   └── index.ts    # 命令导出
│   │   └── utils/          # CLI 工具
│   │       ├── logger.ts   # 彩色日志
│   │       └── progress.ts # Spinner 进度
│   ├── agents/           # Agent 实现
│   │   ├── base-agent.ts   # BaseAgent 基础类
│   │   └── tool-agent.ts   # ToolAgent 工具调用类
│   ├── config/           # 配置加载
│   ├── models/           # LLM 模型管理
│   │   ├── factory.ts      # ModelFactory 单例
│   │   ├── providers.ts    # 提供商预设
│   │   └── helpers.ts      # 工具函数
│   ├── sandbox/          # 沙箱管理
│   │   ├── manager.ts      # 沙箱生命周期
│   │   └── executor.ts     # 命令执行器
│   ├── tools/            # LangChain 工具
│   │   ├── codegen/        # 代码生成工具
│   │   └── mcp/            # MCP 集成
│   ├── types/            # TypeScript 类型定义
│   ├── workflow/         # LangGraph 工作流
│   │   ├── graph.ts        # StateGraph 构建
│   │   ├── nodes/          # 工作流节点
│   │   └── index.ts        # 对外 API
│   └── index.ts          # SDK 入口文件
├── dist/                 # 构建产物
├── task.json             # 任务追踪
├── progress.txt          # 进度日志
└── init.sh               # 环境初始化脚本
```

## 开发命令

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

## 示例

### 自定义 Agent 配置

```typescript
import { ToolAgent } from 'x-codegen-agent';

const agent = new ToolAgent({
  name: 'code-reviewer',
  description: '代码审查 Agent',
  model,
  systemPrompt: `你是一个专业的代码审查专家。
请从以下方面进行审查：
1. 代码质量
2. 安全性
3. 性能
4. 可维护性`,
  maxIterations: 5,
  temperature: 0.3,
  timeout: 60000,
  tools: [lintTool, testTool],
});

// 流式执行
for await (const event of agent.stream({ input: '审查这段代码...' })) {
  if (event.type === 'token') {
    process.stdout.write(event.content);
  }
}
```

### 沙箱操作

```typescript
import { createSandbox } from 'x-codegen-agent';

const sandbox = createSandbox({
  rootDir: '/tmp/my-sandbox',
  env: { NODE_ENV: 'development' },
});

await sandbox.initialize();

// 文件操作
await sandbox.writeFile('src/index.ts', 'console.log("Hello");');
const content = await sandbox.readFile('src/index.ts');

// 命令执行
const executor = sandbox.getExecutor();
await executor.pnpm(['install']);
await executor.pnpm(['build']);

// 清理
await sandbox.cleanup();
```

## License

MIT
