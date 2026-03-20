---
name: page-codegen
description: Page-Codegen 分阶段执行技能，支持 step/auto 两种模式，遵循“原始模板只读、仅修改 AI 副本”。
---

# page-codegen 技能说明

## 目标
将页面胶水代码补全流程拆分为 7 个阶段，按阶段执行与验收，确保质量和可追溯性。

## 执行模式

### 1) step 模式（手动分步）
- 用户显式指定阶段：`init` / `research` / `api-design` / `ui-design` / `integration` / `validate` / `deliver`
- 仅执行指定阶段，不自动推进下一阶段

### 2) auto 模式（自动串行）
- 从 `init` 开始按顺序执行到 `deliver`
- 每个阶段完成后自动进入下一阶段
- 任一阶段失败时停止自动流程，先在当前阶段修正并复检

## 最小执行单元
- 最小执行单元为**阶段级**
- 不允许将阶段拆到更细粒度后“跳阶段交付”
- 阶段未通过不得进入下一阶段

## 阶段顺序
1. `init`：初始化与 AI 副本准备
2. `research`：需求与代码研究
3. `api-design`：接口与数据逻辑设计
4. `ui-design`：UI 组件与交互设计
5. `integration`：代码整合与阶段验收
6. `validate`：质量校验与评审闭环
7. `deliver`：交付说明与收尾

## 核心约束（最高优先级）
1. 原始模板只读：原始静态模板文件禁止修改
2. 仅改 AI 副本：所有实现必须落在 `.ai.tsx`（及必要依赖文件）
3. 不生成 `final_code.md`
4. 不落盘 `review/*.md` 或任何评审报告文件
5. 评审必须走**项目自研 reviewer/subagent**，禁止使用 superpowers reviewer
6. 阶段失败必须在**当前阶段**修正并复检，通过后再继续

## 阶段完成通用标准
- 本阶段目标已完成
- 涉及代码变更的阶段必须通过项目自研 reviewer/subagent 检查（最终强制门禁在 `validate`）
- 未引入“禁用工件”（`final_code.md`、`review/*.md`）
- 原始模板保持未修改

## 文件结构
- `SKILL.md`：总编排与约束
- `step-init.md`
- `step-research.md`
- `step-api-design.md`
- `step-ui-design.md`
- `step-integration.md`
- `step-validate.md`
- `step-deliver.md`
