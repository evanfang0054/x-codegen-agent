#!/usr/bin/env node
import { Command } from 'commander';
import { executeRunCommand, printRunResult } from './commands/run.js';
import { executeStatusCommand } from './commands/status.js';
import { executeNextCommand } from './commands/next.js';
import { STAGES, type RunMode, type Stage } from './runtime/state.js';

const version = '1.0.0';
const program = new Command();

program.name('xgen').description('xgen page-codegen step/auto 引导工具').version(version);

program
  .command('run')
  .description('执行 step/auto 引导并更新状态')
  .requiredOption('--change <id>', 'change id')
  .requiredOption('--mode <mode>', '执行模式: step | auto')
  .option('--stage <stage>', `step 模式目标阶段: ${STAGES.join(' | ')}`)
  .action(async (options: { change: string; mode: RunMode; stage?: string }) => {
    try {
      const mode = options.mode;
      if (mode !== 'step' && mode !== 'auto') {
        throw new Error(`无效 mode: ${mode}`);
      }

      const stage = options.stage as Stage | undefined;
      const state = await executeRunCommand(
        {
          change: options.change,
          mode,
          stage,
        },
        process.cwd()
      );
      printRunResult(state, mode);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('查看当前状态')
  .requiredOption('--change <id>', 'change id')
  .action(async (options: { change: string }) => {
    try {
      await executeStatusCommand(options, process.cwd());
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program
  .command('next')
  .description('查看下一阶段建议')
  .requiredOption('--change <id>', 'change id')
  .action(async (options: { change: string }) => {
    try {
      await executeNextCommand(options, process.cwd());
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parse(process.argv);
