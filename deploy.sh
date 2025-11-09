#!/bin/bash

echo "🚀 开始部署 Video AI POC..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未安装 Node.js，请先安装"
    exit 1
fi

# 检查 AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ 未安装 AWS CLI，请先安装并配置"
    exit 1
fi

# 检查 Serverless
if ! command -v serverless &> /dev/null; then
    echo "📦 安装 Serverless Framework..."
    npm install -g serverless
fi

# 安装依赖
echo "📦 安装项目依赖..."
npm install

# 检查 Bedrock 模型访问权限
echo "🔍 检查 Bedrock 模型访问权限..."
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?contains(modelId, 'claude') || contains(modelId, 'nova')].modelId" --output table

echo ""
echo "⚠️  请确认以上模型可用，如果没有看到 claude 或 nova 模型："
echo "   1. 访问 AWS Console -> Bedrock -> Model access"
echo "   2. 申请访问 Claude 和 Nova 模型"
echo ""
read -p "按 Enter 继续部署，或 Ctrl+C 取消..."

# 部署
echo "🚀 部署到 AWS..."
serverless deploy --verbose

echo ""
echo "✅ 部署完成！"
echo ""
echo "🎯 下一步："
echo "   1. 登录 AWS Lambda 控制台"
echo "   2. 找到函数: video-ai-poc-dev-generateVideo"
echo "   3. 点击 Test，输入: {\"idea\": \"你的想法\"}"
echo "   4. 等待约60-90秒，查看视频URL"
echo ""
echo "或者命令行测试："
echo "   npm run invoke"
echo ""
echo "查看日志："
echo "   npm run logs"
echo ""
