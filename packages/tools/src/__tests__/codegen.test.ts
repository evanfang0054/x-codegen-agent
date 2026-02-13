/**
 * Codegen 模块单元测试
 */

import { describe, it, expect, vi } from 'vitest';
import {
  ComponentGenerator,
  createComponentGenerator,
  type ComponentGenerateOptions,
  type GeneratedComponent,
  type ComponentGenerateResult,
} from '../codegen/index.js';

describe('ComponentGenerator', () => {
  describe('constructor', () => {
    it('should create generator with model', () => {
      // 创建一个简单的 mock 模型
      const mockModel = {
        invoke: vi.fn(),
        pipe: vi.fn().mockReturnThis(),
      };

      const generator = createComponentGenerator(
        mockModel as unknown as Parameters<typeof createComponentGenerator>[0]
      );
      expect(generator).toBeInstanceOf(ComponentGenerator);
    });
  });

  describe('createGenerateChain', () => {
    it('should create a runnable chain', () => {
      const mockModel = {
        invoke: vi.fn(),
        pipe: vi.fn().mockReturnThis(),
      };

      const generator = createComponentGenerator(
        mockModel as unknown as Parameters<typeof createComponentGenerator>[0]
      );
      const chain = generator.createGenerateChain();
      expect(chain).toBeDefined();
      expect(typeof chain.invoke).toBe('function');
    });
  });
});

describe('GeneratedComponent', () => {
  it('should have correct structure', () => {
    const component: GeneratedComponent = {
      filename: 'Button.tsx',
      path: 'src/components/Button',
      content: 'export const Button = () => <button>Click</button>;',
      description: 'Button component',
    };

    expect(component.filename).toBe('Button.tsx');
    expect(component.content).toContain('Button');
  });
});

describe('ComponentGenerateOptions', () => {
  it('should have sensible defaults', () => {
    const options: ComponentGenerateOptions = {
      componentName: 'Test',
      designData: {
        nodeId: '1',
        name: 'Test',
        components: [],
        styles: {},
        layout: {},
      },
    };

    expect(options.framework).toBeUndefined();
    expect(options.styling).toBeUndefined();
    expect(options.typescript).toBeUndefined();
  });

  it('should support all options', () => {
    const options: ComponentGenerateOptions = {
      componentName: 'Test',
      designData: {
        nodeId: '1',
        name: 'Test',
        components: [],
        styles: {},
        layout: {},
      },
      prdAnalysis: {
        features: [],
        dataModels: [],
        apiRequirements: [],
        businessRules: [],
        constraints: [],
      },
      requirements: 'Test requirements',
      framework: 'react',
      styling: 'tailwind',
      typescript: true,
      structure: 'multi',
    };

    expect(options.framework).toBe('react');
    expect(options.styling).toBe('tailwind');
    expect(options.typescript).toBe(true);
    expect(options.structure).toBe('multi');
  });
});

describe('ComponentGenerateResult', () => {
  it('should have correct structure for success', () => {
    const result: ComponentGenerateResult = {
      success: true,
      componentName: 'Button',
      files: [
        {
          filename: 'Button.tsx',
          path: 'src/components/Button',
          content: 'export const Button = () => {};',
        },
      ],
    };

    expect(result.success).toBe(true);
    expect(result.componentName).toBe('Button');
    expect(result.files).toHaveLength(1);
  });

  it('should have correct structure for failure', () => {
    const result: ComponentGenerateResult = {
      success: false,
      componentName: 'Button',
      files: [],
      error: 'Generation failed',
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Generation failed');
  });
});

describe('createComponentGenerator', () => {
  it('should create generator instance', () => {
    const mockModel = {
      invoke: vi.fn(),
      pipe: vi.fn().mockReturnThis(),
    };
    const generator = createComponentGenerator(
      mockModel as unknown as Parameters<typeof createComponentGenerator>[0]
    );
    expect(generator).toBeInstanceOf(ComponentGenerator);
  });
});
