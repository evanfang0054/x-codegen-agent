/**
 * Agent 相关类型定义
 */

import type { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { StructuredToolInterface } from '@langchain/core/tools';

/**
 * Agent 配置
 */
export interface AgentConfig {
  /** Agent 名称 */
  name: string;
  /** Agent 描述 */
  description?: string;
  /** 模型实例 */
  model: BaseChatModel;
  /** 系统 Prompt */
  systemPrompt?: string;
  /** 可用工具列表 */
  tools?: StructuredToolInterface[];
  /** 最大迭代次数 */
  maxIterations?: number;
  /** 温度参数 */
  temperature?: number;
  /** 超时时间（毫秒） */
  timeout?: number;
}

/**
 * Agent 输入
 */
export interface AgentInput {
  /** 用户输入 */
  input: string;
  /** 上下文消息 */
  context?: BaseMessage[];
  /** 额外参数 */
  [key: string]: unknown;
}

/**
 * Agent 输出
 */
export interface AgentOutput {
  /** 输出内容 */
  content: string;
  /** 是否使用了工具 */
  usedTools: boolean;
  /** 工具调用记录 */
  toolCalls?: ToolCallRecord[];
  /** 消息历史 */
  messages: BaseMessage[];
  /** 额外数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 工具调用记录
 */
export interface ToolCallRecord {
  /** 工具名称 */
  name: string;
  /** 调用参数 */
  args: Record<string, unknown>;
  /** 调用结果 */
  result: unknown;
  /** 调用时间戳 */
  timestamp: Date;
}

/**
 * Agent 状态
 */
export type AgentStatus = 'idle' | 'running' | 'completed' | 'error';

/**
 * Agent 执行选项
 */
export interface AgentExecuteOptions {
  /** 线程 ID（用于持久化） */
  threadId?: string;
  /** 是否流式输出 */
  stream?: boolean;
  /** 超时时间 */
  timeout?: number;
  /** 回调函数 */
  callbacks?: {
    /** 工具调用前回调 */
    onToolStart?: (name: string, args: Record<string, unknown>) => void;
    /** 工具调用后回调 */
    onToolEnd?: (name: string, result: unknown) => void;
    /** 生成 token 回调 */
    onToken?: (token: string) => void;
    /** 错误回调 */
    onError?: (error: Error) => void;
  };
}

/**
 * Agent 流式事件
 */
export interface AgentStreamEvent {
  /** 事件类型 */
  type: 'token' | 'tool_start' | 'tool_end' | 'complete' | 'error';
  /** 事件内容 */
  content: string | Record<string, unknown>;
  /** 时间戳 */
  timestamp: Date;
}

/**
 * LCEL Chain 配置
 */
export interface LCELChainConfig {
  /** Prompt 模板 */
  promptTemplate?: string;
  /** 是否解析输出 */
  parseOutput?: boolean;
  /** 输出解析器类型 */
  outputParser?: 'string' | 'json' | 'structured';
}

/**
 * ReAct Agent 配置
 */
export interface ReActAgentConfig extends AgentConfig {
  /** Agent 类型 */
  type: 'react';
  /** 推理 Prompt */
  reasoningPrompt?: string;
  /** 行动 Prompt */
  actionPrompt?: string;
}

/**
 * Plan-and-Execute Agent 配置
 */
export interface PlanExecuteAgentConfig extends AgentConfig {
  /** Agent 类型 */
  type: 'plan-execute';
  /** 计划生成 Prompt */
  planningPrompt?: string;
  /** 执行 Prompt */
  executionPrompt?: string;
}
