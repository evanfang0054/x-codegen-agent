import { describe, expect, it, vi, afterEach } from 'vitest';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { executeRunCommand } from '../commands/run.js';
import { executeStatusCommand } from '../commands/status.js';
import { executeNextCommand } from '../commands/next.js';
import { createInitialState, moveToStage, writeState } from '../runtime/state.js';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('commands', () => {
  it('run step mode sets explicit stage', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-run-step-'));
    const state = await executeRunCommand(
      {
        change: 'change-step',
        mode: 'step',
        stage: 'api-design',
      },
      cwd
    );

    expect(state.currentStage).toBe('api-design');
    expect(state.mode).toBe('step');
  });

  it('run auto mode advances one stage only', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-run-auto-'));
    const state = await executeRunCommand(
      {
        change: 'change-auto',
        mode: 'auto',
      },
      cwd
    );

    expect(state.currentStage).toBe('research');
    expect(state.mode).toBe('auto');
  });

  it('run auto mode keeps mode=auto at final stage when review passed', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-run-auto-final-'));
    const base = createInitialState('change-auto-final', 'step');
    const deliverState = moveToStage(base, 'deliver', 'step');
    await writeState(
      {
        ...deliverState,
        checks: {
          ...deliverState.checks,
          review: {
            ...deliverState.checks.review,
            status: 'passed',
          },
        },
      },
      cwd
    );

    const state = await executeRunCommand(
      {
        change: 'change-auto-final',
        mode: 'auto',
      },
      cwd
    );

    expect(state.currentStage).toBe('deliver');
    expect(state.mode).toBe('auto');
  });

  it('run step deliver requires reviewer-subagent result and rejects cli override', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-run-step-deliver-'));

    await expect(
      executeRunCommand(
        {
          change: 'change-step-deliver',
          mode: 'step',
          stage: 'deliver',
        },
        cwd
      )
    ).rejects.toThrow('进入 deliver 前必须完成项目自研 reviewer/subagent 检查并置为 passed');

    await expect(
      executeRunCommand(
        {
          change: 'change-step-deliver',
          mode: 'step',
          stage: 'deliver',
          review: 'passed',
        },
        cwd
      )
    ).rejects.toThrow('review 状态仅可由项目自研 reviewer/subagent 写入，CLI 禁止通过参数修改');

    const base = createInitialState('change-step-deliver', 'step');
    await writeState(
      {
        ...base,
        currentStage: 'integration',
        completedStages: ['init', 'research', 'api-design', 'ui-design'],
        checks: {
          ...base.checks,
          review: {
            ...base.checks.review,
            status: 'passed',
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
        },
      },
      cwd
    );

    const passed = await executeRunCommand(
      {
        change: 'change-step-deliver',
        mode: 'step',
        stage: 'deliver',
      },
      cwd
    );

    expect(passed.currentStage).toBe('deliver');
    expect(passed.checks.review.status).toBe('passed');
  });


  it('run rejects any cli review override', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-run-review-invalid-'));

    await expect(
      executeRunCommand(
        {
          change: 'change-review-invalid',
          mode: 'step',
          stage: 'integration',
          review: 'done',
        },
        cwd
      )
    ).rejects.toThrow('review 状态仅可由项目自研 reviewer/subagent 写入，CLI 禁止通过参数修改');

    await expect(
      executeRunCommand(
        {
          change: 'change-review-invalid-2',
          mode: 'step',
          stage: 'integration',
          review: 'passed',
        },
        cwd
      )
    ).rejects.toThrow('review 状态仅可由项目自研 reviewer/subagent 写入，CLI 禁止通过参数修改');
  });

  it('status prints reviewer, check, and artifact fields', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-status-'));
    const state = createInitialState('change-status', 'step');
    await writeState(
      {
        ...state,
        checks: {
          ...state.checks,
          review: {
            ...state.checks.review,
            status: 'passed',
            updatedAt: '2026-03-20T00:00:00.000Z',
          },
        },
      },
      cwd
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await executeStatusCommand({ change: 'change-status' }, cwd);

    const output = logSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(output).toContain('reviewer.required: true');
    expect(output).toContain('review.check.status: passed');
    expect(output).toContain('review.check.updatedAt: 2026-03-20T00:00:00.000Z');
    expect(output).toContain('artifactPolicy.finalCodeMdRequired: false');
    expect(output).toContain('artifactPolicy.reviewReportRequired: false');
  });

  it('next blocks deliver suggestion when review is not passed at validate stage', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-next-review-gate-'));
    const base = createInitialState('change-next-review-gate', 'step');
    await writeState(
      {
        ...base,
        currentStage: 'validate',
        completedStages: ['init', 'research', 'api-design', 'ui-design', 'integration'],
        checks: {
          ...base.checks,
          review: {
            ...base.checks.review,
            status: 'pending',
          },
        },
      },
      cwd
    );

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await executeNextCommand({ change: 'change-next-review-gate' }, cwd);

    const output = logSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(output).toContain('project-reviewer-subagent');
    expect(output).toContain('passed');
  });

  it('next suggests init when state does not exist', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'xgen-cli-next-'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await executeNextCommand({ change: 'missing-change' }, cwd);

    const output = logSpy.mock.calls.map((args) => args.join(' ')).join('\n');
    expect(output).toContain('建议下一阶段: init');
  });
});
