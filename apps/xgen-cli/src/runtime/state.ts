import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  resolveResearchNotesPath,
  resolveStateFilePath,
  resolveTaskPlanPath,
} from './paths.js';
import type { RunMode, Stage, XgenState, IntegrityState, CheckState } from './types.js';

export const STAGES: readonly Stage[] = [
  'init',
  'research',
  'api-design',
  'ui-design',
  'integration',
  'validate',
  'deliver',
];

const REVIEWER = {
  required: true,
  type: 'project-reviewer-subagent',
  message: '必须走项目自研 reviewer/subagent，禁止替换为外部评审器。',
} as const;

const ARTIFACT_POLICY = {
  finalCodeMdRequired: false,
  reviewReportRequired: false,
  message: '不要求 final_code.md 和 review 报告工件。',
} as const;

function now(): string {
  return new Date().toISOString();
}

function defaultCheckState(): CheckState {
  return {
    status: 'pending',
    blocker: null,
    updatedAt: null,
  };
}

function defaultIntegrityState(): IntegrityState {
  return {
    taskPlanHash: null,
    researchNotesHash: null,
  };
}

async function safeSha256(filePath: string): Promise<string | null> {
  try {
    const content = await readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  } catch {
    return null;
  }
}

async function buildIntegrityState(changeId: string, cwd = process.cwd()): Promise<IntegrityState> {
  const [taskPlanHash, researchNotesHash] = await Promise.all([
    safeSha256(resolveTaskPlanPath(changeId, cwd)),
    safeSha256(resolveResearchNotesPath(changeId, cwd)),
  ]);

  return {
    taskPlanHash,
    researchNotesHash,
  };
}

function normalizeState(raw: Partial<XgenState>, changeId: string, fallbackMode: RunMode): XgenState {
  const mode = raw.mode === 'step' || raw.mode === 'auto' ? raw.mode : fallbackMode;
  const currentStage =
    raw.currentStage && STAGES.includes(raw.currentStage)
      ? raw.currentStage
      : 'init';
  const completedStages = Array.isArray(raw.completedStages)
    ? raw.completedStages.filter((stage): stage is Stage => STAGES.includes(stage))
    : [];

  const reviewer = {
    required: true,
    type: REVIEWER.type,
    message: raw.reviewer?.message ?? REVIEWER.message,
  };
  const artifactPolicy = {
    finalCodeMdRequired: false,
    reviewReportRequired: false,
    message: raw.artifactPolicy?.message ?? ARTIFACT_POLICY.message,
  };

  const reviewStatus =
    raw.checks?.review?.status === 'pending' ||
    raw.checks?.review?.status === 'passed' ||
    raw.checks?.review?.status === 'failed'
      ? raw.checks.review.status
      : 'pending';

  return {
    changeId,
    mode,
    currentStage,
    completedStages,
    reviewer,
    artifactPolicy,
    gates: {
      reviewer,
      artifactPolicy,
    },
    checks: {
      review: {
        status: reviewStatus,
        blocker: raw.checks?.review?.blocker ?? null,
        updatedAt: raw.checks?.review?.updatedAt ?? null,
      },
    },
    integrity: {
      taskPlanHash: raw.integrity?.taskPlanHash ?? null,
      researchNotesHash: raw.integrity?.researchNotesHash ?? null,
    },
    updatedAt: raw.updatedAt ?? now(),
  };
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

export function createInitialState(changeId: string, mode: RunMode): XgenState {
  return {
    changeId,
    mode,
    currentStage: 'init',
    completedStages: [],
    reviewer: { ...REVIEWER },
    artifactPolicy: { ...ARTIFACT_POLICY },
    gates: {
      reviewer: { ...REVIEWER },
      artifactPolicy: { ...ARTIFACT_POLICY },
    },
    checks: {
      review: defaultCheckState(),
    },
    integrity: defaultIntegrityState(),
    updatedAt: now(),
  };
}

export async function readState(changeId: string, cwd = process.cwd()): Promise<XgenState | null> {
  const stateFilePath = resolveStateFilePath(changeId, cwd);

  try {
    const content = await readFile(stateFilePath, 'utf-8');
    const raw = JSON.parse(content) as Partial<XgenState>;
    return normalizeState(raw, changeId, 'step');
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

export async function syncStateIntegrity(state: XgenState, cwd = process.cwd()): Promise<XgenState> {
  const integrity = await buildIntegrityState(state.changeId, cwd);
  const changed =
    integrity.taskPlanHash !== state.integrity.taskPlanHash ||
    integrity.researchNotesHash !== state.integrity.researchNotesHash;

  if (!changed) {
    return state;
  }

  return {
    ...state,
    integrity,
    updatedAt: now(),
  };
}

export async function ensureState(changeId: string, mode: RunMode, cwd = process.cwd()): Promise<XgenState> {
  const existing = await readState(changeId, cwd);
  const existingRaw = existing ? JSON.stringify(existing) : null;
  const baseState = existing ?? createInitialState(changeId, mode);
  const normalized = normalizeState(baseState, changeId, existing?.mode ?? mode);
  const synced = await syncStateIntegrity(normalized, cwd);
  const syncedRaw = JSON.stringify(synced);

  if (!existing || existingRaw !== syncedRaw) {
    await writeState(synced, cwd);
  }

  return synced;
}

export function moveToStage(state: XgenState, stage: Stage, mode: RunMode): XgenState {
  const targetIndex = getStageIndex(stage);
  const completedStages = STAGES.slice(0, targetIndex);

  return {
    ...state,
    mode,
    currentStage: stage,
    completedStages,
    updatedAt: now(),
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
        updatedAt: now(),
      },
      moved: false,
    };
  }

  const updated = moveToStage(state, next, mode);
  return { state: updated, moved: true };
}

export { resolveStateFilePath } from './paths.js';
