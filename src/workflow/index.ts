/**
 * 工作流对外 API
 * 提供便捷的代码生成接口
 */

import { nanoid } from 'nanoid';
import { HumanMessage } from '@langchain/core/messages';
import { createCodeGenGraph, type CodeGenGraph } from './graph.js';
import type {
  CodeGenOptions,
  WorkflowCodeGenResult,
  CodeGenState,
  StreamEvent,
  WorkflowStep,
} from '@/types/index.js';

// 重新导出工作流专用的 CodeGenResult 类型
export type CodeGenResult = WorkflowCodeGenResult;

/**
 * 默认模板仓库
 */
const DEFAULT_TEMPLATE_REPO =
  process.env.DEFAULT_TEMPLATE_REPO ?? 'https://github.com/example/react-tailwind-template';

/**
 * 默认最大重试次数
 */
const DEFAULT_MAX_RETRIES = 3;

/**
 * 代码生成器
 * 封装工作流的创建和执行
 */
export class CodeGenerator {
  private graph: CodeGenGraph;
  private options: CodeGenOptions;

  constructor(options: CodeGenOptions) {
    this.options = {
      templateRepo: DEFAULT_TEMPLATE_REPO,
      maxRetries: DEFAULT_MAX_RETRIES,
      enableCheckpointer: true,
      ...options,
    };

    this.graph = createCodeGenGraph({
      checkpointer: this.options.enableCheckpointer,
    });
  }

  /**
   * 执行代码生成
   * 一次性执行整个工作流
   */
  async generate(): Promise<CodeGenResult> {
    const threadId = this.options.threadId ?? nanoid();

    // 构建初始状态
    const initialState: Partial<CodeGenState> = {
      figmaUrl: this.options.figmaUrl,
      templateRepo: this.options.templateRepo ?? DEFAULT_TEMPLATE_REPO,
      outputDir: this.options.outputDir,
      requirements: this.options.requirements,
      currentStep: 'init',
      sandboxPath: '',
      projectPath: '',
      generatedFiles: [],
      messages: [new HumanMessage('开始代码生成工作流')],
      figmaDesignData: null,
      prdAnalysis: null,
      componentCode: {},
      validationPassed: false,
      validationLog: '',
      error: null,
      retryCount: 0,
      maxRetries: this.options.maxRetries ?? DEFAULT_MAX_RETRIES,
    };

    try {
      // 执行工作流
      const result = await this.graph.invoke(initialState, {
        configurable: {
          thread_id: threadId,
        },
      });

      return this.buildResult(result as CodeGenState);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        finalStep: 'error',
        generatedFiles: [],
        outputDir: this.options.outputDir,
        error: errorMessage,
      };
    }
  }

  /**
   * 流式执行代码生成
   * 通过生成器逐步返回进度事件
   */
  async *generateStream(): AsyncGenerator<StreamEvent> {
    const threadId = this.options.threadId ?? nanoid();

    // 构建初始状态
    const initialState: Partial<CodeGenState> = {
      figmaUrl: this.options.figmaUrl,
      templateRepo: this.options.templateRepo ?? DEFAULT_TEMPLATE_REPO,
      outputDir: this.options.outputDir,
      requirements: this.options.requirements,
      currentStep: 'init',
      sandboxPath: '',
      projectPath: '',
      generatedFiles: [],
      messages: [new HumanMessage('开始代码生成工作流')],
      figmaDesignData: null,
      prdAnalysis: null,
      componentCode: {},
      validationPassed: false,
      validationLog: '',
      error: null,
      retryCount: 0,
      maxRetries: this.options.maxRetries ?? DEFAULT_MAX_RETRIES,
    };

    try {
      // 发送初始事件
      yield {
        step: 'init' as WorkflowStep,
        message: '开始代码生成工作流',
        timestamp: new Date(),
      };

      // 流式执行工作流
      const stream = await this.graph.stream(initialState, {
        configurable: {
          thread_id: threadId,
        },
        streamMode: 'values',
      });

      let finalState: CodeGenState | null = null;

      for await (const event of stream) {
        const state = event as CodeGenState;
        finalState = state;

        // 从最新的消息中提取进度信息
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage) {
          yield {
            step: state.currentStep,
            message: typeof lastMessage.content === 'string'
              ? lastMessage.content
              : JSON.stringify(lastMessage.content),
            timestamp: new Date(),
            data: {
              sandboxPath: state.sandboxPath,
              projectPath: state.projectPath,
              generatedFiles: state.generatedFiles,
              validationPassed: state.validationPassed,
            },
          };
        }
      }

      // 发送完成事件
      if (finalState) {
        yield {
          step: finalState.currentStep,
          message: finalState.error ?? '代码生成完成',
          timestamp: new Date(),
          data: {
            generatedFiles: finalState.generatedFiles,
            validationPassed: finalState.validationPassed,
            validationLog: finalState.validationLog,
          },
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      yield {
        step: 'error',
        message: `工作流执行错误: ${errorMessage}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * 构建结果对象
   */
  private buildResult(state: CodeGenState): CodeGenResult {
    const success = state.currentStep === 'completed' || state.validationPassed;

    return {
      success,
      finalStep: state.currentStep,
      generatedFiles: state.generatedFiles,
      outputDir: this.options.outputDir,
      error: state.error ?? undefined,
      validationLog: state.validationLog || undefined,
    };
  }
}

/**
 * 创建代码生成器
 */
export function createCodeGenerator(options: CodeGenOptions): CodeGenerator {
  return new CodeGenerator(options);
}

/**
 * 便捷函数：一次性执行代码生成
 */
export async function generateCode(options: CodeGenOptions): Promise<CodeGenResult> {
  const generator = new CodeGenerator(options);
  return generator.generate();
}

/**
 * 便捷函数：流式执行代码生成
 */
export async function* generateCodeStream(
  options: CodeGenOptions
): AsyncGenerator<StreamEvent> {
  const generator = new CodeGenerator(options);
  yield* generator.generateStream();
}

// 导出工作流相关类型和函数
export { createCodeGenGraph, createCodeGenGraphWithoutCheckpointer, type CodeGenGraph } from './graph.js';
export { initNode, templateNode, completionNode, validateNode } from './nodes/index.js';
