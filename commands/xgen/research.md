---
name: "XGEN: Research"
description: xgen:research 命令入口（research 阶段）
category: Workflow
tags: [xgen, stage, research]
---

执行 research 阶段（需求梳理与实现线索沉淀）。

**Input**: `/xgen:research <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-research-stage`。
3. 输出研究结论、待确认问题与后续阶段建议。
