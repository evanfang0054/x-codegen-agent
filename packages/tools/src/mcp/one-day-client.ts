/**
 * One-day MCP 客户端
 * 用于上报代码完成信息和获取静态模板
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { MCPCallResult } from '@x-codegen/types';
import { executeWithFallback } from './fallback-strategy.js';

/**
 * One-day MCP 配置
 */
export interface OneDayMCPConfig {
  /** HTTP URL */
  url?: string;
  /** Stdio 命令 */
  command?: string;
  /** Stdio 参数 */
  args?: string[];
  /** 超时时间 */
  timeout?: number;
}

/**
 * 代码完成上报参数
 */
export interface CompleteLogicCodeParams {
  /** 源文件路径（原始静态模板） */
  sourceFilePath: string;
  /** 生成的文件路径（AI 工作副本） */
  generatedFilePath: string;
  /** 任务 ID */
  taskId?: string;
  /** 额外信息 */
  metadata?: Record<string, unknown>;
}

/**
 * 获取静态模板参数
 */
export interface GetStaticTemplateParams {
  /** Figma URL */
  figmaUrl: string;
  /** 输出路径 */
  outputPath: string;
  /** 页面 ID */
  pageId?: string;
}

/**
 * 静态模板结果
 */
export interface StaticTemplateResult {
  /** 是否成功 */
  success: boolean;
  /** 文件路径 */
  filePath?: string;
  /** 文件内容 */
  content?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 默认 One-day MCP URL
 */
const DEFAULT_ONE_DAY_MCP_URL =
  process.env.ONE_DAY_MCP_URL ?? 'http://localhost:3001/mcp';

/**
 * One-day MCP 客户端
 */
export class OneDayMCPClient {
  private client: MultiServerMCPClient | null = null;
  private config: OneDayMCPConfig;

  constructor(config?: OneDayMCPConfig) {
    this.config = config ?? {
      url: DEFAULT_ONE_DAY_MCP_URL,
    };
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    // 根据配置类型创建不同的客户端配置
    if (this.config.url) {
      this.client = new MultiServerMCPClient({
        oneDay: {
          transport: 'http',
          url: this.config.url,
        },
      });
    } else if (this.config.command) {
      this.client = new MultiServerMCPClient({
        oneDay: {
          transport: 'stdio',
          command: this.config.command,
          args: this.config.args ?? [],
        },
      });
    } else {
      this.client = new MultiServerMCPClient({
        oneDay: {
          transport: 'http',
          url: DEFAULT_ONE_DAY_MCP_URL,
        },
      });
    }

    await this.client.initializeConnections();
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      this.client = null;
    }
  }

  /**
   * 获取静态模板
   * 从 Figma URL 获取静态模板代码
   */
  async getStaticTemplate(
    params: GetStaticTemplateParams
  ): Promise<MCPCallResult<StaticTemplateResult>> {
    return executeWithFallback({
      mcpCall: async () => {
        if (!this.client) {
          await this.connect();
        }

        const result = await this.callTool('getStaticTemplate', {
          figmaUrl: params.figmaUrl,
          outputPath: params.outputPath,
          pageId: params.pageId,
        });

        if (result.success) {
          return {
            success: true,
            filePath: (result.content as Record<string, unknown>)?.filePath as string,
            content: (result.content as Record<string, unknown>)?.content as string,
          };
        }

        return {
          success: false,
          error: result.error,
        };
      },
      fallbackCall: async () => {
        // 本地回退：返回空模板
        return {
          success: false,
          error: 'One-day MCP 服务不可用，无法获取静态模板',
        };
      },
      retryConfig: {
        maxRetries: 3,
        retryInterval: 2000,
      },
    });
  }

  /**
   * 上报代码完成信息
   * 调用 completeLogicCode 工具
   */
  async completeLogicCode(
    params: CompleteLogicCodeParams
  ): Promise<MCPCallResult<{ success: boolean; message?: string }>> {
    return executeWithFallback({
      mcpCall: async () => {
        if (!this.client) {
          await this.connect();
        }

        const result = await this.callTool('completeLogicCode', {
          sourceFilePath: params.sourceFilePath,
          generatedFilePath: params.generatedFilePath,
          taskId: params.taskId,
          metadata: params.metadata,
        });

        if (result.success) {
          return {
            success: true,
            message: (result.content as Record<string, unknown>)?.message as string,
          };
        }

        return {
          success: false,
          message: result.error,
        };
      },
      fallbackCall: async () => {
        // 本地回退：静默失败（不影响用户）
        console.warn(
          '[One-day MCP] 服务不可用，无法上报代码完成信息',
          params
        );
        return {
          success: true,
          message: 'Fallback: 上报信息已记录到日志',
        };
      },
      retryConfig: {
        maxRetries: 3,
        retryInterval: 1000,
      },
    });
  }

  /**
   * 调用 MCP 工具
   */
  private async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; content: unknown; error?: string }> {
    if (!this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      const tools = await this.client.getTools();
      const tool = tools.find((t) => t.name === toolName);

      if (!tool) {
        return {
          success: false,
          content: null,
          error: `Tool ${toolName} not found`,
        };
      }

      const result = await tool.invoke(args);

      return {
        success: true,
        content: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        content: null,
        error: errorMessage,
      };
    }
  }
}

/**
 * 创建 One-day MCP 客户端
 */
export function createOneDayMCPClient(config?: OneDayMCPConfig): OneDayMCPClient {
  return new OneDayMCPClient(config);
}
