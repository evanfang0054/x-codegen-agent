/**
 * X-CodeGen-Agent SDK 入口文件
 * 基于 LangChain 的代码生成 Agent
 */

// 类型导出
export * from '@x-codegen/types';

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
} from '@x-codegen/models';

// 配置模块导出
export {
  ConfigLoader,
  getConfigLoader,
  loadConfig,
  getDefaultConfig,
  getModelConfig,
} from '@x-codegen/config';

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
} from '@x-codegen/tools';

// 沙箱模块导出
export {
  SandboxManager,
  createSandbox,
  CommandExecutor,
  createExecutor,
} from '@x-codegen/sandbox';

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
} from '@x-codegen/workflow';

// Page-Codegen 工作流模块导出
export {
  createPageCodegenGraph,
  createPageCodegenGraphWithoutCheckpointer,
  PageCodeGenerator,
  createPageCodeGenerator,
  pageCodegen,
  pageCodegenStream,
  type PageCodegenGraph,
} from '@x-codegen/workflow';

// Agent 模块导出
export {
  // 基础 Agent
  BaseAgent,
  createBaseAgent,
  // 工具调用 Agent
  ToolAgent,
  createToolAgent,
} from '@x-codegen/agents';
