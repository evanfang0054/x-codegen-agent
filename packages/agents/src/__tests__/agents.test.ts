/**
 * Agent 模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseAgent, createBaseAgent } from '../index.js';
import type { AgentConfig, AgentInput } from '@x-codegen/types';
import { RunnableLambda } from '@langchain/core/runnables';

// 创建一个简单的 Mock Runnable 模型
// 由于 Agent 内部使用 RunnableSequence，我们需要让 model 本身是一个有效的 Runnable
const createMockModel = () => {
  const invokeFn = vi.fn().mockResolvedValue({
    content: 'Mock response',
    tool_calls: [],
    additional_kwargs: {},
  });

  const bindToolsFn = vi.fn().mockReturnThis();

  // 创建一个 RunnableLambda 作为 mock 模型
  // 它的 invoke 和 stream 行为需要正确支持
  const model = RunnableLambda.from(async (input: unknown) => {
    return invokeFn(input);
  });

  // 添加额外的 mock 方法
  (model as any).invoke = invokeFn;
  (model as any).bindTools = bindToolsFn;
  (model as any).lc = ['MockModel'];
  (model as any).lc_serializable = true;

  return model as unknown as {
    invoke: typeof invokeFn;
    bindTools: typeof bindToolsFn;
    lc: string[];
    lc_serializable: boolean;
  } & ReturnType<typeof RunnableLambda.from>;
};

type MockModel = ReturnType<typeof createMockModel>;

// 创建 Mock 工具
const createMockTool = (name: string) => ({
  name,
  description: `Mock tool: ${name}`,
  schema: {
    type: 'object',
    properties: {},
  },
  invoke: vi.fn().mockResolvedValue({ result: `${name} executed` }),
});

describe('BaseAgent', () => {
  let mockModel: MockModel;
  let baseConfig: AgentConfig;

  beforeEach(() => {
    mockModel = createMockModel();
    baseConfig = {
      name: 'TestAgent',
      description: 'A test agent',
      model: mockModel as unknown as AgentConfig['model'],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create agent with config', () => {
      const agent = new BaseAgent(baseConfig);

      expect(agent.getName()).toBe('TestAgent');
      expect(agent.getDescription()).toBe('A test agent');
      expect(agent.getStatus()).toBe('idle');
    });

    it('should apply default values', () => {
      const agent = new BaseAgent(baseConfig);

      // 默认值通过 config 应用
      const tools = agent.getTools();
      expect(tools).toHaveLength(0);
    });

    it('should register tools from config', () => {
      const mockTool = createMockTool('testTool');
      const agent = new BaseAgent({
        ...baseConfig,
        tools: [mockTool as unknown as AgentConfig['tools'] extends (infer T)[] | undefined ? T : never],
      });

      const tools = agent.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('testTool');
    });
  });

  describe('getName', () => {
    it('should return agent name', () => {
      const agent = new BaseAgent(baseConfig);
      expect(agent.getName()).toBe('TestAgent');
    });
  });

  describe('getDescription', () => {
    it('should return agent description', () => {
      const agent = new BaseAgent(baseConfig);
      expect(agent.getDescription()).toBe('A test agent');
    });

    it('should return undefined if no description', () => {
      const agent = new BaseAgent({ name: 'NoDesc', model: mockModel as unknown as AgentConfig['model'] });
      expect(agent.getDescription()).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return initial status as idle', () => {
      const agent = new BaseAgent(baseConfig);
      expect(agent.getStatus()).toBe('idle');
    });
  });

  describe('getTools', () => {
    it('should return empty array when no tools', () => {
      const agent = new BaseAgent(baseConfig);
      expect(agent.getTools()).toEqual([]);
    });

    it('should return registered tools', () => {
      const mockTool = createMockTool('tool1');
      const agent = new BaseAgent({
        ...baseConfig,
        tools: [mockTool as unknown as AgentConfig['tools'] extends (infer T)[] | undefined ? T : never],
      });

      const tools = agent.getTools();
      expect(tools).toHaveLength(1);
    });
  });

  describe('registerTool', () => {
    it('should add tool to agent', () => {
      const agent = new BaseAgent(baseConfig);
      const mockTool = createMockTool('newTool');

      agent.registerTool(mockTool as unknown as AgentConfig['tools'] extends (infer T)[] | undefined ? T : never);

      expect(agent.getTools()).toHaveLength(1);
      expect(agent.getTools()[0].name).toBe('newTool');
    });
  });

  describe('removeTool', () => {
    it('should remove existing tool', () => {
      const mockTool = createMockTool('removeMe');
      const agent = new BaseAgent({
        ...baseConfig,
        tools: [mockTool as unknown as AgentConfig['tools'] extends (infer T)[] | undefined ? T : never],
      });

      const result = agent.removeTool('removeMe');

      expect(result).toBe(true);
      expect(agent.getTools()).toHaveLength(0);
    });

    it('should return false for non-existing tool', () => {
      const agent = new BaseAgent(baseConfig);
      const result = agent.removeTool('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should execute and return response', async () => {
      mockModel.invoke.mockResolvedValueOnce({
        content: 'Hello from agent',
        tool_calls: [],
        additional_kwargs: {},
      });

      const agent = new BaseAgent(baseConfig);
      const input: AgentInput = { input: 'Hello' };

      const result = await agent.execute(input);

      expect(result.content).toBe('Hello from agent');
      expect(result.usedTools).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(agent.getStatus()).toBe('completed');
    });

    it('should update status to running during execution', async () => {
      let capturedStatus: string | null = null;
      const agent = new BaseAgent(baseConfig);

      mockModel.invoke.mockImplementationOnce(async () => {
        capturedStatus = agent.getStatus();
        return { content: 'Response', tool_calls: [], additional_kwargs: {} };
      });

      await agent.execute({ input: 'Test' });

      expect(capturedStatus).toBe('running');
    });

    it('should handle errors gracefully', async () => {
      mockModel.invoke.mockRejectedValueOnce(new Error('Model error'));

      const agent = new BaseAgent(baseConfig);
      const result = await agent.execute({ input: 'Test' });

      expect(result.content).toBe('');
      expect(result.metadata?.error).toBe('Model error');
      expect(agent.getStatus()).toBe('error');
    });

    it('should call onError callback on error', async () => {
      mockModel.invoke.mockRejectedValueOnce(new Error('Test error'));

      const onError = vi.fn();
      const agent = new BaseAgent(baseConfig);
      await agent.execute({ input: 'Test' }, { callbacks: { onError } });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('stream', () => {
    it('should yield token and complete events', async () => {
      const agent = new BaseAgent(baseConfig);
      const events = [];

      for await (const event of agent.stream({ input: 'Test' })) {
        events.push(event);
      }

      // RunnableLambda.stream 会 yield 单个结果
      expect(events.length).toBeGreaterThan(0);
      expect(events.find((e) => e.type === 'complete')).toBeDefined();
      expect(agent.getStatus()).toBe('completed');
    });

    it('should yield error event on failure', async () => {
      // 设置 mock 抛出错误
      mockModel.invoke.mockRejectedValueOnce(new Error('Stream error'));

      const agent = new BaseAgent(baseConfig);
      const events = [];

      for await (const event of agent.stream({ input: 'Test' })) {
        events.push(event);
      }

      expect(events.find((e) => e.type === 'error')).toBeDefined();
      expect(agent.getStatus()).toBe('error');
    });
  });

  describe('asRunnable', () => {
    it('should return a runnable that executes agent', async () => {
      mockModel.invoke.mockResolvedValueOnce({
        content: 'Runnable response',
        tool_calls: [],
        additional_kwargs: {},
      });

      const agent = new BaseAgent(baseConfig);
      const runnable = agent.asRunnable();
      const result = await runnable.invoke({ input: 'Test' });

      expect(result).toBe('Runnable response');
    });
  });
});

describe('createBaseAgent', () => {
  it('should create a BaseAgent instance', () => {
    const mockModel = createMockModel();
    const agent = createBaseAgent({
      name: 'FactoryAgent',
      model: mockModel as unknown as AgentConfig['model'],
    });

    expect(agent).toBeInstanceOf(BaseAgent);
    expect(agent.getName()).toBe('FactoryAgent');
  });
});
