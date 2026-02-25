/**
 * Page-Codegen 初始化节点
 * 步骤0：创建沙箱、克隆模板仓库、安装依赖、创建 AI 工作副本
 */

import { HumanMessage } from '@langchain/core/messages';
import type { PageCodegenState } from '@x-codegen/types';
import {
  type TaskPlan,
  type ResearchNotes,
  type OriginalFileInfo,
  type AIWorkFileInfo,
} from '@x-codegen/types';
import { createOneDayMCPClient } from '@x-codegen/tools';
import { createSandbox, type SandboxManager } from '@x-codegen/sandbox';

/**
 * 默认模板仓库
 */
const DEFAULT_TEMPLATE_REPO =
  process.env.DEFAULT_TEMPLATE_REPO ?? 'https://github.com/example/react-tailwind-template';

// 全局沙箱实例缓存
const sandboxCache = new Map<string, SandboxManager>();

/**
 * 初始化节点
 * 执行步骤0的初始化工作：
 * 1. 创建沙箱环境
 * 2. 克隆模板仓库
 * 3. 安装依赖
 * 4. 创建任务计划和研究笔记
 * 5. 创建 AI 工作副本
 */
export async function initNode(
  state: PageCodegenState
): Promise<Partial<PageCodegenState>> {
  const updates: Partial<PageCodegenState> = {};

  try {
    // 1. 确定目标目录和模板仓库
    const targetDir = state.outputDir;
    const templateRepo = state.templateRepo || DEFAULT_TEMPLATE_REPO;

    // 2. 创建沙箱环境
    let sandbox = sandboxCache.get(targetDir);

    if (!sandbox) {
      sandbox = createSandbox({
        env: {
          NODE_ENV: 'development',
        },
      });

      await sandbox.initialize();
      sandboxCache.set(targetDir, sandbox);
    }

    const sandboxPath = sandbox.getRootDir();

    // 3. 克隆模板仓库
    const cloneResult = await sandbox.cloneTemplate({
      repoUrl: templateRepo,
      depth: 1, // 浅克隆
    });

    if (!cloneResult.success) {
      throw new Error(`克隆模板仓库失败: ${cloneResult.error}`);
    }

    const projectPath = cloneResult.cloneDir;

    // 4. 安装依赖
    const installResult = await sandbox.installDeps({
      projectDir: projectPath,
      packageManager: 'pnpm',
      frozenLockfile: true,
    });

    if (!installResult.success) {
      throw new Error(`安装依赖失败: ${installResult.error}`);
    }

    // 5. 初始化任务计划
    const taskPlan: TaskPlan = {
      pageName: extractPageName(state.requirements),
      goal: state.requirements,
      originalFiles: [],
      aiWorkFiles: [],
      auxiliaryFiles: {
        taskPlan: `${targetDir}/task_plan.md`,
        researchNotes: `${targetDir}/research_notes.md`,
        finalCode: `${targetDir}/final_code.md`,
      },
      stages: [
        { id: 'stage-1', name: '理解需求与代码分析', description: 'PRD查询、静态代码分析、技术规范阅读', completed: false, stepFile: 'step1.md' },
        { id: 'stage-2', name: '接口与数据逻辑设计', description: 'API文档查询、数据逻辑设计', completed: false, stepFile: 'step2.md' },
        { id: 'stage-3', name: 'UI组件与交互逻辑设计', description: '组件API查询、交互逻辑设计', completed: false, stepFile: 'step3.md' },
        { id: 'stage-4', name: '代码整合与PRD验收', description: '补全代码、PRD验收', completed: false, stepFile: 'step4.md' },
        { id: 'stage-5', name: '代码质量验证', description: 'pnpm check、生成final_code.md', completed: false, stepFile: 'step5.md' },
        { id: 'stage-6', name: '任务完成交付', description: '告知用户、上报one-day-mcp', completed: false, stepFile: 'step6.md' },
      ],
      keyQuestions: [],
      decisions: [],
      errors: [],
      currentStatus: '初始化完成，准备进入步骤1',
      currentStep: 'research',
    };

    // 6. 初始化研究笔记
    const researchNotes: ResearchNotes = {
      pageName: taskPlan.pageName,
      apiDocuments: [],
      componentDocuments: [],
      userClarifications: [],
      prdBreakdown: {
        coreObjective: '',
        gherkinScenarios: '',
        featureChecklist: [],
        edgeCases: [],
      },
      codeSnippets: [],
      codingStandards: {},
      findings: {
        dependencyFiles: [],
      },
      notes: [],
    };

    // 7. 尝试从 One-day MCP 获取静态模板（如果配置了）
    let originalFiles: OriginalFileInfo[] = [];
    let aiWorkFiles: AIWorkFileInfo[] = [];

    if (state.mcpServers?.oneDay) {
      try {
        const oneDayClient = createOneDayMCPClient(state.mcpServers.oneDay);
        const templateResult = await oneDayClient.getStaticTemplate({
          figmaUrl: state.figmaUrl,
          outputPath: targetDir,
        });

        if (templateResult.success && templateResult.data?.filePath) {
          // 记录原始文件
          originalFiles.push({
            absolutePath: templateResult.data.filePath,
            relativePath: getRelativePath(templateResult.data.filePath, projectPath),
            fileName: getFileName(templateResult.data.filePath),
          });

          // 创建 AI 工作副本路径
          const aiWorkPath = templateResult.data.filePath.replace(/\.tsx?$/, '.ai.tsx');
          aiWorkFiles.push({
            absolutePath: aiWorkPath,
            relativePath: getRelativePath(aiWorkPath, projectPath),
            fileName: getFileName(aiWorkPath),
            originalFilePath: templateResult.data.filePath,
            completed: false,
          });
        }
      } catch (error) {
        // MCP 调用失败，记录错误但继续
        const errorMessage = error instanceof Error ? error.message : String(error);
        taskPlan.errors.push({
          stage: 'init',
          error: `获取静态模板失败: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 8. 更新任务计划中的文件列表
    taskPlan.originalFiles = originalFiles;
    taskPlan.aiWorkFiles = aiWorkFiles;

    // 9. 记录决策
    taskPlan.decisions.push({
      decision: '完成初始化',
      reason: `克隆模板仓库: ${templateRepo}`,
      timestamp: new Date().toISOString(),
    });

    // 10. 更新状态
    updates.currentStep = 'research';
    updates.sandboxPath = sandboxPath;
    updates.projectPath = projectPath;
    updates.templateRepo = templateRepo;
    updates.taskPlan = taskPlan;
    updates.researchNotes = researchNotes;
    updates.originalFiles = originalFiles;
    updates.aiWorkFiles = aiWorkFiles;
    updates.messages = [
      new HumanMessage(`✅ 初始化完成

### 环境准备
- 沙箱路径: ${sandboxPath}
- 项目路径: ${projectPath}
- 模板仓库: ${templateRepo}
- 依赖安装: 完成

### 文件状态
- 原始文件: ${originalFiles.length} 个
- AI 副本: ${aiWorkFiles.length} 个

现在自动进入步骤1：需求与代码研究`),
    ];

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      currentStep: 'error',
      error: `初始化失败: ${errorMessage}`,
      messages: [new HumanMessage(`❌ 初始化失败: ${errorMessage}`)],
    };
  }
}

/**
 * 从需求描述中提取页面名称
 */
function extractPageName(requirements: string): string {
  // 尝试从需求中提取页面名称
  const pageMatch = requirements.match(/(?:页面|page)\s*[：:]\s*(\S+)/i);
  if (pageMatch?.[1]) {
    return pageMatch[1];
  }

  // 使用需求的前 20 个字符作为名称
  return requirements.slice(0, 20).trim() || '未命名页面';
}

/**
 * 获取相对路径
 */
function getRelativePath(absolutePath: string, projectPath: string): string {
  if (!projectPath) return absolutePath;
  return absolutePath.replace(projectPath, '').replace(/^\//, '');
}

/**
 * 获取文件名
 */
function getFileName(absolutePath: string): string {
  const parts = absolutePath.split('/');
  return parts[parts.length - 1] ?? absolutePath;
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

export default initNode;
