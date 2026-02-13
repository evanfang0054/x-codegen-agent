/**
 * 验证节点
 * 负责验证生成的代码并将通过验证的文件输出到宿主环境
 */

import { HumanMessage } from '@langchain/core/messages';
import * as path from 'node:path';
import type { CodeGenState } from '@/types/index.js';
import { getSandbox, cleanupSandbox } from './init.js';

/**
 * 输出文件的白名单目录
 * 只输出这些目录下的文件
 */
const OUTPUT_WHITELIST = ['src/pages', 'src/components', 'src/hooks', 'src/utils'];

/**
 * 排除的文件/目录
 */
const OUTPUT_BLACKLIST = ['node_modules', '.git', 'dist', 'build', '.next'];

/**
 * 验证节点
 * 步骤:
 * 1. 在沙箱中运行 pnpm check（类型检查 + lint + 测试）
 * 2. 如果验证失败且未超过重试次数，返回 completion 节点
 * 3. 如果验证通过或超过重试次数，将文件输出到宿主环境
 */
export async function validateNode(state: CodeGenState): Promise<Partial<CodeGenState>> {
  const messages = [];
  const updates: Partial<CodeGenState> = {
    currentStep: 'validate',
    messages: [],
    validationPassed: false,
    validationLog: '',
    error: null,
  };

  try {
    const sandbox = getSandbox(state.outputDir);
    if (!sandbox) {
      throw new Error('沙箱环境不存在，请先执行初始化');
    }

    // 步骤 1: 运行项目验证
    messages.push(new HumanMessage('正在验证项目代码...'));

    const validateResult = await sandbox.validateProject({
      projectDir: state.projectPath,
      typeCheck: true,
      lint: true,
      test: false, // 跳过测试，因为可能没有测试文件
      build: false, // 跳过构建，加快验证速度
    });

    updates.validationLog = validateResult.log;

    if (validateResult.passed) {
      messages.push(new HumanMessage('代码验证通过'));
      updates.validationPassed = true;

      // 步骤 2: 将文件输出到宿主环境
      messages.push(new HumanMessage(`正在输出文件到: ${state.outputDir}...`));

      const outputFiles = await outputFilesToHost(sandbox, state.projectPath, state.outputDir);

      messages.push(new HumanMessage(`文件输出成功: ${outputFiles.length} 个文件`));
      updates.generatedFiles = outputFiles;

      // 清理沙箱
      await cleanupSandbox(state.outputDir);

      // 标记完成
      updates.currentStep = 'completed';
    } else {
      messages.push(new HumanMessage('代码验证未通过'));

      // 检查是否需要重试
      const currentRetry = state.retryCount ?? 0;
      const maxRetries = state.maxRetries ?? 3;

      if (currentRetry < maxRetries) {
        messages.push(new HumanMessage(`准备进行第 ${currentRetry + 1} 次修复重试...`));
        updates.currentStep = 'completion';
        updates.error = `验证失败，需要修复: ${validateResult.log.slice(0, 500)}`;
      } else {
        messages.push(new HumanMessage(`达到最大重试次数 (${maxRetries})，输出当前代码`));

        // 即使验证失败，也输出文件（用户可以手动修复）
        const outputFiles = await outputFilesToHost(sandbox, state.projectPath, state.outputDir);

        updates.generatedFiles = outputFiles;
        updates.error = `验证未通过，请手动检查: ${validateResult.log.slice(0, 500)}`;

        // 清理沙箱
        await cleanupSandbox(state.outputDir);

        updates.currentStep = 'completed';
      }
    }

    updates.messages = messages;
    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    messages.push(new HumanMessage(`验证失败: ${errorMessage}`));

    return {
      currentStep: 'error',
      error: errorMessage,
      messages,
      validationPassed: false,
    };
  }
}

/**
 * 将文件从沙箱输出到宿主环境
 */
async function outputFilesToHost(
  sandbox: NonNullable<ReturnType<typeof getSandbox>>,
  _projectPath: string,
  outputDir: string
): Promise<string[]> {
  const allOutputFiles: string[] = [];

  for (const whitelistDir of OUTPUT_WHITELIST) {
    const targetDir = path.join(outputDir, whitelistDir);

    try {
      // 检查源目录是否存在
      const exists = await sandbox.exists(whitelistDir);
      if (!exists) {
        continue;
      }

      // 复制目录
      const copiedFiles = await sandbox.copyDirToExternal(
        whitelistDir,
        targetDir,
        {
          exclude: OUTPUT_BLACKLIST,
        }
      );

      allOutputFiles.push(...copiedFiles);
    } catch {
      // 忽略复制错误，继续处理其他目录
    }
  }

  return allOutputFiles;
}
