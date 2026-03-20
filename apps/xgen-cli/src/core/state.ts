import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const STAGES = [
  'init',
  'research',
  'api-design',
  'ui-design',
  'integration',
  'validate',
  'deliver',
] as const;

export type Stage = (typeof STAGES)[number];
export type RunMode = 'step' | 'auto';

export interface XgenState {
  changeId: string;
  mode: RunMode;
  currentStage: Stage;
  completedStages: Stage[];
  reviewer: {
    required: boolean;
    type: 'project-reviewer-subagent';
    message: string;
  };
  artifactPolicy: {
    finalCodeMdRequired: false;
    reviewReportRequired: false;
    message: string;
  };
  updatedAt: string;
}

export function getStageIndex(stage: Stage): number {
  return STAGES.indexOf(stage);
}

export function getNextStage(stage: Stage): Stage | null {
  const index = getStageIndex(stage);
  if (index < 0 || index >= STAGES.length - 1) {
    return null;
  }
  return STAGES[index + 1];
}

export function resolveStateFilePath(changeId: string, cwd = process.cwd()): string {
  return path.join(cwd, 'xgen', 'changes', changeId, 'state.json');
}

export function createInitialState(changeId: string, mode: RunMode): XgenState {
  return {
    changeId,
    mode,
    currentStage: 'init',
    completedStages: [],
    reviewer: {
      required: true,
      type: 'project-reviewer-subagent',
      message: '必须走项目自研 reviewer/subagent，禁止替换为外部评审器。',
    },
    artifactPolicy: {
      finalCodeMdRequired: false,
      reviewReportRequired: false,
      message: '不要求 final_code.md 和 review 报告工件。',
    },
    updatedAt: new Date().toISOString(),
  };
}

export async function readState(changeId: string, cwd = process.cwd()): Promise<XgenState | null> {
  const stateFilePath = resolveStateFilePath(changeId, cwd);

  try {
    const content = await readFile(stateFilePath, 'utf-8');
    return JSON.parse(content) as XgenState;
  } catch {
    return null;
  }
}

export async function writeState(state: XgenState, cwd = process.cwd()): Promise<string> {
  const stateFilePath = resolveStateFilePath(state.changeId, cwd);
  const stateDir = path.dirname(stateFilePath);

  await mkdir(stateDir, { recursive: true });
  await writeFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');

  return stateFilePath;
}

export async function ensureState(changeId: string, mode: RunMode, cwd = process.cwd()): Promise<XgenState> {
  const existing = await readState(changeId, cwd);
  if (existing) {
    return existing;
  }

  const initial = createInitialState(changeId, mode);
  await writeState(initial, cwd);
  return initial;
}

export function moveToStage(state: XgenState, stage: Stage, mode: RunMode): XgenState {
  const targetIndex = getStageIndex(stage);
  const completedStages = STAGES.slice(0, targetIndex);

  return {
    ...state,
    mode,
    currentStage: stage,
    completedStages,
    updatedAt: new Date().toISOString(),
  };
}

export function advanceOneStage(
  state: XgenState,
  mode: RunMode = 'auto'
): { state: XgenState; moved: boolean } {
  const next = getNextStage(state.currentStage);
  if (!next) {
    return {
      state: {
        ...state,
        mode,
        updatedAt: new Date().toISOString(),
      },
      moved: false,
    };
  }

  const updated = moveToStage(state, next, mode);
  return { state: updated, moved: true };
}
