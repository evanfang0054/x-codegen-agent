---
name: "XGEN: Step"
description: xgen:step 命令入口（手动分阶段执行）
category: Workflow
tags: [xgen, workflow, step]
---

执行 xgen 手动分阶段命令。

**Input**: `/xgen:step <args>`，通常包含 `--change <id>` 与 `--stage <stage>`。

## Steps
1. 解析并确认 `change` 与 `stage`；若缺少 `stage`，明确提示补充。
2. 使用 **Skill tool** 调用 `xgen-run`，并固定传入 `--mode step --stage <stage>`。
3. 输出当前阶段、执行结果与下一步建议。

## Guardrails
- 不绕过阶段门禁。
- validate/deliver 前置检查必须遵循项目约束。
- deliver 前必须满足项目自研 reviewer/subagent 门禁（`review.status=passed`）。
- 不生成 `final_code.md`。
- 不落盘 `review/*.md` 评审报告。
