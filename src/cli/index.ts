/**
 * X-CodeGen-Agent CLI 入口
 * 基于 LangChain 的前端代码生成命令行工具
 */
import { Command } from 'commander';
import { generateCommand } from './commands/generate.js';

// 读取 package.json 版本
const version = '1.0.0';

const program = new Command();

program
  .name('x-codegen')
  .description('基于 LangChain 的前端代码生成 CLI 工具')
  .version(version);

program
  .command('generate')
  .description('从 Figma 设计生成前端代码')
  .requiredOption('-f, --figma <url>', 'Figma 设计链接')
  .requiredOption('-o, --output <dir>', '输出目录')
  .option('-t, --template <repo>', '模板仓库 URL')
  .option('-r, --requirements <text>', '需求描述')
  .option('--max-retries <n>', '最大重试次数', '3')
  .option('--provider <name>', 'LLM 提供商')
  .option('--model <name>', '模型名称')
  .option('-v, --verbose', '详细日志', false)
  .action(generateCommand);

// 解析命令行参数
program.parse(process.argv);
