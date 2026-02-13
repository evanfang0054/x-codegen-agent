/**
 * 沙箱命令执行器
 * 在沙箱环境中执行 shell 命令
 */

import { spawn } from 'node:child_process';
import type { CommandResult, SandboxConfig } from '@x-codegen/types';

/**
 * 默认命令超时时间（5分钟）
 */
const DEFAULT_TIMEOUT = 5 * 60 * 1000;

/**
 * 命令执行器
 */
export class CommandExecutor {
  private config: SandboxConfig;

  constructor(config: SandboxConfig) {
    this.config = config;
  }

  /**
   * 执行命令
   * @param command 命令
   * @param args 参数
   * @param options 选项
   */
  async execute(
    command: string,
    args: string[] = [],
    options: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    } = {}
  ): Promise<CommandResult> {
    const startTime = Date.now();
    const timeout = options.timeout ?? this.config.timeout ?? DEFAULT_TIMEOUT;

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      // 合并环境变量
      const env = {
        ...process.env,
        ...this.config.env,
        ...options.env,
      };

      const child = spawn(command, args, {
        cwd: options.cwd ?? this.config.rootDir,
        env,
        shell: true,
      });

      // 设置超时
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        stderr += '\nCommand timed out';
      }, timeout);

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        resolve({
          success: code === 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: code ?? 1,
          duration,
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        const duration = Date.now() - startTime;

        resolve({
          success: false,
          stdout: stdout.trim(),
          stderr: `${stderr}\n${error.message}`.trim(),
          exitCode: 1,
          duration,
        });
      });
    });
  }

  /**
   * 执行 pnpm 命令
   */
  async pnpm(
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
    } = {}
  ): Promise<CommandResult> {
    return this.execute('pnpm', args, options);
  }

  /**
   * 执行 npm 命令
   */
  async npm(
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
    } = {}
  ): Promise<CommandResult> {
    return this.execute('npm', args, options);
  }

  /**
   * 执行 npx 命令
   */
  async npx(
    args: string[],
    options: {
      cwd?: string;
      timeout?: number;
    } = {}
  ): Promise<CommandResult> {
    return this.execute('npx', args, options);
  }

  /**
   * 检查命令是否存在
   */
  async commandExists(command: string): Promise<boolean> {
    const result = await this.execute('which', [command]);
    return result.success && result.stdout.length > 0;
  }

  /**
   * 获取命令版本
   */
  async getVersion(command: string): Promise<string | null> {
    const result = await this.execute(command, ['--version']);
    if (result.success) {
      return result.stdout.trim();
    }
    return null;
  }
}

/**
 * 创建命令执行器
 */
export function createExecutor(config: SandboxConfig): CommandExecutor {
  return new CommandExecutor(config);
}
