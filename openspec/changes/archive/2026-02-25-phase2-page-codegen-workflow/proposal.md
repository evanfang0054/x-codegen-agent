# Phase 2: Page-Codegen Workflow

## Summary

实现 Page-Codegen 7 步工作流，包括完整的类型定义、提示词模板、MCP 客户端扩展、工作流节点和 CLI 集成。新增智谱 GLM 模型支持和完善测试覆盖。

## Goals

- [x] 定义 Page-Codegen 类型系统
- [x] 转换提示词为 ChatPromptTemplate
- [x] 扩展 MCP 客户端支持多传输方式
- [x] 实现 7 步工作流节点
- [x] 构建 LangGraph StateGraph
- [x] 集成智谱 GLM 模型
- [x] 完成端到端测试

## Non-goals

- 生产环境部署
- 发布到 npm
- 实际 Figma API 集成测试

## Affected Packages

| Package | Changes |
|---------|---------|
| @x-codegen/types | PageWorkflowStep, TaskPlan, ResearchNotes 等类型 |
| @x-codegen/tools | One-day/Apifox MCP 客户端、回退策略 |
| @x-codegen/workflow | 7 步节点、page-graph、提示词模板 |
| @x-codegen/sdk | Page-Codegen 相关导出 |
| @x-codegen/cli | generate 命令更新、端到端测试 |

## Features Completed

### Types (feat-016)
- feat-016: Page-Codegen 类型定义
  - PageWorkflowStep 枚举（7 步 + error）
  - TaskPlan、ResearchNotes、APISchemaDefinition
  - MCPCallResult、MCPServerConfig
  - PageCodegenStateAnnotation

### Prompts (feat-017)
- feat-017: 提示词转换
  - skill.ts - 核心约束和步骤 0
  - step1.ts ~ step6.ts - 6 个步骤的 ChatPromptTemplate

### MCP (feat-018)
- feat-018: MCP 客户端扩展
  - fallback-strategy.ts - MCP 优先、本地回退
  - one-day-client.ts - One-day MCP 客户端
  - apifox-client.ts - Apifox MCP 客户端

### Workflow Nodes (feat-020)
- feat-020: 7 步工作流节点
  - init.ts - 创建沙箱、克隆模板、安装依赖
  - research.ts - 需求与代码研究
  - api-design.ts - 接口与数据逻辑设计
  - ui-design.ts - UI 组件与交互逻辑设计
  - integration.ts - 代码整合与 PRD 验收
  - validate.ts - 代码质量验证
  - deliver.ts - 任务完成交付

### Graph (feat-021)
- feat-021: 工作流图构建
  - LangGraph StateGraph 实现
  - PageCodeGenerator 类
  - pageCodegen, pageCodegenStream 便捷函数

### SDK (feat-022)
- feat-022: SDK 聚合导出更新
  - 导出 Page-Codegen 相关类型
  - 导出工作流函数

### CLI (feat-023)
- feat-023: CLI 命令更新
  - generate 命令使用 7 步工作流
  - 流式输出和进度显示

### Workflow Enhancement (feat-024)
- feat-024: 项目模板克隆功能
  - 支持 --template 参数
  - GitHub 仓库克隆
  - 依赖安装

### Testing (feat-025, feat-026, feat-027)
- feat-025: 智谱 GLM 模型集成测试
  - glm-5 模型支持
  - 集成测试文件创建
- feat-026: 测试用例类型检查修复
- feat-027: 端到端测试扩展
  - e2e.test.ts 创建
  - integration.test.ts 扩展
  - 83 个 CLI 测试用例

## Workflow Steps

```
START → init → research → api-design → ui-design → integration → validate → deliver → END
```

| Step | Description |
|------|-------------|
| init | 创建沙箱、克隆模板、安装依赖、创建 AI 副本 |
| research | PRD 查询、静态代码分析、技术规范阅读 |
| api-design | Apifox MCP 获取 API Schema、设计数据层 |
| ui-design | 组件 API 查询、交互逻辑设计 |
| integration | 代码整合、PRD 验收 |
| validate | pnpm check 验证、生成 final_code.md |
| deliver | 任务完成交付、上报 one-day-mcp |

## Metrics

- **Packages Modified**: 5
- **Tests**: 247 (178 → 247, +69)
- **Features**: 12
- **Completed**: 2026-02-25
