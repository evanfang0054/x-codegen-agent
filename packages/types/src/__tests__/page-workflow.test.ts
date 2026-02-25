/**
 * Page-Codegen 类型定义测试
 */

import { describe, it, expect } from 'vitest';
import {
  PageCodegenStateAnnotation,
  type PageWorkflowStep,
  type TaskPlan,
  type TaskPlanItem,
  type ResearchNotes,
  type ResearchNote,
  type APISchemaDefinition,
  type APISchemaField,
  type OriginalFileInfo,
  type AIWorkFileInfo,
  type MCPCallResult,
  type GherkinFeature,
  type GherkinScenario,
  type GherkinStep,
  type PageCodegenOptions,
  type PageCodegenResult,
  type PageCodegenStreamEvent,
} from '@x-codegen/types';

describe('PageCodegenStateAnnotation', () => {
  describe('annotation structure', () => {
    it('should have correct annotation structure', () => {
      expect(PageCodegenStateAnnotation).toBeDefined();
      expect(PageCodegenStateAnnotation.spec).toBeDefined();
    });

    it('should have all required fields', () => {
      const spec = PageCodegenStateAnnotation.spec;

      // 输入参数
      expect(spec.figmaUrl).toBeDefined();
      expect(spec.outputDir).toBeDefined();
      expect(spec.requirements).toBeDefined();
      expect(spec.projectName).toBeDefined();

      // 执行状态
      expect(spec.currentStep).toBeDefined();
      expect(spec.sandboxPath).toBeDefined();
      expect(spec.projectPath).toBeDefined();

      // 三文件模式
      expect(spec.taskPlan).toBeDefined();
      expect(spec.researchNotes).toBeDefined();
      expect(spec.finalCodePath).toBeDefined();

      // 文件管理
      expect(spec.originalFiles).toBeDefined();
      expect(spec.aiWorkFiles).toBeDefined();

      // 中间结果
      expect(spec.apiSchemas).toBeDefined();
      expect(spec.gherkinFeature).toBeDefined();

      // 验证与错误
      expect(spec.validationPassed).toBeDefined();
      expect(spec.validationLog).toBeDefined();
      expect(spec.error).toBeDefined();
    });
  });
});

describe('Page-Codegen Types', () => {
  describe('PageWorkflowStep', () => {
    it('should have valid step values', () => {
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

      validSteps.forEach((step) => {
        expect(typeof step).toBe('string');
      });
    });
  });

  describe('TaskPlan', () => {
    it('should define valid task plan', () => {
      const taskPlan: TaskPlan = {
        pageName: 'BookingPage',
        goal: '实现预订页面',
        originalFiles: [],
        aiWorkFiles: [],
        auxiliaryFiles: {
          taskPlan: '/path/to/task_plan.md',
          researchNotes: '/path/to/research_notes.md',
          finalCode: '/path/to/final_code.md',
        },
        stages: [
          {
            id: 'stage-1',
            name: '需求研究',
            description: '研究需求',
            completed: false,
          },
        ],
        keyQuestions: ['问题1'],
        decisions: [],
        errors: [],
        currentStatus: '进行中',
        currentStep: 'research',
      };

      expect(taskPlan.pageName).toBe('BookingPage');
      expect(taskPlan.stages).toHaveLength(1);
    });
  });

  describe('TaskPlanItem', () => {
    it('should define valid task plan item', () => {
      const item: TaskPlanItem = {
        id: 'stage-1',
        name: '需求研究',
        description: '执行需求研究步骤',
        completed: false,
        stepFile: 'step1.md',
      };

      expect(item.id).toBe('stage-1');
      expect(item.stepFile).toBe('step1.md');
    });
  });

  describe('ResearchNotes', () => {
    it('should define valid research notes', () => {
      const notes: ResearchNotes = {
        pageName: 'BookingPage',
        apiDocuments: [],
        componentDocuments: [],
        userClarifications: [],
        prdBreakdown: {
          coreObjective: '实现预订功能',
          gherkinScenarios: 'Feature: Booking',
          featureChecklist: [
            { name: '功能1', description: '描述', status: 'pending' },
          ],
          edgeCases: [],
        },
        codeSnippets: [],
        codingStandards: {
          coreSpec: 'TypeScript规范',
        },
        findings: {
          dependencyFiles: [],
        },
        notes: [],
      };

      expect(notes.pageName).toBe('BookingPage');
      expect(notes.prdBreakdown.featureChecklist).toHaveLength(1);
    });
  });

  describe('ResearchNote', () => {
    it('should define valid research note', () => {
      const note: ResearchNote = {
        id: 'note-1',
        type: 'api-doc',
        title: 'API文档',
        content: '内容',
        source: 'mcp',
        timestamp: new Date().toISOString(),
      };

      expect(note.type).toBe('api-doc');
      expect(note.source).toBe('mcp');
    });
  });

  describe('APISchemaDefinition', () => {
    it('should define valid API schema', () => {
      const schema: APISchemaDefinition = {
        id: 'api-1',
        name: '获取预订列表',
        path: '/api/bookings',
        method: 'GET',
        description: '获取用户预订列表',
        source: 'apifox-mcp',
      };

      expect(schema.method).toBe('GET');
      expect(schema.source).toBe('apifox-mcp');
    });
  });

  describe('APISchemaField', () => {
    it('should define valid API field', () => {
      const field: APISchemaField = {
        name: 'bookingId',
        type: 'string',
        required: true,
        description: '预订ID',
      };

      expect(field.required).toBe(true);
      expect(field.enumValues).toBeUndefined();
    });

    it('should support enum values', () => {
      const field: APISchemaField = {
        name: 'status',
        type: 'string',
        required: true,
        enumValues: ['pending', 'confirmed', 'cancelled'],
      };

      expect(field.enumValues).toHaveLength(3);
    });
  });

  describe('OriginalFileInfo', () => {
    it('should define valid original file info', () => {
      const fileInfo: OriginalFileInfo = {
        absolutePath: '/path/to/index.tsx',
        relativePath: 'pages/booking/index.tsx',
        fileName: 'index.tsx',
        contentHash: 'abc123',
        lastModified: '2024-01-01T00:00:00Z',
      };

      expect(fileInfo.absolutePath).toContain('index.tsx');
      expect(fileInfo.contentHash).toBe('abc123');
    });
  });

  describe('AIWorkFileInfo', () => {
    it('should define valid AI work file info', () => {
      const fileInfo: AIWorkFileInfo = {
        absolutePath: '/path/to/index.ai.tsx',
        relativePath: 'pages/booking/index.ai.tsx',
        fileName: 'index.ai.tsx',
        originalFilePath: '/path/to/index.tsx',
        content: 'export default function Page() {}',
        completed: true,
      };

      expect(fileInfo.completed).toBe(true);
      expect(fileInfo.originalFilePath).toContain('index.tsx');
    });
  });

  describe('MCPCallResult', () => {
    it('should define successful MCP call result', () => {
      const result: MCPCallResult<{ id: string }> = {
        success: true,
        data: { id: 'test-1' },
        source: 'mcp',
        retryCount: 0,
      };

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('test-1');
    });

    it('should define failed MCP call result', () => {
      const result: MCPCallResult<unknown> = {
        success: false,
        error: 'Connection timeout',
        source: 'fallback',
        retryCount: 3,
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('Gherkin Types', () => {
    it('should define valid Gherkin step', () => {
      const step: GherkinStep = {
        type: 'Given',
        description: '用户已登录',
      };

      expect(step.type).toBe('Given');
    });

    it('should define valid Gherkin scenario', () => {
      const scenario: GherkinScenario = {
        name: '成功预订',
        tags: ['@frontend'],
        steps: [
          { type: 'Given', description: '用户已登录' },
          { type: 'When', description: '点击预订按钮' },
          { type: 'Then', description: '显示预订成功' },
        ],
        frontendGuidance: '使用 React Hook Form',
      };

      expect(scenario.steps).toHaveLength(3);
      expect(scenario.frontendGuidance).toBe('使用 React Hook Form');
    });

    it('should define valid Gherkin feature', () => {
      const feature: GherkinFeature = {
        name: '预订功能',
        asA: '用户',
        iWantTo: '预订服务',
        soThat: '完成预订',
        scenarios: [],
      };

      expect(feature.name).toBe('预订功能');
      expect(feature.scenarios).toHaveLength(0);
    });
  });

  describe('PageCodegenOptions', () => {
    it('should define valid options', () => {
      const options: PageCodegenOptions = {
        figmaUrl: 'https://figma.com/file/abc/Design',
        outputDir: '/tmp/output',
        requirements: '实现预订页面',
        projectName: 'booking-app',
        maxRetries: 3,
        threadId: 'test-thread',
        enableCheckpointer: true,
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
      expect(minimalOptions.maxRetries).toBeUndefined();
    });
  });

  describe('PageCodegenResult', () => {
    it('should define valid result', () => {
      const result: PageCodegenResult = {
        success: true,
        finalStep: 'deliver',
        originalFiles: ['/path/to/index.tsx'],
        aiWorkFiles: ['/path/to/index.ai.tsx'],
        outputDir: '/tmp/output',
        finalCodePath: '/tmp/output/final_code.md',
        validationLog: 'All checks passed',
      };

      expect(result.success).toBe(true);
      expect(result.aiWorkFiles).toHaveLength(1);
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
  });
});
