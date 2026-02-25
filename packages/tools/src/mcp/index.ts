/**
 * MCP 工具模块入口
 */

// 原有客户端
export { FigmaMCPClient, createFigmaMCPClient } from './figma-client.js';
export { KnowledgeBaseMCPClient, createKnowledgeBaseMCPClient } from './knowledge-base.js';

// 新增客户端
export { OneDayMCPClient, createOneDayMCPClient } from './one-day-client.js';
export type { OneDayMCPConfig, CompleteLogicCodeParams, GetStaticTemplateParams, StaticTemplateResult } from './one-day-client.js';

export { ApifoxMCPClient, createApifoxMCPClient } from './apifox-client.js';
export type { ApifoxMCPConfig, GetAPIListParams, GetAPIDetailParams, APIListItem } from './apifox-client.js';

// 回退策略
export {
  executeWithFallback,
  executeBatchWithFallback,
  executeSequentialWithFallback,
  createResilientMCPCaller,
} from './fallback-strategy.js';
export type { RetryConfig, MCPCallOptions } from './fallback-strategy.js';
