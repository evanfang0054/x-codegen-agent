/**
 * LLM 提供商预设配置
 */

import type { ProviderPreset, ModelProvider } from '../types/models.js';

/**
 * 内置提供商预设配置
 */
export const PROVIDER_PRESETS: Record<string, ProviderPreset> = {
  // OpenAI 官方
  openai: {
    provider: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o',
    availableModels: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'o1',
      'o1-mini',
      'o1-preview',
    ],
    openAICompatible: true,
    description: 'OpenAI 官方 API',
  },

  // Anthropic
  anthropic: {
    provider: 'anthropic',
    displayName: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    envKey: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    availableModels: [
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    openAICompatible: false,
    description: 'Anthropic Claude API',
  },

  // DeepSeek
  deepseek: {
    provider: 'deepseek',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    availableModels: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
    openAICompatible: true,
    description: 'DeepSeek 深度求索',
  },

  // 智谱 GLM
  zhipu: {
    provider: 'zhipu',
    displayName: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    envKey: 'ZHIPU_API_KEY',
    defaultModel: 'glm-4-plus',
    availableModels: [
      'glm-4-plus',
      'glm-4-0520',
      'glm-4',
      'glm-4-air',
      'glm-4-airx',
      'glm-4-flash',
      'glm-4v',
      'glm-3-turbo',
    ],
    openAICompatible: true,
    description: '智谱 AI GLM 系列模型',
  },

  // 通义千问
  qwen: {
    provider: 'qwen',
    displayName: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    envKey: 'DASHSCOPE_API_KEY',
    defaultModel: 'qwen-plus',
    availableModels: [
      'qwen-max',
      'qwen-max-latest',
      'qwen-plus',
      'qwen-plus-latest',
      'qwen-turbo',
      'qwen-turbo-latest',
      'qwen-long',
      'qwen-vl-max',
      'qwen-vl-plus',
    ],
    openAICompatible: true,
    description: '阿里云通义千问',
  },

  // 月之暗面 Moonshot
  moonshot: {
    provider: 'moonshot',
    displayName: '月之暗面 Kimi',
    baseUrl: 'https://api.moonshot.cn/v1',
    envKey: 'MOONSHOT_API_KEY',
    defaultModel: 'moonshot-v1-8k',
    availableModels: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    openAICompatible: true,
    description: '月之暗面 Kimi AI',
  },

  // 百川
  baichuan: {
    provider: 'baichuan',
    displayName: '百川大模型',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    envKey: 'BAICHUAN_API_KEY',
    defaultModel: 'Baichuan4',
    availableModels: ['Baichuan4', 'Baichuan3-Turbo', 'Baichuan2-Turbo'],
    openAICompatible: true,
    description: '百川智能大模型',
  },

  // MiniMax
  minimax: {
    provider: 'minimax',
    displayName: 'MiniMax',
    baseUrl: 'https://api.minimax.chat/v1',
    envKey: 'MINIMAX_API_KEY',
    defaultModel: 'abab6.5s-chat',
    availableModels: [
      'abab6.5s-chat',
      'abab6.5g-chat',
      'abab6.5t-chat',
      'abab5.5-chat',
      'abab5.5s-chat',
    ],
    openAICompatible: true,
    description: 'MiniMax 模型',
  },
};

/**
 * 获取提供商预设
 */
export function getProviderPreset(
  providerOrId: ModelProvider | string
): ProviderPreset | undefined {
  // 首先尝试作为 ID 查找
  if (PROVIDER_PRESETS[providerOrId]) {
    return PROVIDER_PRESETS[providerOrId];
  }

  // 然后尝试按 provider 字段查找
  return Object.values(PROVIDER_PRESETS).find(
    (preset) => preset.provider === providerOrId
  );
}

/**
 * 获取所有提供商列表
 */
export function getAllProviders(): ProviderPreset[] {
  return Object.values(PROVIDER_PRESETS);
}

/**
 * 检查是否为 OpenAI 兼容提供商
 */
export function isOpenAICompatible(provider: ModelProvider): boolean {
  const preset = getProviderPreset(provider);
  return preset?.openAICompatible ?? false;
}

/**
 * 获取提供商的环境变量 Key
 */
export function getProviderEnvKey(provider: ModelProvider): string | undefined {
  const preset = getProviderPreset(provider);
  return preset?.envKey;
}
