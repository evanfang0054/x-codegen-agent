/**
 * X-CodeGen-Agent 入口文件
 * 基于 LangChain 的代码生成 Agent
 */

// 类型导出
export * from './types/index.js';

// 模型模块导出
export {
  // 类型
  type ModelProvider,
  type ModelConfig,
  type ProviderPreset,
  type CreateModelOptions,
  type ModelsConfigFile,
  type CachedModelEntry,
  type ModelInstance,
  // 提供商预设
  PROVIDER_PRESETS,
  getProviderPreset,
  getAllProviders,
  isOpenAICompatible,
  getProviderEnvKey,
  // 工厂
  ModelFactory,
  createModel,
  createModelFromPreset,
  getOrCreateModel,
  getModelFactory,
  // 工具函数
  validateModelConfig,
  loadApiKeyFromEnv,
  generateModelId,
  parseModelId,
  mergeConfig,
  isConfigEqual,
  getConfigHash,
} from './models/index.js';

// 配置模块导出
export {
  ConfigLoader,
  getConfigLoader,
  loadConfig,
  getDefaultConfig,
  getModelConfig,
} from './config/index.js';

// 工具模块导出
export {
  // MCP 工具
  FigmaMCPClient,
  createFigmaMCPClient,
  KnowledgeBaseMCPClient,
  createKnowledgeBaseMCPClient,
  // 代码生成工具
  ComponentGenerator,
  createComponentGenerator,
  type ComponentGenerateOptions,
  type GeneratedComponent,
  type ComponentGenerateResult,
} from './tools/index.js';

// 沙箱模块导出
export {
  SandboxManager,
  createSandbox,
  CommandExecutor,
  createExecutor,
} from './sandbox/index.js';

// 工作流模块导出
export {
  // 主要 API
  CodeGenerator,
  createCodeGenerator,
  generateCode,
  generateCodeStream,
  // 工作流构建
  createCodeGenGraph,
  createCodeGenGraphWithoutCheckpointer,
  // 节点函数（高级用法）
  initNode,
  templateNode,
  completionNode,
  validateNode,
  // 类型
  type CodeGenGraph,
} from './workflow/index.js';

// Agent 模块导出
export {
  // 基础 Agent
  BaseAgent,
  createBaseAgent,
  // 工具调用 Agent
  ToolAgent,
  createToolAgent,
} from './agents/index.js';
