/**
 * MCP 调用回退策略
 * 实现 "MCP 优先、本地回退" 的调用模式
 */

import type { MCPCallResult } from '@x-codegen/types';

/**
 * 重试配置
 */
export interface RetryConfig {
  /** 最大重试次数 */
  maxRetries: number;
  /** 重试间隔（毫秒） */
  retryInterval: number;
  /** 是否使用指数退避 */
  exponentialBackoff?: boolean;
}

/**
 * 默认重试配置
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryInterval: 2000,
  exponentialBackoff: false,
};

/**
 * MCP 调用选项
 */
export interface MCPCallOptions<T> {
  /** MCP 调用函数 */
  mcpCall: () => Promise<T>;
  /** 本地回退函数 */
  fallbackCall?: () => Promise<T>;
  /** 重试配置 */
  retryConfig?: Partial<RetryConfig>;
  /** 错误记录回调 */
  onError?: (error: Error, retryCount: number) => void;
  /** 成功回调 */
  onSuccess?: (result: T, source: 'mcp' | 'fallback') => void;
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 执行带有回退策略的 MCP 调用
 *
 * @template T 返回数据类型
 * @param options 调用选项
 * @returns MCP 调用结果
 */
export async function executeWithFallback<T>(
  options: MCPCallOptions<T>
): Promise<MCPCallResult<T>> {
  const {
    mcpCall,
    fallbackCall,
    retryConfig: configOverride,
    onError,
    onSuccess,
  } = options;

  const config = { ...DEFAULT_RETRY_CONFIG, ...configOverride };
  let lastError: Error | null = null;
  let retryCount = 0;

  // 尝试 MCP 调用
  while (retryCount < config.maxRetries) {
    try {
      const result = await mcpCall();
      onSuccess?.(result, 'mcp');
      return {
        success: true,
        data: result,
        source: 'mcp',
        retryCount,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount++;
      onError?.(lastError, retryCount);

      if (retryCount < config.maxRetries) {
        const interval = config.exponentialBackoff
          ? config.retryInterval * Math.pow(2, retryCount - 1)
          : config.retryInterval;
        await delay(interval);
      }
    }
  }

  // MCP 调用失败，尝试本地回退
  if (fallbackCall) {
    try {
      const result = await fallbackCall();
      onSuccess?.(result, 'fallback');
      return {
        success: true,
        data: result,
        source: 'fallback',
        retryCount,
      };
    } catch (fallbackError) {
      const error =
        fallbackError instanceof Error
          ? fallbackError
          : new Error(String(fallbackError));
      return {
        success: false,
        error: `MCP 调用失败: ${lastError?.message}，本地回退也失败: ${error.message}`,
        source: 'fallback',
        retryCount,
      };
    }
  }

  // 没有回退方案，返回 MCP 失败结果
  return {
    success: false,
    error: lastError?.message ?? 'Unknown error',
    source: 'mcp',
    retryCount,
  };
}

/**
 * 批量 MCP 调用
 * 并行执行多个 MCP 调用，返回所有结果
 *
 * @template T 返回数据类型
 * @param calls 调用列表
 * @returns 所有调用结果
 */
export async function executeBatchWithFallback<T>(
  calls: Array<{
    name: string;
    options: MCPCallOptions<T>;
  }>
): Promise<Record<string, MCPCallResult<T>>> {
  const results = await Promise.all(
    calls.map(async ({ name, options }) => ({
      name,
      result: await executeWithFallback(options),
    }))
  );

  return Object.fromEntries(results.map((r) => [r.name, r.result]));
}

/**
 * 顺序 MCP 调用
 * 按顺序执行多个 MCP 调用，前一个成功后才执行下一个
 *
 * @template T 返回数据类型
 * @param calls 调用列表
 * @param stopOnFirstSuccess 是否在第一个成功时停止
 * @returns 所有调用结果
 */
export async function executeSequentialWithFallback<T>(
  calls: Array<{
    name: string;
    options: MCPCallOptions<T>;
  }>,
  stopOnFirstSuccess: boolean = false
): Promise<Record<string, MCPCallResult<T>>> {
  const results: Record<string, MCPCallResult<T>> = {};

  for (const { name, options } of calls) {
    const result = await executeWithFallback(options);
    results[name] = result;

    if (stopOnFirstSuccess && result.success) {
      break;
    }
  }

  return results;
}

/**
 * 创建带重试的 MCP 调用器
 * 返回一个封装了重试逻辑的调用函数
 *
 * @template TArgs 参数类型
 * @template TResult 返回类型
 * @param mcpCall MCP 调用函数
 * @param fallbackCall 本地回退函数
 * @param config 重试配置
 * @returns 封装后的调用函数
 */
export function createResilientMCPCaller<TArgs extends unknown[], TResult>(
  mcpCall: (...args: TArgs) => Promise<TResult>,
  fallbackCall?: (...args: TArgs) => Promise<TResult>,
  config?: Partial<RetryConfig>
): (...args: TArgs) => Promise<MCPCallResult<TResult>> {
  return async (...args: TArgs) => {
    return executeWithFallback({
      mcpCall: () => mcpCall(...args),
      fallbackCall: fallbackCall ? () => fallbackCall(...args) : undefined,
      retryConfig: config,
    });
  };
}
