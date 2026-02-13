/**
 * 工作流相关类型定义
 */

import { Annotation } from '@langchain/langgraph';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * 工作流步骤状态
 */
export type WorkflowStep =
  | 'init'
  | 'template'
  | 'completion'
  | 'validate'
  | 'completed'
  | 'error';

/**
 * Figma 设计数据结构
 */
export interface FigmaDesignData {
  /** 设计节点 ID */
  nodeId: string;
  /** 设计名称 */
  name: string;
  /** 设计描述 */
  description?: string;
  /** 组件结构 */
  components: FigmaComponent[];
  /** 样式信息 */
  styles: Record<string, unknown>;
  /** 布局信息 */
  layout: Record<string, unknown>;
  /** 原始响应数据 */
  raw?: unknown;
}

/**
 * Figma 组件结构
 */
export interface FigmaComponent {
  /** 组件 ID */
  id: string;
  /** 组件名称 */
  name: string;
  /** 组件类型 */
  type: string;
  /** 子组件 */
  children?: FigmaComponent[];
  /** 样式属性 */
  styles?: Record<string, unknown>;
  /** 文本内容 */
  text?: string;
}

/**
 * PRD 分析结果
 */
export interface PRDAnalysisResult {
  /** 功能需求列表 */
  features: PRDFeature[];
  /** 数据模型定义 */
  dataModels: PRDDataModel[];
  /** API 接口需求 */
  apiRequirements: PRDAPIRequirement[];
  /** 业务规则 */
  businessRules: string[];
  /** 约束条件 */
  constraints: string[];
}

/**
 * PRD 功能需求
 */
export interface PRDFeature {
  /** 功能 ID */
  id: string;
  /** 功能名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 验收标准 */
  acceptanceCriteria: string[];
}

/**
 * PRD 数据模型
 */
export interface PRDDataModel {
  /** 模型名称 */
  name: string;
  /** 字段列表 */
  fields: {
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }[];
}

/**
 * PRD API 需求
 */
export interface PRDAPIRequirement {
  /** 接口名称 */
  name: string;
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  /** 接口路径 */
  path: string;
  /** 描述 */
  description?: string;
}

/**
 * 代码生成选项
 */
export interface CodeGenOptions {
  /** Figma 设计链接 */
  figmaUrl: string;
  /** 模板仓库地址 */
  templateRepo?: string;
  /** 输出目录 */
  outputDir: string;
  /** 需求描述 */
  requirements: string;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 线程 ID（用于持久化） */
  threadId?: string;
  /** 是否启用检查点 */
  enableCheckpointer?: boolean;
}

/**
 * 代码生成结果
 */
export interface CodeGenResult {
  /** 是否成功 */
  success: boolean;
  /** 最终步骤 */
  finalStep: WorkflowStep;
  /** 生成的文件列表 */
  generatedFiles: string[];
  /** 输出目录 */
  outputDir: string;
  /** 错误信息 */
  error?: string;
  /** 验证日志 */
  validationLog?: string;
}

/**
 * 流式事件
 */
export interface StreamEvent {
  /** 当前步骤 */
  step: WorkflowStep;
  /** 事件消息 */
  message: string;
  /** 时间戳 */
  timestamp: Date;
  /** 附加数据 */
  data?: Record<string, unknown>;
}

/**
 * 代码生成状态 Annotation
 * 用于 LangGraph StateGraph
 */
export const CodeGenStateAnnotation = Annotation.Root({
  // ===== 输入参数 =====
  /** Figma 设计链接 */
  figmaUrl: Annotation<string>,
  /** 模板仓库地址 */
  templateRepo: Annotation<string>,
  /** 输出目录 */
  outputDir: Annotation<string>,
  /** 需求描述 */
  requirements: Annotation<string>,

  // ===== 执行状态 =====
  /** 当前步骤 */
  currentStep: Annotation<WorkflowStep>,
  /** 沙箱根路径 */
  sandboxPath: Annotation<string>,
  /** 项目路径 */
  projectPath: Annotation<string>,
  /** 生成的文件列表 */
  generatedFiles: Annotation<string[]>({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => [],
  }),

  // ===== 消息历史 =====
  /** 消息历史 */
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => [...(a || []), ...(b || [])],
    default: () => [],
  }),

  // ===== 中间结果 =====
  /** Figma 设计数据 */
  figmaDesignData: Annotation<FigmaDesignData | null>,
  /** PRD 分析结果 */
  prdAnalysis: Annotation<PRDAnalysisResult | null>,
  /** 组件代码映射 */
  componentCode: Annotation<Record<string, string>>({
    reducer: (_prev, next) => next ?? {},
    default: () => ({}),
  }),

  // ===== 验证与错误 =====
  /** 验证是否通过 */
  validationPassed: Annotation<boolean>,
  /** 验证日志 */
  validationLog: Annotation<string>,
  /** 错误信息 */
  error: Annotation<string | null>,
  /** 重试计数 */
  retryCount: Annotation<number>,
  /** 最大重试次数 */
  maxRetries: Annotation<number>,
});

/**
 * 工作流状态类型（从 Annotation 推断）
 */
export type CodeGenState = typeof CodeGenStateAnnotation.State;
