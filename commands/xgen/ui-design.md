---
name: "XGEN: UI Design"
description: xgen:ui-design 命令入口（ui-design 阶段）
category: Workflow
tags: [xgen, stage, ui-design]
---

执行 ui-design 阶段（组件结构与交互设计）。

**Input**: `/xgen:ui-design <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-ui-design-stage`。
3. 输出页面结构、事件触发、状态依赖与改造点清单。
