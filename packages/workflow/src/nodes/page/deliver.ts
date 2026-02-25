/**
 * Page-Codegen 交付节点
 * 步骤6：任务完成交付（告知用户、上报 one-day-mcp）
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState } from '@x-codegen/types';
import { createOneDayMCPClient } from '@x-codegen/tools';

/**
 * 交付节点
 * 执行步骤6的任务完成交付工作
 */
export async function deliverNode(
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

    // 2. 检查前置条件
    if (!state.validationPassed) {
      throw new Error('代码质量验证未通过，无法进行交付');
    }

    if (!state.finalCodePath) {
      throw new Error('final_code.md 未生成，无法进行交付');
    }

    // 3. 生成交付消息
    const deliveryMessage = generateDeliveryMessage(state);

    // 4. 上报代码完成信息到 one-day-mcp（静默执行）
    if (state.mcpServers?.oneDay) {
      try {
        const oneDayClient = createOneDayMCPClient(state.mcpServers.oneDay);

        // 对每个 AI 工作副本文件上报
        for (const aiFile of state.aiWorkFiles) {
          if (aiFile.completed && aiFile.originalFilePath) {
            await oneDayClient.completeLogicCode({
              sourceFilePath: aiFile.originalFilePath,
              generatedFilePath: aiFile.absolutePath,
              taskId: taskPlan.pageName,
              metadata: {
                pageName: taskPlan.pageName,
                completedAt: new Date().toISOString(),
              },
            });
          }
        }
      } catch (error) {
        // 上报失败不影响用户，仅记录日志
        console.warn('[One-day MCP] 上报代码完成信息失败:', error);
      }
    }

    // 5. 更新任务计划
    taskPlan.stages = taskPlan.stages.map((stage) =>
      stage.id === 'stage-6' ? { ...stage, completed: true } : stage
    );
    taskPlan.currentStatus = '所有阶段已完成 - 任务完成';
    taskPlan.currentStep = 'deliver';

    // 记录决策
    taskPlan.decisions.push({
      decision: '完成任务交付',
      reason: '所有步骤已完成，代码已交付',
      timestamp: new Date().toISOString(),
    });

    // 6. 更新状态（任务完成）
    updates.currentStep = 'deliver';
    updates.taskPlan = taskPlan;
    updates.messages = [new HumanMessage(deliveryMessage)];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `任务交付阶段失败: ${errorMessage}`,
      messages: [new HumanMessage(`❌ 步骤6失败: ${errorMessage}`)],
    };
  }
}

/**
 * 生成交付消息
 */
function generateDeliveryMessage(state: PageCodegenState): string {
  const taskPlan = state.taskPlan!;
  const researchNotes = state.researchNotes!;

  // 计算关键成果
  const achievements: string[] = [];
  const implementedFeatures = researchNotes.prdBreakdown.featureChecklist.filter(
    (f) => f.status === 'implemented'
  );
  if (implementedFeatures.length > 0) {
    achievements.push(`实现了 ${implementedFeatures.length} 个功能`);
  }
  if (state.apiSchemas && state.apiSchemas.length > 0) {
    achievements.push(`对接了 ${state.apiSchemas.length} 个 API`);
  }
  if (researchNotes.componentDocuments.length > 0) {
    achievements.push(`使用了 ${researchNotes.componentDocuments.length} 个组件`);
  }

  // 生成文件变更清单
  const originalFilesList = taskPlan.originalFiles
    .map((f) => `  - ${f.absolutePath}`)
    .join('\n');

  const aiWorkFilesList = taskPlan.aiWorkFiles
    .map((f) => `  - ${f.absolutePath}`)
    .join('\n');

  // 生成修复问题列表
  const fixedIssues = taskPlan.errors
    .filter((e) => e.solution)
    .map((e) => `- ${e.solution}`)
    .join('\n');

  return `🎉 所有步骤已完成！任务已成功完成

✅ 代码质量验证：通过（0错误）
📝 生成的代码文件：${state.finalCodePath}
🔧 修复的问题：
${fixedIssues || '- 无'}

📋 文件变更清单：

原始静态模板文件（✅ 未修改，保持原样）：
${originalFilesList || '- 无'}
  **重要**：这些文件完全未被触碰，仅作为参考

AI 工作副本文件（✅ 已完成，包含所有补全逻辑）：
${aiWorkFilesList || '- 无'}
  **说明**：这是最终的可用代码，请使用这些文件进行后续开发

关键成果：
${achievements.map((a) => `- ${a}`).join('\n') || '- 完成了页面胶水代码补全'}

⚠️ **重要提醒**：
- 原始静态模板文件未被修改
- 请使用 AI 工作副本进行后续开发
- 不要将 AI 副本代码复制回原始文件

---
任务完成时间：${new Date().toLocaleString('zh-CN')}`;
}

export default deliverNode;
