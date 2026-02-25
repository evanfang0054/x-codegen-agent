/**
 * Page-Codegen 提示词导出
 */

// 核心约束和步骤0
export {
  CORE_CONSTRAINTS,
  initPrompt,
  getCoreConstraintsPrompt,
} from './skill.js';

// 步骤1：需求与代码研究
export {
  researchPrompt,
  researchOutputPrompt,
} from './step1.js';

// 步骤2：接口与数据逻辑设计
export {
  apiDesignPrompt,
  apifoxQueryPrompt,
} from './step2.js';

// 步骤3：UI组件与交互逻辑设计
export {
  uiDesignPrompt,
  componentQueryPrompt,
} from './step3.js';

// 步骤4：代码整合与PRD验收
export {
  integrationPrompt,
  codeCompletionPrompt,
} from './step4.js';

// 步骤5：代码质量验证
export {
  validatePrompt,
  errorFixPrompt,
} from './step5.js';

// 步骤6：任务完成交付
export {
  deliverPrompt,
  finalCodePrompt,
} from './step6.js';
