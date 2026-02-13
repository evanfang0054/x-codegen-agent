/**
 * 基础 Agent 类
 * 使用 LCEL 构建 Agent，支持 prompt 模板和模型组合
 */

import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentExecuteOptions,
  AgentStreamEvent,
  ToolCallRecord,
  AgentStatus,
} from '@/types/agents.js';

/**
 * 默认系统 Prompt
 */
const DEFAULT_SYSTEM_PROMPT = `你是一个智能助手，能够帮助用户完成各种任务。
请根据用户的输入提供准确、有帮助的回答。`;

/**
 * 基础 Agent 类
 * 使用 LCEL (LangChain Expression Language) 构建
 */
export class BaseAgent {
  protected config: AgentConfig;
  protected chain: RunnableSequence | null = null;
  protected status: AgentStatus = 'idle';
  protected tools: Map<string, StructuredToolInterface> = new Map();

  constructor(config: AgentConfig) {
    this.config = {
      maxIterations: 10,
      temperature: 0.7,
      ...config,
    };

    // 注册工具
    if (config.tools) {
      for (const tool of config.tools) {
        this.tools.set(tool.name, tool);
      }
    }

    // 构建 chain
    this.buildChain();
  }

  /**
   * 获取 Agent 名称
   */
  getName(): string {
    return this.config.name;
  }

  /**
   * 获取 Agent 描述
   */
  getDescription(): string | undefined {
    return this.config.description;
  }

  /**
   * 获取 Agent 状态
   */
  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * 获取已注册的工具
   */
  getTools(): StructuredToolInterface[] {
    return Array.from(this.tools.values());
  }

  /**
   * 注册工具
   */
  registerTool(tool: StructuredToolInterface): void {
    this.tools.set(tool.name, tool);
    // 重新构建 chain 以包含新工具
    this.buildChain();
  }

  /**
   * 移除工具
   */
  removeTool(toolName: string): boolean {
    const result = this.tools.delete(toolName);
    if (result) {
      this.buildChain();
    }
    return result;
  }

  /**
   * 构建 LCEL Chain
   */
  protected buildChain(): void {
    const systemPrompt = this.config.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    const toolsDescription = this.getToolsDescription();

    const fullSystemPrompt = toolsDescription
      ? `${systemPrompt}\n\n## 可用工具\n${toolsDescription}`
      : systemPrompt;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', fullSystemPrompt],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
    ]);

    // 使用 LCEL pipe 组合 prompt + model + parser
    this.chain = RunnableSequence.from([
      prompt,
      this.config.model,
      new StringOutputParser(),
    ]);
  }

  /**
   * 获取工具描述
   */
  protected getToolsDescription(): string {
    if (this.tools.size === 0) {
      return '';
    }

    const descriptions = Array.from(this.tools.values()).map((tool) => {
      return `- ${tool.name}: ${tool.description}`;
    });

    return descriptions.join('\n');
  }

  /**
   * 执行 Agent
   */
  async execute(input: AgentInput, options?: AgentExecuteOptions): Promise<AgentOutput> {
    this.status = 'running';
    const messages: BaseMessage[] = [...(input.context ?? [])];
    const toolCalls: ToolCallRecord[] = [];

    try {
      // 准备输入
      const chainInput = {
        input: input.input,
        chat_history: messages,
      };

      // 执行 chain
      const result = await this.chain!.invoke(chainInput, {
        timeout: options?.timeout ?? this.config.timeout,
      });

      // 添加消息
      messages.push(new HumanMessage(input.input));
      messages.push(new AIMessage(result));

      this.status = 'completed';

      return {
        content: result,
        usedTools: toolCalls.length > 0,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        messages,
      };
    } catch (error) {
      this.status = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);

      options?.callbacks?.onError?.(error instanceof Error ? error : new Error(errorMessage));

      return {
        content: '',
        usedTools: false,
        messages,
        metadata: { error: errorMessage },
      };
    }
  }

  /**
   * 流式执行 Agent
   */
  async *stream(
    input: AgentInput,
    options?: AgentExecuteOptions
  ): AsyncGenerator<AgentStreamEvent> {
    this.status = 'running';
    const messages: BaseMessage[] = [...(input.context ?? [])];

    try {
      // 准备输入
      const chainInput = {
        input: input.input,
        chat_history: messages,
      };

      // 流式执行
      const stream = await this.chain!.stream(chainInput, {
        timeout: options?.timeout ?? this.config.timeout,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk;
        options?.callbacks?.onToken?.(chunk);

        yield {
          type: 'token',
          content: chunk,
          timestamp: new Date(),
        };
      }

      // 添加消息
      messages.push(new HumanMessage(input.input));
      messages.push(new AIMessage(fullContent));

      this.status = 'completed';

      yield {
        type: 'complete',
        content: fullContent,
        timestamp: new Date(),
      };
    } catch (error) {
      this.status = 'error';
      const errorMessage = error instanceof Error ? error.message : String(error);

      yield {
        type: 'error',
        content: { error: errorMessage },
        timestamp: new Date(),
      };
    }
  }

  /**
   * 创建可运行的 chain（用于组合）
   */
  asRunnable() {
    return RunnableLambda.from(async (input: AgentInput) => {
      const result = await this.execute(input);
      return result.content;
    });
  }
}

/**
 * 创建基础 Agent
 */
export function createBaseAgent(config: AgentConfig): BaseAgent {
  return new BaseAgent(config);
}
