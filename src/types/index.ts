/**
 * 类型定义入口
 */

// 原有类型（已废弃，保留向后兼容）
/** @deprecated 使用 AgentConfig from agents.ts */
export interface LegacyAgentConfig {
  /** LLM 模型名称 */
  modelName: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 tokens */
  maxTokens?: number;
}

// 保留旧名称的别名
/** @deprecated 使用 AgentConfig from agents.ts */
export type AgentConfig = LegacyAgentConfig;

export interface CodeGenResult {
  /** 生成的代码 */
  code: string;
  /** 代码语言 */
  language: string;
  /** 描述信息 */
  description?: string;
}

export interface ToolResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
}

// 模型相关类型
export type {
  ModelProvider,
  ModelConfig,
  ProviderPreset,
  CreateModelOptions,
  ModelsConfigFile,
  CachedModelEntry,
  ModelInstance,
} from './models.js';

// 工作流相关类型
export type {
  WorkflowStep,
  FigmaDesignData,
  FigmaComponent,
  PRDAnalysisResult,
  PRDFeature,
  PRDDataModel,
  PRDAPIRequirement,
  CodeGenOptions,
  CodeGenResult as WorkflowCodeGenResult,
  StreamEvent,
  CodeGenState,
} from './workflow.js';

export { CodeGenStateAnnotation } from './workflow.js';

// 沙箱相关类型
export type {
  SandboxConfig,
  CommandResult,
  GitCloneOptions,
  GitCloneResult,
  InstallDepsOptions,
  InstallDepsResult,
  FileOperationType,
  FileOperationOptions,
  SandboxStatus,
  ProjectValidateOptions,
  ProjectValidateResult,
} from './sandbox.js';

// MCP 相关类型
export type {
  MCPTransportType,
  MCPServerConfigBase,
  MCPServerStdioConfig,
  MCPServerHttpConfig,
  MCPServerWebSocketConfig,
  MCPServerConfig,
  FigmaMCPConfig,
  KnowledgeBaseMCPConfig,
  MCPToolDefinition,
  MCPToolResult,
  FigmaExtractOptions,
  KnowledgeBaseQueryOptions,
  KnowledgeBaseQueryResult,
  KnowledgeBaseChunk,
  MultiMCPClientConfig,
} from './mcp.js';

// Agent 相关类型
export type {
  AgentConfig as LCLAgentConfig,
  AgentInput,
  AgentOutput,
  ToolCallRecord,
  AgentStatus,
  AgentExecuteOptions,
  AgentStreamEvent,
  LCELChainConfig,
  ReActAgentConfig,
  PlanExecuteAgentConfig,
} from './agents.js';
