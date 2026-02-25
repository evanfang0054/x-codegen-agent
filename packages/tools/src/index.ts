/**
 * Tools 模块入口
 */

// MCP 工具
export {
  FigmaMCPClient,
  createFigmaMCPClient,
  KnowledgeBaseMCPClient,
  createKnowledgeBaseMCPClient,
  // 新增 MCP 客户端
  OneDayMCPClient,
  createOneDayMCPClient,
  ApifoxMCPClient,
  createApifoxMCPClient,
  // 回退策略
  executeWithFallback,
  executeBatchWithFallback,
  executeSequentialWithFallback,
  createResilientMCPCaller,
  // 类型
  type OneDayMCPConfig,
  type CompleteLogicCodeParams,
  type GetStaticTemplateParams,
  type StaticTemplateResult,
  type ApifoxMCPConfig,
  type GetAPIListParams,
  type GetAPIDetailParams,
  type APIListItem,
  type RetryConfig,
  type MCPCallOptions,
} from './mcp/index.js';

// 代码生成工具
export {
  ComponentGenerator,
  createComponentGenerator,
  type ComponentGenerateOptions,
  type GeneratedComponent,
  type ComponentGenerateResult,
} from './codegen/index.js';
