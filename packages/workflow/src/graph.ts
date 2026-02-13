/**
 * LangGraph 工作流构建
 * 定义代码生成的状态图和节点转换逻辑
 */

import { StateGraph, START, END, MemorySaver } from '@langchain/langgraph';
import { CodeGenStateAnnotation, type CodeGenState } from '@x-codegen/types';
import { initNode, templateNode, completionNode, validateNode } from './nodes/index.js';

/**
 * 工作流编译选项
 */
export interface CodeGenGraphOptions {
  /** 是否启用检查点（用于持久化和恢复） */
  checkpointer?: boolean;
  /** 自定义检查点存储 */
  customCheckpointer?: MemorySaver;
}

/**
 * 路由函数：决定从 init 节点跳转到哪里
 */
function routeFromInit(state: CodeGenState): string {
  if (state.currentStep === 'error') {
    return END;
  }
  return 'template';
}

/**
 * 路由函数：决定从 template 节点跳转到哪里
 */
function routeFromTemplate(state: CodeGenState): string {
  if (state.currentStep === 'error') {
    return END;
  }
  return 'completion';
}

/**
 * 路由函数：决定从 completion 节点跳转到哪里
 */
function routeFromCompletion(state: CodeGenState): string {
  if (state.currentStep === 'error') {
    return END;
  }
  return 'validate';
}

/**
 * 路由函数：决定从 validate 节点跳转到哪里
 */
function routeFromValidate(state: CodeGenState): string {
  // 如果验证通过或标记为完成，结束
  if (state.currentStep === 'completed' || state.validationPassed) {
    return END;
  }

  // 如果需要重试，返回 completion 节点
  if (state.currentStep === 'completion') {
    return 'completion';
  }

  // 错误情况，结束
  if (state.currentStep === 'error') {
    return END;
  }

  // 默认结束
  return END;
}

/**
 * 创建代码生成工作流图
 */
export function createCodeGenGraph(options: CodeGenGraphOptions = {}) {
  const { checkpointer = true, customCheckpointer } = options;

  // 创建状态图
  const workflow = new StateGraph(CodeGenStateAnnotation)
    // 添加节点
    .addNode('init', initNode)
    .addNode('template', templateNode)
    .addNode('completion', completionNode)
    .addNode('validate', validateNode)
    // 设置入口边
    .addEdge(START, 'init')
    // 设置条件边
    .addConditionalEdges('init', routeFromInit, {
      template: 'template',
      [END]: END,
    })
    .addConditionalEdges('template', routeFromTemplate, {
      completion: 'completion',
      [END]: END,
    })
    .addConditionalEdges('completion', routeFromCompletion, {
      validate: 'validate',
      [END]: END,
    })
    .addConditionalEdges('validate', routeFromValidate, {
      completion: 'completion',
      [END]: END,
    });

  // 配置编译选项
  const compileOptions: { checkpointer?: MemorySaver } = {};

  if (checkpointer) {
    compileOptions.checkpointer = customCheckpointer ?? new MemorySaver();
  }

  return workflow.compile(compileOptions);
}

/**
 * 创建不带检查点的轻量级工作流
 * 适用于一次性执行，不需要持久化
 */
export function createCodeGenGraphWithoutCheckpointer() {
  return createCodeGenGraph({ checkpointer: false });
}

/**
 * 工作流类型
 */
export type CodeGenGraph = ReturnType<typeof createCodeGenGraph>;
