/**
 * CLI 日志工具
 * 提供彩色日志输出功能
 */
import chalk from 'chalk';

export interface Logger {
  info: (message: string) => void;
  success: (message: string) => void;
  warn: (message: string) => void;
  error: (message: unknown) => void;
  debug: (message: string) => void;
  dim: (message: string) => void;
}

/**
 * 创建日志记录器
 * @param verbose 是否启用详细日志
 */
export function createLogger(verbose: boolean = false): Logger {
  return {
    info: (message: string) => {
      console.log(chalk.blue('ℹ'), message);
    },

    success: (message: string) => {
      console.log(chalk.green('✔'), message);
    },

    warn: (message: string) => {
      console.log(chalk.yellow('⚠'), message);
    },

    error: (error: unknown) => {
      if (error instanceof Error) {
        console.error(chalk.red('✖'), chalk.red(error.message));
        if (verbose && error.stack) {
          console.error(chalk.dim(error.stack));
        }
      } else {
        console.error(chalk.red('✖'), chalk.red(String(error)));
      }
    },

    debug: (message: string) => {
      if (verbose) {
        console.log(chalk.gray('debug:'), chalk.gray(message));
      }
    },

    dim: (message: string) => {
      console.log(chalk.dim(message));
    },
  };
}

// 默认日志实例
export const logger = createLogger();
