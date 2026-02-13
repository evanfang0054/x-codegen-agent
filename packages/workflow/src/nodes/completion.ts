/**
 * 代码补全节点
 * 负责从知识库获取 PRD 并补全业务逻辑代码
 */

import { HumanMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  createKnowledgeBaseMCPClient,
  type KnowledgeBaseMCPClient,
} from '@x-codegen/tools';
import { createComponentGenerator, type GeneratedComponent } from '@x-codegen/tools';
import { ModelFactory } from '@x-codegen/models';
import type { CodeGenState, PRDAnalysisResult } from '@x-codegen/types';
import { getSandbox } from './init.js';

/**
 * 最大补全循环次数
 */
const MAX_COMPLETION_LOOPS = 3;

/**
 * 代码补全节点
 * 步骤:
 * 1. 连接知识库 MCP 获取 PRD 分析
 * 2. 使用 LLM 补全业务逻辑代码
 * 3. 将补全后的代码写入沙箱
 */
export async function completionNode(state: CodeGenState): Promise<Partial<CodeGenState>> {
  const messages = [];
  const updates: Partial<CodeGenState> = {
    currentStep: 'completion',
    messages: [],
    prdAnalysis: null,
    componentCode: state.componentCode,
    error: null,
    retryCount: state.retryCount ?? 0,
  };

  let knowledgeBaseClient: KnowledgeBaseMCPClient | null = null;

  try {
    // 检查是否超过最大循环次数
    const currentRetry = updates.retryCount ?? 0;
    if (currentRetry >= MAX_COMPLETION_LOOPS) {
      messages.push(new HumanMessage('达到最大补全循环次数，跳过业务补全'));
      updates.currentStep = 'validate';
      updates.messages = messages;
      return updates;
    }

    // 步骤 1: 连接知识库获取 PRD 分析
    messages.push(new HumanMessage('正在从知识库获取 PRD 分析...'));

    knowledgeBaseClient = createKnowledgeBaseMCPClient();
    const prdResult = await knowledgeBaseClient.queryPRD(state.requirements);

    if (!prdResult.success) {
      messages.push(new HumanMessage(`PRD 查询失败: ${prdResult.error}，使用默认分析`));
      updates.prdAnalysis = getEmptyPRDAnalysis();
    } else {
      updates.prdAnalysis = prdResult.data;
      messages.push(
        new HumanMessage(
          `PRD 分析完成: ${prdResult.data.features.length} 个功能需求`
        )
      );
    }

    // 步骤 2: 使用 LLM 补全业务逻辑
    messages.push(new HumanMessage('正在补全业务逻辑代码...'));

    // 将现有代码转换为 GeneratedComponent 格式
    const existingFiles: GeneratedComponent[] = Object.entries(state.componentCode).map(
      ([filePath, content]) => ({
        filename: filePath.split('/').pop() ?? 'unknown.ts',
        path: filePath,
        content,
      })
    );

    if (existingFiles.length === 0) {
      throw new Error('没有可补全的代码文件');
    }

    // 获取模型实例（类型断言为 BaseChatModel）
    const modelInstance = await ModelFactory.getInstance().createFromPreset('deepseek');
    const model = modelInstance as unknown as BaseChatModel;
    const generator = createComponentGenerator(model);

    const completionResult = await generator.completeBusinessLogic(
      existingFiles,
      updates.prdAnalysis!,
      state.requirements
    );

    if (!completionResult.success) {
      throw new Error(`业务逻辑补全失败: ${completionResult.error}`);
    }

    messages.push(
      new HumanMessage(`业务逻辑补全成功: ${completionResult.files.length} 个文件`)
    );

    // 步骤 3: 将补全后的代码写入沙箱
    const sandbox = getSandbox(state.outputDir);
    if (!sandbox) {
      throw new Error('沙箱环境不存在，请先执行初始化');
    }

    const newComponentCode: Record<string, string> = { ...state.componentCode };

    for (const file of completionResult.files) {
      // 确定文件路径
      let filePath = file.path;
      if (!filePath || filePath === '.') {
        // 使用原始文件路径作为基础
        const originalFile = existingFiles[0];
        const dir = originalFile.path.substring(0, originalFile.path.lastIndexOf('/'));
        filePath = `${dir}/${file.filename}`;
      }

      await sandbox.writeFile(filePath, file.content);
      newComponentCode[filePath] = file.content;
    }

    updates.componentCode = newComponentCode;
    updates.retryCount = currentRetry + 1;

    messages.push(new HumanMessage('补全代码已写入沙箱'));

    // 标记业务补全完成，准备进入验证步骤
    updates.currentStep = 'validate';
    updates.messages = messages;

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    messages.push(new HumanMessage(`业务补全失败: ${errorMessage}`));

    // 如果补全失败，仍然尝试进入验证步骤
    return {
      currentStep: 'validate',
      error: `业务补全警告: ${errorMessage}`,
      messages,
      componentCode: state.componentCode,
      retryCount: (state.retryCount ?? 0) + 1,
    };
  } finally {
    // 断开知识库 MCP 连接
    if (knowledgeBaseClient) {
      await knowledgeBaseClient.disconnect();
    }
  }
}

/**
 * 获取空的 PRD 分析结果
 */
function getEmptyPRDAnalysis(): PRDAnalysisResult {
  return {
    features: [],
    dataModels: [],
    apiRequirements: [],
    businessRules: [],
    constraints: [],
  };
}
