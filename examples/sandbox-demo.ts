/**
 * 沙箱管理示例
 * 展示如何使用 SandboxManager 进行隔离环境操作
 */

import 'dotenv/config';
import { createSandbox } from '../src/index.js';

async function main() {
  console.log('=== 沙箱管理示例 ===\n');

  // 1. 创建沙箱
  const sandbox = createSandbox({
    // 可选：自定义根目录，默认为 /tmp/x-codegen-sandboxes/<uuid>
    // rootDir: '/tmp/my-custom-sandbox',
    env: {
      NODE_ENV: 'development',
      CUSTOM_VAR: 'test-value',
    },
  });

  console.log('沙箱 ID:', sandbox.getId());
  console.log('沙箱根目录:', sandbox.getRootDir());

  // 2. 初始化沙箱
  console.log('\n初始化沙箱...');
  await sandbox.initialize();
  console.log('沙箱状态:', sandbox.getStatus());

  // 3. 文件操作
  console.log('\n--- 文件操作 ---');

  // 写入文件
  await sandbox.writeFile('src/index.ts', `
// 示例 TypeScript 文件
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`);

  await sandbox.writeFile('package.json', JSON.stringify({
    name: 'sandbox-demo',
    version: '1.0.0',
    type: 'module',
  }, null, 2));

  console.log('文件已写入');

  // 读取文件
  const content = await sandbox.readFile('src/index.ts');
  console.log('读取文件内容:\n', content);

  // 列出目录
  const files = await sandbox.listDir();
  console.log('沙箱目录内容:', files);

  // 检查文件是否存在
  const exists = await sandbox.exists('src/index.ts');
  console.log('src/index.ts 存在:', exists);

  // 4. 命令执行
  console.log('\n--- 命令执行 ---');
  const executor = sandbox.getExecutor();

  // 执行简单命令
  const echoResult = await executor.execute('echo', ['Hello from sandbox!']);
  console.log('Echo 结果:', echoResult.stdout.trim());

  // 检查 Node.js 版本
  const nodeVersion = await executor.getVersion('node');
  console.log('Node.js 版本:', nodeVersion);

  // 检查 pnpm 是否可用
  const pnpmExists = await executor.commandExists('pnpm');
  console.log('pnpm 可用:', pnpmExists);

  // 5. 嵌套目录操作
  console.log('\n--- 嵌套目录操作 ---');
  await sandbox.writeFile('src/utils/helper.ts', `
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
`);

  await sandbox.writeFile('src/components/Button.tsx', `
export const Button = ({ children }: { children: React.ReactNode }) => {
  return <button>{children}</button>;
};
`);

  const allFiles = await sandbox.listDir('', true);
  console.log('所有文件:', allFiles);

  // 6. 清理
  console.log('\n--- 清理沙箱 ---');
  await sandbox.cleanup();
  console.log('沙箱已清理');
}

main().catch(console.error);
