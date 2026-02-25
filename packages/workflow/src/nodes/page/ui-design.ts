/**
 * Page-Codegen UI 设计节点
 * 步骤3：组件 API 查询、交互逻辑设计
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState } from '@x-codegen/types';
import { uiDesignPrompt } from '../../prompts/index.js';
import {
  createKnowledgeBaseMCPClient,
  executeWithFallback,
} from '@x-codegen/tools';

/**
 * UI 设计节点
 * 执行步骤3的 UI 组件与交互逻辑设计工作
 */
export async function uiDesignNode(
  state: PageCodegenState
): Promise<Partial<PageCodegenState>> {
  const updates: Partial<PageCodegenState> = {};

  try {
    // 1. 准备上下文
    const taskPlan = state.taskPlan;
    const researchNotes = state.researchNotes;

    if (!taskPlan || !researchNotes) {
      throw new Error('任务计划或研究笔记未初始化');
    }

    // 2. 识别需要查询的组件
    const componentsToQuery = identifyComponents(state.aiWorkFiles, researchNotes);

    // 3. 从知识库 MCP 查询组件文档
    const knowledgeBaseClient = createKnowledgeBaseMCPClient(
      state.mcpServers?.knowledgeBase
    );

    for (const componentName of componentsToQuery) {
      const componentResult = await executeWithFallback({
        mcpCall: async () => {
          return knowledgeBaseClient.query({
            query: `组件文档: ${componentName}`,
            maxResults: 3,
          });
        },
        fallbackCall: async () => {
          // 本地回退：返回空结果
          return {
            success: true,
            chunks: [],
            totalMatches: 0,
          };
        },
        retryConfig: {
          maxRetries: 3,
          retryInterval: 2000,
        },
        onError: (error: Error, retryCount: number) => {
          taskPlan.errors.push({
            stage: 'ui-design',
            error: `组件 ${componentName} 文档查询失败 (尝试 ${retryCount}/3): ${error.message}`,
            timestamp: new Date().toISOString(),
          });
        },
      });

      if (componentResult.success && componentResult.data) {
        const chunks = componentResult.data.chunks ?? [];
        if (chunks.length > 0) {
          researchNotes.componentDocuments.push({
            name: componentName,
            importPath: `@dragonpass/atom-ui-mobile`,
            props: extractComponentProps(chunks),
            usageExample: chunks[0]?.content,
            source: componentResult.source === 'fallback' ? 'local' : 'mcp',
          });
        }
      }
    }

    // 4. 调用 LLM 设计交互逻辑
    let interactionDesign = '';
    if (state.model) {
      const prompt = await uiDesignPrompt.format({
        taskPlan: JSON.stringify(taskPlan, null, 2),
        researchNotes: JSON.stringify(researchNotes, null, 2),
        aiWorkFiles: JSON.stringify(state.aiWorkFiles, null, 2),
        requirements: state.requirements,
      });

      const response = await state.model.invoke(prompt);
      interactionDesign =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
    }

    // 5. 更新研究笔记
    if (interactionDesign) {
      researchNotes.findings.interactionLogicDesign = extractInteractionDesign(interactionDesign);
    }

    // 添加 JSBridge 规范
    researchNotes.codingStandards.jsBridgeSpec = `
## JSBridge 常用方法

### openWebview
打开新的 WebView 页面
\`\`\`typescript
window.jsBridge?.openWebview(url: string, options?: WebviewOptions);
\`\`\`

### navigateBack
返回上一页
\`\`\`typescript
window.jsBridge?.navigateBack(delta?: number);
\`\`\`

### showToast
显示 Toast 提示
\`\`\`typescript
window.jsBridge?.showToast(message: string, duration?: number);
\`\`\`
`;

    // 6. 更新任务计划
    taskPlan.stages = taskPlan.stages.map((stage) =>
      stage.id === 'stage-3' ? { ...stage, completed: true } : stage
    );
    taskPlan.currentStatus = '阶段3完成，进入步骤4';
    taskPlan.currentStep = 'integration';

    // 记录决策
    taskPlan.decisions.push({
      decision: '完成 UI 组件与交互逻辑设计',
      reason: `查询了 ${componentsToQuery.length} 个组件文档`,
      timestamp: new Date().toISOString(),
    });

    // 7. 更新状态
    updates.currentStep = 'integration';
    updates.taskPlan = taskPlan;
    updates.researchNotes = researchNotes;
    updates.messages = [
      new HumanMessage(`✅ 步骤3完成：UI组件与交互逻辑设计

### UI 设计摘要
- 查询的组件: ${componentsToQuery.length} 个
- 获取的组件文档: ${researchNotes.componentDocuments.length} 个
- 交互逻辑: 已设计

${researchNotes.componentDocuments.length > 0 ? '### 组件列表\n' + researchNotes.componentDocuments.map(c => `- ${c.name} (来源: ${c.source})`).join('\n') : ''}

现在进入步骤4：代码整合与PRD验收`),
    ];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `UI 设计阶段失败: ${errorMessage}`,
      messages: [new HumanMessage(`❌ 步骤3失败: ${errorMessage}`)],
    };
  }
}

/**
 * 识别需要查询的组件
 */
function identifyComponents(
  aiWorkFiles: Array<{ content?: string; fileName?: string }>,
  researchNotes: { prdBreakdown: { featureChecklist: Array<{ name: string }> } }
): string[] {
  const components: Set<string> = new Set();

  // 常用组件关键词
  const componentKeywords = [
    'Button', 'Form', 'Input', 'DatePicker', 'TimePicker',
    'Picker', 'Stepper', 'Switch', 'Checkbox', 'Radio',
    'Select', 'Modal', 'Toast', 'Loading', 'List',
    'Card', 'Tabs', 'Navbar', 'Icon', 'Image',
  ];

  // 从 AI 工作副本中识别组件
  for (const file of aiWorkFiles) {
    if (file.content) {
      for (const keyword of componentKeywords) {
        if (file.content.includes(keyword)) {
          components.add(keyword);
        }
      }
    }
  }

  // 从功能清单中推断需要的组件
  for (const feature of researchNotes.prdBreakdown.featureChecklist) {
    const name = feature.name.toLowerCase();
    if (name.includes('form') || name.includes('表单')) {
      components.add('Form');
      components.add('Input');
    }
    if (name.includes('date') || name.includes('日期')) {
      components.add('DatePicker');
    }
    if (name.includes('time') || name.includes('时间')) {
      components.add('TimePicker');
    }
    if (name.includes('select') || name.includes('选择')) {
      components.add('Picker');
    }
    if (name.includes('button') || name.includes('按钮')) {
      components.add('Button');
    }
  }

  return Array.from(components);
}

/**
 * 从文档中提取组件 Props
 */
function extractComponentProps(
  chunks: Array<{ content: string }>
): Record<string, unknown> {
  // 简单实现：尝试从内容中提取 Props
  const props: Record<string, unknown> = {};

  for (const chunk of chunks) {
    // 尝试匹配 TypeScript interface
    const propsMatch = chunk.content.match(/interface\s+\w*Props\s*{([^}]+)}/);
    if (propsMatch?.[1]) {
      const propsContent = propsMatch[1];
      const lines = propsContent.split(';').map((l) => l.trim());
      for (const line of lines) {
        const propMatch = line.match(/(\w+)(\?)?:\s*(\w+)/);
        if (propMatch?.[1] && propMatch?.[3]) {
          props[propMatch[1]] = {
            type: propMatch[3],
            required: propMatch[2] !== '?',
          };
        }
      }
    }
  }

  return props;
}

/**
 * 从 LLM 输出中提取交互逻辑设计
 */
function extractInteractionDesign(output: string): string {
  const match = output.match(/### 交互逻辑设计\s*([\s\S]*?)(?=###|$)/);
  return match?.[1]?.trim() ?? '';
}

export default uiDesignNode;
