/**
 * 模板生成节点
 * 负责从 Figma 获取设计数据并生成静态模板代码
 */

import { HumanMessage } from '@langchain/core/messages';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { createFigmaMCPClient, type FigmaMCPClient } from '@/tools/mcp/index.js';
import { createComponentGenerator } from '@/tools/codegen/index.js';
import { ModelFactory } from '@/models/index.js';
import type { CodeGenState, FigmaDesignData } from '@/types/index.js';
import { getSandbox } from './init.js';

/**
 * 模板生成节点
 * 步骤:
 * 1. 连接 Figma MCP 获取设计数据
 * 2. 使用 LLM 生成静态模板代码
 * 3. 将代码写入沙箱项目
 */
export async function templateNode(state: CodeGenState): Promise<Partial<CodeGenState>> {
  const messages = [];
  const updates: Partial<CodeGenState> = {
    currentStep: 'template',
    messages: [],
    figmaDesignData: null,
    componentCode: {},
    generatedFiles: [],
    error: null,
  };

  let figmaClient: FigmaMCPClient | null = null;

  try {
    // 步骤 1: 获取 Figma 设计数据
    messages.push(new HumanMessage(`正在获取 Figma 设计数据: ${state.figmaUrl}...`));

    figmaClient = createFigmaMCPClient();
    const designResult = await figmaClient.extractDesign({
      fileUrl: state.figmaUrl,
      includeStyles: true,
      includeComponents: true,
    });

    if (!designResult.success || !designResult.data) {
      throw new Error(`获取 Figma 设计数据失败: ${designResult.error}`);
    }

    updates.figmaDesignData = designResult.data;
    messages.push(new HumanMessage(`设计数据获取成功: ${designResult.data.name}`));

    // 步骤 2: 使用 LLM 生成静态模板代码
    messages.push(new HumanMessage('正在生成静态模板代码...'));

    // 获取模型实例（类型断言为 BaseChatModel）
    const modelInstance = await ModelFactory.getInstance().createFromPreset('deepseek');
    const model = modelInstance as unknown as BaseChatModel;
    const generator = createComponentGenerator(model);

    // 提取组件名称
    const componentName = extractComponentName(state.figmaUrl, designResult.data);

    const generateResult = await generator.generateStaticTemplate({
      componentName,
      designData: designResult.data,
      framework: 'react',
      styling: 'tailwind',
      typescript: true,
    });

    if (!generateResult.success) {
      throw new Error(`生成静态模板失败: ${generateResult.error}`);
    }

    messages.push(new HumanMessage(`模板生成成功: ${generateResult.files.length} 个文件`));

    // 步骤 3: 将代码写入沙箱
    const sandbox = getSandbox(state.outputDir);
    if (!sandbox) {
      throw new Error('沙箱环境不存在，请先执行初始化');
    }

    const componentCode: Record<string, string> = {};
    const generatedFiles: string[] = [];

    for (const file of generateResult.files) {
      const filePath = `src/components/${componentName}/${file.filename}`;
      await sandbox.writeFile(filePath, file.content);

      componentCode[filePath] = file.content;
      generatedFiles.push(filePath);
    }

    updates.componentCode = componentCode;
    updates.generatedFiles = generatedFiles;

    messages.push(new HumanMessage(`代码已写入沙箱: ${generatedFiles.length} 个文件`));

    // 标记模板生成完成，准备进入业务补全步骤
    updates.currentStep = 'completion';
    updates.messages = messages;

    return updates;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    messages.push(new HumanMessage(`模板生成失败: ${errorMessage}`));

    return {
      currentStep: 'error',
      error: errorMessage,
      messages,
    };
  } finally {
    // 断开 Figma MCP 连接
    if (figmaClient) {
      await figmaClient.disconnect();
    }
  }
}

/**
 * 从 Figma URL 或设计数据中提取组件名称
 */
function extractComponentName(figmaUrl: string, designData: FigmaDesignData): string {
  // 优先使用设计名称
  if (designData.name) {
    return toPascalCase(designData.name);
  }

  // 尝试从 URL 提取
  const urlMatch = figmaUrl.match(/\/file\/[^/]+\/([^?]+)/);
  if (urlMatch?.[1]) {
    return toPascalCase(decodeURIComponent(urlMatch[1]));
  }

  // 默认名称
  return 'GeneratedComponent';
}

/**
 * 转换为 PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}
