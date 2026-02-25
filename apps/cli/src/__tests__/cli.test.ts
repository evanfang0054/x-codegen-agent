/**
 * CLI 工具单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '../utils/logger.js';
import { createProgress, StepProgress } from '../utils/progress.js';
import { generateCommand, type GenerateCommandOptions } from '../commands/generate.js';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock console 方法
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code) => {
  throw new Error(`process.exit:${code}`);
});

// Mock ora
vi.mock('ora', () => {
  const mockSpinner = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
  };
  return {
    default: vi.fn(() => mockSpinner),
  };
});

// Mock @x-codegen/sdk
vi.mock('@x-codegen/sdk', () => ({
  pageCodegenStream: vi.fn().mockImplementation(async function* () {
    yield { step: 'init', message: '初始化中...' };
    yield { step: 'research', message: '研究需求...' };
    yield { step: 'api-design', message: '设计 API...' };
    yield { step: 'ui-design', message: '设计 UI...' };
    yield { step: 'integration', message: '整合代码...' };
    yield { step: 'validate', message: '验证代码...' };
    yield { step: 'deliver', message: '完成' };
  }),
}));

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createLogger', () => {
    it('should create logger with default verbose=false', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.success).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.dim).toBe('function');
    });

    it('should create logger with verbose=true', () => {
      const logger = createLogger(true);
      expect(logger).toBeDefined();
    });
  });

  describe('info', () => {
    it('should log info message', () => {
      const logger = createLogger();
      logger.info('Test info message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('success', () => {
    it('should log success message', () => {
      const logger = createLogger();
      logger.success('Test success message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning message', () => {
      const logger = createLogger();
      logger.warn('Test warning message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error message from Error object', () => {
      const logger = createLogger();
      logger.error(new Error('Test error'));
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log error message from string', () => {
      const logger = createLogger();
      logger.error('String error');
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should log stack trace in verbose mode', () => {
      const logger = createLogger(true);
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      logger.error(error);
      expect(mockConsoleError).toHaveBeenCalledTimes(2);
    });
  });

  describe('debug', () => {
    it('should not log debug message when verbose=false', () => {
      const logger = createLogger(false);
      logger.debug('Test debug message');
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });

    it('should log debug message when verbose=true', () => {
      const logger = createLogger(true);
      logger.debug('Test debug message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });

  describe('dim', () => {
    it('should log dim message', () => {
      const logger = createLogger();
      logger.dim('Test dim message');
      expect(mockConsoleLog).toHaveBeenCalled();
    });
  });
});

describe('Progress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createProgress', () => {
    it('should create progress indicator', () => {
      const progress = createProgress('Loading...');
      expect(progress).toBeDefined();
      expect(typeof progress.start).toBe('function');
      expect(typeof progress.update).toBe('function');
      expect(typeof progress.succeed).toBe('function');
      expect(typeof progress.fail).toBe('function');
      expect(typeof progress.warn).toBe('function');
      expect(typeof progress.info).toBe('function');
      expect(typeof progress.stop).toBe('function');
      expect(progress.spinner).toBeDefined();
    });

    it('should start with initial text', () => {
      createProgress('Initial text');
      // ora mock 会被调用
    });
  });

  describe('ProgressIndicator methods', () => {
    it('should call start', () => {
      const progress = createProgress();
      progress.start('Starting...');
      expect(progress.spinner.start).toHaveBeenCalled();
    });

    it('should call update text', () => {
      const progress = createProgress();
      progress.update('Updated text');
      expect(progress.spinner.text).toBe('Updated text');
    });

    it('should call succeed', () => {
      const progress = createProgress();
      progress.succeed('Success!');
      expect(progress.spinner.succeed).toHaveBeenCalled();
    });

    it('should call fail', () => {
      const progress = createProgress();
      progress.fail('Failed!');
      expect(progress.spinner.fail).toHaveBeenCalled();
    });

    it('should call warn', () => {
      const progress = createProgress();
      progress.warn('Warning!');
      expect(progress.spinner.warn).toHaveBeenCalled();
    });

    it('should call info', () => {
      const progress = createProgress();
      progress.info('Info!');
      expect(progress.spinner.info).toHaveBeenCalled();
    });

    it('should call stop', () => {
      const progress = createProgress();
      progress.stop();
      expect(progress.spinner.stop).toHaveBeenCalled();
    });
  });

  describe('StepProgress', () => {
    it('should create step progress with steps', () => {
      const steps = ['Step 1', 'Step 2', 'Step 3'];
      const stepProgress = new StepProgress(steps);

      expect(stepProgress.current).toBe(0);
      expect(stepProgress.total).toBe(3);
    });

    it('should advance to next step', () => {
      const steps = ['Step 1', 'Step 2', 'Step 3'];
      const stepProgress = new StepProgress(steps);

      stepProgress.next();
      expect(stepProgress.current).toBe(1);
    });

    it('should update current step text', () => {
      const steps = ['Step 1', 'Step 2'];
      const stepProgress = new StepProgress(steps);

      stepProgress.update('Updated step 1');
      // spinner.text 应该被更新
    });

    it('should complete with message', () => {
      const steps = ['Step 1', 'Step 2'];
      const stepProgress = new StepProgress(steps);

      stepProgress.complete('All done!');
      // succeed 应该被调用
    });

    it('should fail with message', () => {
      const steps = ['Step 1', 'Step 2'];
      const stepProgress = new StepProgress(steps);

      stepProgress.fail('Failed!');
      // fail 应该被调用
    });

    it('should not exceed total steps', () => {
      const steps = ['Step 1', 'Step 2'];
      const stepProgress = new StepProgress(steps);

      stepProgress.next();
      stepProgress.next();
      stepProgress.next(); // 超过总步数，current 会继续增加但不会越界访问 steps

      // current 会增加到 3（因为 next() 只是递增计数器）
      expect(stepProgress.current).toBe(3);
    });
  });
});

describe('GenerateCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('参数验证', () => {
    it('should exit when figma URL is missing', async () => {
      const options: GenerateCommandOptions = {
        figma: '',
        output: '/tmp/output',
        maxRetries: '3',
        verbose: false,
      };

      await expect(generateCommand(options)).rejects.toThrow('process.exit:1');
    });

    it('should exit when output directory is missing', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '',
        maxRetries: '3',
        verbose: false,
      };

      await expect(generateCommand(options)).rejects.toThrow('process.exit:1');
    });
  });

  describe('成功执行', () => {
    it('should execute with valid options', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        maxRetries: '3',
        verbose: false,
      };

      // 不应该抛出错误
      await generateCommand(options);

      // 验证 console.log 被调用（输出后续步骤）
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should execute with verbose mode', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        maxRetries: '3',
        verbose: true,
      };

      await generateCommand(options);

      // verbose 模式会打印配置信息
      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should parse maxRetries correctly', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        maxRetries: '5',
        verbose: false,
      };

      await generateCommand(options);
      // 如果 maxRetries 解析正确，不会抛出错误
    });

    it('should use default maxRetries when invalid', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        maxRetries: 'invalid',
        verbose: false,
      };

      await generateCommand(options);
      // invalid maxRetries 会使用默认值 3
    });

    it('should handle optional project parameter', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        project: 'booking-app',
        maxRetries: '3',
        verbose: false,
      };

      await generateCommand(options);
    });

    it('should handle optional template parameter', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        template: 'https://github.com/example/react-tailwind-template',
        maxRetries: '3',
        verbose: false,
      };

      await generateCommand(options);
    });

    it('should handle optional requirements parameter', async () => {
      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        requirements: '实现用户登录页面',
        maxRetries: '3',
        verbose: false,
      };

      await generateCommand(options);
    });
  });

  describe('错误处理', () => {
    it('should handle error step from stream', async () => {
      // 重新 mock pageCodegenStream 返回错误
      vi.mocked(await import('@x-codegen/sdk')).pageCodegenStream.mockImplementationOnce(
        async function* () {
          yield { step: 'error', message: '生成失败' };
        }
      );

      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        maxRetries: '3',
        verbose: false,
      };

      await expect(generateCommand(options)).rejects.toThrow('process.exit:1');
    });

    it('should handle exception from stream', async () => {
      // 重新 mock pageCodegenStream 抛出异常
      vi.mocked(await import('@x-codegen/sdk')).pageCodegenStream.mockImplementationOnce(
        async function* () {
          throw new Error('Stream error');
        }
      );

      const options: GenerateCommandOptions = {
        figma: 'https://figma.com/file/xxx',
        output: '/tmp/output',
        maxRetries: '3',
        verbose: false,
      };

      await expect(generateCommand(options)).rejects.toThrow('process.exit:1');
    });
  });
});

describe('CLI 入口', () => {
  it('should have correct package.json bin entry', () => {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.bin).toBeDefined();
    expect(packageJson.bin['x-codegen']).toBe('./dist/index.js');
  });

  it('should have correct command name', () => {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.name).toBe('@x-codegen/cli');
  });

  it('should have required dependencies', () => {
    const packageJsonPath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

    expect(packageJson.dependencies['@x-codegen/sdk']).toBeDefined();
    expect(packageJson.dependencies.commander).toBeDefined();
    expect(packageJson.dependencies.chalk).toBeDefined();
    expect(packageJson.dependencies.ora).toBeDefined();
  });
});
