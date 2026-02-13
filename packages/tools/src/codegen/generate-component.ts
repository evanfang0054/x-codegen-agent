/**
 * 组件代码生成器
 * 根据 Figma 设计数据和 PRD 分析生成 React + Tailwind 组件代码
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda } from '@langchain/core/runnables';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { FigmaDesignData, PRDAnalysisResult } from '@x-codegen/types';

/**
 * 组件生成选项
 */
export interface ComponentGenerateOptions {
  /** 组件名称 */
  componentName: string;
  /** Figma 设计数据 */
  designData: FigmaDesignData;
  /** PRD 分析结果 */
  prdAnalysis?: PRDAnalysisResult | null;
  /** 需求描述 */
  requirements?: string;
  /** 目标框架 */
  framework?: 'react' | 'vue';
  /** 样式方案 */
  styling?: 'tailwind' | 'css-modules' | 'styled-components';
  /** 是否使用 TypeScript */
  typescript?: boolean;
  /** 组件目录结构 */
  structure?: 'single' | 'multi';
}

/**
 * 生成的组件文件
 */
export interface GeneratedComponent {
  /** 文件名 */
  filename: string;
  /** 文件路径（相对于组件目录） */
  path: string;
  /** 文件内容 */
  content: string;
  /** 文件描述 */
  description?: string;
}

/**
 * 组件生成结果
 */
export interface ComponentGenerateResult {
  /** 是否成功 */
  success: boolean;
  /** 组件名称 */
  componentName: string;
  /** 生成的文件列表 */
  files: GeneratedComponent[];
  /** 错误信息 */
  error?: string;
}

/**
 * 静态模板生成 Prompt
 */
const STATIC_TEMPLATE_PROMPT = `你是一个前端代码生成专家。根据 Figma 设计数据生成 React + TypeScript + Tailwind CSS 组件代码。

## 设计数据
{designData}

## 组件名称
{componentName}

## 要求
1. 使用 React 函数组件和 Hooks
2. 使用 TypeScript 类型定义
3. 使用 Tailwind CSS 进行样式
4. 遵循"数据下传，事件上传"原则
5. 组件职责单一，结构清晰
6. 生成以下文件结构：
   - index.ts: 统一导出
   - interface.ts: 类型定义
   - [ComponentName].tsx: 组件实现
   - helpers.ts: 工具函数（如有需要）

## 输出格式
按照以下 JSON 格式输出：
\`\`\`json
{
  "files": [
    {
      "filename": "index.ts",
      "path": "",
      "content": "// 文件内容",
      "description": "文件描述"
    }
  ]
}
\`\`\`

请生成组件代码：`;

/**
 * 代码补全 Prompt
 */
const COMPLETION_PROMPT = `你是一个前端业务逻辑专家。根据 PRD 分析结果补全组件的业务逻辑。

## 静态模板代码
{staticTemplate}

## PRD 分析结果
{prdAnalysis}

## 需求描述
{requirements}

## 要求
1. 保持现有的组件结构不变
2. 添加业务逻辑和状态管理
3. 添加表单验证和错误处理
4. 添加 API 调用逻辑（使用占位符）
5. 添加必要的事件处理函数
6. 使用 Zustand 进行状态管理（如需要）

## 输出格式
按照以下 JSON 格式输出完整的组件代码：
\`\`\`json
{
  "files": [
    {
      "filename": "index.ts",
      "path": "",
      "content": "// 完整的文件内容",
      "description": "文件描述"
    }
  ]
}
\`\`\`

请补全组件代码：`;

/**
 * 组件代码生成器
 */
export class ComponentGenerator {
  private model: BaseChatModel;

  constructor(model: BaseChatModel) {
    this.model = model;
  }

  /**
   * 生成静态模板代码
   */
  async generateStaticTemplate(
    options: ComponentGenerateOptions
  ): Promise<ComponentGenerateResult> {
    const {
      componentName,
      designData,
      framework = 'react',
      styling = 'tailwind',
      typescript = true,
    } = options;

    try {
      const prompt = ChatPromptTemplate.fromTemplate(STATIC_TEMPLATE_PROMPT);
      const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

      const result = await chain.invoke({
        designData: JSON.stringify(designData, null, 2),
        componentName,
        framework,
        styling,
        typescript: typescript.toString(),
      });

      const files = this.parseGeneratedFiles(result);

      return {
        success: true,
        componentName,
        files,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        componentName,
        files: [],
        error: errorMessage,
      };
    }
  }

  /**
   * 补全业务逻辑代码
   */
  async completeBusinessLogic(
    staticTemplate: GeneratedComponent[],
    prdAnalysis: PRDAnalysisResult,
    requirements: string
  ): Promise<ComponentGenerateResult> {
    try {
      const prompt = ChatPromptTemplate.fromTemplate(COMPLETION_PROMPT);
      const chain = prompt.pipe(this.model).pipe(new StringOutputParser());

      const result = await chain.invoke({
        staticTemplate: JSON.stringify(staticTemplate, null, 2),
        prdAnalysis: JSON.stringify(prdAnalysis, null, 2),
        requirements,
      });

      const files = this.parseGeneratedFiles(result);

      return {
        success: true,
        componentName: staticTemplate[0]?.filename.replace('.tsx', '') ?? 'Component',
        files,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        componentName: staticTemplate[0]?.filename.replace('.tsx', '') ?? 'Component',
        files: staticTemplate,
        error: errorMessage,
      };
    }
  }

  /**
   * 完整生成流程（静态模板 + 业务补全）
   */
  async generate(
    options: ComponentGenerateOptions
  ): Promise<ComponentGenerateResult> {
    // 步骤 1: 生成静态模板
    const templateResult = await this.generateStaticTemplate(options);

    if (!templateResult.success) {
      return templateResult;
    }

    // 如果有 PRD 分析，进行业务补全
    if (options.prdAnalysis) {
      const completionResult = await this.completeBusinessLogic(
        templateResult.files,
        options.prdAnalysis,
        options.requirements ?? ''
      );

      return completionResult;
    }

    return templateResult;
  }

  /**
   * 创建可运行的生成链
   */
  createGenerateChain() {
    return RunnableLambda.from(async (options: ComponentGenerateOptions) => {
      return this.generate(options);
    });
  }

  /**
   * 解析生成的文件
   */
  private parseGeneratedFiles(result: string): GeneratedComponent[] {
    const files: GeneratedComponent[] = [];

    // 尝试提取 JSON 块
    const jsonMatch = result.match(/```json\s*([\s\S]*?)```/);
    const jsonContent = jsonMatch?.[1] ?? result;

    try {
      const parsed = JSON.parse(jsonContent.trim()) as { files?: GeneratedComponent[] };

      if (Array.isArray(parsed.files)) {
        return parsed.files;
      }
    } catch {
      // JSON 解析失败，尝试其他格式
    }

    // 尝试提取代码块
    const codeBlocks = result.matchAll(/```(\w+)?\s*(?:\/\/\s*)?([^\n]+)\n([\s\S]*?)```/g);

    for (const match of codeBlocks) {
      const language = match[1] ?? 'typescript';
      const filename = match[2]?.trim() ?? `file-${files.length}.ts`;
      const content = match[3] ?? '';

      files.push({
        filename,
        path: '',
        content: content.trim(),
        description: `${language} file`,
      });
    }

    return files;
  }
}

/**
 * 创建组件生成器
 */
export function createComponentGenerator(model: BaseChatModel): ComponentGenerator {
  return new ComponentGenerator(model);
}
