/**
 * Page-Codegen 研究节点
 * 步骤1：PRD 查询、静态代码分析、技术规范阅读
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState, ResearchNotes } from '@x-codegen/types';
import {
  type GherkinFeature,
} from '@x-codegen/types';
import { researchPrompt } from '../../prompts/index.js';
import {
  createKnowledgeBaseMCPClient,
  executeWithFallback,
} from '@x-codegen/tools';

/**
 * 研究节点
 * 执行步骤1的需求与代码研究工作
 */
export async function researchNode(
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

    // 2. 调用 LLM 进行研究分析
    if (state.model) {
      const prompt = await researchPrompt.format({
        taskPlan: JSON.stringify(taskPlan, null, 2),
        researchNotes: JSON.stringify(researchNotes, null, 2),
        originalFiles: JSON.stringify(state.originalFiles, null, 2),
        aiWorkFiles: JSON.stringify(state.aiWorkFiles, null, 2),
        requirements: state.requirements,
      });

      const response = await state.model.invoke(prompt);
      const llmOutput =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // 解析 LLM 输出，更新研究笔记
      parseAndUpdateResearchNotes(researchNotes, llmOutput);
    }

    // 3. 尝试从知识库 MCP 查询 PRD（MCP 优先，本地回退）
    const knowledgeBaseClient = createKnowledgeBaseMCPClient(
      state.mcpServers?.knowledgeBase
    );

    const prdResult = await executeWithFallback({
      mcpCall: async () => {
        return knowledgeBaseClient.queryPRD(state.requirements);
      },
      fallbackCall: async () => {
        // 本地回退：使用需求描述作为 PRD
        return {
          success: true,
          data: {
            features: [],
            dataModels: [],
            apiRequirements: [],
            businessRules: [state.requirements],
            constraints: [],
          },
        };
      },
      retryConfig: {
        maxRetries: 3,
        retryInterval: 2000,
      },
    });

    if (prdResult.success && prdResult.data) {
      // 更新 PRD 分析到研究笔记
      researchNotes.prdBreakdown.coreObjective = state.requirements;

      // 将 PRD 功能转换为验收清单（如果 data 是 PRDAnalysisResult）
      const prdData = prdResult.data as { features?: Array<{ name: string; description: string }>; businessRules?: string[] };
      if (prdData.features) {
        for (const feature of prdData.features) {
          researchNotes.prdBreakdown.featureChecklist.push({
            name: feature.name,
            description: feature.description,
            status: 'pending',
          });
        }
      }

      // 记录业务规则
      if (prdData.businessRules) {
        for (const rule of prdData.businessRules) {
          researchNotes.notes.push({
            id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            type: 'prd',
            title: '业务规则',
            content: rule,
            source: prdResult.source === 'fallback' ? 'local' : prdResult.source,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // 4. 生成 Gherkin 场景（基于需求）
    const gherkinFeature = generateGherkinScenarios(state.requirements, researchNotes);
    updates.gherkinFeature = gherkinFeature;

    // 5. 更新研究笔记中的 Gherkin 场景
    researchNotes.prdBreakdown.gherkinScenarios = formatGherkinFeature(gherkinFeature);

    // 6. 更新任务计划
    taskPlan.stages = taskPlan.stages.map((stage) =>
      stage.id === 'stage-1' ? { ...stage, completed: true } : stage
    );
    taskPlan.currentStatus = '阶段1完成，进入步骤2';
    taskPlan.currentStep = 'api-design';

    // 7. 记录决策
    taskPlan.decisions.push({
      decision: '完成需求与代码研究',
      reason: '已完成 PRD 查询和代码分析',
      timestamp: new Date().toISOString(),
    });

    // 8. 更新状态
    updates.currentStep = 'api-design';
    updates.taskPlan = taskPlan;
    updates.researchNotes = researchNotes;
    updates.messages = [
      new HumanMessage(`✅ 步骤1完成：需求与代码研究

### 研究结果摘要
- 核心目标: ${researchNotes.prdBreakdown.coreObjective.slice(0, 100)}...
- 功能清单: ${researchNotes.prdBreakdown.featureChecklist.length} 项
- Gherkin 场景: ${gherkinFeature.scenarios.length} 个

现在进入步骤2：接口与数据逻辑设计`),
    ];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `研究阶段失败: ${errorMessage}`,
      messages: [new HumanMessage(`❌ 步骤1失败: ${errorMessage}`)],
    };
  }
}

/**
 * 解析 LLM 输出并更新研究笔记
 */
function parseAndUpdateResearchNotes(
  researchNotes: ResearchNotes,
  llmOutput: string
): void {
  // 尝试提取结构化内容
  const sections = extractSections(llmOutput);

  if (sections['用户需求理解']) {
    researchNotes.prdBreakdown.coreObjective = sections['用户需求理解'];
  }

  if (sections['PRD 分析结果']) {
    researchNotes.notes.push({
      id: `prd-${Date.now()}`,
      type: 'prd',
      title: 'PRD 分析',
      content: sections['PRD 分析结果'],
      source: 'mcp',
      timestamp: new Date().toISOString(),
    });
  }

  if (sections['静态代码分析']) {
    researchNotes.notes.push({
      id: `code-${Date.now()}`,
      type: 'code-snippet',
      title: '代码分析',
      content: sections['静态代码分析'],
      source: 'local',
      timestamp: new Date().toISOString(),
    });
  }

  if (sections['技术规范理解']) {
    researchNotes.codingStandards.coreSpec = sections['技术规范理解'];
  }

  if (sections['代码片段参考']) {
    researchNotes.codeSnippets.push({
      feature: '参考代码',
      source: '研究阶段',
      code: sections['代码片段参考'],
    });
  }
}

/**
 * 从文本中提取章节内容
 */
function extractSections(text: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const sectionPattern = /###\s*(.+?)\n([\s\S]*?)(?=###|$)/g;

  let match;
  while ((match = sectionPattern.exec(text)) !== null) {
    const title = match[1]?.trim();
    const content = match[2]?.trim();
    if (title && content) {
      sections[title] = content;
    }
  }

  return sections;
}

/**
 * 生成 Gherkin 场景
 */
function generateGherkinScenarios(
  requirements: string,
  researchNotes: ResearchNotes
): GherkinFeature {
  const feature: GherkinFeature = {
    name: researchNotes.pageName,
    asA: '用户',
    iWantTo: requirements,
    soThat: '完成业务目标',
    scenarios: [],
  };

  // 基于功能清单生成场景
  for (const item of researchNotes.prdBreakdown.featureChecklist) {
    feature.scenarios.push({
      name: item.name,
      steps: [
        { type: 'Given', description: '用户已进入页面' },
        { type: 'When', description: `用户执行 ${item.name}` },
        { type: 'Then', description: `系统应 ${item.description}` },
      ],
      frontendGuidance: `实现 ${item.name} 功能`,
    });
  }

  // 如果没有功能清单，生成默认场景
  if (feature.scenarios.length === 0) {
    feature.scenarios.push({
      name: '基本功能',
      steps: [
        { type: 'Given', description: '用户已进入页面' },
        { type: 'When', description: '页面加载完成' },
        { type: 'Then', description: '显示正确的UI组件' },
      ],
      frontendGuidance: '实现页面基本功能',
    });
  }

  return feature;
}

/**
 * 格式化 Gherkin Feature 为字符串
 */
function formatGherkinFeature(feature: GherkinFeature): string {
  let output = `Feature: ${feature.name}\n`;
  output += `  As a ${feature.asA}\n`;
  output += `  I want to ${feature.iWantTo}\n`;
  output += `  So that ${feature.soThat}\n\n`;

  for (const scenario of feature.scenarios) {
    output += `  Scenario: ${scenario.name}\n`;
    for (const step of scenario.steps) {
      output += `    ${step.type} ${step.description}\n`;
    }
    if (scenario.frontendGuidance) {
      output += `\n  @frontend\n  ${scenario.frontendGuidance}\n`;
    }
    output += '\n';
  }

  return output;
}

export default researchNode;
