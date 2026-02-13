/**
 * MCP (Model Context Protocol) 相关类型定义
 */

/**
 * MCP 传输类型
 */
export type MCPTransportType = 'stdio' | 'http' | 'websocket';

/**
 * MCP 服务器配置基础
 */
export interface MCPServerConfigBase {
  /** 传输类型 */
  transport: MCPTransportType;
}

/**
 * Stdio MCP 配置
 */
export interface MCPServerStdioConfig extends MCPServerConfigBase {
  transport: 'stdio';
  /** 命令 */
  command: string;
  /** 参数 */
  args?: string[];
  /** 环境变量 */
  env?: Record<string, string>;
}

/**
 * HTTP MCP 配置
 */
export interface MCPServerHttpConfig extends MCPServerConfigBase {
  transport: 'http';
  /** 服务器 URL */
  url: string;
  /** 请求头 */
  headers?: Record<string, string>;
}

/**
 * WebSocket MCP 配置
 */
export interface MCPServerWebSocketConfig extends MCPServerConfigBase {
  transport: 'websocket';
  /** WebSocket URL */
  url: string;
}

/**
 * MCP 服务器配置
 */
export type MCPServerConfig =
  | MCPServerStdioConfig
  | MCPServerHttpConfig
  | MCPServerWebSocketConfig;

/**
 * Figma MCP 配置
 */
export interface FigmaMCPConfig extends MCPServerStdioConfig {
  transport: 'stdio';
  command: 'npx';
  args: ['-y', 'figma-context-mcp'];
  env: {
    FIGMA_ACCESS_TOKEN: string;
  };
}

/**
 * 知识库 MCP 配置
 */
export interface KnowledgeBaseMCPConfig extends MCPServerHttpConfig {
  transport: 'http';
  url: string;
}

/**
 * MCP 工具定义
 */
export interface MCPToolDefinition {
  /** 工具名称 */
  name: string;
  /** 工具描述 */
  description: string;
  /** 输入 schema */
  inputSchema: Record<string, unknown>;
}

/**
 * MCP 工具调用结果
 */
export interface MCPToolResult {
  /** 是否成功 */
  success: boolean;
  /** 结果内容 */
  content: unknown;
  /** 错误信息 */
  error?: string;
}

/**
 * Figma 设计提取选项
 */
export interface FigmaExtractOptions {
  /** Figma 文件 URL */
  fileUrl: string;
  /** 节点 ID（可选） */
  nodeId?: string;
  /** 是否包含样式 */
  includeStyles?: boolean;
  /** 是否包含组件 */
  includeComponents?: boolean;
}

/**
 * 知识库查询选项
 */
export interface KnowledgeBaseQueryOptions {
  /** 查询文本 */
  query: string;
  /** 最大结果数 */
  maxResults?: number;
  /** 相似度阈值 */
  similarityThreshold?: number;
  /** 过滤条件 */
  filters?: Record<string, unknown>;
}

/**
 * 知识库查询结果
 */
export interface KnowledgeBaseQueryResult {
  /** 查询是否成功 */
  success: boolean;
  /** 匹配的文档片段 */
  chunks: KnowledgeBaseChunk[];
  /** 总匹配数 */
  totalMatches: number;
  /** 错误信息 */
  error?: string;
}

/**
 * 知识库文档片段
 */
export interface KnowledgeBaseChunk {
  /** 片段 ID */
  id: string;
  /** 文档内容 */
  content: string;
  /** 相似度分数 */
  score: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 多 MCP 客户端配置
 */
export type MultiMCPClientConfig = Record<string, MCPServerConfig>;
