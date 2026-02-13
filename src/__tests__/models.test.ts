/**
 * 模型模块单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  ModelFactory,
  createModel,
  getProviderPreset,
  getAllProviders,
  isOpenAICompatible,
  validateModelConfig,
  loadApiKeyFromEnv,
  generateModelId,
  parseModelId,
  getConfigHash,
} from '../index.js';
import type { ModelConfig, ProviderPreset } from '../index.js';

describe('Providers', () => {
  describe('getProviderPreset', () => {
    it('should return preset for known provider', () => {
      const preset = getProviderPreset('deepseek');
      expect(preset).toBeDefined();
      expect(preset?.provider).toBe('deepseek');
      expect(preset?.baseUrl).toBe('https://api.deepseek.com/v1');
    });

    it('should return preset for provider by ID', () => {
      const preset = getProviderPreset('openai');
      expect(preset).toBeDefined();
      expect(preset?.provider).toBe('openai');
    });

    it('should return undefined for unknown provider', () => {
      const preset = getProviderPreset('unknown-provider');
      expect(preset).toBeUndefined();
    });
  });

  describe('getAllProviders', () => {
    it('should return all provider presets', () => {
      const providers = getAllProviders();
      expect(providers.length).toBeGreaterThan(0);
      expect(providers.find((p) => p.provider === 'openai')).toBeDefined();
      expect(providers.find((p) => p.provider === 'anthropic')).toBeDefined();
      expect(providers.find((p) => p.provider === 'deepseek')).toBeDefined();
    });
  });

  describe('isOpenAICompatible', () => {
    it('should return true for OpenAI compatible providers', () => {
      expect(isOpenAICompatible('openai')).toBe(true);
      expect(isOpenAICompatible('deepseek')).toBe(true);
      expect(isOpenAICompatible('qwen')).toBe(true);
    });

    it('should return false for Anthropic', () => {
      expect(isOpenAICompatible('anthropic')).toBe(false);
    });
  });
});

describe('Helpers', () => {
  describe('validateModelConfig', () => {
    it('should validate a valid config', () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'test-key',
      };
      const result = validateModelConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for missing provider', () => {
      const config = { model: 'test' } as ModelConfig;
      const result = validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('provider 是必需字段');
    });

    it('should fail for missing model', () => {
      const config = { provider: 'openai' } as ModelConfig;
      const result = validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('model 是必需字段');
    });

    it('should fail for invalid temperature', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        temperature: 3, // invalid: > 2
      };
      const result = validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('temperature 必须在 0-2 之间');
    });

    it('should fail for invalid maxTokens', () => {
      const config: ModelConfig = {
        provider: 'openai',
        model: 'gpt-4',
        maxTokens: 0, // invalid: < 1
      };
      const result = validateModelConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxTokens 必须大于 0');
    });
  });

  describe('loadApiKeyFromEnv', () => {
    it('should return undefined if env key not set', () => {
      // 确保 OPENAI_API_KEY 未设置
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const key = loadApiKeyFromEnv('openai');
      expect(key).toBeUndefined();

      // 恢复环境变量
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    it('should load API key from environment when set', () => {
      const originalKey = process.env.OPENAI_API_KEY;
      process.env.OPENAI_API_KEY = 'test-openai-key';

      const key = loadApiKeyFromEnv('openai');
      expect(key).toBe('test-openai-key');

      // 恢复环境变量
      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      } else {
        delete process.env.OPENAI_API_KEY;
      }
    });
  });

  describe('generateModelId', () => {
    it('should generate a unique model ID', () => {
      const id1 = generateModelId('deepseek', 'deepseek-chat');
      const id2 = generateModelId('deepseek', 'deepseek-chat');
      expect(id1).not.toBe(id2);
      expect(id1).toContain('deepseek');
      expect(id1).toContain('deepseek-chat');
    });
  });

  describe('parseModelId', () => {
    it('should parse a valid model ID', () => {
      const id = 'deepseek:deepseek-chat:123456:abc123';
      const parsed = parseModelId(id);
      expect(parsed).toEqual({
        provider: 'deepseek',
        model: 'deepseek-chat',
      });
    });

    it('should return null for invalid ID', () => {
      const parsed = parseModelId('invalid-id');
      expect(parsed).toBeNull();
    });
  });

  describe('getConfigHash', () => {
    it('should generate consistent hash for same config', () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
      };
      const hash1 = getConfigHash(config);
      const hash2 = getConfigHash(config);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different config', () => {
      const config1: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
      };
      const config2: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-coder',
      };
      const hash1 = getConfigHash(config1);
      const hash2 = getConfigHash(config2);
      expect(hash1).not.toBe(hash2);
    });
  });
});

describe('ModelFactory', () => {
  let factory: ModelFactory;

  beforeEach(() => {
    ModelFactory.resetInstance();
    factory = ModelFactory.getInstance();
    factory.clearCache();
  });

  afterEach(() => {
    factory.clearCache();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = ModelFactory.getInstance();
      const instance2 = ModelFactory.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('cache management', () => {
    it('should cache model instances', async () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'test-key',
      };

      const model1 = await factory.getOrCreate('test-id', config);
      const model2 = await factory.getOrCreate('test-id', config);

      expect(model1).toBe(model2);
      expect(factory.getCacheSize()).toBe(1);
    });

    it('should remove cached model', async () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'test-key',
      };

      await factory.getOrCreate('test-id', config);
      expect(factory.getCacheSize()).toBe(1);

      factory.remove('test-id');
      expect(factory.getCacheSize()).toBe(0);
    });

    it('should clear all cache', async () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'test-key',
      };

      await factory.getOrCreate('id1', config);
      await factory.getOrCreate('id2', config);
      expect(factory.getCacheSize()).toBe(2);

      factory.clearCache();
      expect(factory.getCacheSize()).toBe(0);
    });
  });

  describe('registerPreset', () => {
    it('should register custom preset', () => {
      const customPreset: ProviderPreset = {
        provider: 'custom',
        displayName: 'Custom Provider',
        baseUrl: 'https://custom.api.com/v1',
        envKey: 'CUSTOM_API_KEY',
        defaultModel: 'custom-model',
        availableModels: ['custom-model'],
        openAICompatible: true,
      };

      factory.registerPreset(customPreset);
      const presets = factory.getAllPresets();
      expect(presets.find((p) => p.provider === 'custom')).toBeDefined();
    });
  });

  describe('default model', () => {
    it('should set and get default model', async () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        apiKey: 'test-key',
      };

      await factory.setDefault(config);
      const defaultModel = factory.getDefault();

      expect(defaultModel).toBeDefined();
      expect(factory.getDefaultModelId()).toBeDefined();
    });
  });

  describe('create', () => {
    it('should throw error for missing API key', async () => {
      const config: ModelConfig = {
        provider: 'deepseek',
        model: 'deepseek-chat',
        // No apiKey provided
      };

      // 临时删除环境变量
      const originalKey = process.env.DEEPSEEK_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;

      await expect(factory.create(config)).rejects.toThrow('缺少 API Key');

      // 恢复环境变量
      if (originalKey) {
        process.env.DEEPSEEK_API_KEY = originalKey;
      }
    });

    it('should throw error for invalid config', async () => {
      const config = {} as ModelConfig;

      await expect(factory.create(config)).rejects.toThrow('无效的模型配置');
    });
  });
});

describe('Convenience functions', () => {
  beforeEach(() => {
    ModelFactory.resetInstance();
  });

  it('createModel should create a model', async () => {
    const config: ModelConfig = {
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: 'test-key',
    };

    const model = await createModel(config);
    expect(model).toBeDefined();
  });
});
