/**
 * 代码生成工作流示例
 * 展示如何使用 generateCode 和 generateCodeStream
 */

import 'dotenv/config';
import {
  createModelFromPreset,
  createCodeGenGraph,
  createCodeGenGraphWithoutCheckpointer,
  type CodeGenOptions,
} from '../src/index.js';

async function main() {
  console.log('=== 代码生成工作流示例 ===\n');

  // 配置选项
  const options: CodeGenOptions = {
    figmaUrl: 'https://www.figma.com/file/example/Design-System',
    templateRepo: 'https://github.com/example/react-tailwind-template',
    outputDir: '/tmp/codegen-output',
    requirements: '实现一个用户登录页面，包含用户名、密码输入框和登录按钮',
    maxRetries: 2,
    threadId: 'demo-thread-001',
  };

  // 方式一：使用不带检查点的图（简单场景）
  console.log('--- 方式一：无检查点模式 ---\n');
  const graphWithoutCheckpointer = createCodeGenGraphWithoutCheckpointer();

  console.log('图创建成功');
  console.log('可用节点:', ['init', 'template', 'completion', 'validate']);

  // 方式二：使用带检查点的图（支持暂停/恢复）
  console.log('\n--- 方式二：带检查点模式 ---\n');
  const graph = createCodeGenGraph();

  console.log('图创建成功，支持检查点持久化');

  // 演示状态结构
  console.log('\n初始状态结构:');
  const initialState = {
    figmaUrl: options.figmaUrl,
    templateRepo: options.templateRepo ?? '',
    outputDir: options.outputDir,
    requirements: options.requirements ?? '',
    currentStep: 'init' as const,
    sandboxPath: '',
    projectPath: '',
    generatedFiles: [] as string[],
    messages: [],
    figmaDesignData: null,
    prdAnalysis: null,
    componentCode: {},
    validationPassed: false,
    validationLog: '',
    error: null,
    retryCount: 0,
    maxRetries: options.maxRetries ?? 3,
  };

  console.log(JSON.stringify(initialState, null, 2));

  // 说明：实际运行需要配置 Figma MCP 和知识库 MCP
  console.log('\n--- 运行说明 ---');
  console.log('要实际运行工作流，需要：');
  console.log('1. 配置 FIGMA_ACCESS_TOKEN 环境变量');
  console.log('2. 配置 KNOWLEDGE_BASE_MCP_URL 环境变量');
  console.log('3. 确保模板仓库可访问');
  console.log('4. 安装 pnpm 和 git');

  // 演示如何调用（需要实际环境才能成功执行）
  console.log('\n--- 调用示例代码 ---');
  console.log(`
import { generateCode, generateCodeStream } from 'x-codegen-agent';

// 一次性执行
const result = await generateCode({
  figmaUrl: 'https://www.figma.com/file/xxx/Design',
  templateRepo: 'https://github.com/example/template',
  outputDir: '/path/to/output',
  requirements: '实现用户登录页面',
});

// 流式执行
for await (const event of generateCodeStream(options)) {
  console.log(\`[\${event.step}] \${event.message}\`);

  if (event.data) {
    console.log('附加数据:', event.data);
  }
}
`);
}

main().catch(console.error);
