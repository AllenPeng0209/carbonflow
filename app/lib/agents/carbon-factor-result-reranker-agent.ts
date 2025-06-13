import OpenAI from 'openai';

export interface CarbonFactorCandidate {
  factor: number;
  activityName: string;
  unit: string;
  geography?: string;
  activityUUID?: string;
  dataSource?: string;
  importDate?: string;
  originalScore?: number; // API原始评分
}

export interface CarbonFactorRerankerInput {
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
    targetGeography?: string; // 目标地理区域
    [key: string]: any;
  };
  candidates: CarbonFactorCandidate[];
}

export interface CarbonFactorRerankerResult {
  rankings: Array<{
    index: number; // 原始索引
    score: number; // AI评分 (0-1)
    reasoning: string; // 评分原因
    confidence: number; // 置信度 (0-1)
  }>;
  bestMatch: CarbonFactorCandidate & {
    aiScore: number;
    aiReasoning: string;
  };
  summary: {
    totalCandidates: number;
    averageConfidence: number;
    recommendationStrength: 'strong' | 'moderate' | 'weak';
  };
}

interface CarbonFactorRerankerAgentOptions {
  input: CarbonFactorRerankerInput;
  apiKey?: string;
  baseURL?: string;
  model?: string;
  maxCandidates?: number; // 最多重排序的候选数量
}

/**
 * 生成备选结果（当AI解析失败时）
 */
function generateFallbackResult(
  candidates: CarbonFactorCandidate[],
): CarbonFactorRerankerResult {
  if (!candidates || candidates.length === 0) {
    // This should ideally not be reached if the calling function checks, but as a safeguard:
    return {
      rankings: [],
      bestMatch: {} as any, // Cannot form a best match
      summary: {
        totalCandidates: 0,
        averageConfidence: 0,
        recommendationStrength: 'weak',
      },
    };
  }
  const rankings = candidates.map((_, index) => ({
    index: index + 1,
    score: 1 - index * 0.1,
    reasoning: 'AI模型调用失败或返回格式错误，按原始API返回顺序排列',
    confidence: 0.5,
  }));

  return {
    rankings,
    bestMatch: {
      ...candidates[0],
      aiScore: 0.8, // Assign a default score
      aiReasoning:
        'AI模型调用失败，使用原始API返回的第一个结果作为备选方案',
    },
    summary: {
      totalCandidates: candidates.length,
      averageConfidence: 0.5,
      recommendationStrength: 'weak',
    },
  };
}

/**
 * 碳因子结果重排序Agent
 *
 * 使用AI大模型对碳因子查询结果进行智能重排序，选出最佳匹配
 *
 * @param options - 配置选项
 * @returns Promise<CarbonFactorRerankerResult> 重排序结果
 */
export async function rerankCarbonFactorResultsWithLlmAgent({
  input,
  apiKey = process.env.DASHSCOPE_API_KEY ||
    process.env.OPENAI_API_KEY ||
    'sk-fa57208fc8184dd89310666789d16faa',
  baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  model = 'qwen-plus',
  maxCandidates = 10,
}: CarbonFactorRerankerAgentOptions): Promise<CarbonFactorRerankerResult> {
  console.log('[CarbonFactorRerankerAgent] ===== 开始结果重排序 =====');
  console.log('[CarbonFactorRerankerAgent] 输入信息:', {
    nodeLabel: input.nodeLabel,
    nodeType: input.nodeType,
    candidatesCount: input.candidates.length,
  });

  if (!input.candidates || input.candidates.length === 0) {
    console.warn('[CarbonFactorRerankerAgent] 没有候选碳因子结果需要重排序');
    return generateFallbackResult([]);
  }

  // 限制候选数量以控制成本和响应时间
  const limitedCandidates = input.candidates.slice(0, maxCandidates);

  // 构建详细的prompt
  const candidatesDescription = limitedCandidates
    .map(
      (candidate, index) => `
候选 ${index + 1}:
- 活动名称: ${candidate.activityName}
- 碳因子: ${candidate.factor} kg CO2eq/${candidate.unit}
- 地理位置: ${candidate.geography || '未指定'}
- 数据源: ${candidate.dataSource || '未指定'}
- 活动UUID: ${candidate.activityUUID || '未指定'}
- 导入日期: ${candidate.importDate || '未指定'}
- 原始评分: ${candidate.originalScore || '未指定'}`,
    )
    .join('\n');

  const prompt = `
你是专业的碳足迹数据分析专家，请为以下节点的碳因子候选结果进行智能重排序。

节点信息：
- 标签: ${input.nodeLabel}
- 节点类型: ${input.nodeType}
- 生命周期阶段: ${input.lifecycleStage || '未指定'}
- 排放类型: ${input.emissionType || '未指定'}
- 上下文数据: ${JSON.stringify(input.contextData || {}, null, 2)}

候选碳因子结果：
${candidatesDescription}

评估标准（按重要性排序）：
1. 活动名称与节点标签的语义相关性 (40%)
2. 生命周期阶段的匹配度 (25%)
3. 地理位置的适用性 (15%)
4. 数据源的权威性和可靠性 (10%)
5. 碳因子数值的合理性 (5%)
6. 数据时效性 (5%)

请返回严格的JSON格式：
{
  "rankings": [
    {
      "index": 1,
      "score": 0.95,
      "reasoning": "具体的评分原因说明",
      "confidence": 0.9
    }
  ],
  "bestMatch": {
    "factor": 候选1的factor值,
    "activityName": "候选1的activityName",
    "unit": "候选1的unit",
    "geography": "候选1的geography",
    "activityUUID": "候选1的activityUUID",
    "dataSource": "候选1的dataSource",
    "importDate": "候选1的importDate",
    "aiScore": 0.95,
    "aiReasoning": "选择此候选的综合原因"
  },
  "summary": {
    "totalCandidates": ${limitedCandidates.length},
    "averageConfidence": 0.85,
    "recommendationStrength": "strong"
  }
}

注意事项：
- 按从高到低的score顺序排列所有候选
- score和confidence都应为0-1之间的数值
- recommendationStrength应为 "strong", "moderate", 或 "weak"
- 不要输出markdown格式或其他说明文字
`;

  const openai = new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true,
  });

  let llmResponseText: string | null = null;

  try {
    console.log('[CarbonFactorRerankerAgent] 🚀 调用LLM API');

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          '你是专业的碳足迹数据分析专家，擅长评估和排序碳排放因子的相关性和质量。',
      },
      { role: 'user', content: prompt },
    ];

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 2048,
      temperature: 0.2, // 低温度确保评分一致性
    });

    if (
      completion &&
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
    ) {
      llmResponseText = completion.choices[0].message.content;
      console.log('[CarbonFactorRerankerAgent] ✅ 收到LLM响应');
    } else {
      throw new Error('无法从LLM API返回中提取内容');
    }
  } catch (error: any) {
    console.error('[CarbonFactorRerankerAgent] ❌ LLM API调用失败:', error);
    return generateFallbackResult(limitedCandidates);
  }

  if (!llmResponseText || llmResponseText.trim() === '') {
    console.error('[CarbonFactorRerankerAgent] LLM返回内容为空');
    return generateFallbackResult(limitedCandidates);
  }

  // 解析JSON响应
  let parsedResult: any;

  try {
    // 清理可能的markdown格式
    const cleaned = llmResponseText.trim().replace(/^```json\s*|\s*```$/g, '');
    parsedResult = JSON.parse(cleaned);
    console.log('[CarbonFactorRerankerAgent] 🔍 JSON解析成功');
  } catch (error) {
    console.error('[CarbonFactorRerankerAgent] ❌ JSON解析失败:', error);
    console.error('[CarbonFactorRerankerAgent] 原始响应:', llmResponseText);

    // 提供备选方案：按原始顺序排列
    return generateFallbackResult(limitedCandidates);
  }

  // 验证响应格式
  if (
    !parsedResult ||
    !Array.isArray(parsedResult.rankings) ||
    !parsedResult.bestMatch ||
    !parsedResult.summary
  ) {
    console.warn(
      '[CarbonFactorRerankerAgent] ⚠️ 响应格式不完整，使用备选方案',
    );
    return generateFallbackResult(limitedCandidates);
  }

  // 验证最佳匹配是否存在于候选中
  const bestMatchFromRanking =
    parsedResult.rankings.length > 0 ? parsedResult.rankings[0] : null;

  if (
    !bestMatchFromRanking ||
    bestMatchFromRanking.index < 1 ||
    bestMatchFromRanking.index > limitedCandidates.length
  ) {
    console.warn(
      '[CarbonFactorRerankerAgent] ⚠️ 最佳匹配索引无效，使用备选方案',
    );
    return generateFallbackResult(limitedCandidates);
  }

  // 将 bestMatch 与 rankings 中的最佳匹配项同步
  const bestCandidate = limitedCandidates[bestMatchFromRanking.index - 1];
  parsedResult.bestMatch = {
    ...bestCandidate,
    aiScore: bestMatchFromRanking.score,
    aiReasoning: bestMatchFromRanking.reasoning,
  };

  console.log('[CarbonFactorRerankerAgent] ✅ 结果重排序完成:', {
    bestMatch: parsedResult.bestMatch.activityName,
    topScore: parsedResult.rankings[0]?.score,
    recommendationStrength: parsedResult.summary.recommendationStrength,
  });

  return parsedResult as CarbonFactorRerankerResult;
} 