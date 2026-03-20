---
name: "XGEN: Deliver"
description: xgen:deliver 命令入口（最终交付推进）
category: Workflow
tags: [xgen, stage, deliver]
---

执行 deliver 阶段（最终交付推进）。

**Input**: `/xgen:deliver <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-deliver-stage`。
3. 输出门禁检查结果、交付执行结果与收尾建议。

## Guardrails
- validate → deliver 必须经过项目自研 reviewer/subagent 且 `review.status=passed`。
- 不允许通过参数或手工状态覆盖绕过门禁。
- 不生成 `final_code.md`。
- 不落盘 `review/*.md` 评审报告。
