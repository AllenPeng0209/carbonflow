import OpenAI from 'openai';

export interface CarbonFactorSearchOptimizerInput {
  nodeLabel: string;
  nodeType:
    | 'product'
    | 'manufacturing'
    | 'distribution'
    | 'usage'
    | 'disposal'
    | 'finalProduct';
  lifecycleStage?: string;
  emissionType?: string;
  contextData?: {
    material?: string;
    weight?: number;
    energyType?: string;
    transportationMode?: string;
    [key: string]: any;
  };
}

export interface CarbonFactorSearchOptimizerResult {
  optimizedQuery: string;
  confidence: number; // 0-1之间的置信度
  reasoning: string;
  alternativeQueries?: string[]; // 备选搜索词
  suggestedDatabase?: string; // 建议的数据库（如ecoinvent, IPCC等）
}

interface CarbonFactorSearchOptimizerAgentOptions {
  input: CarbonFactorSearchOptimizerInput;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  language?: 'zh' | 'en'; // 输出语言偏好
}

/**
 * 碳因子搜索词优化Agent
 *
 * 使用AI大模型根据节点信息生成最优的英文搜索词，用于查询ecoinvent等碳因子数据库
 *
 * @param options - 配置选项
 * @returns Promise<CarbonFactorSearchOptimizerResult> 优化结果
 */
export async function optimizeCarbonFactorSearchWithLlmAgent({
  input,
  apiKey = process.env.DASHSCOPE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    'sk-fa57208fc8184dd89310666789d16faa',
  baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model = 'qwen-plus',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  language = 'zh',
}: CarbonFactorSearchOptimizerAgentOptions): Promise<CarbonFactorSearchOptimizerResult> {
  console.log('[CarbonFactorSearchOptimizerAgent] ===== 开始搜索词优化 =====');
  console.log('[CarbonFactorSearchOptimizerAgent] 输入信息:', input);

  // 构建详细的prompt
  const prompt = `
你是碳足迹数据专家，专门负责为碳排放因子数据库查询生成最优的英文搜索词。

请为以下节点信息生成最优的英文搜索词，用于查询ecoinvent、IPCC、DEFRA等国际碳因子数据库：

节点信息：
- 标签: ${input.nodeLabel}
- 节点类型: ${input.nodeType}
- 生命周期阶段: ${input.lifecycleStage || '未指定'}
- 排放类型: ${input.emissionType || '未指定'}
- 上下文数据: ${JSON.stringify(input.contextData || {}, null, 2)}

要求：
1. 搜索词必须是英文，符合国际碳排放数据库的标准命名规范
2. 优先使用ecoinvent数据库中的标准活动名称格式
3. 考虑节点的生命周期阶段和具体活动类型
4. 确保搜索词能够匹配到相关的碳排放因子
5. 提供2-3个备选搜索词以提高匹配成功率

输出严格的JSON格式：
{
  "optimizedQuery": "主要优化搜索词（英文）",
  "confidence": 0.85,
  "reasoning": "优化原因和策略说明",
  "alternativeQueries": ["备选搜索词1", "备选搜索词2"],
  "suggestedDatabase": "建议的数据库名称"
}

注意事项：
- 不要输出markdown格式或其他说明文字
- confidence应为0-1之间的数值
- 优化搜索词应该具体且准确
- 考虑地理区域和技术特征（如适用）
`;

  console.log('[CarbonFactorSearchOptimizerAgent] 生成的Prompt:', prompt);

  const openai = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });

  let llmResponseText: string | null = null;

  try {
    console.log('[CarbonFactorSearchOptimizerAgent] 🚀 调用LLM API');

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          '你是专业的碳足迹数据专家，擅长为国际碳排放数据库生成标准化的英文搜索词。',
      },
      { role: 'user', content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.3, // 低温度确保输出一致性
    });

    if (
      completion &&
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
    ) {
      llmResponseText = completion.choices[0].message.content;
      console.log('[CarbonFactorSearchOptimizerAgent] ✅ 收到LLM响应');
    } else {
      throw new Error('无法从LLM API返回中提取内容');
    }
  } catch (error: any) {
    console.error(
      '[CarbonFactorSearchOptimizerAgent] ❌ LLM API调用失败:',
      error,
    );
    // 在API调用失败时，也返回一个备选结果，而不是抛出错误
    return {
      optimizedQuery: input.nodeLabel,
      confidence: 0.5,
      reasoning: 'LLM API调用失败，使用原始标签作为备选方案',
      alternativeQueries: [input.nodeLabel],
      suggestedDatabase: 'ecoinvent',
    };
  }

  if (!llmResponseText || llmResponseText.trim() === '') {
    // 同样，如果响应为空，返回备选结果
    return {
      optimizedQuery: input.nodeLabel,
      confidence: 0.5,
      reasoning: 'LLM返回内容为空，使用原始标签作为备选方案',
      alternativeQueries: [input.nodeLabel],
      suggestedDatabase: 'ecoinvent',
    };
  }

  // 解析JSON响应
  let parsedResult: any;

  try {
    // 清理可能的markdown格式
    const cleaned = llmResponseText.trim().replace(/^```json\s*|\s*```$/g, '');
    parsedResult = JSON.parse(cleaned);
    console.log('[CarbonFactorSearchOptimizerAgent] 🔍 JSON解析成功');
  } catch (error) {
    console.error(
      '[CarbonFactorSearchOptimizerAgent] ❌ JSON解析失败:',
      error,
    );
    console.error(
      '[CarbonFactorSearchOptimizerAgent] 原始响应:',
      llmResponseText,
    );

    // 提供备选方案
    return {
      optimizedQuery: input.nodeLabel,
      confidence: 0.5,
      reasoning: 'LLM响应解析失败，使用原始标签作为备选方案',
      alternativeQueries: [input.nodeLabel],
      suggestedDatabase: 'ecoinvent',
    };
  }

  // 验证响应格式
  if (
    !parsedResult ||
    typeof parsedResult.optimizedQuery !== 'string' ||
    typeof parsedResult.confidence !== 'number' ||
    typeof parsedResult.reasoning !== 'string'
  ) {
    console.warn(
      '[CarbonFactorSearchOptimizerAgent] ⚠️ 响应格式不完整，使用备选方案',
    );

    return {
      optimizedQuery: input.nodeLabel,
      confidence: 0.5,
      reasoning: 'LLM响应格式不完整，使用原始标签作为备选方案',
      alternativeQueries: [input.nodeLabel],
      suggestedDatabase: 'ecoinvent',
    };
  }

  // 确保confidence在合理范围内
  if (parsedResult.confidence < 0 || parsedResult.confidence > 1) {
    parsedResult.confidence = Math.max(
      0,
      Math.min(1, parsedResult.confidence),
    );
  }

  console.log('[CarbonFactorSearchOptimizerAgent] ✅ 搜索词优化完成:', {
    original: input.nodeLabel,
    optimized: parsedResult.optimizedQuery,
    confidence: parsedResult.confidence,
  });

  return {
    optimizedQuery: parsedResult.optimizedQuery,
    confidence: parsedResult.confidence,
    reasoning: parsedResult.reasoning,
    alternativeQueries: parsedResult.alternativeQueries || [input.nodeLabel],
    suggestedDatabase: parsedResult.suggestedDatabase || 'ecoinvent',
  };
} 