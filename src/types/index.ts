/**
 * 类型定义入口
 */

// 原有类型
export interface AgentConfig {
  /** LLM 模型名称 */
  modelName: string;
  /** 温度参数 */
  temperature?: number;
  /** 最大 tokens */
  maxTokens?: number;
}

export interface CodeGenResult {
  /** 生成的代码 */
  code: string;
  /** 代码语言 */
  language: string;
  /** 描述信息 */
  description?: string;
}

export interface ToolResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
}

// 模型相关类型
export type {
  ModelProvider,
  ModelConfig,
  ProviderPreset,
  CreateModelOptions,
  ModelsConfigFile,
  CachedModelEntry,
  ModelInstance,
} from './models.js';
