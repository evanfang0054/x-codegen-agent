import { readState, STAGES, getNextStage } from '../runtime/state.js';

export interface NextOptions {
  change: string;
}

function requireChangeId(change?: string): string {
  if (!change) {
    throw new Error('缺少 --change 参数');
  }
  return change;
}

export async function executeNextCommand(options: NextOptions, cwd = process.cwd()): Promise<void> {
  const changeId = requireChangeId(options.change);
  const state = await readState(changeId, cwd);

  if (!state) {
    console.log(`建议下一阶段: ${STAGES[0]} (尚未初始化状态)`);
    return;
  }

  if (state.currentStage === 'validate' && state.checks.review.status !== 'passed') {
    console.log('进入 deliver 前必须先由 project-reviewer-subagent 完成检查并将 review 状态置为 passed');
    return;
  }

  const next = getNextStage(state.currentStage);
  if (!next) {
    console.log('所有阶段已完成，无下一阶段');
    return;
  }

  console.log(`建议下一阶段: ${next}`);
}
