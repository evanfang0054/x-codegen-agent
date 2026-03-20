import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  ensureState,
  moveToStage,
  readState,
  resolveStateFilePath,
  syncStateIntegrity,
} from '../runtime/state.js';
import { resolveResearchNotesPath, resolveTaskPlanPath } from '../runtime/paths.js';

describe('runtime state', () => {
  it('creates state file with required gates and checks', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-runtime-'));

    const state = await ensureState('change-runtime-a', 'step', cwd);

    expect(state.reviewer.type).toBe('project-reviewer-subagent');
    expect(state.artifactPolicy.finalCodeMdRequired).toBe(false);
    expect(state.artifactPolicy.reviewReportRequired).toBe(false);
    expect(state.checks.review.status).toBe('pending');

    const filePath = resolveStateFilePath('change-runtime-a', cwd);
    const saved = await readState('change-runtime-a', cwd);

    expect(saved?.changeId).toBe('change-runtime-a');
    expect(filePath).toContain(path.join('xgen', 'changes', 'change-runtime-a', 'state.json'));
  });

  it('computes and syncs integrity hash from task_plan and research_notes', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-runtime-'));

    const changeId = 'change-runtime-b';
    const state = await ensureState(changeId, 'step', cwd);

    const taskPlanPath = resolveTaskPlanPath(changeId, cwd);
    const researchPath = resolveResearchNotesPath(changeId, cwd);
    await mkdir(path.dirname(taskPlanPath), { recursive: true });
    await writeFile(taskPlanPath, '# task plan\n- [ ] demo\n', 'utf-8');
    await writeFile(researchPath, '# research\nfindings\n', 'utf-8');

    const synced = await syncStateIntegrity(state, cwd);
    expect(synced.integrity.taskPlanHash).toMatch(/^[a-f0-9]{64}$/);
    expect(synced.integrity.researchNotesHash).toMatch(/^[a-f0-9]{64}$/);

    const resynced = await syncStateIntegrity(synced, cwd);
    expect(resynced).toBe(synced);
  });

  it('updates integrity in ensureState after artifact files change', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-runtime-'));

    const changeId = 'change-runtime-c';
    await ensureState(changeId, 'step', cwd);

    const taskPlanPath = resolveTaskPlanPath(changeId, cwd);
    await mkdir(path.dirname(taskPlanPath), { recursive: true });
    await writeFile(taskPlanPath, '# first\n', 'utf-8');

    const second = await ensureState(changeId, 'step', cwd);
    expect(second.integrity.taskPlanHash).toMatch(/^[a-f0-9]{64}$/);

    await writeFile(taskPlanPath, '# second\n', 'utf-8');
    const third = await ensureState(changeId, 'step', cwd);

    expect(third.integrity.taskPlanHash).not.toBe(second.integrity.taskPlanHash);

    const savedRaw = await readFile(resolveStateFilePath(changeId, cwd), 'utf-8');
    expect(savedRaw).toContain('"integrity"');
  });

  it('keeps mode and updates completed stages when moving stage', () => {
    const initial = createInitialState('change-runtime-d', 'step');
    const moved = moveToStage(initial, 'validate', 'auto');

    expect(moved.mode).toBe('auto');
    expect(moved.currentStage).toBe('validate');
    expect(moved.completedStages).toEqual(['init', 'research', 'api-design', 'ui-design', 'integration']);
  });
});
