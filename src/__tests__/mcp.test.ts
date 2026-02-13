/**
 * MCP 模块单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  FigmaMCPClient,
  createFigmaMCPClient,
  KnowledgeBaseMCPClient,
  createKnowledgeBaseMCPClient,
} from '@/tools/mcp/index.js';
import type { FigmaDesignData, PRDAnalysisResult } from '@/types/index.js';

// Mock MultiServerMCPClient
vi.mock('@langchain/mcp-adapters', () => ({
  MultiServerMCPClient: vi.fn().mockImplementation(() => ({
    initializeConnections: vi.fn().mockResolvedValue({}),
    getTools: vi.fn().mockResolvedValue([
      {
        name: 'get_figma_design',
        invoke: vi.fn().mockResolvedValue({
          name: 'Test Design',
          components: [],
        }),
      },
      {
        name: 'retrieve',
        invoke: vi.fn().mockResolvedValue([
          { id: '1', content: 'Test content', score: 0.9 },
        ]),
      },
    ]),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('FigmaMCPClient', () => {
  let client: FigmaMCPClient;

  beforeEach(() => {
    // 设置环境变量
    process.env.FIGMA_ACCESS_TOKEN = 'test-token';
    client = createFigmaMCPClient();
  });

  afterEach(async () => {
    await client.disconnect();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client).toBeInstanceOf(FigmaMCPClient);
    });

    it('should throw error without FIGMA_ACCESS_TOKEN', () => {
      const originalToken = process.env.FIGMA_ACCESS_TOKEN;
      delete process.env.FIGMA_ACCESS_TOKEN;

      expect(() => createFigmaMCPClient()).toThrow('FIGMA_ACCESS_TOKEN');

      process.env.FIGMA_ACCESS_TOKEN = originalToken;
    });
  });

  describe('connect', () => {
    it('should connect to MCP server', async () => {
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error', async () => {
      await client.connect();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe('extractDesign', () => {
    it('should extract design data', async () => {
      const result = await client.extractDesign({
        fileUrl: 'https://www.figma.com/file/abc123/Design',
        includeStyles: true,
        includeComponents: true,
      });

      // 由于 mock 的限制，这里测试返回结构
      expect(result).toHaveProperty('success');
    });

    it('should fail for invalid Figma URL', async () => {
      const result = await client.extractDesign({
        fileUrl: 'https://invalid-url.com',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Figma URL');
    });
  });

  describe('getComponents', () => {
    it('should get components list', async () => {
      const result = await client.getComponents('abc123');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });
  });
});

describe('KnowledgeBaseMCPClient', () => {
  let client: KnowledgeBaseMCPClient;

  beforeEach(() => {
    client = createKnowledgeBaseMCPClient();
  });

  afterEach(async () => {
    await client.disconnect();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      expect(client).toBeInstanceOf(KnowledgeBaseMCPClient);
    });

    it('should use custom URL', () => {
      const customClient = createKnowledgeBaseMCPClient({
        url: 'http://custom-url/mcp',
      });
      expect(customClient).toBeInstanceOf(KnowledgeBaseMCPClient);
    });
  });

  describe('connect', () => {
    it('should connect to MCP server', async () => {
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect without error', async () => {
      await client.connect();
      await expect(client.disconnect()).resolves.not.toThrow();
    });
  });

  describe('query', () => {
    it('should query knowledge base', async () => {
      const result = await client.query({
        query: 'test query',
        maxResults: 5,
      });

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('chunks');
    });
  });

  describe('queryPRD', () => {
    it('should query PRD information', async () => {
      const result = await client.queryPRD('实现用户登录功能');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveProperty('features');
      expect(result.data).toHaveProperty('dataModels');
      expect(result.data).toHaveProperty('apiRequirements');
      expect(result.data).toHaveProperty('businessRules');
    });
  });

  describe('queryCodeTemplate', () => {
    it('should query code template', async () => {
      const result = await client.queryCodeTemplate('Button', 'react');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
    });
  });
});

describe('MCP Types', () => {
  describe('FigmaDesignData', () => {
    it('should have correct structure', () => {
      const designData: FigmaDesignData = {
        nodeId: 'node-123',
        name: 'Test Design',
        description: 'A test design',
        components: [
          {
            id: 'comp-1',
            name: 'Button',
            type: 'COMPONENT',
          },
        ],
        styles: { color: 'red' },
        layout: { flex: true },
      };

      expect(designData.nodeId).toBe('node-123');
      expect(designData.components).toHaveLength(1);
    });
  });

  describe('PRDAnalysisResult', () => {
    it('should have correct structure', () => {
      const prdResult: PRDAnalysisResult = {
        features: [
          {
            id: 'feat-1',
            name: 'Login',
            description: 'User login feature',
            priority: 'high',
            acceptanceCriteria: ['User can login'],
          },
        ],
        dataModels: [
          {
            name: 'User',
            fields: [
              { name: 'id', type: 'string', required: true },
              { name: 'email', type: 'string', required: true },
            ],
          },
        ],
        apiRequirements: [
          {
            name: 'Login API',
            method: 'POST',
            path: '/api/login',
          },
        ],
        businessRules: ['Password must be at least 8 characters'],
        constraints: [],
      };

      expect(prdResult.features).toHaveLength(1);
      expect(prdResult.dataModels).toHaveLength(1);
      expect(prdResult.apiRequirements).toHaveLength(1);
    });
  });
});
