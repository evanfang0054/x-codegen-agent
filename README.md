# X-CodeGen-Agent

基于 LangChain 的代码生成 Agent

## 技术栈

- **Runtime**: Node.js >= 20
- **Language**: TypeScript 5.7+
- **Framework**: LangChain 1.2+
- **Build**: tsup
- **Test**: Vitest
- **Lint**: ESLint 9 + typescript-eslint

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制环境变量模板并填写配置：

```bash
cp .env.example .env
```

### 开发模式

```bash
pnpm dev
```

### 构建

```bash
pnpm build
```

### 测试

```bash
pnpm test
```

### 代码检查

```bash
pnpm lint
pnpm lint:fix
```

## 项目结构

```
x-codegen-agent/
├── src/
│   ├── agents/       # Agent 实现
│   ├── tools/        # LangChain 工具
│   ├── types/        # 类型定义
│   ├── utils/        # 工具函数
│   └── index.ts      # 入口文件
├── dist/             # 构建产物
├── tsconfig.json     # TypeScript 配置
├── tsup.config.ts    # 构建配置
├── vitest.config.ts  # 测试配置
└── eslint.config.js  # ESLint 配置
```

## 依赖版本

| Package | Version |
|---------|---------|
| langchain | ^1.2.23 |
| @langchain/core | ^1.0.0 |
| @langchain/openai | ^1.2.7 |
| @langchain/anthropic | ^1.0.0 |
| zod | ^3.24.0 |

## License

MIT
