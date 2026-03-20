---
name: "XGEN: Next"
description: xgen:next 命令入口（计算下一阶段建议）
category: Workflow
tags: [xgen, workflow, next-stage]
---

给出 xgen 的下一阶段建议。

**Input**: `/xgen:next <args>`，通常包含 `--change <id>`。

## Steps
1. 解析参数并确认目标 change。
2. 使用 **Skill tool** 调用 `xgen-next`。
3. 输出 recommended next stage、阻塞项与可执行下一动作。

## Guardrails
- 若 review/check 门禁未满足，必须明确阻断原因。
