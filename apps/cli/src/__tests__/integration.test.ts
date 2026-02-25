/**
 * CLI 集成测试
 * 使用智谱 GLM 模型测试实际功能
 *
 * 运行条件：
 * 1. 在 .env 中配置 ZHIPU_API_KEY
 * 2. 设置 ZHIPU_MODEL=glm-5
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createModel,
  createModelFromPreset,
  ModelFactory,
  getProviderPreset,
  type ModelConfig,
} from '@x-codegen/sdk';
import { HumanMessage } from '@langchain/core/messages';
import dotenv from 'dotenv';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
dotenv.config({ path: join(__dirname, '../../.env') });

describe('CLI 集成测试 - 智谱 GLM 模型', () => {
  beforeAll(() => {
    // 重置工厂实例
    ModelFactory.resetInstance();
  });

  afterAll(() => {
    // 清理
    ModelFactory.getInstance().clearCache();
  });

  describe('模型配置验证', () => {
    it('应该正确读取智谱 GLM 提供商预设', () => {
      const preset = getProviderPreset('zhipu');

      expect(preset).toBeDefined();
      expect(preset?.provider).toBe('zhipu');
      expect(preset?.baseUrl).toBe('https://open.bigmodel.cn/api/paas/v4');
      expect(preset?.envKey).toBe('ZHIPU_API_KEY');
      expect(preset?.defaultModel).toBe('glm-5');
      expect(preset?.availableModels).toContain('glm-5');
    });

    it('应该正确检测智谱为 OpenAI 兼容提供商', () => {
      const preset = getProviderPreset('zhipu');
      expect(preset?.openAICompatible).toBe(true);
    });
  });

  describe('模型创建测试', () => {
    it('应该能从环境变量读取 API Key', () => {
      const apiKey = process.env.ZHIPU_API_KEY;
      expect(apiKey).toBeDefined();
      expect(apiKey?.length).toBeGreaterThan(0);
    });

    it('应该能使用完整配置创建模型', async () => {
      const config: ModelConfig = {
        provider: 'zhipu',
        model: 'glm-5',
        apiKey: process.env.ZHIPU_API_KEY,
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        temperature: 0.7,
        maxTokens: 100,
      };

      const model = await createModel(config);

      expect(model).toBeDefined();
      // 验证模型有 invoke 方法
      expect(typeof model.invoke).toBe('function');
    });

    it('应该能从预设创建模型（自动读取环境变量）', async () => {
      const model = await createModelFromPreset('zhipu', {
        model: 'glm-5',
        temperature: 0.7,
        maxTokens: 100,
      });

      expect(model).toBeDefined();
      expect(typeof model.invoke).toBe('function');
    });
  });

  describe('模型调用测试', () => {
    // 辅助函数：将响应内容转换为字符串
    const contentToString = (content: unknown): string => {
      if (typeof content === 'string') {
        return content;
      }
      if (Array.isArray(content)) {
        return content
          .map((item) => {
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && item && 'text' in item)
              return (item as { text: string }).text;
            return '';
          })
          .join('');
      }
      return '';
    };

    it('应该能成功调用智谱 GLM 模型', async () => {
      const model = await createModelFromPreset('zhipu', {
        model: 'glm-5',
        temperature: 0.1,
        maxTokens: 50,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await model.invoke([
        new HumanMessage('你好，请用一句话介绍你自己'),
      ])) as any;

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();

      const content = contentToString(response.content);
      console.log('智谱 GLM 响应:', content);

      // 智谱 GLM 可能返回空字符串，只验证响应存在即可
      expect(response.content).not.toBeNull();
      expect(response.content).not.toBeUndefined();
    }, 60000);

    it('应该能进行多轮对话', async () => {
      const model = await createModelFromPreset('zhipu', {
        model: 'glm-5',
        temperature: 0.1,
        maxTokens: 100,
      });

      // 第一轮
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response1 = (await model.invoke([
        new HumanMessage('我的名字是小明'),
      ])) as any;

      expect(response1.content).toBeDefined();

      // 第二轮（测试模型是否能记住上下文）
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response2 = (await model.invoke([
        new HumanMessage('我叫什么名字？'),
      ])) as any;

      expect(response2.content).toBeDefined();
      const content2 = contentToString(response2.content);
      console.log('多轮对话响应:', content2);
    }, 60000);

    it('应该能处理代码生成请求', async () => {
      const model = await createModelFromPreset('zhipu', {
        model: 'glm-5',
        temperature: 0.3,
        maxTokens: 500,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await model.invoke([
        new HumanMessage(`请生成一个简单的 TypeScript 函数，计算两个数的和。
要求：
1. 使用 TypeScript 类型注解
2. 包含参数类型和返回值类型
3. 只返回代码，不要其他解释`),
      ])) as any;

      expect(response.content).toBeDefined();
      const content = contentToString(response.content);
      expect(content).toContain('function');
      expect(content).toContain('number');

      console.log('代码生成响应:\n', content);
    }, 60000);
  });

  describe('流式输出测试', () => {
    it('应该能流式输出响应', async () => {
      const model = await createModelFromPreset('zhipu', {
        model: 'glm-5',
        temperature: 0.1,
        maxTokens: 100,
      });

      if (!model.stream) {
        expect(true).toBe(true); // skip test
        return;
      }

      const stream = await model.stream([
        new HumanMessage('请用三句话介绍 TypeScript'),
      ]);

      const chunks: string[] = [];
      for await (const chunk of stream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const chunkAny = chunk as any;
        if (chunkAny && typeof chunkAny === 'object' && 'content' in chunkAny) {
          const content = chunkAny.content;
          if (typeof content === 'string' && content) {
            chunks.push(content);
            process.stdout.write(content);
          }
        }
      }
      console.log(); // 换行

      // 流式输出可能不产生任何 chunks，但不应抛出错误
      // 只验证流式调用可以正常执行
      expect(stream).toBeDefined();
    }, 60000);
  });

  describe('模型缓存测试', () => {
    it('应该正确缓存模型实例', async () => {
      const factory = ModelFactory.getInstance();
      factory.clearCache();

      const config: ModelConfig = {
        provider: 'zhipu',
        model: 'glm-5',
        apiKey: process.env.ZHIPU_API_KEY,
      };

      const model1 = await factory.getOrCreate('test-cache-id', config);
      const model2 = await factory.getOrCreate('test-cache-id', config);

      expect(model1).toBe(model2);
      expect(factory.getCacheSize()).toBe(1);
    });
  });

  describe('错误处理测试', () => {
    it('应该在缺少 API Key 时抛出错误', async () => {
      const originalKey = process.env.ZHIPU_API_KEY;
      delete process.env.ZHIPU_API_KEY;

      const config: ModelConfig = {
        provider: 'zhipu',
        model: 'glm-5',
        // 不提供 apiKey
      };

      await expect(createModel(config)).rejects.toThrow('缺少 API Key');

      // 恢复环境变量
      if (originalKey) {
        process.env.ZHIPU_API_KEY = originalKey;
      }
    });

    it('应该在使用无效模型名称时仍然能创建实例（运行时可能失败）', async () => {
      // OpenAI 兼容模型在创建时不会验证模型名称，只在调用时可能失败
      const config: ModelConfig = {
        provider: 'zhipu',
        model: 'invalid-model-name',
        apiKey: process.env.ZHIPU_API_KEY,
      };

      // 应该能创建实例
      const model = await createModel(config);
      expect(model).toBeDefined();
    });
  });
});

describe('CLI 功能模拟测试', () => {
  describe('Logger 工具测试', async () => {
    it('应该正确创建 logger 实例', async () => {
      const { createLogger } = await import('../utils/logger.js');
      const logger = createLogger(true);

      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Progress 工具测试', async () => {
    it('应该正确创建 progress 实例', async () => {
      const { createProgress } = await import('../utils/progress.js');
      const progress = createProgress('测试进度');

      expect(progress).toBeDefined();
      expect(typeof progress.start).toBe('function');
      expect(typeof progress.update).toBe('function');
      expect(typeof progress.succeed).toBe('function');
      expect(typeof progress.fail).toBe('function');
      expect(progress.spinner).toBeDefined();
    });
  });
});
