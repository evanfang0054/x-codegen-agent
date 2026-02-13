/**
 * Figma MCP 客户端
 * 通过 MCP 协议连接 figma-context-mcp 服务获取设计数据
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type {
  FigmaMCPConfig,
  FigmaExtractOptions,
  FigmaDesignData,
} from '@/types/index.js';

/**
 * 默认 Figma MCP 配置
 */
function getDefaultFigmaConfig(): FigmaMCPConfig {
  const accessToken = process.env.FIGMA_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
  }

  return {
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'figma-context-mcp'],
    env: {
      FIGMA_ACCESS_TOKEN: accessToken,
    },
  };
}

/**
 * 设计提取结果
 */
export interface DesignExtractResult {
  /** 是否成功 */
  success: boolean;
  /** 设计数据 */
  data: FigmaDesignData | null;
  /** 错误信息 */
  error?: string;
}

/**
 * 组件列表结果
 */
export interface ComponentsResult {
  /** 是否成功 */
  success: boolean;
  /** 组件列表 */
  data: unknown[];
  /** 错误信息 */
  error?: string;
}

/**
 * Figma MCP 客户端
 */
export class FigmaMCPClient {
  private client: MultiServerMCPClient | null = null;
  private config: FigmaMCPConfig;

  constructor(config?: Partial<FigmaMCPConfig>) {
    this.config = config ? { ...getDefaultFigmaConfig(), ...config } : getDefaultFigmaConfig();
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    this.client = new MultiServerMCPClient({
      figma: this.config,
    });

    await this.client.initializeConnections();
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      // MultiServerMCPClient 可能没有 close 方法，直接置空
      this.client = null;
    }
  }

  /**
   * 提取 Figma 设计数据
   */
  async extractDesign(options: FigmaExtractOptions): Promise<DesignExtractResult> {
    if (!this.client) {
      await this.connect();
    }

    try {
      // 解析 Figma URL 获取 file key 和 node id
      const { fileKey, nodeId } = this.parseFigmaUrl(options.fileUrl);

      // 调用 MCP 工具获取设计数据
      const result = await this.callTool('get_figma_design', {
        fileKey,
        nodeId: options.nodeId ?? nodeId,
        includeStyles: options.includeStyles ?? true,
        includeComponents: options.includeComponents ?? true,
      });

      if (result.success && result.content) {
        return {
          success: true,
          data: this.transformDesignData(result.content, fileKey, nodeId),
        };
      }

      return {
        success: false,
        data: null,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  /**
   * 获取组件列表
   */
  async getComponents(fileKey: string): Promise<ComponentsResult> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const result = await this.callTool('get_figma_components', { fileKey });

      return {
        success: result.success,
        data: result.success && Array.isArray(result.content) ? result.content : [],
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: [],
        error: errorMessage,
      };
    }
  }

  /**
   * 解析 Figma URL
   */
  private parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } {
    // 支持多种 Figma URL 格式
    // https://www.figma.com/file/FILE_KEY/FILE_NAME?node-id=NODE_ID
    // https://www.figma.com/design/FILE_KEY/FILE_NAME?node-id=NODE_ID

    const fileMatch = url.match(/\/(?:file|design)\/([a-zA-Z0-9]+)/);
    const nodeMatch = url.match(/[?&]node-id=([^&]+)/);

    if (!fileMatch?.[1]) {
      throw new Error(`Invalid Figma URL: ${url}`);
    }

    return {
      fileKey: fileMatch[1],
      nodeId: nodeMatch?.[1] ? decodeURIComponent(nodeMatch[1]) : undefined,
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

      // 使用 LangChain 工具调用
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

  /**
   * 转换设计数据为内部格式
   */
  private transformDesignData(
    raw: unknown,
    fileKey: string,
    nodeId?: string
  ): FigmaDesignData {
    // 根据 figma-context-mcp 返回的实际格式进行转换
    const rawData = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

    return {
      nodeId: nodeId ?? fileKey,
      name: (rawData.name as string) ?? 'Unnamed Design',
      description: rawData.description as string | undefined,
      components: this.extractComponents(rawData),
      styles: (rawData.styles as Record<string, unknown>) ?? {},
      layout: (rawData.layout as Record<string, unknown>) ?? {},
      raw: rawData,
    };
  }

  /**
   * 提取组件结构
   */
  private extractComponents(data: Record<string, unknown>): FigmaDesignData['components'] {
    const components: FigmaDesignData['components'] = [];

    const traverse = (node: Record<string, unknown>, depth = 0): void => {
      if (depth > 50) return; // 防止无限递归

      components.push({
        id: (node.id as string) ?? '',
        name: (node.name as string) ?? '',
        type: (node.type as string) ?? 'UNKNOWN',
        children: undefined,
        styles: node.styles as Record<string, unknown> | undefined,
        text: node.characters as string | undefined,
      });

      const children = node.children as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(children)) {
        for (const child of children) {
          traverse(child, depth + 1);
        }
      }
    };

    traverse(data);
    return components;
  }
}

/**
 * 创建 Figma MCP 客户端
 */
export function createFigmaMCPClient(config?: Partial<FigmaMCPConfig>): FigmaMCPClient {
  return new FigmaMCPClient(config);
}
