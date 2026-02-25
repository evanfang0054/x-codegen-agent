/**
 * Apifox MCP 客户端
 * 用于获取 API 文档和 Schema
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type {
  MCPCallResult,
  APISchemaDefinition,
  APISchemaField,
} from '@x-codegen/types';
import { executeWithFallback } from './fallback-strategy.js';

/**
 * Apifox MCP 配置
 */
export interface ApifoxMCPConfig {
  /** API Key */
  apiKey?: string;
  /** 项目 ID */
  projectId?: string;
  /** HTTP URL */
  url?: string;
  /** Stdio 命令 */
  command?: string;
  /** Stdio 参数 */
  args?: string[];
}

/**
 * API 列表查询参数
 */
export interface GetAPIListParams {
  /** 搜索关键词 */
  keywords?: string[];
  /** 分类 ID */
  categoryId?: string;
  /** 限制数量 */
  limit?: number;
}

/**
 * API 详情查询参数
 */
export interface GetAPIDetailParams {
  /** API ID */
  apiId: string;
}

/**
 * API 列表项
 */
export interface APIListItem {
  /** API ID */
  id: string;
  /** API 名称 */
  name: string;
  /** 请求方法 */
  method: string;
  /** 请求路径 */
  path: string;
  /** 分类名称 */
  categoryName?: string;
  /** 描述 */
  description?: string;
}

/**
 * 默认 Apifox MCP 配置
 */
const DEFAULT_APIFOX_MCP_COMMAND = 'npx';
const DEFAULT_APIFOX_MCP_ARGS = ['-y', 'apifox-api-docs-mcp'];

/**
 * Apifox MCP 客户端
 */
export class ApifoxMCPClient {
  private client: MultiServerMCPClient | null = null;
  private config: ApifoxMCPConfig;
  private apiKey?: string;
  private projectId?: string;

  constructor(config?: ApifoxMCPConfig) {
    this.config = config ?? {};
    this.apiKey = config?.apiKey ?? process.env.APIFOX_API_KEY;
    this.projectId = config?.projectId ?? process.env.APIFOX_PROJECT_ID;
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    // 根据配置类型创建不同的客户端配置
    if (this.config.url) {
      this.client = new MultiServerMCPClient({
        apifox: {
          transport: 'http',
          url: this.config.url,
          headers: this.apiKey
            ? {
                'X-API-Key': this.apiKey,
              }
            : undefined,
        },
      });
    } else {
      // 默认使用 Stdio
      this.client = new MultiServerMCPClient({
        apifox: {
          transport: 'stdio',
          command: this.config.command ?? DEFAULT_APIFOX_MCP_COMMAND,
          args: this.config.args ?? [...DEFAULT_APIFOX_MCP_ARGS],
          env: this.apiKey
            ? {
                APIFOX_API_KEY: this.apiKey,
                ...(this.projectId ? { APIFOX_PROJECT_ID: this.projectId } : {}),
              }
            : undefined,
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
   * 获取 API 列表
   */
  async getAPIList(
    params: GetAPIListParams = {}
  ): Promise<MCPCallResult<APIListItem[]>> {
    return executeWithFallback({
      mcpCall: async () => {
        if (!this.client) {
          await this.connect();
        }

        const result = await this.callTool('apifox_get_api_list', {
          keywords: params.keywords,
          categoryId: params.categoryId,
          limit: params.limit ?? 50,
          projectId: this.projectId,
        });

        if (result.success) {
          return this.transformAPIList(result.content);
        }

        return [];
      },
      fallbackCall: async () => {
        // 本地回退：返回空列表
        console.warn('[Apifox MCP] 服务不可用，无法获取 API 列表');
        return [];
      },
      retryConfig: {
        maxRetries: 5,
        retryInterval: 2000,
      },
    });
  }

  /**
   * 获取 API 详情
   */
  async getAPIDetail(
    params: GetAPIDetailParams
  ): Promise<MCPCallResult<APISchemaDefinition>> {
    return executeWithFallback({
      mcpCall: async () => {
        if (!this.client) {
          await this.connect();
        }

        const result = await this.callTool('apifox_get_api_detail', {
          apiId: params.apiId,
          projectId: this.projectId,
        });

        if (result.success) {
          return this.transformAPIDetail(result.content);
        }

        throw new Error(result.error ?? '获取 API 详情失败');
      },
      fallbackCall: async () => {
        // 本地回退：返回推断的 Schema
        return this.inferAPISchema(params.apiId);
      },
      retryConfig: {
        maxRetries: 5,
        retryInterval: 2000,
      },
    });
  }

  /**
   * 根据关键词搜索 API
   */
  async searchAPIs(
    keywords: string[]
  ): Promise<MCPCallResult<APISchemaDefinition[]>> {
    const listResult = await this.getAPIList({ keywords, limit: 20 });

    if (!listResult.success || listResult.data!.length === 0) {
      return {
        success: false,
        error: listResult.error ?? '未找到匹配的 API',
        source: listResult.source,
        retryCount: listResult.retryCount,
      };
    }

    // 获取每个 API 的详情
    const details: APISchemaDefinition[] = [];
    for (const api of listResult.data!) {
      const detailResult = await this.getAPIDetail({ apiId: api.id });
      if (detailResult.success && detailResult.data) {
        details.push(detailResult.data);
      }
    }

    return {
      success: true,
      data: details,
      source: listResult.source,
      retryCount: listResult.retryCount,
    };
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

      // 如果 API Key 无效，尝试不传 key 调用
      let result = await tool.invoke(args);

      // 检查是否是认证错误
      if (
        result &&
        typeof result === 'object' &&
        'error' in result &&
        (result.error as string)?.includes('auth')
      ) {
        // 移除 API Key 重试
        const retryArgs = { ...args };
        delete retryArgs.apiKey;
        result = await tool.invoke(retryArgs);
      }

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

  /**
   * 转换 API 列表
   */
  private transformAPIList(raw: unknown): APIListItem[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map((item) => ({
        id: String(item.id ?? item.apiId ?? ''),
        name: item.name ?? item.summary ?? '',
        method: item.method ?? 'GET',
        path: item.path ?? item.url ?? '',
        categoryName: item.categoryName ?? item.folder ?? undefined,
        description: item.description ?? item.desc ?? undefined,
      }));
    }

    // 处理分页响应
    if (typeof raw === 'object' && raw !== null && 'list' in raw) {
      const list = (raw as Record<string, unknown>).list;
      if (Array.isArray(list)) {
        return this.transformAPIList(list);
      }
    }

    return [];
  }

  /**
   * 转换 API 详情
   */
  private transformAPIDetail(raw: unknown): APISchemaDefinition {
    if (!raw || typeof raw !== 'object') {
      throw new Error('Invalid API detail response');
    }

    const data = raw as Record<string, unknown>;

    return {
      id: String(data.id ?? data.apiId ?? ''),
      name: String(data.name ?? data.summary ?? ''),
      path: String(data.path ?? data.url ?? ''),
      method: (data.method as APISchemaDefinition['method']) ?? 'GET',
      description: data.description as string | undefined,
      requestParams: this.transformFields(data.parameters ?? data.params),
      requestBody: data.requestBody
        ? {
            contentType:
              (data.requestBody as Record<string, unknown>)?.contentType as string ??
              'application/json',
            fields: this.transformFields(
              (data.requestBody as Record<string, unknown>)?.properties
            ),
          }
        : undefined,
      responseBody: data.responseBody
        ? {
            fields: this.transformFields(
              (data.responseBody as Record<string, unknown>)?.properties
            ),
          }
        : undefined,
      source: 'apifox-mcp',
      raw: data,
    };
  }

  /**
   * 转换字段定义
   */
  private transformFields(raw: unknown): APISchemaField[] {
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw.map((item) => ({
        name: item.name ?? item.key ?? '',
        type: item.type ?? 'string',
        required: item.required ?? false,
        description: item.description ?? item.desc ?? undefined,
        defaultValue: item.default ?? item.defaultValue ?? undefined,
        enumValues: item.enum ?? item.enumValues ?? undefined,
      }));
    }

    if (typeof raw === 'object') {
      return Object.entries(raw as Record<string, unknown>).map(([name, value]) => {
        const field = value as Record<string, unknown>;
        return {
          name,
          type: (field?.type as string) ?? 'string',
          required: (field?.required as boolean) ?? false,
          description: field?.description as string | undefined,
          defaultValue: field?.default,
          enumValues: field?.enum as string[] | undefined,
        };
      });
    }

    return [];
  }

  /**
   * 推断 API Schema（本地回退）
   */
  private inferAPISchema(apiId: string): APISchemaDefinition {
    return {
      id: apiId,
      name: `Inferred API ${apiId}`,
      path: '/api/unknown',
      method: 'GET',
      description: '此 Schema 是在 MCP 不可用时推断生成的',
      source: 'inferred',
    };
  }
}

/**
 * 创建 Apifox MCP 客户端
 */
export function createApifoxMCPClient(config?: ApifoxMCPConfig): ApifoxMCPClient {
  return new ApifoxMCPClient(config);
}
