/**
 * 配置模块单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ConfigLoader,
  getConfigLoader,
  loadConfig,
  getDefaultConfig,
  getModelConfig,
} from '../index.js';
import type { ModelsConfigFile } from '@x-codegen/types';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock dotenv
vi.mock('dotenv', () => ({
  config: vi.fn(),
}));

// Mock @x-codegen/models 的 validateModelConfig
vi.mock('@x-codegen/models', () => ({
  validateModelConfig: vi.fn((config) => {
    if (!config.provider) {
      return { valid: false, errors: ['provider 是必需字段'] };
    }
    if (!config.model) {
      return { valid: false, errors: ['model 是必需字段'] };
    }
    return { valid: true, errors: [] };
  }),
  PROVIDER_PRESETS: {
    openai: {
      provider: 'openai',
      displayName: 'OpenAI',
      baseUrl: 'https://api.openai.com/v1',
      envKey: 'OPENAI_API_KEY',
      defaultModel: 'gpt-4',
      availableModels: ['gpt-4', 'gpt-3.5-turbo'],
      openAICompatible: true,
    },
    deepseek: {
      provider: 'deepseek',
      displayName: 'DeepSeek',
      baseUrl: 'https://api.deepseek.com/v1',
      envKey: 'DEEPSEEK_API_KEY',
      defaultModel: 'deepseek-chat',
      availableModels: ['deepseek-chat', 'deepseek-coder'],
      openAICompatible: true,
    },
  },
}));

describe('ConfigLoader', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    // 创建临时目录
    tempDir = join(tmpdir(), `config-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    originalCwd = process.cwd();

    // 重置单例
    vi.resetModules();
  });

  afterEach(() => {
    // 清理临时目录
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    process.chdir(originalCwd);
  });

  describe('load', () => {
    it('should load valid config file', () => {
      const configPath = join(tempDir, 'models.config.json');
      const configContent: ModelsConfigFile = {
        defaultModelId: 'main',
        models: {
          main: {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-key',
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(configContent));

      const loader = new ConfigLoader();
      const result = loader.load(configPath);

      expect(result).toEqual(configContent);
    });

    it('should return empty config when file does not exist', () => {
      const loader = new ConfigLoader();
      const result = loader.load('/nonexistent/path/models.config.json');

      expect(result).toEqual({ models: {} });
    });

    it('should throw error for invalid JSON', () => {
      const configPath = join(tempDir, 'models.config.json');
      writeFileSync(configPath, 'invalid json');

      const loader = new ConfigLoader();
      expect(() => loader.load(configPath)).toThrow('加载配置文件失败');
    });

    it('should throw error for config without models', () => {
      const configPath = join(tempDir, 'models.config.json');
      writeFileSync(configPath, JSON.stringify({}));

      const loader = new ConfigLoader();
      expect(() => loader.load(configPath)).toThrow('配置文件必须包含 models 对象');
    });

    it('should throw error for invalid model config', () => {
      const configPath = join(tempDir, 'models.config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          models: {
            invalid: {
              // missing provider and model
            },
          },
        })
      );

      const loader = new ConfigLoader();
      expect(() => loader.load(configPath)).toThrow('模型配置 "invalid" 无效');
    });
  });

  describe('getConfig', () => {
    it('should auto-load if not loaded', () => {
      process.chdir(tempDir);
      // 无配置文件，应该返回空配置
      const loader = new ConfigLoader();
      const result = loader.getConfig();

      expect(result).toEqual({ models: {} });
    });

    it('should return cached config', () => {
      const configPath = join(tempDir, 'models.config.json');
      const configContent: ModelsConfigFile = {
        models: {
          test: {
            provider: 'deepseek',
            model: 'deepseek-chat',
            apiKey: 'test-key',
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(configContent));

      const loader = new ConfigLoader();
      loader.load(configPath);
      const result = loader.getConfig();

      expect(result).toEqual(configContent);
    });
  });

  describe('getModelConfig', () => {
    it('should return config for existing model', () => {
      const configPath = join(tempDir, 'models.config.json');
      const configContent: ModelsConfigFile = {
        models: {
          myModel: {
            provider: 'openai',
            model: 'gpt-4',
            apiKey: 'test-key',
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(configContent));

      const loader = new ConfigLoader();
      loader.load(configPath);
      const result = loader.getModelConfig('myModel');

      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'test-key',
      });
    });

    it('should return undefined for non-existing model', () => {
      const loader = new ConfigLoader();
      const result = loader.getModelConfig('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('getDefaultModelConfig', () => {
    it('should return default model config', () => {
      const configPath = join(tempDir, 'models.config.json');
      const configContent: ModelsConfigFile = {
        defaultModelId: 'main',
        models: {
          main: {
            provider: 'openai',
            model: 'gpt-4',
          },
          other: {
            provider: 'deepseek',
            model: 'deepseek-chat',
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(configContent));

      const loader = new ConfigLoader();
      loader.load(configPath);
      const result = loader.getDefaultModelConfig();

      expect(result?.provider).toBe('openai');
    });

    it('should return first model if no defaultModelId', () => {
      const configPath = join(tempDir, 'models.config.json');
      const configContent: ModelsConfigFile = {
        models: {
          first: {
            provider: 'deepseek',
            model: 'deepseek-chat',
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(configContent));

      const loader = new ConfigLoader();
      loader.load(configPath);
      const result = loader.getDefaultModelConfig();

      expect(result?.provider).toBe('deepseek');
    });

    it('should return undefined if no models', () => {
      const loader = new ConfigLoader();
      const result = loader.getDefaultModelConfig();

      expect(result).toBeUndefined();
    });
  });

  describe('buildFromEnv', () => {
    it('should build config from environment variables', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENAI_MODEL = 'gpt-4-turbo';

      const loader = new ConfigLoader();
      const result = loader.buildFromEnv();

      expect(result).toEqual({
        provider: 'openai',
        model: 'gpt-4-turbo',
        apiKey: 'test-openai-key',
        baseUrl: 'https://api.openai.com/v1',
        temperature: undefined,
        maxTokens: undefined,
      });

      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_MODEL;
    });

    it('should return null if no API keys found', () => {
      // 清除所有可能的环境变量
      delete process.env.OPENAI_API_KEY;
      delete process.env.DEEPSEEK_API_KEY;

      const loader = new ConfigLoader();
      const result = loader.buildFromEnv();

      expect(result).toBeNull();
    });
  });

  describe('getDefaultConfig', () => {
    it('should prefer file config over env', () => {
      const configPath = join(tempDir, 'models.config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          defaultModelId: 'main',
          models: {
            main: {
              provider: 'openai',
              model: 'gpt-4',
              apiKey: 'file-key',
            },
          },
        })
      );

      process.env.DEEPSEEK_API_KEY = 'env-key';

      const loader = new ConfigLoader();
      loader.load(configPath);
      const result = loader.getDefaultConfig();

      expect(result?.apiKey).toBe('file-key');

      delete process.env.DEEPSEEK_API_KEY;
    });

    it('should fallback to env if no file config', () => {
      process.env.DEEPSEEK_API_KEY = 'env-key';

      const loader = new ConfigLoader();
      const result = loader.getDefaultConfig();

      expect(result?.provider).toBe('deepseek');

      delete process.env.DEEPSEEK_API_KEY;
    });

    it('should return null if no config available', () => {
      const loader = new ConfigLoader();
      const result = loader.getDefaultConfig();

      expect(result).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset config state', () => {
      const configPath = join(tempDir, 'models.config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          models: {
            test: {
              provider: 'openai',
              model: 'gpt-4',
              apiKey: 'test',
            },
          },
        })
      );

      const loader = new ConfigLoader();
      loader.load(configPath);
      expect(loader.getConfigPath()).toBe(configPath);

      loader.reset();
      expect(loader.getConfigPath()).toBeNull();
    });
  });

  describe('getConfigPath', () => {
    it('should return null before loading', () => {
      const loader = new ConfigLoader();
      expect(loader.getConfigPath()).toBeNull();
    });

    it('should return path after loading', () => {
      const configPath = join(tempDir, 'models.config.json');
      writeFileSync(
        configPath,
        JSON.stringify({
          models: {
            test: {
              provider: 'openai',
              model: 'gpt-4',
              apiKey: 'test',
            },
          },
        })
      );

      const loader = new ConfigLoader();
      loader.load(configPath);
      expect(loader.getConfigPath()).toBe(configPath);
    });
  });
});

describe('Singleton functions', () => {
  it('getConfigLoader should return same instance', () => {
    const loader1 = getConfigLoader();
    const loader2 = getConfigLoader();

    expect(loader1).toBe(loader2);
  });
});

describe('Convenience functions', () => {
  it('loadConfig should return config', () => {
    const result = loadConfig('/nonexistent/path');
    expect(result).toEqual({ models: {} });
  });

  it('getDefaultConfig should return null when no config', () => {
    const result = getDefaultConfig();
    expect(result).toBeNull();
  });

  it('getModelConfig should return undefined for nonexistent id', () => {
    const result = getModelConfig('nonexistent');
    expect(result).toBeUndefined();
  });
});
