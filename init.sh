#!/bin/bash

# X-CodeGen-Agent 环境初始化脚本
# 用于启动开发环境和运行基础测试

set -e

echo "🚀 初始化 X-CodeGen-Agent 开发环境..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js 版本需要 >= 20，当前版本: $(node -v)"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"

# 检查 pnpm 是否安装
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm 未安装，请先安装 pnpm"
    exit 1
fi
echo "✅ pnpm 版本: $(pnpm -v)"

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 运行类型检查
echo "🔍 运行 TypeScript 类型检查..."
pnpm typecheck

# 运行 lint 检查
echo "🔍 运行 ESLint 检查..."
pnpm lint

# 运行测试
echo "🧪 运行测试..."
pnpm test -- --run

echo ""
echo "✅ 环境初始化完成！"
echo ""
echo "可用命令："
echo "  pnpm dev        - 开发模式运行"
echo "  pnpm build      - 生产构建"
echo "  pnpm test       - 运行测试"
echo "  pnpm check      - 完整项目检查"
echo ""
