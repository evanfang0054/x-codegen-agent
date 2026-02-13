/**
 * 基础 Agent 使用示例
 * 展示如何创建和使用 BaseAgent
 */

import 'dotenv/config';
import { createModelFromPreset, createBaseAgent, createToolAgent } from '../src/index.js';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

async function main() {
  // 1. 创建模型（从预设创建，自动读取环境变量）
  const model = await createModelFromPreset('deepseek');
  console.log('模型创建成功\n');

  // 2. 创建基础 Agent
  const baseAgent = createBaseAgent({
    name: 'assistant',
    model,
    systemPrompt: '你是一个有帮助的编程助手。请用简洁的中文回答问题。',
    temperature: 0.7,
  });

  console.log('=== 基础 Agent 测试 ===');
  const result = await baseAgent.execute({
    input: '请用 TypeScript 写一个简单的防抖函数',
  });
  console.log('回答:', result.content);
  console.log('\n---\n');

  // 3. 创建工具调用 Agent
  console.log('=== 工具调用 Agent 测试 ===');

  // 定义天气查询工具
  const weatherTool = new DynamicStructuredTool({
    name: 'get_weather',
    description: '获取指定城市的当前天气信息',
    schema: z.object({
      city: z.string().describe('城市名称，如：北京、上海'),
    }),
    func: async ({ city }) => {
      // 模拟天气数据
      const weatherData: Record<string, string> = {
        北京: '晴天，温度 15°C，空气质量良好',
        上海: '多云，温度 18°C，有轻微雾霾',
        广州: '小雨，温度 22°C，湿度较高',
        深圳: '阴天，温度 23°C，适合外出',
      };
      return weatherData[city] ?? `未找到 ${city} 的天气数据`;
    },
  });

  // 定义计算器工具
  const calculatorTool = new DynamicStructuredTool({
    name: 'calculator',
    description: '执行基本的数学计算',
    schema: z.object({
      expression: z.string().describe('数学表达式，如：2+3*4'),
    }),
    func: async ({ expression }) => {
      try {
        // 简单的安全计算（仅支持数字和基本运算符）
        const sanitized = expression.replace(/[^0-9+\-*/().]/g, '');
        const result = Function(`"use strict"; return (${sanitized})`)();
        return `计算结果: ${expression} = ${result}`;
      } catch {
        return '计算错误：无效的表达式';
      }
    },
  });

  const toolAgent = createToolAgent({
    name: 'multi-tool-agent',
    model,
    tools: [weatherTool, calculatorTool],
    systemPrompt: `你是一个智能助手，可以使用工具来帮助用户。
当用户询问天气时，使用 get_weather 工具。
当用户需要计算时，使用 calculator 工具。
如果不需要工具，直接回答问题。`,
    maxIterations: 5,
  });

  // 测试工具调用
  const toolResult = await toolAgent.execute({
    input: '北京和上海今天的天气怎么样？另外帮我算一下 15 * 8 + 20 等于多少',
  });

  console.log('回答:', toolResult.content);
  console.log('是否使用了工具:', toolResult.usedTools);

  if (toolResult.toolCalls) {
    console.log('\n工具调用记录:');
    for (const call of toolResult.toolCalls) {
      console.log(`  - ${call.name}(${JSON.stringify(call.args)}) => ${JSON.stringify(call.result)}`);
    }
  }

  // 4. 流式输出示例
  console.log('\n=== 流式输出测试 ===');
  console.log('回答: ');

  for await (const event of baseAgent.stream({
    input: '请简单介绍一下 TypeScript 的泛型',
  })) {
    if (event.type === 'token') {
      process.stdout.write(event.content);
    } else if (event.type === 'complete') {
      console.log('\n[完成]');
    }
  }
}

main().catch(console.error);
