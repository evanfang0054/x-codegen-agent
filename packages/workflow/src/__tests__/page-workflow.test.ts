/**
 * Page-Codegen 工作流测试
 * 测试 Page-Codegen 相关类型
 */

import { describe, it, expect } from 'vitest';
import {
  type PageWorkflowStep,
  type PageCodegenOptions,
  type PageCodegenResult,
  type PageCodegenStreamEvent,
} from '@x-codegen/types';

describe('Page-Codegen Types', () => {
  describe('PageWorkflowStep', () => {
    it('should have valid 7-step workflow values', () => {
      const validSteps: PageWorkflowStep[] = [
        'init',
        'research',
        'api-design',
        'ui-design',
        'integration',
        'validate',
        'deliver',
        'error',
      ];

      expect(validSteps).toHaveLength(8);
      validSteps.forEach((step) => {
        expect(typeof step).toBe('string');
      });
    });
  });

  describe('PageCodegenOptions', () => {
    it('should define valid options for page codegen', () => {
      const options: PageCodegenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputDir: '/tmp/output',
        requirements: '实现预订页面',
        projectName: 'booking-app',
        maxRetries: 3,
      };

      expect(options.figmaUrl).toContain('figma.com');
      expect(options.projectName).toBe('booking-app');
    });

    it('should allow optional fields', () => {
      const minimalOptions: PageCodegenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputDir: '/tmp/output',
        requirements: '实现预订页面',
      };

      expect(minimalOptions.projectName).toBeUndefined();
    });

    it('should support templateRepo option', () => {
      const options: PageCodegenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputDir: '/tmp/output',
        requirements: '实现预订页面',
        templateRepo: 'https://github.com/example/react-tailwind-template',
      };

      expect(options.templateRepo).toBe('https://github.com/example/react-tailwind-template');
    });

    it('should support MCP server configuration', () => {
      const options: PageCodegenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputDir: '/tmp/output',
        requirements: '实现预订页面',
        mcpServers: {
          knowledgeBase: {
            url: 'http://localhost:3000/mcp',
          },
          apifox: {
            apiKey: 'test-key',
            projectId: 'test-project',
          },
          oneDay: {
            url: 'http://localhost:3001/mcp',
          },
        },
      };

      expect(options.mcpServers?.knowledgeBase?.url).toBe('http://localhost:3000/mcp');
    });
  });

  describe('PageCodegenResult', () => {
    it('should define successful result', () => {
      const result: PageCodegenResult = {
        success: true,
        finalStep: 'deliver',
        originalFiles: ['/path/to/index.tsx'],
        aiWorkFiles: ['/path/to/index.ai.tsx'],
        outputDir: '/tmp/output',
      };

      expect(result.success).toBe(true);
      expect(result.aiWorkFiles).toHaveLength(1);
    });

    it('should define error result', () => {
      const result: PageCodegenResult = {
        success: false,
        finalStep: 'error',
        originalFiles: [],
        aiWorkFiles: [],
        outputDir: '/tmp/output',
        error: 'Test error',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('should include validation log', () => {
      const result: PageCodegenResult = {
        success: true,
        finalStep: 'validate',
        originalFiles: [],
        aiWorkFiles: [],
        outputDir: '/tmp/output',
        validationLog: 'All checks passed',
      };

      expect(result.validationLog).toBe('All checks passed');
    });
  });

  describe('PageCodegenStreamEvent', () => {
    it('should define valid stream event', () => {
      const event: PageCodegenStreamEvent = {
        step: 'research',
        message: '正在研究需求',
        timestamp: new Date(),
        data: {
          progress: 50,
        },
      };

      expect(event.step).toBe('research');
      expect(event.data?.progress).toBe(50);
    });

    it('should support task plan data', () => {
      const event: PageCodegenStreamEvent = {
        step: 'api-design',
        message: '设计 API',
        timestamp: new Date(),
        data: {
          taskPlan: {
            pageName: 'Test',
            goal: 'Test goal',
            originalFiles: [],
            aiWorkFiles: [],
            auxiliaryFiles: {},
            stages: [],
            keyQuestions: [],
            decisions: [],
            errors: [],
            currentStep: 'api-design',
            currentStatus: 'in_progress',
          },
        },
      };

      expect(event.data?.taskPlan?.pageName).toBe('Test');
    });
  });
});
