/**
 * Page-Codegen 工作流图
 * 使用 LangGraph StateGraph 构建 7 步工作流
 */

import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import {
  PageCodegenStateAnnotation,
  type PageCodegenState,
  type PageCodegenOptions,
  type PageCodegenResult,
  type PageCodegenStreamEvent,
  type PageWorkflowStep,
} from '@x-codegen/types';
import {
  initNode,
  researchNode,
  apiDesignNode,
  uiDesignNode,
  integrationNode,
  validateNode,
  deliverNode,
} from './nodes/page/index.js';

/**
 * Page-Codegen 工作流图类型
 */
export type PageCodegenGraph = ReturnType<typeof createPageCodegenGraph>;

/**
 * 创建 Page-Codegen 工作流图
 */
export function createPageCodegenGraph(options?: { checkpointer?: boolean }) {
  const graph = new StateGraph(PageCodegenStateAnnotation)
    // 添加节点
    .addNode('init', initNode)
    .addNode('research', researchNode)
    .addNode('api-design', apiDesignNode)
    .addNode('ui-design', uiDesignNode)
    .addNode('integration', integrationNode)
    .addNode('validate', validateNode)
    .addNode('deliver', deliverNode)
    // 添加边
    .addEdge(START, 'init')
    .addEdge('init', 'research')
    .addEdge('research', 'api-design')
    .addEdge('api-design', 'ui-design')
    .addEdge('ui-design', 'integration')
    .addEdge('integration', 'validate')
    .addEdge('validate', 'deliver')
    .addEdge('deliver', END);

  // 编译图（可选检查点）
  if (options?.checkpointer !== false) {
    return graph.compile({ checkpointer: new MemorySaver() });
  }

  return graph.compile();
}

/**
 * 创建不带检查点的 Page-Codegen 工作流图
 */
export function createPageCodegenGraphWithoutCheckpointer() {
  return createPageCodegenGraph({ checkpointer: false });
}

/**
 * Page-Codegen 代码生成器
 * 封装工作流的创建和执行
 */
export class PageCodeGenerator {
  private graph: PageCodegenGraph;
  private options: PageCodegenOptions;

  constructor(options: PageCodegenOptions) {
    this.options = {
      maxRetries: 3,
      enableCheckpointer: true,
      ...options,
    };

    this.graph = createPageCodegenGraph({
      checkpointer: this.options.enableCheckpointer,
    });
  }

  /**
   * 执行代码生成
   * 一次性执行整个工作流
   */
  async generate(): Promise<PageCodegenResult> {
    const threadId = this.options.threadId ?? crypto.randomUUID();

    // 构建初始状态
    const initialState: Partial<PageCodegenState> = {
      figmaUrl: this.options.figmaUrl,
      outputDir: this.options.outputDir,
      requirements: this.options.requirements,
      templateRepo: this.options.templateRepo ?? '',
      projectName: this.options.projectName ?? '',
      currentStep: 'init',
      sandboxPath: '',
      projectPath: '',
      maxRetries: this.options.maxRetries ?? 3,
      retryCount: 0,
      messages: [],
      model: null,
      taskPlan: null,
      researchNotes: null,
      finalCodePath: '',
      originalFiles: [],
      aiWorkFiles: [],
      apiSchemas: [],
      gherkinFeature: null,
      mcpServers: this.options.mcpServers ?? null,
      validationPassed: false,
      validationLog: '',
      error: null,
    };

    try {
      // 执行工作流
      const result = await this.graph.invoke(initialState, {
        configurable: {
          thread_id: threadId,
        },
      });

      return this.buildResult(result as PageCodegenState);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        success: false,
        finalStep: 'error',
        originalFiles: [],
        aiWorkFiles: [],
        outputDir: this.options.outputDir,
        error: errorMessage,
      };
    }
  }

  /**
   * 流式执行代码生成
   * 通过生成器逐步返回进度事件
   */
  async *generateStream(): AsyncGenerator<PageCodegenStreamEvent> {
    const threadId = this.options.threadId ?? crypto.randomUUID();

    // 构建初始状态
    const initialState: Partial<PageCodegenState> = {
      figmaUrl: this.options.figmaUrl,
      outputDir: this.options.outputDir,
      requirements: this.options.requirements,
      templateRepo: this.options.templateRepo ?? '',
      projectName: this.options.projectName ?? '',
      currentStep: 'init',
      sandboxPath: '',
      projectPath: '',
      maxRetries: this.options.maxRetries ?? 3,
      retryCount: 0,
      messages: [],
      model: null,
      taskPlan: null,
      researchNotes: null,
      finalCodePath: '',
      originalFiles: [],
      aiWorkFiles: [],
      apiSchemas: [],
      gherkinFeature: null,
      mcpServers: this.options.mcpServers ?? null,
      validationPassed: false,
      validationLog: '',
      error: null,
    };

    try {
      // 发送初始事件
      yield {
        step: 'init',
        message: '开始 Page-Codegen 工作流',
        timestamp: new Date(),
      };

      // 流式执行工作流
      const stream = await this.graph.stream(initialState, {
        configurable: {
          thread_id: threadId,
        },
        streamMode: 'values',
      });

      let finalState: PageCodegenState | null = null;

      for await (const event of stream) {
        const state = event as PageCodegenState;
        finalState = state;

        // 发送进度事件
        yield {
          step: state.currentStep,
          message: this.getStepMessage(state.currentStep),
          timestamp: new Date(),
          data: {
            taskPlan: state.taskPlan ?? undefined,
            researchNotes: state.researchNotes ?? undefined,
            progress: this.calculateProgress(state.currentStep),
            validationPassed: state.validationPassed,
          },
        };
      }

      // 发送完成事件
      if (finalState) {
        yield {
          step: finalState.currentStep,
          message: finalState.error ?? 'Page-Codegen 工作流完成',
          timestamp: new Date(),
          data: {
            progress: 100,
            validationPassed: finalState.validationPassed,
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
  private buildResult(state: PageCodegenState): PageCodegenResult {
    const success = state.currentStep === 'deliver' && state.validationPassed;

    return {
      success,
      finalStep: state.currentStep,
      originalFiles: state.originalFiles.map((f) => f.absolutePath),
      aiWorkFiles: state.aiWorkFiles.map((f) => f.absolutePath),
      outputDir: this.options.outputDir,
      finalCodePath: state.finalCodePath || undefined,
      validationLog: state.validationLog || undefined,
      error: state.error ?? undefined,
    };
  }

  /**
   * 获取步骤消息
   */
  private getStepMessage(step: PageWorkflowStep): string {
    const messages: Record<PageWorkflowStep, string> = {
      init: '初始化工作流',
      research: '执行需求与代码研究',
      'api-design': '设计接口与数据层',
      'ui-design': '设计 UI 组件与交互逻辑',
      integration: '整合代码与 PRD 验收',
      validate: '执行代码质量验证',
      deliver: '任务完成交付',
      error: '工作流执行出错',
    };

    return messages[step] ?? '未知步骤';
  }

  /**
   * 计算进度百分比
   */
  private calculateProgress(step: PageWorkflowStep): number {
    const steps: PageWorkflowStep[] = [
      'init',
      'research',
      'api-design',
      'ui-design',
      'integration',
      'validate',
      'deliver',
    ];

    const index = steps.indexOf(step);
    if (index === -1) return 0;

    return Math.round(((index + 1) / steps.length) * 100);
  }
}

/**
 * 创建 Page-Codegen 代码生成器
 */
export function createPageCodeGenerator(options: PageCodegenOptions): PageCodeGenerator {
  return new PageCodeGenerator(options);
}

/**
 * 便捷函数：一次性执行 Page-Codegen 代码生成
 */
export async function pageCodegen(options: PageCodegenOptions): Promise<PageCodegenResult> {
  const generator = new PageCodeGenerator(options);
  return generator.generate();
}

/**
 * 便捷函数：流式执行 Page-Codegen 代码生成
 */
export async function* pageCodegenStream(
  options: PageCodegenOptions
): AsyncGenerator<PageCodegenStreamEvent> {
  const generator = new PageCodeGenerator(options);
  yield* generator.generateStream();
}

// 导出节点
export {
  initNode,
  researchNode,
  apiDesignNode,
  uiDesignNode,
  integrationNode,
  validateNode,
  deliverNode,
};
