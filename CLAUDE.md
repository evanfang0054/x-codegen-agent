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
│   └── models.ts     # ModelConfig, ProviderPreset, ModelInstance 等
├── agents/           # Agent 实现（待开发）
├── tools/            # LangChain 工具（待开发）
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

## Tech Stack

- Node.js >= 20, TypeScript 5.7+
- LangChain 1.2+ (`langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/anthropic`)
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
