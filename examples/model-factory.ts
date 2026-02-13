/**
 * 模型管理示例
 * 展示如何使用 ModelFactory 创建和管理 LLM 模型实例
 */

import 'dotenv/config';
import {
  createModel,
  createModelFromPreset,
  ModelFactory,
  getAllProviders,
  getProviderPreset,
  isOpenAICompatible,
} from '../src/index.js';

async function main() {
  console.log('=== 模型管理示例 ===\n');

  // 1. 查看所有支持的提供商
  console.log('--- 支持的提供商 ---');
  const providers = getAllProviders();
  console.log('提供商列表:', providers);

  // 2. 查看提供商预设配置
  console.log('\n--- 提供商预设配置 ---');
  for (const provider of ['openai', 'anthropic', 'deepseek', 'qwen', 'zhipu']) {
    const preset = getProviderPreset(provider);
    if (preset) {
      console.log(`${provider}:`);
      console.log(`  - 模型: ${preset.model}`);
      console.log(`  - OpenAI 兼容: ${isOpenAICompatible(provider)}`);
      console.log(`  - 环境变量: ${preset.envKey}`);
    }
  }

  // 3. 方式一：直接创建模型
  console.log('\n--- 方式一：直接创建模型 ---');
  try {
    const model1 = await createModel({
      provider: 'deepseek',
      model: 'deepseek-chat',
      apiKey: process.env.DEEPSEEK_API_KEY,
      temperature: 0.7,
    });
    console.log('模型创建成功:', model1.constructor.name);
  } catch (error) {
    console.log('创建失败（可能未配置 API Key）:', error instanceof Error ? error.message : error);
  }

  // 4. 方式二：从预设创建（自动读取环境变量）
  console.log('\n--- 方式二：从预设创建 ---');
  const presetOrder = ['deepseek', 'qwen', 'zhipu', 'openai', 'anthropic'];

  let createdModel = null;
  for (const preset of presetOrder) {
    try {
      createdModel = await createModelFromPreset(preset);
      console.log(`使用预设 "${preset}" 创建模型成功`);
      break;
    } catch {
      // 继续尝试下一个预设
    }
  }

  if (!createdModel) {
    console.log('未能创建模型，请配置至少一个提供商的 API Key');
    return;
  }

  // 5. 方式三：使用 ModelFactory 缓存模式
  console.log('\n--- 方式三：ModelFactory 缓存模式 ---');
  const factory = ModelFactory.getInstance();

  // 首次创建
  const cachedModel1 = await factory.getOrCreate('my-deepseek', {
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  console.log('首次创建模型');

  // 再次获取（返回缓存实例）
  const cachedModel2 = await factory.getOrCreate('my-deepseek', {
    provider: 'deepseek',
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });
  console.log('再次获取模型（使用缓存）');

  // 6. 测试模型调用
  console.log('\n--- 测试模型调用 ---');
  try {
    const response = await createdModel.invoke('请用一句话介绍 TypeScript');
    console.log('模型响应:', response.content);
  } catch (error) {
    console.log('调用失败:', error instanceof Error ? error.message : error);
  }

  // 7. 查看缓存状态
  console.log('\n--- 缓存状态 ---');
  console.log('已缓存的模型数量:', factory.getCacheSize());
}

main().catch(console.error);
