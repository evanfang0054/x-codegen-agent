/**
 * 配置模块导出
 */

export type { ModelsConfigFile, ModelConfig } from '@x-codegen/types';

export {
  ConfigLoader,
  getConfigLoader,
  loadConfig,
  getDefaultConfig,
  getModelConfig,
} from './loader.js';
