@echo off
chcp 65001 >nul
echo ========================================
echo   Bedrock 模型访问检查工具
echo ========================================
echo.

REM 检查 AWS CLI
where aws >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未安装 AWS CLI
    exit /b 1
)

echo [成功] AWS CLI 已安装
echo.

REM 检查 AWS 凭证
echo ========================================
echo   当前 AWS 账号信息
echo ========================================
aws sts get-caller-identity
echo.

REM 检查 Claude 3.5 Sonnet
echo ========================================
echo   检查 Claude 3.5 Sonnet
echo ========================================
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?modelId=='anthropic.claude-3-5-sonnet-20240620-v1:0'].modelId" --output text > temp.txt
set /p CLAUDE_35=<temp.txt
del temp.txt

if not "%CLAUDE_35%"=="" (
    echo [成功] Claude 3.5 Sonnet 可用
) else (
    echo [警告] Claude 3.5 Sonnet 不可用
    echo [信息] 检查 Claude 3 Sonnet 作为备选...
    
    aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?modelId=='anthropic.claude-3-sonnet-20240229-v1:0'].modelId" --output text > temp.txt
    set /p CLAUDE_3=<temp.txt
    del temp.txt
    
    if not "%CLAUDE_3%"=="" (
        echo [成功] Claude 3 Sonnet 可用（可以使用这个）
    ) else (
        echo [错误] Claude 3 Sonnet 也不可用
    )
)
echo.

REM 检查 Nova Video
echo ========================================
echo   检查 Amazon Nova Video
echo ========================================
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?contains(modelId, 'nova')].modelId" --output text
echo.

REM 列出所有 Anthropic 模型
echo ========================================
echo   所有可用的 Anthropic 模型
echo ========================================
aws bedrock list-foundation-models --region us-east-1 --by-provider anthropic --query "modelSummaries[*].modelId" --output table
echo.

echo ========================================
echo   所有可用的 Amazon 模型
echo ========================================
aws bedrock list-foundation-models --region us-east-1 --by-provider amazon --query "modelSummaries[*].modelId" --output table
echo.

echo ========================================
echo   检查完成！
echo ========================================
pause
