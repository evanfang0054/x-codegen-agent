/**
 * Page-Codegen API 设计节点
 * 步骤2：获取 API Schema、设计数据层
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState, ResearchNotes, APISchemaDefinition } from '@x-codegen/types';
import { apiDesignPrompt } from '../../prompts/index.js';
import {
  createApifoxMCPClient,
  executeWithFallback,
} from '@x-codegen/tools';

/**
 * API 设计节点
 * 执行步骤2的接口与数据逻辑设计工作
 */
export async function apiDesignNode(
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

    // 2. 获取已有的 API Schema
    const existingSchemas = state.apiSchemas ?? [];

    // 3. 从需求中提取关键词，用于 API 查询
    const keywords = extractAPIKeywords(state.requirements, researchNotes);

    // 4. 尝试从 Apifox MCP 获取 API Schema
    const apifoxClient = createApifoxMCPClient(state.mcpServers?.apifox);

    const apiResult = await executeWithFallback({
      mcpCall: async () => {
        return apifoxClient.searchAPIs(keywords);
      },
      fallbackCall: async () => {
        // 本地回退：返回推断的 API
        return {
          success: true,
          data: inferAPISchemas(researchNotes),
          source: 'fallback' as const,
          retryCount: 0,
        };
      },
      retryConfig: {
        maxRetries: 5,
        retryInterval: 2000,
      },
      onError: (error: Error, retryCount: number) => {
        taskPlan.errors.push({
          stage: 'api-design',
          error: `Apifox MCP 调用失败 (尝试 ${retryCount}/5): ${error.message}`,
          timestamp: new Date().toISOString(),
        });
      },
    });

    // 5. 合并 API Schema
    const newSchemas: APISchemaDefinition[] = [];
    if (apiResult.success && apiResult.data) {
      const schemaArray = Array.isArray(apiResult.data) ? apiResult.data : [apiResult.data];
      for (const schema of schemaArray) {
        // 避免重复
        if (!existingSchemas.some((s) => s.id === schema.id)) {
          newSchemas.push(schema);
        }
      }
    }

    const allSchemas = [...existingSchemas, ...newSchemas];

    // 6. 调用 LLM 设计数据层（可选）
    let dataLayerDesign = '';
    if (state.model) {
      const prompt = await apiDesignPrompt.format({
        taskPlan: JSON.stringify(taskPlan, null, 2),
        researchNotes: JSON.stringify(researchNotes, null, 2),
        apiSchemas: JSON.stringify(allSchemas, null, 2),
        requirements: state.requirements,
      });

      const response = await state.model.invoke(prompt);
      dataLayerDesign =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
    }

    // 7. 更新研究笔记
    for (const schema of newSchemas) {
      // 转换 source 类型：apifox-mcp -> mcp
      const source = schema.source === 'apifox-mcp' ? 'mcp' as const :
                     schema.source === 'local-doc' ? 'local' as const :
                     schema.source;
      researchNotes.apiDocuments.push({
        name: schema.name,
        path: schema.path,
        method: schema.method,
        requestParams: schema.requestParams,
        responseData: schema.responseBody,
        source,
      });
    }

    // 记录数据流设计
    if (dataLayerDesign) {
      researchNotes.findings.dataFlowDesign = extractDataFlowDesign(dataLayerDesign);
      researchNotes.findings.stateManagementPlan = extractStateManagement(dataLayerDesign);
    }

    // 8. 更新任务计划
    taskPlan.stages = taskPlan.stages.map((stage) =>
      stage.id === 'stage-2' ? { ...stage, completed: true } : stage
    );
    taskPlan.currentStatus = '阶段2完成，进入步骤3';
    taskPlan.currentStep = 'ui-design';

    // 记录决策
    taskPlan.decisions.push({
      decision: '完成接口与数据逻辑设计',
      reason: `获取了 ${newSchemas.length} 个 API Schema`,
      timestamp: new Date().toISOString(),
    });

    // 9. 更新状态
    updates.currentStep = 'ui-design';
    updates.apiSchemas = allSchemas;
    updates.taskPlan = taskPlan;
    updates.researchNotes = researchNotes;
    updates.messages = [
      new HumanMessage(`✅ 步骤2完成：接口与数据逻辑设计

### API 设计摘要
- 新增 API Schema: ${newSchemas.length} 个
- 总计 API Schema: ${allSchemas.length} 个
- 数据来源: ${apiResult.source}

${newSchemas.length > 0 ? '### 新增的 API\n' + newSchemas.map(s => `- ${s.method} ${s.path}`).join('\n') : ''}

现在进入步骤3：UI组件与交互逻辑设计`),
    ];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `API 设计阶段失败: ${errorMessage}`,
      messages: [new HumanMessage(`❌ 步骤2失败: ${errorMessage}`)],
    };
  }
}

/**
 * 从需求和研究中提取 API 查询关键词
 */
function extractAPIKeywords(
  requirements: string,
  researchNotes: ResearchNotes
): string[] {
  const keywords: Set<string> = new Set();

  // 从需求中提取关键词
  const commonKeywords = [
    'booking', 'reservation', 'order', 'payment', 'user', 'auth',
    'login', 'register', 'profile', 'list', 'detail', 'create',
    'update', 'delete', 'search', 'filter', 'lounge', 'resources',
    'available', 'schedule', 'appointment', 'service',
  ];

  const lowerRequirements = requirements.toLowerCase();
  for (const keyword of commonKeywords) {
    if (lowerRequirements.includes(keyword)) {
      keywords.add(keyword);
    }
  }

  // 从功能清单中提取
  for (const feature of researchNotes.prdBreakdown.featureChecklist) {
    const words = feature.name.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (word.length > 3) {
        keywords.add(word);
      }
    }
  }

  return Array.from(keywords).slice(0, 10); // 最多 10 个关键词
}

/**
 * 推断 API Schema（本地回退）
 */
function inferAPISchemas(
  researchNotes: ResearchNotes
): APISchemaDefinition[] {
  const schemas: APISchemaDefinition[] = [];

  // 基于 PRD API 需求推断
  for (const api of researchNotes.apiDocuments) {
    schemas.push({
      id: `inferred-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: api.name || 'Inferred API',
      path: api.path || '/api/unknown',
      method: api.method as APISchemaDefinition['method'] || 'GET',
      description: '此 Schema 是在 MCP 不可用时推断生成的',
      source: 'inferred',
    });
  }

  // 如果没有 API 需求，生成基本的 CRUD API
  if (schemas.length === 0) {
    schemas.push({
      id: `inferred-list-${Date.now()}`,
      name: '列表查询',
      path: '/api/list',
      method: 'GET',
      description: '推断的列表查询 API',
      source: 'inferred',
    });
  }

  return schemas;
}

/**
 * 从 LLM 输出中提取数据流设计
 */
function extractDataFlowDesign(output: string): string {
  const match = output.match(/### 数据层设计\s*([\s\S]*?)(?=###|$)/);
  return match?.[1]?.trim() ?? '';
}

/**
 * 从 LLM 输出中提取状态管理方案
 */
function extractStateManagement(output: string): string {
  const match = output.match(/### 状态管理方案\s*([\s\S]*?)(?=###|$)/);
  return match?.[1]?.trim() ?? '';
}

export default apiDesignNode;
