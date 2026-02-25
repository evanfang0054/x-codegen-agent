/**
 * 类型定义入口
 */

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
  AgentConfig,
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

// Page-Codegen 工作流相关类型
export type {
  PageWorkflowStep,
  TaskPlanItem,
  TaskPlan,
  ResearchNote,
  ResearchNotes,
  APISchemaField,
  APISchemaDefinition,
  OriginalFileInfo,
  AIWorkFileInfo,
  MCPCallResult,
  GherkinStep,
  GherkinScenario,
  GherkinFeature,
  PageCodegenOptions,
  PageCodegenMCPServers,
  PageCodegenResult,
  PageCodegenStreamEvent,
  PageCodegenState,
} from './page-workflow.js';

export { PageCodegenStateAnnotation } from './page-workflow.js';
