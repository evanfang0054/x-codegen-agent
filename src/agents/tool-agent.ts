/**
 * 工具调用 Agent
 * 支持 bindTools() 和工具执行
 */

import { HumanMessage, AIMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { StructuredToolInterface } from '@langchain/core/tools';
import type { Runnable } from '@langchain/core/runnables';
import { BaseAgent } from './base-agent.js';
import type {
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentExecuteOptions,
  AgentStreamEvent,
  ToolCallRecord,
} from '@/types/agents.js';

/**
 * 工具调用 Agent 系统 Prompt
 */
const TOOL_AGENT_SYSTEM_PROMPT = `你是一个智能助手，可以使用工具来完成任务。

## 工作流程
1. 分析用户输入
2. 决定是否需要使用工具
3. 如果需要工具，选择合适的工具并调用
4. 根据工具结果生成最终回答

请始终提供清晰、有帮助的回答。`;

/**
 * 工具调用 Agent
 * 扩展 BaseAgent，支持工具绑定和调用
 */
export class ToolAgent extends BaseAgent {
  protected modelWithTools: Runnable | null = null;

  constructor(config: AgentConfig) {
    super({
      ...config,
      systemPrompt: config.systemPrompt ?? TOOL_AGENT_SYSTEM_PROMPT,
    });

    // 绑定工具到模型
    this.bindToolsToModel();
  }

  /**
   * 绑定工具到模型
   */
  protected bindToolsToModel(): void {
    const tools = this.getTools();
    if (tools.length > 0 && typeof this.config.model.bindTools === 'function') {
      this.modelWithTools = this.config.model.bindTools(tools);
    }
  }

  /**
   * 注册工具（重写以更新模型绑定）
   */
  override registerTool(tool: StructuredToolInterface): void {
    super.registerTool(tool);
    this.bindToolsToModel();
  }

  /**
   * 移除工具（重写以更新模型绑定）
   */
  override removeTool(toolName: string): boolean {
    const result = super.removeTool(toolName);
    if (result) {
      this.bindToolsToModel();
    }
    return result;
  }

  /**
   * 执行 Agent（支持工具调用）
   */
  override async execute(
    input: AgentInput,
    options?: AgentExecuteOptions
  ): Promise<AgentOutput> {
    this.status = 'running';
    const messages: BaseMessage[] = [...(input.context ?? [])];
    const toolCalls: ToolCallRecord[] = [];

    try {
      messages.push(new HumanMessage(input.input));

      // 使用绑定了工具的模型
      const model = this.modelWithTools ?? this.config.model;

      // 迭代执行（可能需要多次工具调用）
      let iterations = 0;
      const maxIterations = this.config.maxIterations ?? 10;
      let finalContent = '';

      while (iterations < maxIterations) {
        iterations++;

        // 调用模型
        const response = await model.invoke(messages, {
          timeout: options?.timeout ?? this.config.timeout,
        });

        // 添加 AI 响应到消息历史
        messages.push(new AIMessage(response.content as string));

        // 检查是否有工具调用
        const toolCallsInResponse = response.tool_calls ?? response.additional_kwargs?.tool_calls;

        if (!toolCallsInResponse || (Array.isArray(toolCallsInResponse) && toolCallsInResponse.length === 0)) {
          // 没有工具调用，返回最终结果
          finalContent = response.content as string;
          break;
        }

        // 执行工具调用
        for (const toolCall of toolCallsInResponse as Array<{ name: string; args: Record<string, unknown> }>) {
          const toolName = toolCall.name;
          const toolArgs = toolCall.args;

          options?.callbacks?.onToolStart?.(toolName, toolArgs);

          // 执行工具
          const tool = this.tools.get(toolName);
          let toolResult: unknown;

          if (tool) {
            try {
              toolResult = await tool.invoke(toolArgs);
            } catch (error) {
              toolResult = {
                error: error instanceof Error ? error.message : String(error),
              };
            }
          } else {
            toolResult = { error: `Tool ${toolName} not found` };
          }

          // 记录工具调用
          toolCalls.push({
            name: toolName,
            args: toolArgs,
            result: toolResult,
            timestamp: new Date(),
          });

          options?.callbacks?.onToolEnd?.(toolName, toolResult);

          // 添加工具结果到消息历史
          messages.push(new HumanMessage(`Tool ${toolName} result: ${JSON.stringify(toolResult)}`));
        }
      }

      if (!finalContent) {
        finalContent = '达到最大迭代次数，未能完成任务。';
      }

      this.status = 'completed';

      return {
        content: finalContent,
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
   * 流式执行 Agent（工具调用不支持真正的流式）
   */
  override async *stream(
    input: AgentInput,
    options?: AgentExecuteOptions
  ): AsyncGenerator<AgentStreamEvent> {
    // 工具调用不支持真正的流式，先执行然后生成事件
    const result = await this.execute(input, options);

    // 生成 token 事件
    const tokens = result.content.split('');
    for (const token of tokens) {
      options?.callbacks?.onToken?.(token);
      yield {
        type: 'token',
        content: token,
        timestamp: new Date(),
      };
    }

    // 生成工具调用事件
    if (result.toolCalls) {
      for (const toolCall of result.toolCalls) {
        yield {
          type: 'tool_start',
          content: { name: toolCall.name, args: toolCall.args },
          timestamp: toolCall.timestamp,
        };
        yield {
          type: 'tool_end',
          content: { name: toolCall.name, result: toolCall.result },
          timestamp: toolCall.timestamp,
        };
      }
    }

    // 生成完成事件
    yield {
      type: 'complete',
      content: result.content,
      timestamp: new Date(),
    };
  }
}

/**
 * 创建工具调用 Agent
 */
export function createToolAgent(config: AgentConfig): ToolAgent {
  return new ToolAgent(config);
}
