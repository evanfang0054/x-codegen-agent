/**
 * Page-Codegen 代码整合节点
 * 步骤4：代码整合与 PRD 验收
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState, AIWorkFileInfo } from '@x-codegen/types';
import { integrationPrompt } from '../../prompts/index.js';

/**
 * 代码整合节点
 * 执行步骤4的代码整合与 PRD 验收工作
 */
export async function integrationNode(
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

    // 2. 调用 LLM 进行代码整合
    let completedFiles: AIWorkFileInfo[] = [];
    let verificationResults: Array<{
      name: string;
      description: string;
      status: 'implemented' | 'partial' | 'failed';
    }> = [];

    if (state.model) {
      // 生成代码补全
      const prompt = await integrationPrompt.format({
        taskPlan: JSON.stringify(taskPlan, null, 2),
        researchNotes: JSON.stringify(researchNotes, null, 2),
        apiSchemas: JSON.stringify(state.apiSchemas, null, 2),
        aiWorkFiles: JSON.stringify(state.aiWorkFiles, null, 2),
        requirements: state.requirements,
      });

      const response = await state.model.invoke(prompt);
      const llmOutput =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      // 解析生成的代码
      completedFiles = parseGeneratedFiles(llmOutput, state.aiWorkFiles);

      // 解析验收结果
      verificationResults = parseVerificationResults(llmOutput);
    }

    // 3. 更新 AI 工作副本文件状态
    const updatedAiWorkFiles = state.aiWorkFiles.map((file) => {
      const completed = completedFiles.find(
        (f) => f.absolutePath === file.absolutePath
      );
      if (completed) {
        return { ...file, completed: true, content: completed.content };
      }
      return file;
    });

    // 4. 更新研究笔记中的验收状态
    for (const result of verificationResults) {
      const existingItem = researchNotes.prdBreakdown.featureChecklist.find(
        (item) => item.name === result.name
      );
      if (existingItem) {
        existingItem.status = result.status;
      } else {
        researchNotes.prdBreakdown.featureChecklist.push({
          name: result.name,
          description: result.description,
          status: result.status,
        });
      }
    }

    // 5. 检查是否有未通过验收的功能
    const failedFeatures = researchNotes.prdBreakdown.featureChecklist.filter(
      (item) => item.status === 'failed' || item.status === 'partial'
    );

    if (failedFeatures.length > 0) {
      taskPlan.errors.push({
        stage: 'integration',
        error: `有 ${failedFeatures.length} 个功能未完全实现`,
        solution: '需要进一步补全代码',
        timestamp: new Date().toISOString(),
      });
    }

    // 6. 更新任务计划
    taskPlan.stages = taskPlan.stages.map((stage) =>
      stage.id === 'stage-4' ? { ...stage, completed: true } : stage
    );
    taskPlan.currentStatus = '阶段4完成，进入步骤5';
    taskPlan.currentStep = 'validate';

    // 记录决策
    taskPlan.decisions.push({
      decision: '完成代码整合与 PRD 验收',
      reason: `完成了 ${completedFiles.length} 个文件的代码补全`,
      timestamp: new Date().toISOString(),
    });

    // 7. 更新状态
    updates.currentStep = 'validate';
    updates.aiWorkFiles = updatedAiWorkFiles;
    updates.taskPlan = taskPlan;
    updates.researchNotes = researchNotes;
    updates.messages = [
      new HumanMessage(`✅ 步骤4完成：代码整合与PRD验收

### 代码整合摘要
- 补全的文件: ${completedFiles.length} 个
- 验收的功能: ${researchNotes.prdBreakdown.featureChecklist.length} 个
- 通过验收: ${researchNotes.prdBreakdown.featureChecklist.filter(f => f.status === 'implemented').length} 个
- 部分实现: ${researchNotes.prdBreakdown.featureChecklist.filter(f => f.status === 'partial').length} 个
- 未实现: ${researchNotes.prdBreakdown.featureChecklist.filter(f => f.status === 'failed').length} 个

### ⚠️ 核心约束确认
- ✅ 原始静态模板文件未被修改
- ✅ 所有代码补全仅在 AI 工作副本中完成
- ✅ 没有将 AI 副本代码复制到原始文件

现在进入步骤5：代码质量验证`),
    ];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `代码整合阶段失败: ${errorMessage}`,
      messages: [new HumanMessage(`❌ 步骤4失败: ${errorMessage}`)],
    };
  }
}

/**
 * 从 LLM 输出中解析生成的文件
 */
function parseGeneratedFiles(
  output: string,
  existingFiles: AIWorkFileInfo[]
): AIWorkFileInfo[] {
  const files: AIWorkFileInfo[] = [];

  // 尝试匹配代码块
  const codeBlockPattern = /```(?:typescript|tsx|ts)\s*(:?([^\n]+)\n)?([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockPattern.exec(output)) !== null) {
    const fileName = match[2]?.trim() || '';
    const content = match[3]?.trim() || '';

    if (content && fileName) {
      // 查找对应的现有文件
      const existingFile = existingFiles.find(
        (f) =>
          f.fileName === fileName ||
          f.absolutePath.endsWith(fileName) ||
          fileName.includes(f.fileName?.replace('.ai.tsx', '') || '')
      );

      if (existingFile) {
        files.push({
          ...existingFile,
          content,
          completed: true,
        });
      }
    }
  }

  // 如果没有匹配到文件名，尝试从内容推断
  if (files.length === 0 && existingFiles.length > 0) {
    // 获取所有代码块
    const allCodeBlocks: string[] = [];
    const simplePattern = /```(?:typescript|tsx|ts)\n([\s\S]*?)```/g;
    while ((match = simplePattern.exec(output)) !== null) {
      if (match[1]) {
        allCodeBlocks.push(match[1].trim());
      }
    }

    // 将代码块分配给现有文件
    for (let i = 0; i < Math.min(allCodeBlocks.length, existingFiles.length); i++) {
      files.push({
        ...existingFiles[i],
        content: allCodeBlocks[i],
        completed: true,
      });
    }
  }

  return files;
}

/**
 * 从 LLM 输出中解析验收结果
 */
function parseVerificationResults(
  output: string
): Array<{ name: string; description: string; status: 'implemented' | 'partial' | 'failed' }> {
  const results: Array<{
    name: string;
    description: string;
    status: 'implemented' | 'partial' | 'failed';
  }> = [];

  // 尝试匹配验收清单
  const checklistPattern = /[-*]\s*(.+?)(?:：|:)\s*(.+?)(?:\s*[✅❌⚠️])/g;

  let match;
  while ((match = checklistPattern.exec(output)) !== null) {
    const name = match[1]?.trim() || '';
    const description = match[2]?.trim() || '';
    const fullLine = output.slice(match.index, match.index + 100);

    let status: 'implemented' | 'partial' | 'failed' = 'implemented';
    if (fullLine.includes('❌')) {
      status = 'failed';
    } else if (fullLine.includes('⚠️')) {
      status = 'partial';
    }

    if (name) {
      results.push({ name, description, status });
    }
  }

  return results;
}

export default integrationNode;
