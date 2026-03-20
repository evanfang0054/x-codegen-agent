import {
  STAGES,
  advanceOneStage,
  ensureState,
  moveToStage,
  type RunMode,
  type Stage,
  type XgenState,
  writeState,
} from '../runtime/state.js';

export interface RunOptions {
  change: string;
  mode: RunMode;
  stage?: Stage;
  review?: string;
}

function isStage(value: string): value is Stage {
  return STAGES.includes(value as Stage);
}

function requireChangeId(change?: string): string {
  if (!change) {
    throw new Error('缺少 --change 参数');
  }
  return change;
}

function assertReviewOverrideBlocked(review?: string): void {
  if (!review) {
    return;
  }

  throw new Error('review 状态仅可由项目自研 reviewer/subagent 写入，CLI 禁止通过参数修改');
}

function assertDeliverReviewPassed(state: XgenState, targetStage: Stage): void {
  if (targetStage !== 'deliver') {
    return;
  }

  if (state.checks.review.status !== 'passed') {
    throw new Error('进入 deliver 前必须完成项目自研 reviewer/subagent 检查并置为 passed');
  }
}

export async function executeRunCommand(options: RunOptions, cwd = process.cwd()): Promise<XgenState> {
  const changeId = requireChangeId(options.change);
  assertReviewOverrideBlocked(options.review);
  const baseState = await ensureState(changeId, options.mode, cwd);

  if (options.mode === 'step') {
    if (!options.stage) {
      throw new Error('step 模式必须提供 --stage 参数');
    }
    if (!isStage(options.stage)) {
      throw new Error(`无效 stage: ${options.stage}`);
    }

    const nextState = moveToStage(baseState, options.stage, 'step');
    assertDeliverReviewPassed(nextState, options.stage);
    await writeState(nextState, cwd);
    return nextState;
  }

  const { state: autoState } = advanceOneStage(baseState, 'auto');
  assertDeliverReviewPassed(autoState, autoState.currentStage);
  await writeState(autoState, cwd);
  return autoState;
}

export function printRunResult(state: XgenState, mode: RunMode): void {
  console.log(`change: ${state.changeId}`);
  console.log(`mode: ${mode}`);
  console.log(`current stage: ${state.currentStage}`);

  if (mode === 'auto') {
    console.log('auto 模式最小实现：本次仅推进一阶段，请继续执行 xgen run --mode auto');
  }
}
