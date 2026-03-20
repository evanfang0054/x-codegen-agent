---
name: "XGEN: Integration"
description: xgen:integration 命令入口（integration 阶段）
category: Workflow
tags: [xgen, stage, integration]
---

执行 integration 阶段（在 AI 副本中完成落地实现）。

**Input**: `/xgen:integration <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-integration-stage`。
3. 输出整合结果、关键边界处理与进入 validate 的准备状态。

## Guardrails
- 仅修改 AI 副本文件，原始模板保持不变。
