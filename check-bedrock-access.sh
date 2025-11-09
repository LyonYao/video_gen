#!/bin/bash

echo "🔍 检查AWS Bedrock模型访问权限..."
echo ""

# 检查AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ 未安装AWS CLI"
    exit 1
fi

echo "✅ AWS CLI已安装"
echo ""

# 检查AWS凭证
echo "📋 当前AWS账号信息:"
aws sts get-caller-identity
echo ""

# 检查Claude 3.5 Sonnet
echo "🔍 检查Claude 3.5 Sonnet..."
CLAUDE_35=$(aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?modelId==`anthropic.claude-3-5-sonnet-20240620-v1:0`].modelId' \
  --output text)

if [ -n "$CLAUDE_35" ]; then
    echo "✅ Claude 3.5 Sonnet 可用"
else
    echo "❌ Claude 3.5 Sonnet 不可用"
    echo "   尝试查找Claude 3 Sonnet..."
    
    CLAUDE_3=$(aws bedrock list-foundation-models --region us-east-1 \
      --query 'modelSummaries[?modelId==`anthropic.claude-3-sonnet-20240229-v1:0`].modelId' \
      --output text)
    
    if [ -n "$CLAUDE_3" ]; then
        echo "✅ Claude 3 Sonnet 可用（可以使用这个）"
    else
        echo "❌ Claude 3 Sonnet 也不可用"
    fi
fi
echo ""

# 检查Nova Video
echo "🔍 检查Amazon Nova Video..."
NOVA=$(aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `nova`)].modelId' \
  --output text)

if [ -n "$NOVA" ]; then
    echo "✅ Nova模型可用:"
    echo "$NOVA"
else
    echo "❌ Nova模型不可用"
fi
echo ""

# 列出所有可用的Anthropic模型
echo "📋 所有可用的Anthropic模型:"
aws bedrock list-foundation-models --region us-east-1 \
  --by-provider anthropic \
  --query 'modelSummaries[*].modelId' \
  --output table

echo ""
echo "📋 所有可用的Amazon模型:"
aws bedrock list-foundation-models --region us-east-1 \
  --by-provider amazon \
  --query 'modelSummaries[*].modelId' \
  --output table

echo ""
echo "✅ 检查完成！"
