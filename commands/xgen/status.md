---
name: "XGEN: Status"
description: xgen:status 命令入口（查看阶段与检查状态）
category: Workflow
tags: [xgen, workflow, status]
---

查看 xgen 变更状态。

**Input**: `/xgen:status <args>`，通常包含 `--change <id>`。

## Steps
1. 解析参数；若缺少 `change`，提示用户提供。
2. 使用 **Skill tool** 调用 `xgen-status`，并传入原始参数。
3. 输出 current stage、check/review 状态与门禁结论。
