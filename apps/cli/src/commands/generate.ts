/**
 * generate 命令实现
 * 从 Figma 设计生成前端代码
 */
import chalk from 'chalk';
import { pageCodegenStream, type PageCodegenOptions } from '@x-codegen/sdk';
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
  /** 项目模板仓库 URL */
  template?: string;
  /** 项目名称（Monorepo 项目） */
  project?: string;
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
 * 步骤中文名称映射（Page-Codegen 7 步工作流）
 */
const STEP_NAMES: Record<string, string> = {
  init: '初始化',
  research: '需求与代码研究',
  'api-design': '接口与数据逻辑设计',
  'ui-design': 'UI组件与交互逻辑设计',
  integration: '代码整合与PRD验收',
  validate: '代码质量验证',
  deliver: '任务完成交付',
  error: '错误',
};

/**
 * 执行 generate 命令
 */
export async function generateCommand(options: GenerateCommandOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const progress = createProgress('正在生成页面代码...');

  try {
    // 构建 Page-Codegen 选项
    const pageCodegenOptions: PageCodegenOptions = {
      figmaUrl: options.figma,
      outputDir: options.output,
      templateRepo: options.template,
      projectName: options.project,
      requirements: options.requirements ?? '',
      maxRetries: parseInt(options.maxRetries, 10) || 3,
    };

    // 验证必要参数
    if (!pageCodegenOptions.figmaUrl) {
      progress.fail(chalk.red('缺少 Figma 设计链接'));
      logger.error('请使用 --figma 或 -f 参数提供 Figma 设计链接');
      process.exit(1);
    }

    if (!pageCodegenOptions.outputDir) {
      progress.fail(chalk.red('缺少输出目录'));
      logger.error('请使用 --output 或 -o 参数提供输出目录');
      process.exit(1);
    }

    // 打印配置信息
    if (options.verbose) {
      logger.info('配置信息:');
      console.log(chalk.dim(`  Figma URL: ${pageCodegenOptions.figmaUrl}`));
      console.log(chalk.dim(`  输出目录: ${pageCodegenOptions.outputDir}`));
      if (pageCodegenOptions.templateRepo) {
        console.log(chalk.dim(`  模板仓库: ${pageCodegenOptions.templateRepo}`));
      }
      if (pageCodegenOptions.projectName) {
        console.log(chalk.dim(`  项目名称: ${pageCodegenOptions.projectName}`));
      }
      if (pageCodegenOptions.requirements) {
        console.log(chalk.dim(`  需求描述: ${pageCodegenOptions.requirements}`));
      }
    }

    logger.info('开始 Page-Codegen 工作流...');
    progress.update('正在初始化...');

    // 执行 Page-Codegen 工作流
    for await (const event of pageCodegenStream(pageCodegenOptions)) {
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
    progress.succeed(chalk.green('页面代码生成完成!'));
    console.log();
    logger.success(`输出目录: ${chalk.cyan(pageCodegenOptions.outputDir)}`);

    // 显示后续步骤提示
    console.log();
    console.log(chalk.dim('后续步骤:'));
    console.log(chalk.dim(`  cd ${pageCodegenOptions.outputDir}`));
    console.log(chalk.dim('  pnpm install'));
    console.log(chalk.dim('  pnpm dev'));

  } catch (error) {
    progress.fail(chalk.red('页面代码生成失败'));
    logger.error(error);
    process.exit(1);
  }
}
