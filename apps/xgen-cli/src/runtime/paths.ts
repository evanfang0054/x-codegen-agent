import path from 'node:path';

export function resolveChangeDirPath(changeId: string, cwd = process.cwd()): string {
  return path.join(cwd, 'xgen', 'changes', changeId);
}

export function resolveStateFilePath(changeId: string, cwd = process.cwd()): string {
  return path.join(resolveChangeDirPath(changeId, cwd), 'state.json');
}

export function resolveTaskPlanPath(changeId: string, cwd = process.cwd()): string {
  return path.join(resolveChangeDirPath(changeId, cwd), 'task_plan.md');
}

export function resolveResearchNotesPath(changeId: string, cwd = process.cwd()): string {
  return path.join(resolveChangeDirPath(changeId, cwd), 'research_notes.md');
}
