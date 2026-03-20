import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  advanceOneStage,
  createInitialState,
  getNextStage,
  moveToStage,
  readState,
  resolveStateFilePath,
  writeState,
} from '../runtime/state.js';

describe('state core', () => {
  it('creates initial state with reviewer gate and artifact policy', () => {
    const state = createInitialState('demo-change', 'step');

    expect(state.changeId).toBe('demo-change');
    expect(state.currentStage).toBe('init');
    expect(state.reviewer.required).toBe(true);
    expect(state.artifactPolicy.finalCodeMdRequired).toBe(false);
    expect(state.artifactPolicy.reviewReportRequired).toBe(false);
  });

  it('writes and reads state from xgen/changes/<id>/state.json', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-state-'));
    const state = createInitialState('change-a', 'step');

    const stateFile = await writeState(state, cwd);
    const loaded = await readState('change-a', cwd);

    expect(stateFile).toBe(resolveStateFilePath('change-a', cwd));
    expect(loaded?.changeId).toBe('change-a');

    const content = await readFile(stateFile, 'utf-8');
    expect(content).toContain('"changeId": "change-a"');
  });

  it('advances one stage in auto mode', () => {
    const initial = createInitialState('change-b', 'auto');
    const { state, moved } = advanceOneStage(initial);

    expect(moved).toBe(true);
    expect(state.currentStage).toBe('research');
    expect(state.mode).toBe('auto');
  });

  it('moves to explicit step and calculates next stage', () => {
    const initial = createInitialState('change-c', 'step');
    const moved = moveToStage(initial, 'ui-design', 'step');

    expect(moved.currentStage).toBe('ui-design');
    expect(moved.completedStages).toEqual(['init', 'research', 'api-design']);
    expect(getNextStage('ui-design')).toBe('integration');
  });
});
