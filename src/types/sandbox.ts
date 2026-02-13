/**
 * 沙箱相关类型定义
 */

/**
 * 沙箱配置
 */
export interface SandboxConfig {
  /** 沙箱根目录 */
  rootDir: string;
  /** 是否启用虚拟模式（路径安全限制） */
  virtualMode?: boolean;
  /** 命令执行超时时间（毫秒） */
  timeout?: number;
  /** 环境变量 */
  env?: Record<string, string>;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  /** 是否成功 */
  success: boolean;
  /** 标准输出 */
  stdout: string;
  /** 标准错误 */
  stderr: string;
  /** 退出码 */
  exitCode: number;
  /** 执行时间（毫秒） */
  duration: number;
}

/**
 * Git 克隆选项
 */
export interface GitCloneOptions {
  /** 仓库地址 */
  repoUrl: string;
  /** 目标目录 */
  targetDir: string;
  /** 分支名 */
  branch?: string;
  /** 深度（浅克隆） */
  depth?: number;
  /** 是否使用 SSH */
  useSSH?: boolean;
}

/**
 * Git 克隆结果
 */
export interface GitCloneResult {
  /** 是否成功 */
  success: boolean;
  /** 克隆目录 */
  cloneDir: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 依赖安装选项
 */
export interface InstallDepsOptions {
  /** 项目目录 */
  projectDir: string;
  /** 包管理器 */
  packageManager?: 'npm' | 'pnpm' | 'yarn';
  /** 是否使用冻结锁文件 */
  frozenLockfile?: boolean;
  /** 是否安装开发依赖 */
  includeDevDeps?: boolean;
}

/**
 * 依赖安装结果
 */
export interface InstallDepsResult {
  /** 是否成功 */
  success: boolean;
  /** 安装日志 */
  log: string;
  /** 错误信息 */
  error?: string;
}

/**
 * 文件操作类型
 */
export type FileOperationType = 'read' | 'write' | 'delete' | 'copy' | 'move';

/**
 * 文件操作选项
 */
export interface FileOperationOptions {
  /** 操作类型 */
  operation: FileOperationType;
  /** 源路径 */
  sourcePath?: string;
  /** 目标路径 */
  targetPath?: string;
  /** 文件内容（写入时） */
  content?: string | Buffer;
  /** 编码 */
  encoding?: BufferEncoding;
}

/**
 * 沙箱状态
 */
export interface SandboxStatus {
  /** 沙箱 ID */
  id: string;
  /** 是否已初始化 */
  initialized: boolean;
  /** 根目录 */
  rootDir: string;
  /** 创建时间 */
  createdAt: Date;
  /** 最后活动时间 */
  lastActivityAt: Date;
}

/**
 * 项目验证选项
 */
export interface ProjectValidateOptions {
  /** 项目目录 */
  projectDir: string;
  /** 运行类型检查 */
  typeCheck?: boolean;
  /** 运行 lint */
  lint?: boolean;
  /** 运行测试 */
  test?: boolean;
  /** 构建检查 */
  build?: boolean;
}

/**
 * 项目验证结果
 */
export interface ProjectValidateResult {
  /** 是否通过 */
  passed: boolean;
  /** 类型检查结果 */
  typeCheck?: CommandResult;
  /** Lint 结果 */
  lint?: CommandResult;
  /** 测试结果 */
  test?: CommandResult;
  /** 构建结果 */
  build?: CommandResult;
  /** 综合日志 */
  log: string;
}
