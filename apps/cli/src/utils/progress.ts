/**
 * CLI 进度工具
 * 提供 Spinner 进度指示器功能
 */
import ora, { type Ora } from 'ora';

export interface ProgressIndicator {
  start: (text?: string) => void;
  update: (text: string) => void;
  succeed: (text?: string) => void;
  fail: (text?: string) => void;
  warn: (text?: string) => void;
  info: (text?: string) => void;
  stop: () => void;
  spinner: Ora;
}

/**
 * 创建进度指示器
 * @param initialText 初始文本
 */
export function createProgress(initialText?: string): ProgressIndicator {
  const spinner = ora(initialText).start();

  return {
    start: (text?: string) => {
      if (text) {
        spinner.start(text);
      } else {
        spinner.start();
      }
    },

    update: (text: string) => {
      spinner.text = text;
    },

    succeed: (text?: string) => {
      spinner.succeed(text);
    },

    fail: (text?: string) => {
      spinner.fail(text);
    },

    warn: (text?: string) => {
      spinner.warn(text);
    },

    info: (text?: string) => {
      spinner.info(text);
    },

    stop: () => {
      spinner.stop();
    },

    spinner,
  };
}

/**
 * 步骤进度管理器
 * 管理多个步骤的进度显示
 */
export class StepProgress {
  private steps: string[] = [];
  private currentStep = 0;
  private spinner: Ora;

  constructor(steps: string[]) {
    this.steps = steps;
    this.spinner = ora(steps[0]).start();
  }

  /**
   * 前进到下一步
   */
  next(): void {
    this.currentStep++;
    if (this.currentStep < this.steps.length) {
      this.spinner.text = this.steps[this.currentStep];
    }
  }

  /**
   * 更新当前步骤文本
   */
  update(text: string): void {
    this.spinner.text = text;
  }

  /**
   * 完成所有步骤
   */
  complete(message?: string): void {
    this.spinner.succeed(message);
  }

  /**
   * 失败
   */
  fail(message?: string): void {
    this.spinner.fail(message);
  }

  /**
   * 获取当前步骤索引
   */
  get current(): number {
    return this.currentStep;
  }

  /**
   * 获取总步骤数
   */
  get total(): number {
    return this.steps.length;
  }
}
