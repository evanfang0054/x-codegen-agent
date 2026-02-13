/**
 * 初始化节点
 * 负责创建沙箱环境、克隆模板仓库、安装依赖
 */

import { HumanMessage } from '@langchain/core/messages';
import { createSandbox, type SandboxManager } from '@/sandbox/index.js';
import type { CodeGenState } from '@/types/index.js';

// 全局沙箱实例缓存
const sandboxCache = new Map<string, SandboxManager>();

/**
 * 初始化节点
 * 步骤:
 * 1. 创建沙箱环境
 * 2. 克隆模板仓库
 * 3. 安装依赖
 */
export async function initNode(state: CodeGenState): Promise<Partial<CodeGenState>> {
  const messages = [];
  const updates: Partial<CodeGenState> = {
    currentStep: 'init',
    messages: [],
    error: null,
  };

  try {
    // 步骤 1: 创建沙箱
    messages.push(new HumanMessage('正在创建沙箱环境...'));

    let sandbox = sandboxCache.get(state.outputDir);

    if (!sandbox) {
      sandbox = createSandbox({
        env: {
          NODE_ENV: 'development',
        },
      });

      await sandbox.initialize();
      sandboxCache.set(state.outputDir, sandbox);
    }

    updates.sandboxPath = sandbox.getRootDir();
    messages.push(new HumanMessage(`沙箱创建成功: ${sandbox.getRootDir()}`));

    // 步骤 2: 克隆模板仓库
    messages.push(new HumanMessage(`正在克隆模板仓库: ${state.templateRepo}...`));

    const cloneResult = await sandbox.cloneTemplate({
      repoUrl: state.templateRepo,
      depth: 1, // 浅克隆
    });

    if (!cloneResult.success) {
      throw new Error(`克隆模板仓库失败: ${cloneResult.error}`);
    }

    updates.projectPath = cloneResult.cloneDir;
    messages.push(new HumanMessage(`模板克隆成功: ${cloneResult.cloneDir}`));

    // 步骤 3: 安装依赖
    messages.push(new HumanMessage('正在安装项目依赖...'));

    const installResult = await sandbox.installDeps({
      projectDir: cloneResult.cloneDir,
      packageManager: 'pnpm',
      frozenLockfile: true,
    });

    if (!installResult.success) {
      throw new Error(`安装依赖失败: ${installResult.error}`);
    }

    messages.push(new HumanMessage('依赖安装成功'));

    // 标记初始化完成，准备进入模板生成步骤
    updates.currentStep = 'template';
    updates.messages = messages;

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    messages.push(new HumanMessage(`初始化失败: ${errorMessage}`));

    return {
      currentStep: 'error',
      error: errorMessage,
      messages,
    };
  }
}

/**
 * 获取沙箱实例
 */
export function getSandbox(outputDir: string): SandboxManager | undefined {
  return sandboxCache.get(outputDir);
}

/**
 * 清理沙箱
 */
export async function cleanupSandbox(outputDir: string): Promise<void> {
  const sandbox = sandboxCache.get(outputDir);
  if (sandbox) {
    await sandbox.cleanup();
    sandboxCache.delete(outputDir);
  }
}
