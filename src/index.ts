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

// 后续导出 Agent、Tools 等
// export { CodeGenAgent } from './agents/index.js';
// export * from './tools/index.js';
