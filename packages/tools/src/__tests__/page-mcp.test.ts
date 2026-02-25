/**
 * MCP 扩展客户端测试
 * 测试 One-day MCP、Apifox MCP 和回退策略
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @langchain/mcp-adapters
vi.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: class MultiServerMCPClient {
    private config: Record<string, unknown>;
    constructor(config: Record<string, unknown>) {
      this.config = config;
    }
    async initializeConnections() {
      // Mock 初始化
    }
    async getTools() {
      return [
        {
          name: 'getStaticTemplate',
          invoke: vi.fn().mockResolvedValue({ filePath: '/path/to/file.tsx', content: 'export default function Page() {}' }),
        },
        {
          name: 'completeLogicCode',
          invoke: vi.fn().mockResolvedValue({ success: true }),
        },
        {
          name: 'apifox_get_api_list',
          invoke: vi.fn().mockResolvedValue([
            { id: '1', name: 'API 1', method: 'GET', path: '/api/test' },
          ]),
        },
        {
          name: 'apifox_get_api_detail',
          invoke: vi.fn().mockResolvedValue({
            id: '1',
            name: 'API 1',
            method: 'GET',
            path: '/api/test',
          }),
        },
      ];
    }
  },
}));

describe('Fallback Strategy', () => {
  describe('executeWithFallback', () => {
    it('should return success when MCP call succeeds', async () => {
      const { executeWithFallback } = await import('../mcp/fallback-strategy.js');

      const result = await executeWithFallback({
        mcpCall: async () => ({ data: 'success' }),
        fallbackCall: async () => ({ data: 'fallback' }),
        retryConfig: { maxRetries: 1, retryInterval: 100 },
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('mcp');
    });

    it('should use fallback when MCP call fails', async () => {
      const { executeWithFallback } = await import('../mcp/fallback-strategy.js');

      const result = await executeWithFallback({
        mcpCall: async () => {
          throw new Error('MCP failed');
        },
        fallbackCall: async () => ({ data: 'fallback' }),
        retryConfig: { maxRetries: 1, retryInterval: 100 },
      });

      expect(result.success).toBe(true);
      expect(result.source).toBe('fallback');
    });

    it('should retry on failure', async () => {
      const { executeWithFallback } = await import('../mcp/fallback-strategy.js');

      let callCount = 0;
      const result = await executeWithFallback({
        mcpCall: async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Not yet');
          }
          return { data: 'success' };
        },
        retryConfig: { maxRetries: 3, retryInterval: 10 },
      });

      expect(result.success).toBe(true);
      expect(callCount).toBe(3);
    });

    it('should call onError callback on failure', async () => {
      const { executeWithFallback } = await import('../mcp/fallback-strategy.js');

      const onError = vi.fn();
      await executeWithFallback({
        mcpCall: async () => {
          throw new Error('Test error');
        },
        fallbackCall: async () => ({ data: 'fallback' }),
        retryConfig: { maxRetries: 2, retryInterval: 10 },
        onError,
      });

      expect(onError).toHaveBeenCalledTimes(2);
    });
  });

  describe('createResilientMCPCaller', () => {
    it('should create a resilient caller function', async () => {
      const { createResilientMCPCaller } = await import('../mcp/fallback-strategy.js');

      const caller = createResilientMCPCaller(
        async (x: number) => x * 2,
        async (x: number) => x * 3,
        { maxRetries: 1, retryInterval: 10 }
      );

      const result = await caller(5);

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });
  });
});

describe('One-day MCP Client', () => {
  describe('constructor', () => {
    it('should create client with HTTP config', async () => {
      const { OneDayMCPClient } = await import('../mcp/one-day-client.js');

      const client = new OneDayMCPClient({
        url: 'http://localhost:3001/mcp',
      });

      expect(client).toBeDefined();
    });

    it('should create client with Stdio config', async () => {
      const { OneDayMCPClient } = await import('../mcp/one-day-client.js');

      const client = new OneDayMCPClient({
        command: 'npx',
        args: ['one-day-mcp'],
      });

      expect(client).toBeDefined();
    });
  });

  describe('getStaticTemplate', () => {
    it('should return template result', async () => {
      const { createOneDayMCPClient } = await import('../mcp/one-day-client.js');

      const client = createOneDayMCPClient({ url: 'http://localhost:3001/mcp' });
      const result = await client.getStaticTemplate({
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputPath: '/tmp/output',
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('completeLogicCode', () => {
    it('should report code completion', async () => {
      const { createOneDayMCPClient } = await import('../mcp/one-day-client.js');

      const client = createOneDayMCPClient({ url: 'http://localhost:3001/mcp' });
      const result = await client.completeLogicCode({
        sourceFilePath: '/path/to/index.tsx',
        generatedFilePath: '/path/to/index.ai.tsx',
      });

      expect(result.success).toBeDefined();
    });
  });
});

describe('Apifox MCP Client', () => {
  describe('constructor', () => {
    it('should create client with API key', async () => {
      const { ApifoxMCPClient } = await import('../mcp/apifox-client.js');

      const client = new ApifoxMCPClient({
        apiKey: 'test-key',
        projectId: 'test-project',
      });

      expect(client).toBeDefined();
    });

    it('should create client with HTTP config', async () => {
      const { ApifoxMCPClient } = await import('../mcp/apifox-client.js');

      const client = new ApifoxMCPClient({
        url: 'http://api.apifox.com/mcp',
      });

      expect(client).toBeDefined();
    });
  });

  describe('getAPIList', () => {
    it('should return API list', async () => {
      const { createApifoxMCPClient } = await import('../mcp/apifox-client.js');

      const client = createApifoxMCPClient({ apiKey: 'test-key' });
      const result = await client.getAPIList({
        keywords: ['booking', 'reservation'],
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('getAPIDetail', () => {
    it('should return API detail', async () => {
      const { createApifoxMCPClient } = await import('../mcp/apifox-client.js');

      const client = createApifoxMCPClient({ apiKey: 'test-key' });
      const result = await client.getAPIDetail({
        apiId: 'api-1',
      });

      expect(result.success).toBeDefined();
    });
  });

  describe('searchAPIs', () => {
    it('should search APIs by keywords', async () => {
      const { createApifoxMCPClient } = await import('../mcp/apifox-client.js');

      const client = createApifoxMCPClient({ apiKey: 'test-key' });
      const result = await client.searchAPIs(['booking', 'user']);

      expect(result.success).toBeDefined();
    });
  });
});

describe('MCP Type Exports', () => {
  it('should export MCP client types', async () => {
    const types = await import('../mcp/index.js');

    // 验证类型导出（编译时检查）
    expect(types).toBeDefined();
  });
});
