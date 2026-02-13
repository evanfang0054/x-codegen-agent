# 示例代码说明

本目录包含 X-CodeGen-Agent 的使用示例。

## 运行示例

确保已安装依赖并配置了环境变量：

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填写你的 API Key
```

运行示例：

```bash
# 基础 Agent 示例
pnpm tsx examples/basic-agent.ts

# 模型管理示例
pnpm tsx examples/model-factory.ts

# 沙箱管理示例
pnpm tsx examples/sandbox-demo.ts

# 工作流示例（需要完整配置）
pnpm tsx examples/workflow-demo.ts
```

## 示例说明

| 文件 | 说明 |
|------|------|
| `basic-agent.ts` | Agent 基础用法，包括 BaseAgent、ToolAgent 和流式输出 |
| `model-factory.ts` | 模型管理，包括创建、缓存、多提供商支持 |
| `sandbox-demo.ts` | 沙箱管理，包括文件操作、命令执行 |
| `workflow-demo.ts` | 代码生成工作流，包括检查点和流式执行 |

## 环境变量要求

不同示例需要的环境变量：

| 示例 | 必需的环境变量 |
|------|---------------|
| `basic-agent.ts` | 任一 LLM 提供商的 API Key |
| `model-factory.ts` | 任一 LLM 提供商的 API Key |
| `sandbox-demo.ts` | 无 |
| `workflow-demo.ts` | `FIGMA_ACCESS_TOKEN`, `KNOWLEDGE_BASE_MCP_URL` |
