/**
 * 模型相关类型定义
 */

/**
 * 支持的 LLM 提供商
 */
export type ModelProvider =
  | 'openai'
  | 'anthropic'
  | 'deepseek'
  | 'zhipu'
  | 'qwen'
  | 'moonshot'
  | 'baichuan'
  | 'minimax'
  | 'custom';

/**
 * 模型配置接口
 */
export interface ModelConfig {
  /** 提供商 */
  provider: ModelProvider;
  /** 模型名称 */
  model: string;
  /** API Key（可选，可从环境变量自动读取） */
  apiKey?: string;
  /** 基础 URL（可选，用于 OpenAI 兼容 API） */
  baseUrl?: string;
  /** 温度参数 (0-2) */
  temperature?: number;
  /** 最大输出 tokens */
  maxTokens?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 其他提供商特定配置 */
  [key: string]: unknown;
}

/**
 * 提供商预设配置
 */
export interface ProviderPreset {
  /** 提供商标识 */
  provider: ModelProvider;
  /** 显示名称 */
  displayName: string;
  /** 基础 URL */
  baseUrl: string;
  /** 环境变量 Key 名称 */
  envKey: string;
  /** 默认模型 */
  defaultModel: string;
  /** 可用模型列表 */
  availableModels: string[];
  /** 是否 OpenAI 兼容 */
  openAICompatible: boolean;
  /** 描述信息 */
  description?: string;
}

/**
 * 创建模型的选项
 */
export interface CreateModelOptions extends Omit<ModelConfig, 'provider'> {
  /** 提供商 */
  provider?: ModelProvider;
  /** 预设 ID（使用预设时可不传其他配置） */
  presetId?: string;
}

/**
 * 配置文件结构
 */
export interface ModelsConfigFile {
  /** 默认模型 ID */
  defaultModelId?: string;
  /** 模型配置映射 */
  models: Record<string, ModelConfig>;
}

/**
 * 缓存的模型实例信息
 */
export interface CachedModelEntry {
  /** 实例 ID */
  id: string;
  /** 原始配置 */
  config: ModelConfig;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后使用时间戳 */
  lastUsedAt: number;
}

/**
 * 模型实例类型（LangChain BaseChatModel）
 */
export type ModelInstance = {
  /** 调用模型 */
  invoke: (input: unknown) => Promise<unknown>;
  /** 流式调用 */
  stream?: (input: unknown) => Promise<AsyncIterable<unknown>>;
  /** 模型标识 */
  lc?: string[];
  /** 序列化键 */
  lc_serializable?: boolean;
  [key: string]: unknown;
};
