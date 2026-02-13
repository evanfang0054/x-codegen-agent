/**
 * 模型模块导出
 */

// 类型
export type {
  ModelProvider,
  ModelConfig,
  ProviderPreset,
  CreateModelOptions,
  ModelsConfigFile,
  CachedModelEntry,
  ModelInstance,
} from '../types/models.js';

// 提供商预设
export {
  PROVIDER_PRESETS,
  getProviderPreset,
  getAllProviders,
  isOpenAICompatible,
  getProviderEnvKey,
} from './providers.js';

// 工厂
export {
  ModelFactory,
  createModel,
  createModelFromPreset,
  getOrCreateModel,
  getModelFactory,
} from './factory.js';

// 工具函数
export {
  validateModelConfig,
  loadApiKeyFromEnv,
  generateModelId,
  parseModelId,
  mergeConfig,
  isConfigEqual,
  getConfigHash,
} from './helpers.js';
