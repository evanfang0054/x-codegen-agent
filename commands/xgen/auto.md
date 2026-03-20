---
name: "XGEN: Auto"
description: xgen:auto 命令入口（自动全链路推进）
category: Workflow
tags: [xgen, workflow, auto]
---

执行 xgen 自动推进命令。

**Input**: `/xgen:auto <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-run`，并固定传入 `--mode auto`。
3. 输出当前阶段、自动推进结果与下一步建议。

## Guardrails
- 不绕过阶段门禁。
- validate/deliver 前置检查必须遵循项目约束。
- deliver 前必须满足项目自研 reviewer/subagent 门禁（`review.status=passed`）。
- 不生成 `final_code.md`。
- 不落盘 `review/*.md` 评审报告。
