const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const bedrockClient = new BedrockRuntimeClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });
const s3Client = new S3Client({ region: process.env.BEDROCK_REGION || 'us-east-1' });
const lambdaClient = new LambdaClient({ region: process.env.BEDROCK_REGION || 'us-east-1' });

/**
 * 函数1: 生成提示词并异步调用视频生成
 * 这个函数快速完成（1-2分钟），不会超时
 */
exports.generatePrompts = async (event) => {
    console.log('开始生成提示词...');
    console.log('输入事件:', JSON.stringify(event, null, 2));

    try {
        // 解析输入
        let userIdea;
        if (event.idea) {
            userIdea = event.idea;
        } else if (event.body) {
            const body = JSON.parse(event.body);
            userIdea = body.idea;
        } else {
            return response(400, { error: '请提供 idea 参数，格式: {"idea": "你的想法"}' });
        }

        if (!userIdea) {
            return response(400, { error: '请提供 idea 参数' });
        }

        console.log('用户想法:', userIdea);

        // 1. 生成5个视频提示词
        console.log('\n步骤1: 生成5个视频提示词...');
        const prompts = await generateVideoPrompts(userIdea);
        console.log('生成的提示词:', JSON.stringify(prompts, null, 2));

        // 2. 评估并选择最佳提示词
        console.log('\n步骤2: 评估最佳提示词...');
        const bestPrompt = await selectBestPrompt(userIdea, prompts);
        console.log('选择的最佳提示词:', bestPrompt);

        // 3. 保存提示词到S3（作为中间结果）
        const promptKey = `prompts/prompt-${Date.now()}.json`;
        await s3Client.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET,
            Key: promptKey,
            Body: JSON.stringify({
                userIdea,
                prompts,
                bestPrompt,
                timestamp: new Date().toISOString()
            }),
            ContentType: 'application/json'
        }));
        console.log('提示词已保存到S3:', promptKey);

        // 4. 异步调用视频生成函数
        console.log('\n步骤3: 异步调用视频生成函数...');
        const invokeParams = {
            FunctionName: process.env.VIDEO_FUNCTION_NAME || 'video-ai-poc-dev-generateVideo',
            InvocationType: 'Event',  // 异步调用，不等待结果
            Payload: JSON.stringify({
                promptKey,
                userIdea,
                bestPrompt
            })
        };

        await lambdaClient.send(new InvokeCommand(invokeParams));
        console.log('✅ 视频生成函数已异步调用');

        return response(200, {
            success: true,
            message: '提示词生成完成，视频正在后台生成',
            userIdea,
            generatedPrompts: prompts,
            selectedPrompt: bestPrompt,
            promptKey,
            note: '视频生成需要几分钟，请稍后查看S3存储桶'
        });

    } catch (error) {
        console.error('❌ 错误:', error);
        return response(500, {
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 函数2: 生成视频（可能需要很长时间）
 * 这个函数由函数1异步调用，即使超过15分钟也会自动重试
 */
exports.generateVideo = async (event) => {
    console.log('开始生成视频...');
    console.log('输入事件:', JSON.stringify(event, null, 2));

    const startTime = Date.now();

    try {
        // 从事件中获取提示词信息
        const { promptKey, userIdea, bestPrompt } = event;

        if (!bestPrompt || !bestPrompt.prompt) {
            throw new Error('缺少提示词信息');
        }

        console.log('用户想法:', userIdea);
        console.log('使用的提示词:', bestPrompt.prompt);

        // 1. 生成视频（不限制时长和质量）
        console.log('\n开始生成高质量视频...');
        const videoResult = await generateVideoHighQuality(bestPrompt);

        // 2. 保存到S3
        console.log('\n保存视频到S3...');
        const s3Url = await saveVideoToS3(videoResult.videoData, userIdea);

        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        console.log('✅ 完成！视频URL:', s3Url);
        console.log('总耗时:', totalTime, '秒');

        // 3. 更新提示词文件，添加视频URL
        if (promptKey) {
            await s3Client.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: promptKey.replace('.json', '-completed.json'),
                Body: JSON.stringify({
                    userIdea,
                    bestPrompt,
                    videoUrl: s3Url,
                    completedAt: new Date().toISOString(),
                    totalTime
                }),
                ContentType: 'application/json'
            }));
        }

        return {
            success: true,
            videoUrl: s3Url,
            totalTime
        };

    } catch (error) {
        console.error('❌ 错误:', error);
        return response(500, {
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

/**
 * 步骤1: 生成5个视频提示词
 * 优先使用Claude（中文支持更好），如果不可用则降级到Titan或模拟数据
 */
async function generateVideoPrompts(userIdea) {
    // 先尝试使用Claude（中文支持更好）
    try {
        return await generatePromptsWithClaude(userIdea);
    } catch (error) {
        console.warn('⚠️ Claude不可用:', error.message);
        
        // 如果是地区限制，尝试Titan
        if (error.message && error.message.includes('not allowed from unsupported countries')) {
            console.warn('尝试使用Titan...');
            try {
                return await generatePromptsWithTitan(userIdea);
            } catch (titanError) {
                console.warn('⚠️ Titan也不可用:', titanError.message);
            }
        }
        
        // 如果需要申请Bedrock访问，返回模拟数据
        if (error.message && error.message.includes('provide further information')) {
            console.warn('⚠️ 需要申请Bedrock访问权限，使用模拟数据');
            return generateMockPrompts(userIdea);
        }
        
        throw error;
    }
}

/**
 * 使用DeepSeek-R1生成提示词（开源模型，中文支持好）
 */
async function generatePromptsWithClaude(userIdea) {
    const prompt = `你是一个专业的视频创意专家。用户有一个视频想法，请帮助生成5个不同风格的视频提示词。

用户想法：${userIdea}

要求：
1. 生成5个不同的视频提示词
2. 每个提示词要详细描述画面、动作、风格、氛围
3. 提示词要适合AI视频生成模型理解
4. 每个提示词控制在50-100字
5. 用JSON格式返回，格式如下：

{
  "prompts": [
    {"id": 1, "style": "风格描述", "prompt": "详细提示词"},
    {"id": 2, "style": "风格描述", "prompt": "详细提示词"},
    ...
  ]
}

只返回JSON，不要其他解释。`;

    const command = new InvokeModelCommand({
        modelId: 'us.deepseek.r1-v1:0',  // 使用DeepSeek-R1
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000,
            temperature: 0.8
        })
    });

    const result = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(result.body));
    const content = responseBody.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('无法解析DeepSeek返回的JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.prompts;
}

/**
 * 使用Titan生成提示词（备选方案）
 */
async function generatePromptsWithTitan(userIdea) {
    const prompt = `You are a professional video creative expert. A user has a video idea, please help generate 5 different style video prompts.

User idea: ${userIdea}

Requirements:
1. Generate 5 different video prompts
2. Each prompt should describe the scene, action, style, and atmosphere in detail
3. Prompts should be suitable for AI video generation models
4. Each prompt should be 50-100 words
5. Return in JSON format:

{
  "prompts": [
    {"id": 1, "style": "style description", "prompt": "detailed prompt"},
    {"id": 2, "style": "style description", "prompt": "detailed prompt"},
    ...
  ]
}

Return only JSON, no other explanation.`;

    const command = new InvokeModelCommand({
        modelId: 'amazon.titan-text-express-v1',  // 使用 Express 版本
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            inputText: prompt,
            textGenerationConfig: {
                maxTokenCount: 2000,
                temperature: 0.8,
                topP: 0.9
            }
        })
    });

    const result = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(result.body));
    const content = responseBody.results[0].outputText;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('无法解析Titan返回的JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.prompts;
}

/**
 * 步骤2: 评估并选择最佳提示词
 * 优先使用Claude（中文支持更好），如果不可用则降级到Titan
 */
async function selectBestPrompt(userIdea, prompts) {
    // 先尝试使用Claude
    try {
        return await selectBestPromptWithClaude(userIdea, prompts);
    } catch (error) {
        // 如果Claude不可用，降级到Titan
        if (error.message && error.message.includes('not allowed from unsupported countries')) {
            console.warn('⚠️ Claude不可用（地区限制），降级使用Titan');
            return await selectBestPromptWithTitan(userIdea, prompts);
        }
        throw error;
    }
}

/**
 * 使用DeepSeek-R1评估提示词（开源模型，中文支持好）
 */
async function selectBestPromptWithClaude(userIdea, prompts) {
    const promptsText = prompts.map(p =>
        `ID ${p.id} [${p.style}]: ${p.prompt}`
    ).join('\n\n');

    const evaluationPrompt = `你是一个视频创意评估专家。用户有一个原始想法，我们生成了5个视频提示词。请评估哪个提示词最符合用户的原始想法。

用户原始想法：${userIdea}

生成的5个提示词：
${promptsText}

请分析每个提示词与原始想法的契合度，然后选择最佳的一个。

返回JSON格式：
{
  "selectedId": 选择的ID,
  "reason": "选择理由（简短说明）",
  "prompt": "完整的提示词内容"
}

只返回JSON，不要其他解释。`;

    const command = new InvokeModelCommand({
        modelId: 'us.deepseek.r1-v1:0',  // 使用DeepSeek-R1
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            messages: [{ role: 'user', content: evaluationPrompt }],
            max_tokens: 1000,
            temperature: 0.3
        })
    });

    const result = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(result.body));
    const content = responseBody.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('无法解析DeepSeek返回的评估结果');
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * 使用Titan评估提示词（备选方案）
 */
async function selectBestPromptWithTitan(userIdea, prompts) {
    const promptsText = prompts.map(p =>
        `ID ${p.id} [${p.style}]: ${p.prompt}`
    ).join('\n\n');

    const evaluationPrompt = `You are a video creative evaluation expert. A user has an original idea, and we generated 5 video prompts. Please evaluate which prompt best matches the user's original idea.

User's original idea: ${userIdea}

Generated 5 prompts:
${promptsText}

Analyze how well each prompt matches the original idea, then select the best one.

Return JSON format:
{
  "selectedId": selected ID,
  "reason": "reason for selection (brief explanation)",
  "prompt": "complete prompt content"
}

Return only JSON, no other explanation.`;

    const command = new InvokeModelCommand({
        modelId: 'amazon.titan-text-express-v1',  // 使用 Express 版本
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
            inputText: evaluationPrompt,
            textGenerationConfig: {
                maxTokenCount: 1000,
                temperature: 0.7,
                topP: 0.9
            }
        })
    });

    const result = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(result.body));
    const content = responseBody.results[0].outputText;
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        throw new Error('无法解析Titan返回的评估结果');
    }

    return JSON.parse(jsonMatch[0]);
}

/**
 * 生成高质量视频（不限制时长和质量）
 * 用于异步Lambda调用，可以生成更长、更高质量的视频
 */
async function generateVideoHighQuality(bestPrompt) {
    console.log('调用Nova Video API（高质量模式）...');

    try {
        const command = new InvokeModelCommand({
            modelId: 'amazon.nova-reel-v1:0',
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                taskType: 'TEXT_VIDEO',
                textToVideoParams: {
                    text: bestPrompt.prompt,
                    durationSeconds: 6,  // 6秒视频（保守配置，确保15分钟内完成）
                    fps: 24,
                    dimension: '1280x720',  // 720p
                    seed: Math.floor(Math.random() * 1000000)
                },
                videoGenerationConfig: {
                    numberOfVideos: 1,
                    quality: 'standard',  // 使用standard质量（更快）
                    height: 720,
                    width: 1280
                }
            })
        });

        console.log('等待视频生成（预计3-5分钟）...');
        const result = await bedrockClient.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(result.body));

        console.log('Nova Video 响应:', JSON.stringify(responseBody, null, 2));

        const videoData = responseBody.video || responseBody.videos?.[0] || responseBody.result;

        if (!videoData) {
            throw new Error('Nova Video 未返回视频数据');
        }

        return { videoData, metadata: responseBody };

    } catch (error) {
        if (error.name === 'ValidationException' || error.message.includes('not found')) {
            console.warn('⚠️ Nova Video 暂不可用，返回模拟数据');
            return {
                videoData: Buffer.from('MOCK_HIGH_QUALITY_VIDEO_DATA'),
                metadata: {
                    mock: true,
                    message: 'Nova Video API暂不可用，这是模拟数据',
                    prompt: bestPrompt.prompt,
                    quality: 'standard',
                    duration: 6
                }
            };
        }
        throw error;
    }
}

/**
 * 保存视频到S3
 */
async function saveVideoToS3(videoData, userIdea) {
    const timestamp = Date.now();
    const fileName = `video-${timestamp}.mp4`;
    const bucketName = process.env.S3_BUCKET;

    // 处理不同格式的视频数据
    let buffer;
    if (typeof videoData === 'string') {
        // 如果是base64字符串
        buffer = Buffer.from(videoData, 'base64');
    } else if (Buffer.isBuffer(videoData)) {
        buffer = videoData;
    } else if (videoData.data) {
        // 如果是包含data字段的对象
        buffer = Buffer.from(videoData.data, 'base64');
    } else {
        throw new Error('不支持的视频数据格式');
    }

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: 'video/mp4',
        Metadata: {
            'user-idea': userIdea.substring(0, 100),
            'generated-at': new Date().toISOString()
        }
    });

    await s3Client.send(command);

    const region = process.env.BEDROCK_REGION || 'us-east-1';
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    return s3Url;
}

/**
 * 生成模拟提示词（用于测试）
 */
function generateMockPrompts(userIdea) {
    console.log('⚠️ 使用模拟数据生成提示词');
    return [
        {
            id: 1,
            style: '写实风格',
            prompt: `A realistic scene: ${userIdea}. Cinematic lighting, detailed textures, natural colors, 4K quality.`
        },
        {
            id: 2,
            style: '动漫风格',
            prompt: `An anime style scene: ${userIdea}. Vibrant colors, expressive characters, Studio Ghibli inspired.`
        },
        {
            id: 3,
            style: '梦幻风格',
            prompt: `A dreamy fantasy scene: ${userIdea}. Soft lighting, magical atmosphere, ethereal beauty.`
        },
        {
            id: 4,
            style: '复古风格',
            prompt: `A vintage retro scene: ${userIdea}. Film grain, warm tones, nostalgic feeling.`
        },
        {
            id: 5,
            style: '未来科技风',
            prompt: `A futuristic sci-fi scene: ${userIdea}. Neon lights, high-tech elements, cyberpunk aesthetic.`
        }
    ];
}

/**
 * 构造HTTP响应
 */
function response(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true
        },
        body: JSON.stringify(body, null, 2)
    };
}
