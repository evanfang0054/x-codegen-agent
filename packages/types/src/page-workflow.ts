/**
 * Page-Codegen 工作流相关类型定义
 * 用于前端页面胶水代码补全的 7 步工作流
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

// ==================== 工作流步骤 ====================

/**
 * Page-Codegen 工作流步骤枚举
 */
export type PageWorkflowStep =
  | 'init'        // 步骤0：初始化（创建沙箱、Figma MCP 获取模板、创建 AI 副本）
  | 'research'    // 步骤1：需求与代码研究（PRD 查询、静态代码分析、技术规范阅读）
  | 'api-design'  // 步骤2：接口与数据逻辑设计（获取 API Schema、设计数据层）
  | 'ui-design'   // 步骤3：UI 组件与交互逻辑设计（组件 API 查询、交互逻辑设计）
  | 'integration' // 步骤4：代码整合与 PRD 验收（补全代码、PRD 验收）
  | 'validate'    // 步骤5：代码质量验证（pnpm check、生成 final_code.md）
  | 'deliver'     // 步骤6：任务完成交付（告知用户、上报 one-day-mcp）
  | 'error';      // 错误状态

// ==================== 任务计划相关 ====================

/**
 * 任务计划项
 */
export interface TaskPlanItem {
  /** 阶段 ID */
  id: string;
  /** 阶段名称 */
  name: string;
  /** 阶段描述 */
  description: string;
  /** 是否完成 */
  completed: boolean;
  /** 关联的步骤文件 */
  stepFile?: string;
}

/**
 * 任务计划结构
 */
export interface TaskPlan {
  /** 页面名称 */
  pageName: string;
  /** 目标描述 */
  goal: string;
  /** 原始静态模板文件列表（只读） */
  originalFiles: OriginalFileInfo[];
  /** AI 工作副本文件列表（可修改） */
  aiWorkFiles: AIWorkFileInfo[];
  /** 辅助文件 */
  auxiliaryFiles: {
    taskPlan?: string;
    researchNotes?: string;
    finalCode?: string;
  };
  /** 阶段列表 */
  stages: TaskPlanItem[];
  /** 关键问题 */
  keyQuestions: string[];
  /** 已做出的决策 */
  decisions: Array<{
    decision: string;
    reason: string;
    timestamp: string;
  }>;
  /** 遇到的错误 */
  errors: Array<{
    stage: string;
    error: string;
    solution?: string;
    timestamp: string;
  }>;
  /** 当前状态 */
  currentStatus: string;
  /** 当前步骤 */
  currentStep: PageWorkflowStep;
}

// ==================== 研究笔记相关 ====================

/**
 * 研究笔记项
 */
export interface ResearchNote {
  /** 笔记 ID */
  id: string;
  /** 笔记类型 */
  type: 'api-doc' | 'component-doc' | 'prd' | 'code-snippet' | 'spec' | 'user-clarification' | 'other';
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 来源 */
  source: 'mcp' | 'local' | 'inferred' | 'user';
  /** 时间戳 */
  timestamp: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 研究笔记结构
 */
export interface ResearchNotes {
  /** 页面名称 */
  pageName: string;
  /** API 文档查询结果 */
  apiDocuments: Array<{
    name: string;
    path: string;
    method: string;
    requestParams?: unknown;
    responseData?: unknown;
    notes?: string;
    source: 'mcp' | 'local' | 'inferred';
  }>;
  /** 组件 API 查询结果 */
  componentDocuments: Array<{
    name: string;
    importPath: string;
    props?: unknown;
    usageExample?: string;
    notes?: string;
    source: 'mcp' | 'local' | 'inferred';
  }>;
  /** 用户需求澄清记录 */
  userClarifications: Array<{
    question: string;
    answer: string;
    reason?: string;
  }>;
  /** PRD 理解与拆解（Gherkin 语法） */
  prdBreakdown: {
    coreObjective: string;
    gherkinScenarios: string;
    featureChecklist: Array<{
      name: string;
      description: string;
      status: 'pending' | 'implemented' | 'partial' | 'failed';
    }>;
    edgeCases: Array<{
      name: string;
      description: string;
      solution?: string;
    }>;
  };
  /** 代码片段参考 */
  codeSnippets: Array<{
    feature: string;
    source: string;
    code: string;
    modifications?: string;
  }>;
  /** 编码规范理解 */
  codingStandards: {
    coreSpec?: string;
    jsBridgeSpec?: string;
    apiRequestSpec?: string;
  };
  /** 综合发现 */
  findings: {
    dataFlowDesign?: string;
    stateManagementPlan?: string;
    dependencyFiles: Array<{
      type: 'types' | 'store' | 'utils';
      name: string;
      content?: string;
    }>;
    interactionLogicDesign?: string;
  };
  /** 笔记列表 */
  notes: ResearchNote[];
}

// ==================== API Schema 相关 ====================

/**
 * API Schema 字段定义
 */
export interface APISchemaField {
  /** 字段名 */
  name: string;
  /** 字段类型 */
  type: string;
  /** 是否必填 */
  required: boolean;
  /** 描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: unknown;
  /** 枚举值 */
  enumValues?: string[];
}

/**
 * API Schema 定义
 */
export interface APISchemaDefinition {
  /** 接口 ID */
  id: string;
  /** 接口名称 */
  name: string;
  /** 接口路径 */
  path: string;
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 描述 */
  description?: string;
  /** 请求参数 */
  requestParams?: APISchemaField[];
  /** 请求体 */
  requestBody?: {
    contentType: string;
    fields: APISchemaField[];
  };
  /** 响应数据 */
  responseBody?: {
    fields: APISchemaField[];
  };
  /** 来源 */
  source: 'apifox-mcp' | 'local-doc' | 'inferred';
  /** 原始响应 */
  raw?: unknown;
}

// ==================== 文件管理相关 ====================

/**
 * 原始静态模板文件信息（只读）
 */
export interface OriginalFileInfo {
  /** 文件绝对路径 */
  absolutePath: string;
  /** 相对路径（相对于项目根目录） */
  relativePath: string;
  /** 文件名 */
  fileName: string;
  /** 文件内容哈希（用于验证未被修改） */
  contentHash?: string;
  /** 最后修改时间（用于验证未被修改） */
  lastModified?: string;
}

/**
 * AI 工作副本文件信息（可修改）
 */
export interface AIWorkFileInfo {
  /** 文件绝对路径 */
  absolutePath: string;
  /** 相对路径 */
  relativePath: string;
  /** 文件名 */
  fileName: string;
  /** 对应的原始文件路径 */
  originalFilePath: string;
  /** 文件内容 */
  content?: string;
  /** 是否已完成 */
  completed: boolean;
}

// ==================== MCP 调用相关 ====================

/**
 * MCP 调用结果
 */
export interface MCPCallResult<T = unknown> {
  /** 是否成功 */
  success: boolean;
  /** 结果数据 */
  data?: T;
  /** 错误信息 */
  error?: string;
  /** 来源 */
  source: 'mcp' | 'fallback';
  /** 重试次数 */
  retryCount?: number;
}

// ==================== Gherkin 场景相关 ====================

/**
 * Gherkin 场景步骤
 */
export interface GherkinStep {
  /** 步骤类型 */
  type: 'Given' | 'When' | 'Then' | 'And' | 'But';
  /** 步骤描述 */
  description: string;
}

/**
 * Gherkin 场景
 */
export interface GherkinScenario {
  /** 场景名称 */
  name: string;
  /** 标签 */
  tags?: string[];
  /** 步骤列表 */
  steps: GherkinStep[];
  /** 前端开发指导 */
  frontendGuidance?: string;
}

/**
 * Gherkin 功能
 */
export interface GherkinFeature {
  /** 功能名称 */
  name: string;
  /** 角色描述 */
  asA: string;
  /** 功能需求 */
  iWantTo: string;
  /** 商业价值 */
  soThat: string;
  /** 场景列表 */
  scenarios: GherkinScenario[];
}

// ==================== 工作流选项和结果 ====================

/**
 * Page-Codegen 工作流选项
 */
export interface PageCodegenOptions {
  /** Figma 设计链接 */
  figmaUrl: string;
  /** 输出目录 */
  outputDir: string;
  /** 需求描述 */
  requirements: string;
  /** 项目模板仓库地址（GitHub URL） */
  templateRepo?: string;
  /** 项目名称（用于 Monorepo 项目定位） */
  projectName?: string;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 线程 ID（用于持久化） */
  threadId?: string;
  /** 是否启用检查点 */
  enableCheckpointer?: boolean;
  /** MCP 服务器配置 */
  mcpServers?: PageCodegenMCPServers;
}

/**
 * Page-Codegen MCP 服务器配置
 */
export interface PageCodegenMCPServers {
  /** 知识库 MCP */
  knowledgeBase?: {
    url?: string;
    command?: string;
    args?: string[];
    env?: Record<string, string>;
  };
  /** Apifox MCP */
  apifox?: {
    apiKey?: string;
    projectId?: string;
    url?: string;
    command?: string;
    args?: string[];
  };
  /** One-day MCP */
  oneDay?: {
    url?: string;
    command?: string;
    args?: string[];
  };
}

/**
 * Page-Codegen 工作流结果
 */
export interface PageCodegenResult {
  /** 是否成功 */
  success: boolean;
  /** 最终步骤 */
  finalStep: PageWorkflowStep;
  /** 原始文件列表（未修改） */
  originalFiles: string[];
  /** AI 工作副本文件列表（已完成） */
  aiWorkFiles: string[];
  /** 输出目录 */
  outputDir: string;
  /** final_code.md 路径 */
  finalCodePath?: string;
  /** 验证日志 */
  validationLog?: string;
  /** 错误信息 */
  error?: string;
}

/**
 * Page-Codegen 流式事件
 */
export interface PageCodegenStreamEvent {
  /** 当前步骤 */
  step: PageWorkflowStep;
  /** 事件消息 */
  message: string;
  /** 时间戳 */
  timestamp: Date;
  /** 附加数据 */
  data?: {
    taskPlan?: TaskPlan;
    researchNotes?: ResearchNotes;
    currentFile?: string;
    progress?: number;
    validationPassed?: boolean;
    [key: string]: unknown;
  };
}

// ==================== LangGraph 状态 Annotation ====================

/**
 * Page-Codegen 状态 Annotation
 * 用于 LangGraph StateGraph
 */
export const PageCodegenStateAnnotation = Annotation.Root({
  // ===== 输入参数 =====
  /** Figma 设计链接 */
  figmaUrl: Annotation<string>,
  /** 输出目录 */
  outputDir: Annotation<string>,
  /** 需求描述 */
  requirements: Annotation<string>,
  /** 项目模板仓库地址 */
  templateRepo: Annotation<string>,
  /** 项目名称 */
  projectName: Annotation<string>,

  // ===== 执行状态 =====
  /** 当前步骤 */
  currentStep: Annotation<PageWorkflowStep>,
  /** 沙箱根路径 */
  sandboxPath: Annotation<string>,
  /** 项目路径 */
  projectPath: Annotation<string>,
  /** 最大重试次数 */
  maxRetries: Annotation<number>,
  /** 重试计数 */
  retryCount: Annotation<number>,

  // ===== 消息历史 =====
  /** 消息历史 */
  messages: Annotation<BaseMessage[]>({
    reducer: (a: BaseMessage[], b: BaseMessage[]) => [...(a || []), ...(b || [])],
    default: () => [],
  }),

  // ===== LLM 模型 =====
  /** LLM 模型实例 */
  model: Annotation<BaseChatModel | null>,

  // ===== 三文件模式 =====
  /** 任务计划 */
  taskPlan: Annotation<TaskPlan | null>,
  /** 研究笔记 */
  researchNotes: Annotation<ResearchNotes | null>,
  /** 最终代码路径 */
  finalCodePath: Annotation<string>,

  // ===== 文件管理 =====
  /** 原始静态模板文件列表（只读） */
  originalFiles: Annotation<OriginalFileInfo[]>({
    reducer: (_prev: OriginalFileInfo[] | undefined, next: OriginalFileInfo[]) => next ?? [],
    default: () => [],
  }),
  /** AI 工作副本文件列表（可修改） */
  aiWorkFiles: Annotation<AIWorkFileInfo[]>({
    reducer: (_prev: AIWorkFileInfo[] | undefined, next: AIWorkFileInfo[]) => next ?? [],
    default: () => [],
  }),

  // ===== 中间结果 =====
  /** API Schema 列表 */
  apiSchemas: Annotation<APISchemaDefinition[]>({
    reducer: (_prev: APISchemaDefinition[] | undefined, next: APISchemaDefinition[]) => next ?? [],
    default: () => [],
  }),
  /** Gherkin 功能定义 */
  gherkinFeature: Annotation<GherkinFeature | null>,

  // ===== MCP 配置 =====
  /** MCP 服务器配置 */
  mcpServers: Annotation<PageCodegenMCPServers | null>,

  // ===== 验证与错误 =====
  /** 验证是否通过 */
  validationPassed: Annotation<boolean>,
  /** 验证日志 */
  validationLog: Annotation<string>,
  /** 错误信息 */
  error: Annotation<string | null>,
});

/**
 * Page-Codegen 工作流状态类型（从 Annotation 推断）
 */
export type PageCodegenState = typeof PageCodegenStateAnnotation.State;
