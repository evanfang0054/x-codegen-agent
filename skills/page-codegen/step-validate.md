# 阶段 validate：质量校验与评审闭环

## 目标
完成可执行校验与评审闭环，确保交付质量达标。

## 输入
- `integration` 阶段实现结果

## 执行动作
1. 运行项目校验命令（优先 `pnpm check`，或仓库等效命令）
2. 修复 lint/type/test 问题并复检，直到通过
3. 使用**项目自研 reviewer/subagent**执行评审
4. 若评审未通过：在本阶段修正并重新评审

## 强制约束
- 评审必须使用项目自研 reviewer/subagent
- 禁止使用 superpowers reviewer
- 不生成 `final_code.md`
- 不落盘 `review/*.md` 报告文件

## 输出
- 校验通过结论
- 评审通过结论（以会话结论形式保留，不落盘报告）

## 完成标准
- 质量检查通过
- 自研 reviewer/subagent 评审通过
- 未产生禁用工件

## 失败处理
- 任一检查失败：停留本阶段修复并复检
- 禁止在未通过评审时进入 `deliver`
