/**
 * 模型工具函数
 */

import type { ModelConfig, ModelProvider } from '../types/models.js';
import { getProviderPreset, getProviderEnvKey } from './providers.js';

/**
 * 验证模型配置
 * @param config 模型配置
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateModelConfig(
  config: ModelConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 检查必需字段
  if (!config.provider) {
    errors.push('provider 是必需字段');
  }

  if (!config.model) {
    errors.push('model 是必需字段');
  }

  // 检查 provider 是否有效
  const preset = getProviderPreset(config.provider);
  if (!preset && config.provider !== 'custom') {
    errors.push(`未知的提供商: ${config.provider}`);
  }

  // 检查温度参数范围
  if (config.temperature !== undefined) {
    if (config.temperature < 0 || config.temperature > 2) {
      errors.push('temperature 必须在 0-2 之间');
    }
  }

  // 检查 maxTokens
  if (config.maxTokens !== undefined && config.maxTokens < 1) {
    errors.push('maxTokens 必须大于 0');
  }

  // 检查 timeout
  if (config.timeout !== undefined && config.timeout < 0) {
    errors.push('timeout 不能为负数');
  }

  // 检查 maxRetries
  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    errors.push('maxRetries 不能为负数');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 从环境变量加载 API Key
 * @param provider 提供商
 * @returns API Key 或 undefined
 */
export function loadApiKeyFromEnv(provider: ModelProvider): string | undefined {
  const envKey = getProviderEnvKey(provider);
  if (!envKey) {
    return undefined;
  }

  return process.env[envKey];
}

/**
 * 生成模型 ID
 * @param provider 提供商
 * @param model 模型名称
 * @returns 格式化的模型 ID
 */
export function generateModelId(provider: ModelProvider, model: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${provider}:${model}:${timestamp}:${randomSuffix}`;
}

/**
 * 解析模型 ID
 * @param id 模型 ID
 * @returns 解析后的信息
 */
export function parseModelId(
  id: string
): { provider: string; model: string } | null {
  const parts = id.split(':');
  if (parts.length < 2) {
    return null;
  }

  return {
    provider: parts[0],
    model: parts[1],
  };
}

/**
 * 合并配置（用户配置覆盖预设）
 * @param preset 预设配置
 * @param userConfig 用户配置
 * @returns 合并后的配置
 */
export function mergeConfig(
  preset: { baseUrl: string; defaultModel: string },
  userConfig: Partial<ModelConfig>
): ModelConfig {
  return {
    provider: userConfig.provider ?? 'custom',
    model: userConfig.model ?? preset.defaultModel,
    baseUrl: userConfig.baseUrl ?? preset.baseUrl,
    apiKey: userConfig.apiKey,
    temperature: userConfig.temperature,
    maxTokens: userConfig.maxTokens,
    timeout: userConfig.timeout,
    maxRetries: userConfig.maxRetries,
    ...userConfig,
  };
}

/**
 * 深度比较两个配置是否相等
 * @param config1 配置1
 * @param config2 配置2
 * @returns 是否相等
 */
export function isConfigEqual(
  config1: ModelConfig,
  config2: ModelConfig
): boolean {
  const keys1 = Object.keys(config1) as (keyof ModelConfig)[];
  const keys2 = Object.keys(config2) as (keyof ModelConfig)[];

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (config1[key] !== config2[key]) {
      return false;
    }
  }

  return true;
}

/**
 * 获取配置的哈希值（用于缓存 key）
 * @param config 模型配置
 * @returns 哈希字符串
 */
export function getConfigHash(config: ModelConfig): string {
  const normalized = {
    provider: config.provider,
    model: config.model,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  };
  return JSON.stringify(normalized);
}
