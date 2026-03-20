---
name: "XGEN: Validate"
description: xgen:validate 命令入口（检查与门禁确认）
category: Workflow
tags: [xgen, stage, validate]
---

执行 validate 阶段（检查与门禁确认）。

**Input**: `/xgen:validate <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-validate-stage`。
3. 输出检查结果与 reviewer/subagent 门禁状态。

## Guardrails
- reviewer 门禁必须来自项目自研 reviewer/subagent。
- 当 `review.status != passed`，明确阻断进入 deliver。
- 不生成 `final_code.md`。
- 不落盘 `review/*.md` 评审报告。
