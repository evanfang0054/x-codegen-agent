/**
 * 沙箱管理器
 * 负责沙箱的创建、生命周期管理和清理
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import simpleGit, { type SimpleGit } from 'simple-git';
import { nanoid } from 'nanoid';
import { CommandExecutor, createExecutor } from './executor.js';
import type {
  SandboxConfig,
  SandboxStatus,
  GitCloneOptions,
  GitCloneResult,
  InstallDepsOptions,
  InstallDepsResult,
  ProjectValidateOptions,
  ProjectValidateResult,
  CommandResult,
} from '@x-codegen/types';

/**
 * 默认沙箱根目录
 */
const DEFAULT_SANDBOX_ROOT = path.join(os.tmpdir(), 'x-codegen-sandboxes');

/**
 * 默认模板仓库
 */
const DEFAULT_TEMPLATE_REPO = 'https://github.com/example/react-tailwind-template';

/**
 * 沙箱管理器
 */
export class SandboxManager {
  private id: string;
  private config: SandboxConfig;
  private executor: CommandExecutor;
  private status: SandboxStatus;
  private git: SimpleGit | null = null;

  constructor(config?: Partial<SandboxConfig>) {
    this.id = nanoid(12);

    const rootDir = config?.rootDir ?? path.join(DEFAULT_SANDBOX_ROOT, this.id);

    this.config = {
      rootDir,
      virtualMode: config?.virtualMode ?? true,
      timeout: config?.timeout,
      env: config?.env,
    };

    this.executor = createExecutor(this.config);

    this.status = {
      id: this.id,
      initialized: false,
      rootDir,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };
  }

  /**
   * 获取沙箱 ID
   */
  getId(): string {
    return this.id;
  }

  /**
   * 获取沙箱根目录
   */
  getRootDir(): string {
    return this.config.rootDir;
  }

  /**
   * 获取沙箱状态
   */
  getStatus(): SandboxStatus {
    return { ...this.status };
  }

  /**
   * 获取命令执行器
   */
  getExecutor(): CommandExecutor {
    this.status.lastActivityAt = new Date();
    return this.executor;
  }

  /**
   * 初始化沙箱
   * 创建目录结构
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.config.rootDir, { recursive: true });
    this.status.initialized = true;
    this.status.lastActivityAt = new Date();
  }

  /**
   * 克隆模板仓库
   */
  async cloneTemplate(options?: Partial<GitCloneOptions>): Promise<GitCloneResult> {
    const repoUrl = options?.repoUrl ?? DEFAULT_TEMPLATE_REPO;
    const targetDir = options?.targetDir ?? path.join(this.config.rootDir, 'project');

    try {
      this.git = simpleGit();

      const cloneArgs: string[] = [];
      if (options?.branch) {
        cloneArgs.push('--branch', options.branch);
      }
      if (options?.depth) {
        cloneArgs.push('--depth', String(options.depth));
      }

      await this.git.clone(repoUrl, targetDir, cloneArgs);

      // 更新 git 实例指向克隆的目录
      this.git = simpleGit(targetDir);

      this.status.lastActivityAt = new Date();

      return {
        success: true,
        cloneDir: targetDir,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        cloneDir: targetDir,
        error: errorMessage,
      };
    }
  }

  /**
   * 安装依赖
   */
  async installDeps(options?: Partial<InstallDepsOptions>): Promise<InstallDepsResult> {
    const projectDir = options?.projectDir ?? path.join(this.config.rootDir, 'project');
    const packageManager = options?.packageManager ?? 'pnpm';

    const args = ['install'];
    if (options?.frozenLockfile) {
      if (packageManager === 'pnpm') {
        args.push('--frozen-lockfile');
      } else if (packageManager === 'npm') {
        args.push('--ci');
      }
    }

    const result = await this.executor.execute(packageManager, args, {
      cwd: projectDir,
      timeout: 10 * 60 * 1000, // 10 分钟超时
    });

    this.status.lastActivityAt = new Date();

    return {
      success: result.success,
      log: result.stdout + '\n' + result.stderr,
      error: result.success ? undefined : result.stderr,
    };
  }

  /**
   * 验证项目
   */
  async validateProject(options?: Partial<ProjectValidateOptions>): Promise<ProjectValidateResult> {
    const projectDir = options?.projectDir ?? path.join(this.config.rootDir, 'project');
    const log: string[] = [];

    const result: ProjectValidateResult = {
      passed: true,
      log: '',
    };

    // 类型检查
    if (options?.typeCheck !== false) {
      const typeResult = await this.executor.execute('pnpm', ['typecheck'], {
        cwd: projectDir,
      });
      result.typeCheck = typeResult;
      log.push(`[TypeCheck]\n${typeResult.stdout}\n${typeResult.stderr}`);
      if (!typeResult.success) {
        result.passed = false;
      }
    }

    // Lint 检查
    if (options?.lint !== false) {
      const lintResult = await this.executor.execute('pnpm', ['lint'], {
        cwd: projectDir,
      });
      result.lint = lintResult;
      log.push(`[Lint]\n${lintResult.stdout}\n${lintResult.stderr}`);
      if (!lintResult.success) {
        result.passed = false;
      }
    }

    // 测试
    if (options?.test !== false) {
      const testResult = await this.executor.execute('pnpm', ['test', '--', '--run'], {
        cwd: projectDir,
        timeout: 5 * 60 * 1000, // 5 分钟超时
      });
      result.test = testResult;
      log.push(`[Test]\n${testResult.stdout}\n${testResult.stderr}`);
      if (!testResult.success) {
        result.passed = false;
      }
    }

    // 构建
    if (options?.build) {
      const buildResult = await this.executor.execute('pnpm', ['build'], {
        cwd: projectDir,
        timeout: 10 * 60 * 1000, // 10 分钟超时
      });
      result.build = buildResult;
      log.push(`[Build]\n${buildResult.stdout}\n${buildResult.stderr}`);
      if (!buildResult.success) {
        result.passed = false;
      }
    }

    result.log = log.join('\n\n---\n\n');
    this.status.lastActivityAt = new Date();

    return result;
  }

  /**
   * 读取文件
   */
  async readFile(relativePath: string): Promise<string> {
    const filePath = path.join(this.config.rootDir, relativePath);
    return fs.readFile(filePath, 'utf-8');
  }

  /**
   * 写入文件
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    const filePath = path.join(this.config.rootDir, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
    this.status.lastActivityAt = new Date();
  }

  /**
   * 删除文件
   */
  async deleteFile(relativePath: string): Promise<void> {
    const filePath = path.join(this.config.rootDir, relativePath);
    await fs.unlink(filePath).catch(() => {
      // 忽略文件不存在的错误
    });
    this.status.lastActivityAt = new Date();
  }

  /**
   * 列出目录内容
   */
  async listDir(relativePath: string = ''): Promise<string[]> {
    const dirPath = path.join(this.config.rootDir, relativePath);
    return fs.readdir(dirPath);
  }

  /**
   * 检查文件/目录是否存在
   */
  async exists(relativePath: string): Promise<boolean> {
    const filePath = path.join(this.config.rootDir, relativePath);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 复制文件到外部目录
   */
  async copyToExternal(sourceRelativePath: string, targetAbsolutePath: string): Promise<void> {
    const sourcePath = path.join(this.config.rootDir, sourceRelativePath);
    await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });
    await fs.copyFile(sourcePath, targetAbsolutePath);
    this.status.lastActivityAt = new Date();
  }

  /**
   * 复制目录到外部
   */
  async copyDirToExternal(
    sourceRelativePath: string,
    targetAbsolutePath: string,
    options?: {
      exclude?: string[];
    }
  ): Promise<string[]> {
    const sourcePath = path.join(this.config.rootDir, sourceRelativePath);
    const copiedFiles: string[] = [];
    const exclude = options?.exclude ?? [];

    const copyRecursive = async (src: string, dest: string): Promise<void> => {
      const entries = await fs.readdir(src, { withFileTypes: true });
      await fs.mkdir(dest, { recursive: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        const relativePath = path.relative(sourcePath, srcPath);

        // 检查排除规则
        if (exclude.some((pattern) => relativePath.includes(pattern))) {
          continue;
        }

        if (entry.isDirectory()) {
          await copyRecursive(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
          copiedFiles.push(path.relative(targetAbsolutePath, destPath));
        }
      }
    };

    await copyRecursive(sourcePath, targetAbsolutePath);
    this.status.lastActivityAt = new Date();

    return copiedFiles;
  }

  /**
   * 执行自定义命令
   */
  async executeCommand(
    command: string,
    args: string[] = [],
    options?: {
      cwd?: string;
      timeout?: number;
      env?: Record<string, string>;
    }
  ): Promise<CommandResult> {
    return this.executor.execute(command, args, {
      cwd: options?.cwd ? path.join(this.config.rootDir, options.cwd) : undefined,
      timeout: options?.timeout,
      env: options?.env,
    });
  }

  /**
   * 清理沙箱
   * 删除所有文件
   */
  async cleanup(): Promise<void> {
    try {
      await fs.rm(this.config.rootDir, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
    this.status.initialized = false;
  }
}

/**
 * 创建沙箱管理器
 */
export function createSandbox(config?: Partial<SandboxConfig>): SandboxManager {
  return new SandboxManager(config);
}
