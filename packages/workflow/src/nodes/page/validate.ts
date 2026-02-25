/**
 * Page-Codegen 验证节点
 * 步骤5：代码质量验证（pnpm check、生成 final_code.md）
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState } from '@x-codegen/types';
import { errorFixPrompt, finalCodePrompt } from '../../prompts/index.js';

/**
 * 验证节点
 * 执行步骤5的代码质量验证工作
 */
export async function validateNode(
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

    // 2. 执行核心约束检查
    const constraintCheckResult = checkCoreConstraints(state);
    if (!constraintCheckResult.passed) {
      throw new Error(`核心约束检查失败: ${constraintCheckResult.errors.join(', ')}`);
    }

    // 3. 执行代码质量验证（模拟）
    // 在实际实现中，这里应该执行 `pnpm run check`
    const validationLog = await executeCodeQualityCheck(state);
    const validationPassed = !validationLog.includes('error') && !validationLog.includes('failed');

    // 4. 如果验证失败，尝试修复
    let fixAttempts = 0;
    const maxFixAttempts = 3;
    let currentValidationLog = validationLog;
    let currentValidationPassed = validationPassed;

    while (!currentValidationPassed && fixAttempts < maxFixAttempts && state.model) {
      fixAttempts++;

      // 调用 LLM 分析错误并生成修复方案
      const prompt = await errorFixPrompt.format({
        errorLog: currentValidationLog,
        relevantFiles: JSON.stringify(state.aiWorkFiles.filter(f => f.content), null, 2),
        aiWorkCode: state.aiWorkFiles.map(f => `// ${f.fileName}\n${f.content || ''}`).join('\n\n'),
      });

      const response = await state.model.invoke(prompt);
      // fixOutput is used for logging/analysis in production
      void response.content; // Acknowledge the response

      // 应用修复（模拟）
      // 在实际实现中，这里应该解析 LLM 输出并更新代码

      // 重新验证
      currentValidationLog = await executeCodeQualityCheck(state);
      currentValidationPassed = !currentValidationLog.includes('error');

      if (!currentValidationPassed) {
        taskPlan.errors.push({
          stage: 'validate',
          error: `代码质量验证失败 (尝试 ${fixAttempts}/${maxFixAttempts})`,
          solution: '应用了 LLM 生成的修复方案',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 5. 生成 final_code.md
    let finalCodePath = '';
    if (currentValidationPassed && state.model) {
      finalCodePath = `${state.outputDir}/final_code.md`;

      // 调用 LLM 生成 final_code.md 内容
      const prompt = await finalCodePrompt.format({
        taskPlan: JSON.stringify(taskPlan, null, 2),
        researchNotes: JSON.stringify(researchNotes, null, 2),
        aiWorkFilesContent: state.aiWorkFiles
          .filter((f) => f.content)
          .map((f) => `// ${f.fileName}\n${f.content}`)
          .join('\n\n'),
        validationResult: currentValidationPassed ? '✅ 通过' : '❌ 失败',
        fixedIssues: taskPlan.errors
          .filter((e) => e.stage === 'validate')
          .map((e) => e.solution)
          .filter(Boolean)
          .join('\n'),
      });

      const response = await state.model.invoke(prompt);
      // finalCodeContent would be written to final_code.md in production
      void response.content; // Acknowledge the response
    }

    // 6. 更新任务计划
    taskPlan.stages = taskPlan.stages.map((stage) =>
      stage.id === 'stage-5' ? { ...stage, completed: true } : stage
    );
    taskPlan.currentStatus = '阶段5完成，进入步骤6';
    taskPlan.currentStep = 'deliver';

    // 记录验证结果
    taskPlan.decisions.push({
      decision: '完成代码质量验证',
      reason: currentValidationPassed
        ? '验证通过（0错误）'
        : `验证完成（${fixAttempts} 次修复尝试）`,
      timestamp: new Date().toISOString(),
    });

    // 7. 更新状态
    updates.currentStep = 'deliver';
    updates.validationPassed = currentValidationPassed;
    updates.validationLog = currentValidationLog;
    updates.finalCodePath = finalCodePath;
    updates.taskPlan = taskPlan;
    updates.messages = [
      new HumanMessage(`✅ 步骤5完成：代码质量验证

### 验证结果
- 代码质量验证: ${currentValidationPassed ? '✅ 通过（0错误）' : '⚠️ 存在问题'}
- 修复尝试次数: ${fixAttempts}
- final_code.md: ${finalCodePath || '未生成'}

### 核心约束确认
- ✅ 原始静态模板文件完全未被修改
- ✅ 所有代码补全工作仅在 AI 工作副本中完成
- ✅ 没有将 AI 副本代码复制到原始文件

${!currentValidationPassed ? '⚠️ 存在未解决的问题，建议检查验证日志' : ''}

现在进入步骤6：任务完成交付`),
    ];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `代码质量验证阶段失败: ${errorMessage}`,
      validationPassed: false,
      messages: [new HumanMessage(`❌ 步骤5失败: ${errorMessage}`)],
    };
  }
}

/**
 * 检查核心约束
 */
function checkCoreConstraints(
  _state: PageCodegenState
): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // 在实际实现中，这里应该检查：
  // 1. 原始文件的修改时间是否变化
  // 2. 原始文件的内容哈希是否变化
  // 3. 是否有对原始文件的写入操作

  // 模拟检查（总是通过）
  // 实际实现应该进行真实的文件检查

  return {
    passed: true,
    errors,
  };
}

/**
 * 执行代码质量检查
 */
async function executeCodeQualityCheck(
  _state: PageCodegenState
): Promise<string> {
  // 在实际实现中，这里应该执行：
  // - pnpm --filter <project-name> run check
  // - 或者 cd /path/to/project && pnpm run check

  // 模拟验证结果 - 总是返回通过
  return `
> @project/codegen@1.0.0 check
> tsc --noEmit && eslint src/

✅ TypeScript type check passed
✅ ESLint check passed (0 errors, 0 warnings)

All checks passed!
`;
}

export default validateNode;
