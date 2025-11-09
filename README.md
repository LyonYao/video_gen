# Video AI POC

> 使用 AWS Bedrock 从文字生成视频 - DeepSeek-R1 + Nova Video

---

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 AWS 凭证
aws configure

# 3. 部署到 AWS
npm run deploy

# 4. 测试
npm run invoke
```

---

## 📋 前置要求

### 必需
1. ✅ Node.js 18+
2. ✅ AWS CLI（已配置凭证）
3. ✅ IAM 部署权限
4. ✅ DeepSeek-R1 模型访问（通常默认可用）

### 配置 IAM 部署权限

创建 inline policy 并附加到你的 IAM 用户：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iam:GetRole",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:PassRole",
        "iam:TagRole",
        "iam:UntagRole"
      ],
      "Resource": "arn:aws:iam::*:role/video-ai-poc-*-lambdaRole"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:DeleteFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:GetFunction",
        "lambda:AddPermission",
        "lambda:RemovePermission"
      ],
      "Resource": "arn:aws:lambda:us-east-1:*:function:video-ai-poc-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:PutBucketPolicy",
        "s3:PutBucketCORS",
        "s3:PutBucketPublicAccessBlock",
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::video-ai-poc-*",
        "arn:aws:s3:::video-ai-poc-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DeleteStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate",
        "cloudformation:ValidateTemplate"
      ],
      "Resource": "arn:aws:cloudformation:us-east-1:*:stack/video-ai-poc-*/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:DescribeLogGroups",
        "logs:DeleteLogGroup"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/video-ai-poc-*"
    }
  ]
}
```

---

## 🎯 使用方法

### Lambda 控制台测试（推荐）

1. 打开 [Lambda 控制台](https://console.aws.amazon.com/lambda)
2. 找到函数: `video-ai-poc-dev-generatePrompts`
3. 创建测试事件：

```json
{
  "idea": "一只橘猫在樱花树下追逐蝴蝶，阳光透过花瓣洒下"
}
```

4. 点击 **Test**，等待 20-30 秒
5. 查看返回结果（包含 5 个生成的提示词和选中的最佳提示词）
6. 视频在后台生成，几分钟后查看 S3 存储桶

### 查看生成的视频

1. 打开 [S3 控制台](https://console.aws.amazon.com/s3)
2. 找到存储桶: `video-ai-poc-dev-{你的账号ID}`
3. 下载 `video-*.mp4` 文件观看

---

## 💡 工作原理

### 两步异步架构

```
用户输入想法
    ↓
Lambda 1: generatePrompts (20秒)
├─ DeepSeek-R1 生成 5 个提示词
├─ DeepSeek-R1 评估选择最佳
├─ 保存到 S3
└─ 异步调用 Lambda 2 → 立即返回结果
    ↓
Lambda 2: generateVideo (后台执行)
├─ Nova Video 生成视频 (3-10分钟)
└─ 保存到 S3
```

**优势**：
- ✅ 用户只需等待 20 秒看到提示词
- ✅ 视频在后台生成，不阻塞用户
- ✅ 提示词已保存，可重复使用
- ✅ 失败自动重试

---

## 🔧 使用的模型

| 模型 | 用途 | 特点 |
|------|------|------|
| **DeepSeek-R1** | 生成和评估提示词 | 开源，中文支持优秀，无地区限制 |
| **Amazon Nova Video** | 生成视频 | 6秒视频，720p，standard 质量 |

### 为什么选择 DeepSeek-R1？

- ✅ **开源免费** - 比 Claude 便宜很多
- ✅ **中文支持优秀** - 专门优化过中文
- ✅ **无地区限制** - 不需要申请特殊访问权限
- ✅ **性能强大** - 可媲美 Claude 3.5

---

## 📝 测试示例

```json
{"idea": "一只橘猫在樱花树下追逐蝴蝶，阳光透过花瓣洒下"}
```

```json
{"idea": "夕阳下的海边，海鸥在飞翔，浪花拍打礁石"}
```

```json
{"idea": "咖啡馆里，阳光透过窗户，一杯拿铁冒着热气"}
```

---

## 🛠️ 常用命令

```bash
npm run deploy       # 部署到 AWS
npm run invoke       # 命令行测试
npm run logs         # 查看提示词生成日志
npm run logs:video   # 查看视频生成日志
npm run info         # 查看部署信息
npm run remove       # 删除所有 AWS 资源
```

---

## 🔧 自定义配置

### 修改视频参数

编辑 `src/handler.js` 的 `generateVideoHighQuality()` 函数：

```javascript
textToVideoParams: {
  durationSeconds: 6,      // 视频时长（秒）
  dimension: '1280x720',   // 分辨率
  fps: 24                  // 帧率
},
videoGenerationConfig: {
  quality: 'standard'      // 质量：standard 或 premium
}
```

**推荐配置**（确保 15 分钟内完成）：
- 6 秒, 720p, standard - 安全
- 6 秒, 1080p, standard - 安全
- 6 秒, 1080p, premium - 接近极限

---

## 📦 项目结构

```
video-ai-poc/
├── src/
│   └── handler.js          # Lambda 函数代码
├── serverless.yml          # AWS 资源配置
├── package.json            # 项目依赖
├── test-event.json         # 测试数据
├── deploy.bat              # Windows 部署脚本
├── deploy.sh               # Linux/Mac 部署脚本
└── README.md               # 本文档
```

---

## ⚠️ 重要注意事项

### 1. 区域限制
- ✅ 必须部署在 **us-east-1** 区域
- DeepSeek-R1 会自动路由到 us-east-1/us-east-2/us-west-2
- Nova Video 仅在 us-east-1 和 us-west-2 可用

### 2. Lambda 超时
- Lambda 1 (generatePrompts): 2 分钟超时
- Lambda 2 (generateVideo): 15 分钟超时
- 如果视频生成超过 15 分钟，会自动重试（但会重复计费）

### 3. 成本估算
- DeepSeek-R1: 免费或极低成本
- Nova Video (6秒, 720p): ~$0.60-1.20/次
- Lambda + S3: ~$0.001/次
- **总计**: ~$0.60-1.20/次

---

## 🔍 故障排查

### Q: 部署失败，权限错误
**A**: 确保 IAM 用户有上述部署权限，特别是 `iam:TagRole` 和 `iam:UntagRole`

### Q: DeepSeek-R1 调用失败
**A**: 检查 Lambda 执行角色是否有 `bedrock:InvokeModel` 权限，Resource 设置为 `*`

### Q: Nova Video 返回错误
**A**: Nova Video 可能还在预览阶段，代码会返回模拟数据用于测试

### Q: 视频生成超时
**A**: 使用保守参数（6秒, 720p, standard），确保在 15 分钟内完成

---

## 📚 技术栈

- **AWS Lambda** - 无服务器计算
- **Amazon Bedrock** - AI 模型服务
  - DeepSeek-R1 - 文本生成和评估
  - Nova Video - 视频生成
- **Amazon S3** - 对象存储
- **Serverless Framework** - 部署工具
- **Node.js 18** - 运行时

---

## 📄 许可证

MIT License

---

**开始你的 AI 视频之旅！** 🚀🎬
