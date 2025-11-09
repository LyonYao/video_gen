@echo off
chcp 65001 >nul
echo ========================================
echo   Video AI POC 部署脚本
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未安装 Node.js，请先安装
    exit /b 1
)
echo [成功] Node.js 已安装

REM 检查 AWS CLI
where aws >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未安装 AWS CLI，请先安装并配置
    exit /b 1
)
echo [成功] AWS CLI 已安装

REM 检查 Serverless
where serverless >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [信息] 正在安装 Serverless Framework...
    npm install -g serverless
)
echo [成功] Serverless Framework 已就绪

REM 安装依赖
echo.
echo [信息] 正在安装项目依赖...
call npm install

REM 检查 Bedrock 模型访问权限
echo.
echo ========================================
echo   检查 Bedrock 模型访问权限
echo ========================================
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?contains(modelId, 'claude') || contains(modelId, 'nova')].modelId" --output table

echo.
echo [警告] 请确认以上模型可用
echo        如果没有看到 claude 或 nova 模型：
echo        1. 访问 AWS Console -^> Bedrock
echo        2. 启用 Claude 和 Nova 模型
echo.
pause

REM 部署
echo.
echo ========================================
echo   正在部署到 AWS...
echo ========================================
call serverless deploy --verbose

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo.
echo 下一步：
echo   1. 登录 AWS Lambda 控制台
echo   2. 找到函数: video-ai-poc-dev-generatePrompts
echo   3. 点击 Test，输入: {"idea": "你的想法"}
echo   4. 等待 20 秒生成提示词
echo   5. 几分钟后查看 S3 存储桶获取视频
echo.
echo 或者命令行测试：
echo   npm run invoke
echo.
echo 查看日志：
echo   npm run logs
echo.
pause
