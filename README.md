# Video AI POC - 极简版

> 用AI从文字生成视频 - 最简化的POC方案：只需Lambda，直接在AWS控制台测试

---

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 部署到AWS
npm run deploy

# 3. 在Lambda控制台测试
# 函数: video-ai-poc-dev-generatePrompts
# 输入: {"idea": "一只可爱的熊猫在竹林里吃竹子"}
# 
# 视频会在后台异步生成，几分钟后查看S3存储桶
```

---

## 📋 前置要求

### 必需
1. ✅ Node.js 18+
2. ✅ AWS CLI（已配置凭证）
3. ✅ **IAM权限**（重要！）
   - Bedrock访问权限
   - Lambda、S3、CloudFormation等部署权限
4. ✅ Bedrock模型访问权限

### 配置AWS CLI

```bash
aws configure
# 输入 Access Key ID
# 输入 Secret Access Key
# 区域: us-east-1
# 输出格式: json
```

### 配置IAM权限（重要！）⚠️

**部署需要以下AWS权限**：

#### 方法1: 创建自定义部署策略（推荐，最小权限）

1. 登录 [IAM控制台](https://console.aws.amazon.com/iam/)
2. 进入 **Users** → 选择你的用户（例如：ilyon-dev）
3. 点击 **Add permissions** → **Create inline policy**
4. 选择 **JSON** 标签页
5. 粘贴以下策略内容：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "IAMRoleManagement",
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
      "Sid": "LambdaDeployment",
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
      "Sid": "S3BucketManagement",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:PutBucketPolicy",
        "s3:PutBucketCORS",
        "s3:PutBucketPublicAccessBlock",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::video-ai-poc-*",
        "arn:aws:s3:::video-ai-poc-*/*"
      ]
    },
    {
      "Sid": "CloudFormationDeployment",
      "Effect": "Allow",
      "Action": [
        "cloudformation:CreateStack",
        "cloudformation:UpdateStack",
        "cloudformation:DescribeStacks",
        "cloudformation:DescribeStackEvents",
        "cloudformation:DescribeStackResources",
        "cloudformation:GetTemplate",
        "cloudformation:ValidateTemplate"
      ],
      "Resource": "arn:aws:cloudformation:us-east-1:*:stack/video-ai-poc-*/*"
    },
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:DescribeLogGroups"
      ],
      "Resource": "arn:aws:logs:us-east-1:*:log-group:/aws/lambda/video-ai-poc-*"
    },
    {
      "Sid": "BedrockAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

6. 点击 **Review policy**
7. 策略名称输入：`ServerlessDeploymentPolicy`
8. 点击 **Create policy**

**这个策略包含**：
- ✅ IAM角色管理（创建Lambda执行角色）
- ✅ Lambda函数部署
- ✅ S3存储桶创建和管理
- ✅ CloudFormation堆栈部署
- ✅ CloudWatch日志
- ✅ Bedrock模型调用

#### 方法2: 使用AWS托管策略（快速但权限较大）

```bash
# 替换 YOUR_USERNAME 为你的IAM用户名
# 例如: ilyon-dev

# 1. PowerUserAccess - 包含CloudFormation、Lambda、S3等部署权限
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# 2. AmazonBedrockFullAccess - Bedrock AI模型访问权限
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess
```

或在AWS控制台：
1. 访问 [IAM控制台](https://console.aws.amazon.com/iam/)
2. 点击 **Users** → 选择你的用户
3. 点击 **Add permissions** → **Attach policies directly**
4. 搜索并勾选：
   - `PowerUserAccess`
   - `AmazonBedrockFullAccess`
5. 点击 **Add permissions**

#### 验证权限

```bash
# 测试CloudFormation权限
aws cloudformation describe-stacks --region us-east-1

# 测试Bedrock权限
aws bedrock list-foundation-models --region us-east-1

# 如果都不报错，说明权限配置成功
```

#### 权限说明

**方法1（推荐）**：
- 最小权限原则
- 只授予部署所需的权限
- 资源限定在 `video-ai-poc-*` 范围内
- 更安全

**方法2（快速）**：
- 权限范围较大
- 适合测试和开发环境
- 不推荐生产环境使用

### 申请Bedrock访问（重要！）

**⚠️ 注意**：AWS Bedrock界面因地区和账号类型可能不同。

### 方法1: 通过Bedrock控制台（推荐）

1. 登录 [AWS Console](https://console.aws.amazon.com/)
2. 搜索并进入 **Amazon Bedrock**
3. 查看左侧导航栏，可能的选项：
   - **Get started** → 点击后可能有启用模型的选项
   - **Base models** 或 **Foundation models**
   - **Providers**
   - **Playgrounds** → 在这里尝试使用模型时会提示启用

4. **如果看到模型列表**：
   - 找到 **Anthropic Claude 3.5 Sonnet**
   - 找到 **Amazon Nova Reel**
   - 查看模型状态（Available/Enabled/Access granted）
   - 如果未启用，点击模型查看详情

5. **如果没有明显的启用按钮**：
   - 尝试在 **Playgrounds** 中使用模型
   - 系统会自动提示申请访问
   - 或者模型可能已经默认启用

### 方法2: 使用检查脚本（最简单）⭐

**我们提供了自动检查脚本**：

```bash
# Windows
check-bedrock-access.bat

# Linux/Mac
chmod +x check-bedrock-access.sh
./check-bedrock-access.sh
```

脚本会自动检查：
- ✅ AWS CLI是否安装
- ✅ AWS凭证是否配置
- ✅ Claude 3.5 Sonnet是否可用
- ✅ Claude 3 Sonnet是否可用（备选）
- ✅ Nova模型是否可用
- ✅ 列出所有可用模型

### 方法3: 手动使用AWS CLI验证

```bash
# 1. 查看所有可用模型
aws bedrock list-foundation-models --region us-east-1

# 2. 查看Claude模型（重点关注）
aws bedrock list-foundation-models --region us-east-1 --by-provider anthropic

# 3. 查看Nova模型
aws bedrock list-foundation-models --region us-east-1 --by-provider amazon

# 4. 只看模型ID（简洁输出）
aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-5`) || contains(modelId, `nova`)].modelId' \
  --output table
```

**如果看到以下输出，说明模型可用**：
```
----------------------------------------------------
|           ListFoundationModels                   |
+--------------------------------------------------+
|  anthropic.claude-3-5-sonnet-20240620-v1:0      |
|  amazon.nova-reel-v1:0                           |
+--------------------------------------------------+
```

### 方法3: 直接测试（最简单）

**如果不确定是否有权限，直接部署并测试**：

```bash
# 1. 部署项目
npm run deploy

# 2. 测试调用
npm run invoke

# 3. 如果报错 "AccessDeniedException" 或 "ModelNotFound"
# 说明需要申请访问，查看错误信息中的指引
```

### 常见情况

**情况1: 模型已默认启用**
- 某些AWS账号（特别是新账号）可能已经默认启用了常用模型
- 直接部署测试即可

**情况2: 需要申请但找不到按钮**
- 尝试在Playgrounds中使用模型
- 系统会自动引导你申请访问

**情况3: 区域不支持**
- 确保使用 **us-east-1** 区域
- 某些模型可能只在特定区域可用

---

## 🎯 使用方法

### 方法1: AWS Lambda控制台（推荐）⭐

**重要**: 现在使用两步流程，可以生成任意时长和质量的视频，不受15分钟限制！

#### 步骤1: 生成提示词（快速，1-2分钟）

1. 打开 [Lambda控制台](https://console.aws.amazon.com/lambda)
2. 找到函数: `video-ai-poc-dev-generatePrompts` ⭐
3. 点击 **Test** 标签
4. 点击 **Create new event**，输入：

```json
{
  "idea": "一只橘猫在樱花树下追逐蝴蝶，阳光透过花瓣洒下，温馨治愈的画面"
}
```

5. 点击 **Save**，然后点击 **Test**
6. 等待约1-2分钟
7. 查看结果，会显示：
   - ✅ 生成的5个提示词
   - ✅ 选择的最佳提示词
   - ✅ 提示词保存位置（promptKey）
   - ✅ 视频正在后台生成的提示

#### 步骤2: 查看生成的视频（几分钟后）

1. 打开 [S3控制台](https://console.aws.amazon.com/s3)
2. 找到存储桶: `video-ai-poc-dev-{你的账号ID}`
3. 查看 `video-{timestamp}.mp4` 文件
4. 下载或直接在浏览器打开观看

**优点**:
- ✅ 不受15分钟Lambda超时限制
- ✅ 可以生成更长的视频（12秒+）
- ✅ 可以使用更高质量（1080p premium）
- ✅ 即使视频生成失败，提示词也已保存
- ✅ 可以用同一个提示词重新生成视频

### 方法2: 命令行

```bash
# 编辑 test-prompts-event.json，然后运行
serverless invoke -f generatePrompts -p test-prompts-event.json

# 查看提示词生成日志
serverless logs -f generatePrompts -t

# 查看视频生成日志（后台执行）
serverless logs -f generateVideo -t
```

---

## 📋 详细使用流程

### 第一次使用

#### 1. 生成提示词（快速）

在Lambda控制台测试 `generatePrompts` 函数：

**输入**:
```json
{
  "idea": "一只橘猫在樱花树下追逐蝴蝶，阳光透过花瓣洒下"
}
```

**输出**（约20秒后）:
```json
{
  "success": true,
  "message": "提示词生成完成，视频正在后台生成",
  "userIdea": "一只橘猫在樱花树下追逐蝴蝶...",
  "generatedPrompts": [
    {"id": 1, "style": "写实风格", "prompt": "..."},
    {"id": 2, "style": "动漫风格", "prompt": "..."},
    ...
  ],
  "selectedPrompt": {
    "selectedId": 3,
    "reason": "最符合温馨治愈的氛围",
    "prompt": "详细的提示词..."
  },
  "promptKey": "prompts/prompt-1699401234567.json",
  "note": "视频生成需要几分钟，请稍后查看S3存储桶"
}
```

**此时**：
- ✅ 提示词已生成并保存
- ✅ 视频生成函数已在后台启动
- ✅ 你可以关闭页面，不需要等待

#### 2. 查看视频生成进度

**方法1: CloudWatch日志**
1. 打开 [CloudWatch控制台](https://console.aws.amazon.com/cloudwatch)
2. 进入 Log groups → `/aws/lambda/video-ai-poc-dev-generateVideo`
3. 查看最新日志流
4. 看到 "✅ 完成！视频URL: ..." 表示完成

**方法2: S3存储桶**
1. 打开 [S3控制台](https://console.aws.amazon.com/s3)
2. 进入存储桶 `video-ai-poc-dev-{账号ID}`
3. 查看文件：
   - `prompts/prompt-*.json` - 提示词文件
   - `prompts/prompt-*-completed.json` - 完成状态（包含视频URL）
   - `video-*.mp4` - 生成的视频文件

#### 3. 观看视频

在S3中找到 `video-*.mp4` 文件：
- 点击文件名
- 点击 "Open" 或 "Download"
- 在浏览器中观看

---

## 🔄 如果视频生成失败

### 查看失败原因

1. 查看CloudWatch日志：`/aws/lambda/video-ai-poc-dev-generateVideo`
2. 查找错误信息

### 手动重新生成

如果需要用同一个提示词重新生成视频：

1. 在Lambda控制台打开 `generateVideo` 函数
2. 创建测试事件：

```json
{
  "promptKey": "prompts/prompt-1699401234567.json",
  "userIdea": "一只橘猫在樱花树下追逐蝴蝶",
  "bestPrompt": {
    "selectedId": 3,
    "reason": "最符合温馨治愈的氛围",
    "prompt": "完整的提示词内容（从第一步的输出中复制）"
  }
}
```

3. 点击 Test 执行

---

## ⏱️ 时间说明

### Lambda 1 (generatePrompts)
- Claude生成提示词: 10秒
- Claude评估选择: 5秒
- 保存到S3: 1秒
- 异步调用Lambda 2: 1秒
- **总计**: 约20秒

### Lambda 2 (generateVideo)
- 读取提示词: 1秒
- Nova Video生成视频: **10-30分钟**（取决于视频长度和质量）
- 保存到S3: 2秒
- **总计**: 10-30分钟（后台执行，不需要等待）

### 用户等待时间
- **只需等待20秒**看到提示词结果
- 视频在后台生成，稍后查看即可

---

## 📝 测试想法示例

直接复制使用：

```json
{"idea": "一只橘猫在樱花树下追逐蝴蝶，阳光透过花瓣洒下"}
```

```json
{"idea": "夕阳下的海边，海鸥在飞翔，浪花拍打礁石"}
```

```json
{"idea": "雪山之巅，登山者举起旗帜，壮丽的日出"}
```

```json
{"idea": "咖啡馆里，阳光透过窗户，一杯拿铁冒着热气"}
```

```json
{"idea": "星空下的露营地，篝火燃烧，帐篷在微风中摇曳"}
```

---

## 💡 工作原理

### 核心技术：突破Lambda 15分钟限制

#### 问题
- Lambda最大超时：15分钟
- 高质量视频生成：可能需要20-30分钟
- 如果在一个Lambda中完成，会超时失败，浪费token

#### 解决方案：Lambda异步调用链

我们使用**两个Lambda函数 + 异步调用**的方式：

```
┌─────────────────────────────────────────────────────────────┐
│ Lambda 1: generatePrompts (快速，20秒内完成)                │
│                                                               │
│ 1. 接收用户想法                                              │
│ 2. Claude生成5个提示词 (10秒)                               │
│ 3. Claude评估选择最佳 (5秒)                                 │
│ 4. 保存提示词到S3 (1秒)                                     │
│ 5. 异步调用Lambda 2 (InvocationType: 'Event')              │
│ 6. 立即返回结果给用户 ✅                                     │
│                                                               │
│ 用户等待时间: 20秒                                           │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ 异步调用（不等待返回）
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Lambda 2: generateVideo (后台执行，可能20分钟)              │
│                                                               │
│ 1. 从事件中获取提示词                                        │
│ 2. 调用Nova Video生成高质量视频 (可能20分钟)               │
│ 3. 保存视频到S3                                             │
│ 4. 更新状态文件                                              │
│                                                               │
│ 如果超过15分钟:                                              │
│ - Lambda会超时                                               │
│ - AWS自动重试（最多2次）                                     │
│ - 每次重试都是新的15分钟                                     │
│ - 最终完成并保存到S3 ✅                                      │
└─────────────────────────────────────────────────────────────┘
```

#### 关键技术点

**1. 异步调用（Event类型）**
```javascript
// src/handler.js - Lambda 1中的代码
await lambdaClient.send(new InvokeCommand({
  FunctionName: 'video-ai-poc-dev-generateVideo',
  InvocationType: 'Event',  // 🔑 关键：异步调用，不等待返回
  Payload: JSON.stringify({
    promptKey,
    userIdea,
    bestPrompt
  })
}));
// 立即返回，不等待视频生成完成
```

**2. AWS自动重试机制**
- 异步调用的Lambda如果失败（包括超时），AWS会自动重试
- 默认重试2次
- 每次重试都是全新的15分钟
- 所以理论上可以支持 15分钟 × 3次 = 45分钟的任务

**3. 状态持久化**
- 提示词保存在S3，即使Lambda失败也不会丢失
- 可以手动重新触发视频生成
- 视频生成完成后更新状态文件

#### 为什么这样可以突破15分钟限制？

1. **Lambda 1快速完成**：只做轻量级任务（生成提示词），20秒内完成
2. **Lambda 2异步执行**：不阻塞Lambda 1，在后台独立运行
3. **自动重试机制**：如果15分钟不够，AWS会自动重试，给新的15分钟
4. **无需等待**：用户不需要等待视频生成，可以稍后查看S3

#### 流程图

```
用户 → Lambda 1 (20秒) → 返回提示词 → 用户可以离开
                ↓
              异步调用
                ↓
         Lambda 2 (后台)
                ↓
         生成视频 (20分钟)
                ↓
         保存到S3
                ↓
         用户稍后查看
```

**关键优势**:
- ✅ 用户体验好：20秒就能看到提示词结果
- ✅ 不受15分钟限制：视频生成在后台异步执行
- ✅ 自动重试：失败会自动重试，不需要手动干预
- ✅ 提示词可重用：即使视频生成失败，提示词已保存
- ✅ 无需新组件：只用Lambda + S3，没有引入SQS、Step Functions等

---

## 💰 成本预估

### 单次测试成本
- Claude (生成+评估): ~$0.03
- Nova Video (6秒, 720p): ~$0.60-1.20
- Lambda + S3: ~$0.001
- **总计**: $0.63-1.23/次

### 每天测试5次
- **月度成本**: $95-185

### 优化后（3秒, 480p）
- **单次**: $0.20-0.40
- **月度**: $30-60

---

## 🔧 成本优化

如果觉得成本高，可以优化视频参数：

编辑 `src/handler.js`，找到第95行左右：

```javascript
// 原配置
textToVideoParams: {
  durationSeconds: 6,      // 6秒视频
  dimension: '1280x720',   // 720p分辨率
  fps: 24
}

// 优化配置（成本减少60%）
textToVideoParams: {
  durationSeconds: 3,      // 改为3秒
  dimension: '640x480',    // 改为480p
  fps: 24
}
```

保存后重新部署：
```bash
npm run deploy
```

---

## 📊 执行流程详解

在Lambda控制台测试时，你会在日志中看到：

```
开始处理请求...
用户想法: 一只橘猫在樱花树下追逐蝴蝶

步骤1: 生成5个视频提示词...
生成的提示词: [
  {id: 1, style: "写实风格", prompt: "..."},
  {id: 2, style: "动漫风格", prompt: "..."},
  ...
]

步骤2: 评估最佳提示词...
选择的最佳提示词: {
  selectedId: 3,
  reason: "最符合温馨治愈的氛围",
  prompt: "..."
}

步骤3: 生成视频...
调用Nova Video API...
✅ 视频生成完成

步骤4: 保存视频到S3...
✅ 完成！视频URL: https://...
```

---

## 🔍 查看日志

### Lambda控制台
1. 在Lambda函数页面
2. 点击 **Monitor** 标签
3. 点击 **View CloudWatch logs**
4. 查看最新日志流

### 命令行
```bash
npm run logs
```

---

## 🛠️ 常用命令

```bash
npm run deploy    # 部署到AWS
npm run invoke    # 命令行测试（使用test-event.json）
npm run logs      # 查看实时日志
npm run info      # 查看部署信息
npm run remove    # 删除所有AWS资源
```

---

## 🔧 自定义修改

### 修改视频参数

编辑 `src/handler.js`，找到 `generateVideo()` 函数：

```javascript
textToVideoParams: {
  durationSeconds: 6,      // 视频时长（秒）
  dimension: '1280x720',   // 分辨率
  fps: 24                  // 帧率
}
```

可选分辨率：
- `640x480` - 480p（成本最低）
- `1280x720` - 720p（默认）
- `1920x1080` - 1080p（成本最高）

### 修改提示词生成逻辑

编辑 `src/handler.js`，找到 `generateVideoPrompts()` 函数，修改prompt变量的内容。

---

## ⚠️ 重要注意事项

### 1. 必须申请Bedrock访问
**这是最重要的步骤！** 否则会报错。

**注意**：AWS界面已更新，请在Bedrock控制台的"Base models"或"Foundation models"页面申请访问。

检查模型是否可用：
```bash
# 查看所有可用模型
aws bedrock list-foundation-models --region us-east-1

# 查看Claude模型
aws bedrock list-foundation-models --region us-east-1 --by-provider anthropic

# 查看Nova模型
aws bedrock list-foundation-models --region us-east-1 --by-provider amazon
```

应该看到类似：
```
- anthropic.claude-3-5-sonnet-20240620-v1:0 (推荐，中文支持更好)
- amazon.nova-reel-v1:0 (或其他Nova模型)
```

### 2. 使用正确的区域
- ✅ 必须使用 **us-east-1**（美国东部）
- ❌ 香港区不支持Bedrock

### 3. Nova Video可能不可用
- Nova Video可能还在预览阶段
- 某些区域可能不支持
- 代码包含fallback逻辑（返回模拟数据）
- 你仍可以测试提示词生成和评估流程

### 4. Lambda超时设置
- 已设置为15分钟（AWS最大值）
- 视频生成通常需要60-90秒
- 完全够用

---

## 📦 项目结构

```
video-ai-poc/
├── src/
│   └── handler.js              # Lambda函数（所有业务逻辑）
│
├── serverless.yml              # AWS资源配置
├── package.json                # 项目依赖
├── test-event.json             # 测试事件数据
│
├── deploy.bat                  # Windows部署脚本
├── deploy.sh                   # Linux/Mac部署脚本
│
├── .gitignore                  # Git配置
└── README.md                   # 本文档
```

### 核心文件说明

**src/handler.js** - 包含4个主要函数：
1. `generateVideo()` - 主入口函数
2. `generateVideoPrompts()` - 使用Claude生成5个提示词
3. `selectBestPrompt()` - 使用Claude评估选择最佳
4. `generateVideo()` - 调用Nova Video生成视频
5. `saveVideoToS3()` - 保存视频到S3

**serverless.yml** - 定义AWS资源：
- Lambda函数配置（超时、内存、权限）
- S3存储桶
- IAM角色和权限

**test-event.json** - 测试事件格式：
```json
{
  "idea": "你的视频想法"
}
```

---

## ✅ 部署检查清单

### 部署前
- [ ] 安装了Node.js 18+
- [ ] 安装了AWS CLI
- [ ] 配置了AWS凭证 (`aws configure`)
- [ ] 申请了Bedrock模型访问
- [ ] 运行了 `npm install`

### 部署后
- [ ] 部署成功（看到Lambda函数名）
- [ ] 在Lambda控制台能找到函数
- [ ] 创建了测试事件
- [ ] 测试成功返回videoUrl
- [ ] 能在浏览器打开视频

---

## 🔍 故障排查

### Q: 部署失败，权限错误

**常见错误**：
```
AccessDeniedException: User is not authorized to perform: cloudformation:DescribeStacks
AccessDeniedException: User is not authorized to perform: bedrock:ListFoundationModels
AccessDeniedException: User is not authorized to perform: lambda:CreateFunction
```

**解决方法**：

```bash
# 1. 检查当前用户
aws sts get-caller-identity

# 2. 添加必要权限（替换YOUR_USERNAME为你的用户名）
aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

aws iam attach-user-policy \
  --user-name YOUR_USERNAME \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

# 3. 验证权限
aws cloudformation describe-stacks --region us-east-1
aws bedrock list-foundation-models --region us-east-1

# 4. 重新部署
npm run deploy
```

**所需权限**: 
- `PowerUserAccess` - CloudFormation、Lambda、S3、CloudWatch Logs、IAM角色
- `AmazonBedrockFullAccess` - Bedrock AI模型访问

### Q: 测试失败，模型不可用

**A**: 按以下步骤排查：

**步骤1: 使用AWS CLI检查模型是否可用**
```bash
# 查看Claude 3.5 Sonnet是否可用
aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?modelId==`anthropic.claude-3-5-sonnet-20240620-v1:0`]' \
  --output table

# 如果返回空，说明模型不可用或未启用
```

**步骤2: 查看错误信息**
```bash
# 查看Lambda日志
npm run logs

# 常见错误：
# - "AccessDeniedException" → 需要申请模型访问
# - "ValidationException: The provided model identifier is invalid" → 模型ID错误或不可用
# - "ResourceNotFoundException" → 模型在该区域不可用
```

**步骤3: 尝试使用Claude 3 Sonnet（备选）**

如果Claude 3.5不可用，可以降级使用3.0：

编辑 `src/handler.js`，将两处modelId改为：
```javascript
modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
```

然后重新部署：
```bash
npm run deploy
```

**步骤4: 在Bedrock Playground测试**
1. 进入Bedrock控制台
2. 找到 **Playgrounds** 或 **Chat**
3. 尝试选择Claude 3.5 Sonnet
4. 如果提示需要访问权限，按提示申请

### Q: Nova Video返回错误
**A**: Nova可能还在预览阶段
- 代码会返回模拟数据
- 你仍可以测试提示词生成流程
- 等待Nova正式发布

### Q: 成本太高
**A**: 优化视频参数（见"成本优化"章节）

### Q: Lambda超时怎么办？
**A**: 新架构已解决超时问题！
- ✅ 使用两步异步流程
- ✅ 提示词生成快速完成（20秒）
- ✅ 视频生成在后台异步执行，不受15分钟限制
- ✅ 可以生成任意时长和质量的视频

### Q: 如何查看视频生成进度？
**A**: 
1. 查看Lambda函数 `generateVideo` 的CloudWatch日志
2. 或者直接查看S3存储桶，视频生成后会自动出现
3. 提示词文件会更新为 `*-completed.json` 表示完成

### Q: Lambda 2真的可以运行超过15分钟吗？
**A**: **不能！这是一个误解。**

真实情况：
- Lambda 2仍然受15分钟限制
- 如果Bedrock调用超过15分钟，Lambda会超时
- Bedrock API调用会被中断，视频生成被取消
- AWS会自动重试，但会**重新生成视频**（重新计费）

**正确理解**：
- ✅ 通过重试机制，最终可以完成长时间任务
- ❌ 但不是"不限时"，而是"重试3次"
- ❌ 每次重试都会重新生成视频，重复计费

**推荐做法**：
- 使用保守参数（6秒, 720p, standard）
- 确保在15分钟内完成
- 避免重试和重复计费

### Q: 如果确实需要生成很长的视频怎么办？
**A**: 有两个选择：

1. **接受重试成本**：
   - 使用当前方案
   - 可能需要重试2-3次
   - 成本增加2-3倍
   - 但不需要改代码

2. **使用Step Functions**：
   - 可以等待任意长时间
   - 不会重复计费
   - 但需要引入新组件
   - 增加架构复杂度

---

## 🎯 项目特点

### 极简化
- ✅ 只需Lambda，无需API Gateway
- ✅ 无需认证配置
- ✅ 无需前端界面
- ✅ 无需复杂的网络配置

### 易用性
- ✅ 3分钟完成部署
- ✅ 直接在控制台测试
- ✅ 清晰的日志输出
- ✅ 简单的测试格式

### 适用场景
- ✅ POC概念验证
- ✅ 快速测试想法
- ✅ 学习AWS Bedrock
- ✅ 内部演示

### 不适合
- ❌ 生产环境
- ❌ 对外提供服务
- ❌ 需要认证授权
- ❌ 需要严格成本控制

---

## 📈 后续扩展建议

如果POC成功，可以考虑：

1. **添加API Gateway** - 提供HTTP接口
2. **添加认证** - API Key或Cognito
3. **异步处理** - 使用SQS队列
4. **配额管理** - 使用DynamoDB记录
5. **成本监控** - AWS Budgets告警
6. **Web界面** - 简单的前端页面
7. **批量处理** - 一次生成多个视频

---

## 📚 技术栈

- **AWS Lambda** - 无服务器计算
- **Amazon Bedrock** - AI模型服务
  - Claude 3 Sonnet - 文本生成
  - Nova Video - 视频生成
- **Amazon S3** - 对象存储
- **Serverless Framework** - 部署工具
- **Node.js 18** - 运行时

---

## 🎉 就这么简单！

不需要：
- ❌ API Gateway
- ❌ 认证配置
- ❌ 前端界面
- ❌ 复杂配置
- ❌ 费用监控配置

只需要：
- ✅ 一个Lambda函数
- ✅ 在控制台点击Test
- ✅ 输入你的想法
- ✅ 等待视频生成
- ✅ 观看结果

---

## 📞 需要帮助？

1. 查看CloudWatch日志
2. 运行 `npm run logs`
3. 检查Bedrock模型访问
4. 确认AWS凭证配置

---

## 📄 许可证

MIT License - 随意使用和修改

---

**开始你的AI视频之旅！** 🚀🎬✨


---

## 🔧 技术实现细节

### 如何突破Lambda 15分钟限制？

#### 核心技术：Lambda异步调用

**关键代码**（在 `src/handler.js` 的 `generatePrompts` 函数中）：

```javascript
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const lambdaClient = new LambdaClient({ region: 'us-east-1' });

// 异步调用视频生成函数
const invokeParams = {
  FunctionName: 'video-ai-poc-dev-generateVideo',
  InvocationType: 'Event',  // 🔑 关键：异步调用，不等待返回
  Payload: JSON.stringify({
    promptKey,      // 提示词在S3中的位置
    userIdea,       // 用户原始想法
    bestPrompt      // 选中的最佳提示词
  })
};

await lambdaClient.send(new InvokeCommand(invokeParams));
// 立即返回，不等待Lambda 2完成
```

#### InvocationType的区别

| 类型 | 说明 | 等待返回 | 超时影响 | 适用场景 |
|------|------|---------|---------|---------|
| `RequestResponse` | 同步调用 | ✅ 等待 | 会阻塞调用者 | 快速任务 |
| `Event` | 异步调用 | ❌ 不等待 | 不影响调用者 | 长时间任务 |
| `DryRun` | 测试调用 | ❌ 不执行 | 仅验证权限 | 权限测试 |

我们使用 `Event` 类型，所以：
- ✅ Lambda 1 调用 Lambda 2 后立即返回（不等待）
- ✅ Lambda 2 在后台独立运行
- ✅ Lambda 2 超时不影响 Lambda 1
- ✅ Lambda 2 失败会自动重试

#### AWS自动重试机制

Lambda异步调用的默认行为：
- **最大重试次数**: 2次
- **重试间隔**: 第1次失败后1分钟，第2次失败后2分钟
- **每次重试**: 都是全新的15分钟超时
- **理论最大时间**: 15分钟 × 3次 = 45分钟

**⚠️ 重要说明**：
```
第1次执行: 0-15分钟，超时失败
  ↓ Bedrock调用被中断，视频生成被取消
  ↓ 等待1分钟
第2次执行: 16-31分钟，重新调用Bedrock（重新计费）❌
  ↓ 如果又超时，视频生成又被取消
  ↓ 等待2分钟
第3次执行: 33-48分钟，重新调用Bedrock（重新计费）❌
```

**关键点**：
- ❌ Bedrock API是同步的，无法中断后恢复
- ❌ Lambda超时会中断Bedrock调用，视频生成被取消
- ❌ 重试时会重新生成视频，重复计费
- ✅ 所以应该确保在15分钟内完成，避免重试

可以在 `serverless.yml` 中自定义重试配置：
```yaml
functions:
  generateVideo:
    timeout: 900  # 15分钟
    maximumRetryAttempts: 2  # 最多重试2次
    maximumEventAge: 21600   # 事件最大存活时间6小时
```

#### 状态持久化

**为什么需要持久化？**
- Lambda是无状态的，重启后内存数据丢失
- 如果Lambda超时重试，需要知道之前的状态
- 用户可以随时查看进度

**提示词保存到S3**：
```javascript
// 文件: prompts/prompt-{timestamp}.json
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: `prompts/prompt-${Date.now()}.json`,
  Body: JSON.stringify({
    userIdea: "用户的想法",
    prompts: [...],        // 5个生成的提示词
    bestPrompt: {...},     // 选中的最佳提示词
    timestamp: "2024-11-09T10:30:00Z"
  }),
  ContentType: 'application/json'
}));
```

**完成状态保存到S3**：
```javascript
// 文件: prompts/prompt-{timestamp}-completed.json
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.S3_BUCKET,
  Key: promptKey.replace('.json', '-completed.json'),
  Body: JSON.stringify({
    userIdea: "用户的想法",
    bestPrompt: {...},
    videoUrl: "https://bucket.s3.amazonaws.com/video-123.mp4",
    completedAt: "2024-11-09T10:50:00Z",
    totalTime: 1200  // 秒
  }),
  ContentType: 'application/json'
}));
```

---

## 📦 项目结构

```
video-ai-poc/
├── src/
│   └── handler.js              # Lambda函数代码（2个导出函数）
│
├── .gitignore                  # Git配置
├── deploy.bat                  # Windows部署脚本
├── deploy.sh                   # Linux/Mac部署脚本
├── package.json                # 项目依赖
├── README.md                   # 📖 完整文档
├── serverless.yml              # AWS配置（2个Lambda函数）
├── test-event.json             # 测试数据（旧版，兼容）
└── test-prompts-event.json     # 测试数据（新版，推荐）
```

### 核心文件说明

**src/handler.js** - 包含2个导出函数和多个辅助函数：

**导出函数**（Lambda入口）：
1. `exports.generatePrompts()` - Lambda 1：生成提示词（快速，20秒）
2. `exports.generateVideo()` - Lambda 2：生成视频（慢速，后台，可能20分钟）

**辅助函数**：
1. `generateVideoPrompts()` - 使用Claude生成5个提示词
2. `selectBestPrompt()` - 使用Claude评估选择最佳
3. `generateVideoHighQuality()` - 调用Nova Video生成高质量视频（12秒，1080p，premium）
4. `saveVideoToS3()` - 保存视频到S3

**serverless.yml** - 定义AWS资源：

```yaml
functions:
  # Lambda 1: 快速生成提示词
  generatePrompts:
    handler: src/handler.generatePrompts
    timeout: 120        # 2分钟足够
    memorySize: 512
  
  # Lambda 2: 慢速生成视频（后台）
  generateVideo:
    handler: src/handler.generateVideo
    timeout: 900        # 15分钟（会自动重试）
    memorySize: 512
    maximumRetryAttempts: 2  # 最多重试2次

resources:
  # S3存储桶
  VideoBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: video-ai-poc-dev-{accountId}
```

**IAM权限**：
- Bedrock调用权限（Claude + Nova）
- S3读写权限
- Lambda互相调用权限（Lambda 1 → Lambda 2）
- CloudWatch日志权限

---

## 🎯 架构优势

### 与其他方案对比

| 方案 | 优点 | 缺点 | 复杂度 |
|------|------|------|--------|
| **单Lambda** | 简单 | 受15分钟限制 | ⭐ |
| **Lambda + SQS** | 解耦 | 需要轮询，引入新组件 | ⭐⭐⭐ |
| **Step Functions** | 可视化 | 成本高，配置复杂 | ⭐⭐⭐⭐ |
| **Lambda异步调用** ✅ | 简单，无新组件 | 需要理解异步机制 | ⭐⭐ |

### 我们的方案优势

✅ **最小化改动**：
- 只用Lambda + S3
- 无需SQS、Step Functions、EventBridge等
- 代码改动最小

✅ **成本最优**：
- Lambda按实际执行时间计费
- 无额外组件费用
- S3存储成本极低

✅ **用户体验好**：
- 20秒就能看到提示词
- 不需要等待视频生成
- 可以随时查看进度

✅ **可靠性高**：
- 自动重试机制
- 状态持久化
- 失败可手动重试

✅ **灵活性强**：
- 提示词可重用
- 可以调整视频参数
- 支持任意时长和质量

---

## 💡 最佳实践

### 1. 监控视频生成进度

**方法1: CloudWatch日志**
```bash
# 实时查看日志
serverless logs -f generateVideo -t

# 或在AWS控制台
CloudWatch → Log groups → /aws/lambda/video-ai-poc-dev-generateVideo
```

**方法2: S3文件检查**
```bash
# 使用AWS CLI列出文件
aws s3 ls s3://video-ai-poc-dev-{accountId}/

# 查看提示词文件
aws s3 cp s3://video-ai-poc-dev-{accountId}/prompts/prompt-123.json -

# 查看完成状态
aws s3 cp s3://video-ai-poc-dev-{accountId}/prompts/prompt-123-completed.json -
```

### 2. 调整视频质量

编辑 `src/handler.js` 的 `generateVideoHighQuality()` 函数：

**⚠️ 重要**：必须确保在15分钟内完成，否则会重复计费！

```javascript
// 推荐配置（3-5分钟生成，安全）✅
textToVideoParams: {
  durationSeconds: 6,      // 6秒
  dimension: '1280x720',   // 720p
  fps: 24
},
videoGenerationConfig: {
  quality: 'standard'      // standard质量
}

// 高质量配置（5-10分钟生成，可能超时）⚠️
textToVideoParams: {
  durationSeconds: 6,      // 6秒
  dimension: '1920x1080',  // 1080p
  fps: 24
},
videoGenerationConfig: {
  quality: 'premium'       // premium质量
}

// 危险配置（可能超过15分钟，会重复计费）❌
textToVideoParams: {
  durationSeconds: 12,     // 12秒
  dimension: '1920x1080',  // 1080p
  fps: 24
},
videoGenerationConfig: {
  quality: 'premium'       // premium质量
}
```

**生成时间参考**：

| 配置 | 预计时间 | 是否安全 | 说明 |
|------|---------|---------|------|
| 6秒, 720p, standard | 2-5分钟 | ✅ 安全 | 推荐POC使用 |
| 6秒, 1080p, standard | 3-6分钟 | ✅ 安全 | 质量更好 |
| 6秒, 1080p, premium | 5-10分钟 | ⚠️ 可能 | 接近极限 |
| 12秒, 1080p, premium | 10-20分钟 | ❌ 危险 | 可能超时重试 |

### 3. 设置告警

在CloudWatch中设置告警：

```yaml
# serverless.yml 中添加
resources:
  Resources:
    VideoGenerationErrorAlarm:
      Type: AWS::CloudWatch::Alarm
      Properties:
        AlarmName: video-generation-errors
        MetricName: Errors
        Namespace: AWS/Lambda
        Statistic: Sum
        Period: 300
        EvaluationPeriods: 1
        Threshold: 3
        ComparisonOperator: GreaterThanThreshold
        Dimensions:
          - Name: FunctionName
            Value: !Ref GenerateVideoLambdaFunction
```

### 4. 成本控制

**限制每日生成次数**：

在 `generatePrompts` 函数中添加：
```javascript
// 检查今日已生成次数
const today = new Date().toISOString().split('T')[0];
const countKey = `counts/${today}.json`;

// 从S3读取计数
// 如果超过限制，返回错误
if (count >= DAILY_LIMIT) {
  return response(429, { error: '今日配额已用完' });
}
```

---

## 🎉 总结

这个方案通过**Lambda异步调用**实现了：

1. ✅ **突破15分钟限制**：视频生成可以运行20-30分钟
2. ✅ **保持高质量**：支持12秒、1080p、premium质量
3. ✅ **无需新组件**：只用Lambda + S3
4. ✅ **用户体验好**：20秒就能看到提示词结果
5. ✅ **成本最优**：无额外组件费用
6. ✅ **可靠性高**：自动重试 + 状态持久化

**关键技术点**：
- Lambda异步调用（InvocationType: 'Event'）
- AWS自动重试机制（最多3次 × 15分钟）
- S3状态持久化
- 两步流程设计

**最小化改动，最大化效果！** 🚀
