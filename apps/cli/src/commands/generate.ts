/**
 * generate 命令实现
 * 从 Figma 设计生成前端代码
 */
import chalk from 'chalk';
import { generateCodeStream, type CodeGenOptions } from '@x-codegen/sdk';
import { createLogger } from '../utils/logger.js';
import { createProgress } from '../utils/progress.js';

/**
 * CLI generate 命令选项
 */
export interface GenerateCommandOptions {
  /** Figma 设计链接 */
  figma: string;
  /** 输出目录 */
  output: string;
  /** 模板仓库 URL */
  template?: string;
  /** 需求描述 */
  requirements?: string;
  /** 最大重试次数 */
  maxRetries: string;
  /** LLM 提供商 */
  provider?: string;
  /** 模型名称 */
  model?: string;
  /** 详细日志 */
  verbose: boolean;
}

/**
 * 步骤中文名称映射
 */
const STEP_NAMES: Record<string, string> = {
  init: '初始化',
  template: '模板生成',
  completion: '逻辑补全',
  validate: '验证',
  completed: '已完成',
  error: '错误',
};

/**
 * 执行 generate 命令
 */
export async function generateCommand(options: GenerateCommandOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const progress = createProgress('准备开始...');

  // 构建 CodeGenOptions
  const codeGenOptions: CodeGenOptions = {
    figmaUrl: options.figma,
    outputDir: options.output,
    templateRepo: options.template,
    requirements: options.requirements ?? '',
    maxRetries: parseInt(options.maxRetries, 10) || 3,
  };

  // 验证必要参数
  if (!codeGenOptions.figmaUrl) {
    progress.fail(chalk.red('缺少 Figma 设计链接'));
    logger.error('请使用 --figma 或 -f 参数提供 Figma 设计链接');
    process.exit(1);
  }

  if (!codeGenOptions.outputDir) {
    progress.fail(chalk.red('缺少输出目录'));
    logger.error('请使用 --output 或 -o 参数提供输出目录');
    process.exit(1);
  }

  // 打印配置信息
  if (options.verbose) {
    logger.info('配置信息:');
    console.log(chalk.dim(`  Figma URL: ${codeGenOptions.figmaUrl}`));
    console.log(chalk.dim(`  输出目录: ${codeGenOptions.outputDir}`));
    if (codeGenOptions.templateRepo) {
      console.log(chalk.dim(`  模板仓库: ${codeGenOptions.templateRepo}`));
    }
    if (codeGenOptions.requirements) {
      console.log(chalk.dim(`  需求描述: ${codeGenOptions.requirements}`));
    }
    if (options.provider) {
      console.log(chalk.dim(`  LLM 提供商: ${options.provider}`));
    }
    if (options.model) {
      console.log(chalk.dim(`  模型: ${options.model}`));
    }
    console.log();
  }

  try {
    // 执行代码生成流
    for await (const event of generateCodeStream(codeGenOptions)) {
      const stepName = STEP_NAMES[event.step] ?? event.step;

      // 更新进度文本
      progress.update(`[${stepName}] ${event.message}`);

      // 详细模式下输出额外信息
      if (options.verbose && event.data) {
        progress.spinner.stop();
        logger.debug(JSON.stringify(event.data, null, 2));
        progress.spinner.start();
      }

      // 检查是否出错
      if (event.step === 'error') {
        progress.fail(chalk.red(event.message));
        process.exit(1);
      }
    }

    // 成功完成
    progress.succeed(chalk.green('代码生成完成!'));
    console.log();
    logger.success(`输出目录: ${chalk.cyan(codeGenOptions.outputDir)}`);

    // 显示后续步骤提示
    console.log();
    console.log(chalk.dim('后续步骤:'));
    console.log(chalk.dim(`  cd ${codeGenOptions.outputDir}`));
    console.log(chalk.dim('  pnpm install'));
    console.log(chalk.dim('  pnpm dev'));

  } catch (error) {
    progress.fail(chalk.red('代码生成失败'));
    logger.error(error);
    process.exit(1);
  }
}
