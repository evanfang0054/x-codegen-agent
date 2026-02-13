/**
 * Workflow 模块单元测试
 */

import { describe, it, expect } from 'vitest';
import {
  CodeGenStateAnnotation,
  type CodeGenOptions,
  type StreamEvent,
  type WorkflowStep,
} from '@x-codegen/types';

describe('CodeGenStateAnnotation', () => {
  describe('default values', () => {
    it('should have correct annotation structure', () => {
      // 验证 Annotation 结构存在
      expect(CodeGenStateAnnotation).toBeDefined();
      expect(CodeGenStateAnnotation.spec).toBeDefined();
    });

    it('should have all required fields', () => {
      const spec = CodeGenStateAnnotation.spec;

      // 检查必需字段存在
      expect(spec.figmaUrl).toBeDefined();
      expect(spec.currentStep).toBeDefined();
      expect(spec.sandboxPath).toBeDefined();
      expect(spec.messages).toBeDefined();
      expect(spec.generatedFiles).toBeDefined();
    });
  });
});

describe('Workflow Types', () => {
  describe('WorkflowStep', () => {
    it('should have valid step values', () => {
      const validSteps: WorkflowStep[] = [
        'init',
        'template',
        'completion',
        'validate',
        'completed',
        'error',
      ];

      validSteps.forEach((step) => {
        expect(typeof step).toBe('string');
      });
    });
  });

  describe('CodeGenOptions', () => {
    it('should define valid options', () => {
      const options: CodeGenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        templateRepo: 'https://github.com/example/template',
        outputDir: '/tmp/output',
        requirements: '实现登录页面',
        maxRetries: 3,
        threadId: 'test-thread',
        enableCheckpointer: true,
      };

      expect(options.figmaUrl).toContain('figma.com');
      expect(options.maxRetries).toBe(3);
    });

    it('should allow optional fields', () => {
      const minimalOptions: CodeGenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputDir: '/tmp/output',
        requirements: '实现登录页面',
      };

      expect(minimalOptions.templateRepo).toBeUndefined();
      expect(minimalOptions.maxRetries).toBeUndefined();
    });
  });

  describe('StreamEvent', () => {
    it('should define valid stream event', () => {
      const event: StreamEvent = {
        step: 'template',
        message: '正在生成模板',
        timestamp: new Date(),
        data: {
          fileCount: 5,
        },
      };

      expect(event.step).toBe('template');
      expect(event.message).toBe('正在生成模板');
      expect(event.data?.fileCount).toBe(5);
    });
  });
});

describe('Workflow Graph', () => {
  // 由于 createCodeGenGraph 需要实际的模型连接，这里只测试类型和配置
  it('should export graph creation function', async () => {
    // 动态导入以避免初始化问题
    const { createCodeGenGraph, createCodeGenGraphWithoutCheckpointer } = await import(
      '../graph.js'
    );

    expect(typeof createCodeGenGraph).toBe('function');
    expect(typeof createCodeGenGraphWithoutCheckpointer).toBe('function');
  });

  it('should create graph without checkpointer', async () => {
    const { createCodeGenGraphWithoutCheckpointer } = await import('../graph.js');

    const graph = createCodeGenGraphWithoutCheckpointer();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
    expect(typeof graph.stream).toBe('function');
  });
});

describe('Workflow Nodes', () => {
  describe('initNode', () => {
    it('should export initNode function', async () => {
      const { initNode } = await import('../nodes/init.js');
      expect(typeof initNode).toBe('function');
    });
  });

  describe('templateNode', () => {
    it('should export templateNode function', async () => {
      const { templateNode } = await import('../nodes/template.js');
      expect(typeof templateNode).toBe('function');
    });
  });

  describe('completionNode', () => {
    it('should export completionNode function', async () => {
      const { completionNode } = await import('../nodes/completion.js');
      expect(typeof completionNode).toBe('function');
    });
  });

  describe('validateNode', () => {
    it('should export validateNode function', async () => {
      const { validateNode } = await import('../nodes/validate.js');
      expect(typeof validateNode).toBe('function');
    });
  });
});

describe('CodeGenerator', () => {
  it('should export CodeGenerator class', async () => {
    const { CodeGenerator } = await import('../index.js');
    expect(typeof CodeGenerator).toBe('function');
  });

  it('should export generateCode function', async () => {
    const { generateCode } = await import('../index.js');
    expect(typeof generateCode).toBe('function');
  });

  it('should export generateCodeStream function', async () => {
    const { generateCodeStream } = await import('../index.js');
    expect(typeof generateCodeStream).toBe('function');
  });
});
