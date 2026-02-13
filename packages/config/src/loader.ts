/**
 * 配置加载器
 * 支持环境变量和配置文件双重配置源
 */

import { config } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ModelsConfigFile, ModelConfig } from '@x-codegen/types';
import { validateModelConfig } from '@x-codegen/models';
import { PROVIDER_PRESETS } from '@x-codegen/models';

// 加载 .env 文件
config();

/**
 * 配置加载器类
 */
export class ConfigLoader {
  private config: ModelsConfigFile | null = null;
  private configPath: string | null = null;

  /**
   * 加载配置文件
   * @param path 配置文件路径（可选，默认为当前目录的 models.config.json）
   */
  public load(path?: string): ModelsConfigFile {
    const configPath = path ?? join(process.cwd(), 'models.config.json');

    if (!existsSync(configPath)) {
      // 如果配置文件不存在，返回空配置
      this.config = { models: {} };
      return this.config;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(content) as ModelsConfigFile;

      // 验证配置
      this.validateConfigFile(parsed);

      this.config = parsed;
      this.configPath = configPath;
      return this.config;
    } catch (error) {
      throw new Error(
        `加载配置文件失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 验证配置文件
   */
  private validateConfigFile(config: ModelsConfigFile): void {
    if (!config.models || typeof config.models !== 'object') {
      throw new Error('配置文件必须包含 models 对象');
    }

    for (const [id, modelConfig] of Object.entries(config.models)) {
      const validation = validateModelConfig(modelConfig);
      if (!validation.valid) {
        throw new Error(`模型配置 "${id}" 无效: ${validation.errors.join(', ')}`);
      }
    }
  }

  /**
   * 获取已加载的配置
   */
  public getConfig(): ModelsConfigFile {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * 获取指定模型配置
   * @param id 模型 ID
   */
  public getModelConfig(id: string): ModelConfig | undefined {
    const config = this.getConfig();
    return config.models[id];
  }

  /**
   * 获取默认模型配置
   */
  public getDefaultModelConfig(): ModelConfig | undefined {
    const config = this.getConfig();
    if (config.defaultModelId) {
      return config.models[config.defaultModelId];
    }
    // 返回第一个模型配置
    const firstKey = Object.keys(config.models)[0];
    return firstKey ? config.models[firstKey] : undefined;
  }

  /**
   * 从环境变量构建默认配置
   */
  public buildFromEnv(): ModelConfig | null {
    // 按优先级检查环境变量
    const providers = Object.keys(PROVIDER_PRESETS) as string[];

    for (const providerId of providers) {
      const preset = PROVIDER_PRESETS[providerId];
      const apiKey = process.env[preset.envKey];

      if (apiKey) {
        return {
          provider: preset.provider,
          model: process.env[`${providerId.toUpperCase()}_MODEL`] ?? preset.defaultModel,
          apiKey,
          baseUrl: process.env[`${providerId.toUpperCase()}_BASE_URL`] ?? preset.baseUrl,
          temperature: process.env[`${providerId.toUpperCase()}_TEMPERATURE`]
            ? parseFloat(process.env[`${providerId.toUpperCase()}_TEMPERATURE`]!)
            : undefined,
          maxTokens: process.env[`${providerId.toUpperCase()}_MAX_TOKENS`]
            ? parseInt(process.env[`${providerId.toUpperCase()}_MAX_TOKENS`]!, 10)
            : undefined,
        };
      }
    }

    return null;
  }

  /**
   * 获取或创建默认模型配置
   * 优先级：配置文件默认 > 环境变量 > null
   */
  public getDefaultConfig(): ModelConfig | null {
    // 先尝试从配置文件获取
    const fileConfig = this.getDefaultModelConfig();
    if (fileConfig) {
      return fileConfig;
    }

    // 再尝试从环境变量构建
    return this.buildFromEnv();
  }

  /**
   * 获取配置文件路径
   */
  public getConfigPath(): string | null {
    return this.configPath;
  }

  /**
   * 重置配置
   */
  public reset(): void {
    this.config = null;
    this.configPath = null;
  }
}

// 单例实例
let configLoaderInstance: ConfigLoader | null = null;

/**
 * 获取配置加载器单例
 */
export function getConfigLoader(): ConfigLoader {
  if (!configLoaderInstance) {
    configLoaderInstance = new ConfigLoader();
  }
  return configLoaderInstance;
}

/**
 * 便捷函数：加载配置
 */
export function loadConfig(path?: string): ModelsConfigFile {
  return getConfigLoader().load(path);
}

/**
 * 便捷函数：获取默认模型配置
 */
export function getDefaultConfig(): ModelConfig | null {
  return getConfigLoader().getDefaultConfig();
}

/**
 * 便捷函数：获取指定模型配置
 */
export function getModelConfig(id: string): ModelConfig | undefined {
  return getConfigLoader().getModelConfig(id);
}
