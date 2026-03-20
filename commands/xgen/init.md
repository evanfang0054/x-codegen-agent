---
name: "XGEN: Init"
description: xgen:init 命令入口（init 阶段初始化）
category: Workflow
tags: [xgen, stage, init]
---

执行 init 阶段（初始化 AI 副本与只读边界）。

**Input**: `/xgen:init <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-init-stage`。
3. 输出初始化结果、AI 副本边界与下一阶段建议。

## Guardrails
- 原始模板文件保持只读，不直接改动。
