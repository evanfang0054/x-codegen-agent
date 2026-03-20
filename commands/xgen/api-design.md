---
name: "XGEN: API Design"
description: xgen:api-design 命令入口（api-design 阶段）
category: Workflow
tags: [xgen, stage, api-design]
---

执行 api-design 阶段（接口契约与字段映射）。

**Input**: `/xgen:api-design <args>`，通常包含 `--change <id>`。

## Steps
1. 解析并确认 `change`。
2. 使用 **Skill tool** 调用 `xgen-api-design-stage`。
3. 输出接口清单、字段映射、状态映射与未决问题。

## Guardrails
- 优先使用项目 MCP（如 Apifox）获取 Schema，失败再回退本地定义。
