import { readState } from '../runtime/state.js';

export interface StatusOptions {
  change: string;
}

function requireChangeId(change?: string): string {
  if (!change) {
    throw new Error('缺少 --change 参数');
  }
  return change;
}

export async function executeStatusCommand(options: StatusOptions, cwd = process.cwd()): Promise<void> {
  const changeId = requireChangeId(options.change);
  const state = await readState(changeId, cwd);

  if (!state) {
    console.log(`change ${changeId} 尚无状态文件`);
    return;
  }

  console.log(`change: ${state.changeId}`);
  console.log(`mode: ${state.mode}`);
  console.log(`current stage: ${state.currentStage}`);
  console.log(`completed stages: ${state.completedStages.join(', ') || 'none'}`);
  console.log(`reviewer.required: ${state.reviewer.required}`);
  console.log(`reviewer.message: ${state.reviewer.message}`);
  console.log(`review.check.status: ${state.checks.review.status}`);
  console.log(`review.check.blocker: ${state.checks.review.blocker ?? 'none'}`);
  console.log(`review.check.updatedAt: ${state.checks.review.updatedAt ?? 'none'}`);
  console.log(`artifactPolicy.finalCodeMdRequired: ${state.artifactPolicy.finalCodeMdRequired}`);
  console.log(`artifactPolicy.reviewReportRequired: ${state.artifactPolicy.reviewReportRequired}`);
}
