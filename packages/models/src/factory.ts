/**
 * 模型工厂
 * 负责创建和管理 LLM 模型实例
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import type {
  ModelConfig,
  ModelInstance,
  ProviderPreset,
  CachedModelEntry,
} from '@x-codegen/types';
import {
  PROVIDER_PRESETS,
  getProviderPreset,
  isOpenAICompatible,
} from './providers.js';
import {
  validateModelConfig,
  loadApiKeyFromEnv,
  generateModelId,
  getConfigHash,
} from './helpers.js';

/**
 * 模型工厂类
 * 单例模式，管理模型实例的创建和缓存
 */
export class ModelFactory {
  private static instance: ModelFactory | null = null;

  /** 模型实例缓存 */
  private modelCache: Map<string, ModelInstance> = new Map();

  /** 缓存条目信息 */
  private cacheEntries: Map<string, CachedModelEntry> = new Map();

  /** 配置哈希到 ID 的映射（用于检测重复配置） */
  private configHashMap: Map<string, string> = new Map();

  /** 自定义预设 */
  private customPresets: Map<string, ProviderPreset> = new Map();

  /** 默认模型 ID */
  private defaultModelId: string | null = null;

  private constructor() {}

  /**
   * 获取单例实例
   */
  public static getInstance(): ModelFactory {
    if (!ModelFactory.instance) {
      ModelFactory.instance = new ModelFactory();
    }
    return ModelFactory.instance;
  }

  /**
   * 重置单例（主要用于测试）
   */
  public static resetInstance(): void {
    ModelFactory.instance = null;
  }

  /**
   * 创建模型实例
   * @param config 模型配置
   * @returns 模型实例
   */
  public async create(config: ModelConfig): Promise<ModelInstance> {
    // 验证配置
    const validation = validateModelConfig(config);
    if (!validation.valid) {
      throw new Error(`无效的模型配置: ${validation.errors.join(', ')}`);
    }

    // 获取 API Key
    const apiKey = config.apiKey ?? loadApiKeyFromEnv(config.provider);
    if (!apiKey && config.provider !== 'custom') {
      throw new Error(
        `缺少 API Key: 请设置 ${config.provider.toUpperCase()}_API_KEY 环境变量或在配置中提供 apiKey`
      );
    }

    // 获取预设信息
    const preset = getProviderPreset(config.provider);
    const baseUrl = config.baseUrl ?? preset?.baseUrl;

    // 根据提供商类型创建模型
    if (config.provider === 'anthropic') {
      return this.createAnthropicModel(config, apiKey!);
    }

    // OpenAI 和 OpenAI 兼容的模型
    if (isOpenAICompatible(config.provider) || config.provider === 'custom') {
      return this.createOpenAICompatibleModel(config, apiKey!, baseUrl);
    }

    throw new Error(`不支持的提供商: ${config.provider}`);
  }

  /**
   * 创建 Anthropic 模型
   */
  private createAnthropicModel(
    config: ModelConfig,
    apiKey: string
  ): ModelInstance {
    return new ChatAnthropic({
      anthropicApiKey: apiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      maxRetries: config.maxRetries,
      // timeout 使用 clientOptions 传递
      clientOptions: config.timeout
        ? { timeout: config.timeout }
        : undefined,
    }) as unknown as ModelInstance;
  }

  /**
   * 创建 OpenAI 兼容模型
   */
  private createOpenAICompatibleModel(
    config: ModelConfig,
    apiKey: string,
    baseUrl?: string
  ): ModelInstance {
    const options: ConstructorParameters<typeof ChatOpenAI>[0] = {
      apiKey,
      model: config.model,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
    };

    // 设置 baseUrl（用于兼容 API）
    if (baseUrl) {
      options.configuration = {
        baseURL: baseUrl,
      };
    }

    return new ChatOpenAI(options) as unknown as ModelInstance;
  }

  /**
   * 从预设创建模型
   * @param presetId 预设 ID（如 'deepseek', 'qwen'）
   * @param overrides 覆盖配置
   */
  public async createFromPreset(
    presetId: string,
    overrides?: Partial<ModelConfig>
  ): Promise<ModelInstance> {
    // 先查找自定义预设，再查找内置预设
    const preset =
      this.customPresets.get(presetId) ?? PROVIDER_PRESETS[presetId];

    if (!preset) {
      throw new Error(`未找到预设: ${presetId}`);
    }

    const config: ModelConfig = {
      provider: preset.provider,
      model: overrides?.model ?? preset.defaultModel,
      baseUrl: overrides?.baseUrl ?? preset.baseUrl,
      apiKey: overrides?.apiKey,
      temperature: overrides?.temperature,
      maxTokens: overrides?.maxTokens,
      timeout: overrides?.timeout,
      maxRetries: overrides?.maxRetries,
      ...overrides,
    };

    return this.create(config);
  }

  /**
   * 获取或创建模型（带缓存）
   * 相同 ID 返回缓存的实例
   * @param id 模型标识
   * @param config 模型配置
   */
  public async getOrCreate(
    id: string,
    config: ModelConfig
  ): Promise<ModelInstance> {
    // 检查缓存
    const cached = this.modelCache.get(id);
    if (cached) {
      // 更新最后使用时间
      const entry = this.cacheEntries.get(id);
      if (entry) {
        entry.lastUsedAt = Date.now();
      }
      return cached;
    }

    // 检查是否有相同配置的模型
    const configHash = getConfigHash(config);
    const existingId = this.configHashMap.get(configHash);
    if (existingId && this.modelCache.has(existingId)) {
      // 复用现有实例的引用
      const existingModel = this.modelCache.get(existingId)!;
      this.modelCache.set(id, existingModel);
      this.cacheEntries.set(id, {
        id,
        config,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      });
      return existingModel;
    }

    // 创建新实例
    const model = await this.create(config);
    this.modelCache.set(id, model);
    this.cacheEntries.set(id, {
      id,
      config,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
    });
    this.configHashMap.set(configHash, id);

    return model;
  }

  /**
   * 获取缓存的模型
   * @param id 模型标识
   */
  public get(id: string): ModelInstance | undefined {
    const model = this.modelCache.get(id);
    if (model) {
      const entry = this.cacheEntries.get(id);
      if (entry) {
        entry.lastUsedAt = Date.now();
      }
    }
    return model;
  }

  /**
   * 移除缓存的模型
   * @param id 模型标识
   */
  public remove(id: string): boolean {
    const entry = this.cacheEntries.get(id);
    if (entry) {
      const configHash = getConfigHash(entry.config);
      this.configHashMap.delete(configHash);
    }
    this.cacheEntries.delete(id);
    return this.modelCache.delete(id);
  }

  /**
   * 清空所有缓存
   */
  public clearCache(): void {
    this.modelCache.clear();
    this.cacheEntries.clear();
    this.configHashMap.clear();
  }

  /**
   * 获取缓存大小
   */
  public getCacheSize(): number {
    return this.modelCache.size;
  }

  /**
   * 获取所有缓存条目信息
   */
  public getCacheEntries(): CachedModelEntry[] {
    return Array.from(this.cacheEntries.values());
  }

  /**
   * 注册自定义预设
   * @param preset 预设配置
   */
  public registerPreset(preset: ProviderPreset): void {
    if (!preset.provider || !preset.baseUrl) {
      throw new Error('预设必须包含 provider 和 baseUrl');
    }
    this.customPresets.set(preset.provider, preset);
    // 如果有自定义 ID（不同于 provider），也保存
    if (preset.provider !== preset.displayName) {
      // 允许通过 displayName 查找
    }
  }

  /**
   * 获取所有预设（内置 + 自定义）
   */
  public getAllPresets(): ProviderPreset[] {
    return [...Object.values(PROVIDER_PRESETS), ...this.customPresets.values()];
  }

  /**
   * 设置默认模型
   * @param config 模型配置
   */
  public async setDefault(config: ModelConfig): Promise<void> {
    const id = this.defaultModelId ?? generateModelId(config.provider, config.model);
    await this.getOrCreate(id, config);
    this.defaultModelId = id;
  }

  /**
   * 获取默认模型
   */
  public getDefault(): ModelInstance | undefined {
    if (!this.defaultModelId) {
      return undefined;
    }
    return this.get(this.defaultModelId);
  }

  /**
   * 获取默认模型 ID
   */
  public getDefaultModelId(): string | null {
    return this.defaultModelId;
  }
}

/**
 * 便捷函数：创建模型
 */
export async function createModel(config: ModelConfig): Promise<ModelInstance> {
  return ModelFactory.getInstance().create(config);
}

/**
 * 便捷函数：从预设创建模型
 */
export async function createModelFromPreset(
  presetId: string,
  overrides?: Partial<ModelConfig>
): Promise<ModelInstance> {
  return ModelFactory.getInstance().createFromPreset(presetId, overrides);
}

/**
 * 便捷函数：获取或创建模型（带缓存）
 */
export async function getOrCreateModel(
  id: string,
  config: ModelConfig
): Promise<ModelInstance> {
  return ModelFactory.getInstance().getOrCreate(id, config);
}

/**
 * 便捷函数：获取模型工厂单例
 */
export function getModelFactory(): ModelFactory {
  return ModelFactory.getInstance();
}
