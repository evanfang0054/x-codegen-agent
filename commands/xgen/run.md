---
name: "XGEN: Run"
description: xgen:run 命令入口（分阶段流程控制，step/auto）
category: Workflow
tags: [xgen, workflow, stage]
---

执行 xgen 流程总控命令。

**Input**: `/xgen:run <args>`，支持 `--change <id>`、`--mode step|auto`、`--stage <stage>`。

## Steps
1. 解析用户参数；若缺少 `change`，先提示补充。
2. 使用 **Skill tool** 调用 `xgen-run`，并传入原始参数。
3. 按 skill 输出当前阶段、执行结果与下一步建议。

## Guardrails
- 不绕过阶段门禁。
- validate/deliver 前置检查必须遵循项目约束。
