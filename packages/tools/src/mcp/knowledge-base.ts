/**
 * 知识库 MCP 客户端
 * 通过 HTTP MCP 协议连接知识库服务获取 PRD 和业务需求
 */

import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type {
  KnowledgeBaseMCPConfig,
  KnowledgeBaseQueryOptions,
  KnowledgeBaseQueryResult,
  KnowledgeBaseChunk,
  PRDAnalysisResult,
  PRDFeature,
  PRDDataModel,
  PRDAPIRequirement,
} from '@x-codegen/types';

/**
 * 默认知识库 MCP URL
 */
const DEFAULT_KNOWLEDGE_BASE_URL =
  process.env.KNOWLEDGE_BASE_MCP_URL ?? 'http://192.168.25.247/mcp/server/pHYOxbIiH66epsq6/mcp';

/**
 * PRD 查询结果
 */
export interface PRDQueryResult {
  /** 是否成功 */
  success: boolean;
  /** PRD 分析结果 */
  data: PRDAnalysisResult;
  /** 错误信息 */
  error?: string;
}

/**
 * 代码模板查询结果
 */
export interface CodeTemplateResult {
  /** 是否成功 */
  success: boolean;
  /** 模板内容 */
  data: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 知识库 MCP 客户端
 */
export class KnowledgeBaseMCPClient {
  private client: MultiServerMCPClient | null = null;
  private config: KnowledgeBaseMCPConfig;

  constructor(config?: Partial<KnowledgeBaseMCPConfig>) {
    this.config = {
      transport: 'http',
      url: config?.url ?? DEFAULT_KNOWLEDGE_BASE_URL,
      headers: config?.headers,
    };
  }

  /**
   * 连接到 MCP 服务器
   */
  async connect(): Promise<void> {
    this.client = new MultiServerMCPClient({
      knowledgeBase: this.config,
    });

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
   * 查询知识库
   */
  async query(options: KnowledgeBaseQueryOptions): Promise<KnowledgeBaseQueryResult> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const result = await this.callTool('retrieve', {
        query: options.query,
        maxResults: options.maxResults ?? 10,
        similarityThreshold: options.similarityThreshold ?? 0.5,
        filters: options.filters,
      });

      if (result.success) {
        return {
          success: true,
          chunks: this.transformChunks(result.content),
          totalMatches: Array.isArray(result.content) ? result.content.length : 1,
        };
      }

      return {
        success: false,
        chunks: [],
        totalMatches: 0,
        error: result.error,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        chunks: [],
        totalMatches: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * 查询 PRD 相关信息
   */
  async queryPRD(requirements: string): Promise<PRDQueryResult> {
    if (!this.client) {
      await this.connect();
    }

    try {
      // 查询功能需求
      const featureResult = await this.query({
        query: `功能需求: ${requirements}`,
        maxResults: 5,
      });

      // 查询数据模型
      const dataModelResult = await this.query({
        query: `数据模型 数据结构: ${requirements}`,
        maxResults: 5,
      });

      // 查询 API 需求
      const apiResult = await this.query({
        query: `API 接口 接口定义: ${requirements}`,
        maxResults: 5,
      });

      // 查询业务规则
      const rulesResult = await this.query({
        query: `业务规则 逻辑 校验: ${requirements}`,
        maxResults: 5,
      });

      // 合并结果生成 PRD 分析
      const analysis = this.generatePRDAnalysis(
        featureResult.chunks,
        dataModelResult.chunks,
        apiResult.chunks,
        rulesResult.chunks
      );

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: this.getEmptyPRDAnalysis(),
        error: errorMessage,
      };
    }
  }

  /**
   * 查询代码模板
   */
  async queryCodeTemplate(
    componentType: string,
    framework: string = 'react'
  ): Promise<CodeTemplateResult> {
    if (!this.client) {
      await this.connect();
    }

    try {
      const result = await this.query({
        query: `${framework} ${componentType} 组件模板 代码示例`,
        maxResults: 3,
      });

      if (result.chunks.length > 0) {
        return {
          success: true,
          data: result.chunks.map((c) => c.content).join('\n\n---\n\n'),
        };
      }

      return {
        success: false,
        data: '',
        error: 'No code template found',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        data: '',
        error: errorMessage,
      };
    }
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

  /**
   * 转换知识库片段
   */
  private transformChunks(raw: unknown): KnowledgeBaseChunk[] {
    if (!raw) return [];

    // 处理数组格式
    if (Array.isArray(raw)) {
      return raw.map((item, index) => ({
        id: item.id ?? `chunk-${index}`,
        content: typeof item === 'string' ? item : item.content ?? JSON.stringify(item),
        score: item.score ?? 1,
        metadata: item.metadata,
      }));
    }

    // 处理单个对象
    if (typeof raw === 'object') {
      const data = raw as Record<string, unknown>;
      return [
        {
          id: (data.id as string) ?? 'chunk-0',
          content: (data.content as string) ?? JSON.stringify(raw),
          score: (data.score as number) ?? 1,
          metadata: data.metadata as Record<string, unknown> | undefined,
        },
      ];
    }

    // 处理字符串
    return [
      {
        id: 'chunk-0',
        content: String(raw),
        score: 1,
      },
    ];
  }

  /**
   * 生成 PRD 分析结果
   */
  private generatePRDAnalysis(
    featureChunks: KnowledgeBaseChunk[],
    dataModelChunks: KnowledgeBaseChunk[],
    apiChunks: KnowledgeBaseChunk[],
    rulesChunks: KnowledgeBaseChunk[]
  ): PRDAnalysisResult {
    return {
      features: this.extractFeatures(featureChunks),
      dataModels: this.extractDataModels(dataModelChunks),
      apiRequirements: this.extractAPIRequirements(apiChunks),
      businessRules: rulesChunks.map((c) => c.content),
      constraints: [],
    };
  }

  /**
   * 提取功能需求
   */
  private extractFeatures(chunks: KnowledgeBaseChunk[]): PRDFeature[] {
    const features: PRDFeature[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      features.push({
        id: `feat-${i + 1}`,
        name: this.extractFeatureName(chunk.content),
        description: chunk.content,
        priority: 'medium',
        acceptanceCriteria: [],
      });
    }

    return features;
  }

  /**
   * 从内容中提取功能名称
   */
  private extractFeatureName(content: string): string {
    const lines = content.split('\n');
    const firstLine = lines[0] ?? '';

    // 尝试提取标题
    const headerMatch = firstLine.match(/^#+\s*(.+)$/);
    if (headerMatch?.[1]) {
      return headerMatch[1];
    }

    // 使用前 50 个字符作为名称
    return firstLine.slice(0, 50) || 'Unnamed Feature';
  }

  /**
   * 提取数据模型
   */
  private extractDataModels(chunks: KnowledgeBaseChunk[]): PRDDataModel[] {
    // 简单实现：尝试从内容中提取数据模型
    const models: PRDDataModel[] = [];

    for (const chunk of chunks) {
      const modelMatch = chunk.content.match(
        /(?:interface|type|class)\s+(\w+)\s*{([^}]+)}/
      );

      if (modelMatch?.[1] && modelMatch?.[2]) {
        models.push({
          name: modelMatch[1],
          fields: this.parseFields(modelMatch[2]),
        });
      }
    }

    return models;
  }

  /**
   * 解析字段定义
   */
  private parseFields(content: string): PRDDataModel['fields'] {
    const fields: PRDDataModel['fields'] = [];
    const lines = content.split(';').map((l) => l.trim());

    for (const line of lines) {
      const fieldMatch = line.match(/(\w+)(\?)?:\s*(\w+)/);
      if (fieldMatch?.[1] && fieldMatch?.[3]) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[3],
          required: fieldMatch[2] !== '?',
        });
      }
    }

    return fields;
  }

  /**
   * 提取 API 需求
   */
  private extractAPIRequirements(chunks: KnowledgeBaseChunk[]): PRDAPIRequirement[] {
    const apis: PRDAPIRequirement[] = [];

    for (const chunk of chunks) {
      // 尝试匹配 REST API 定义
      const apiMatches = chunk.content.matchAll(
        /(GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]+)/g
      );

      for (const match of apiMatches) {
        const method = match[1] as PRDAPIRequirement['method'];
        const path = match[2];
        if (method && path) {
          apis.push({
            method,
            path,
            name: `${method} ${path}`,
          });
        }
      }
    }

    return apis;
  }

  /**
   * 获取空的 PRD 分析结果
   */
  private getEmptyPRDAnalysis(): PRDAnalysisResult {
    return {
      features: [],
      dataModels: [],
      apiRequirements: [],
      businessRules: [],
      constraints: [],
    };
  }
}

/**
 * 创建知识库 MCP 客户端
 */
export function createKnowledgeBaseMCPClient(
  config?: Partial<KnowledgeBaseMCPConfig>
): KnowledgeBaseMCPClient {
  return new KnowledgeBaseMCPClient(config);
}
