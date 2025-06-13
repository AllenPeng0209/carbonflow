import OpenAI from 'openai';

/**
 * Defines the structure for each item parsed by the CsvParsingAgent.
 * 适应不输出nodeType的新结构
 */
export interface CsvParseResultItem {
  data: Record<string, any> & { label: string }; // data对象必须包含label
}

/**
 * Interface defining the options required to initialize the CsvParsingAgent.
 */
interface CsvParsingAgentOptions {
  csvContent: string; // The CSV text content to parse
  llmProviderName: string; // Name of the LLM provider (for logging, less relevant now)
  apiKey?: string; // API Key for the LLM provider
  baseURL?: string; // Base URL for the LLM provider API
  model?: string; // Model name to use
}

/**
 * Child Agent: CsvParsingAgent
 *
 * Responsible for calling an LLM to parse CSV content, determine the nodeType
 * for each row, and return a validated array of structured node data.
 *
 * @param options - Configuration including the CSV content, API key, baseURL, and model.
 * @returns A Promise resolving to an array of CsvParseResultItem objects.
 * @throws {Error} If the LLM API call fails, or if the response is empty,
 *                 invalid JSON, not an array, or contains no valid items
 *                 matching the expected structure.
 */
export async function parseCsvWithLlmAgent({
  csvContent,
  apiKey = process.env.DASHSCOPE_API_KEY || process.env.OPENAI_API_KEY,
  baseURL = 'https://dashscope.aliyuncs.com/compatible-mode/v1', // Default baseURL from example
  model = 'qwen-plus',
}: CsvParsingAgentOptions): Promise<CsvParseResultItem[]> {
  console.log('[CsvParsingAgent] ===== 开始CSV解析 =====');
  console.log('[CsvParsingAgent] 解析时间:', new Date().toISOString());
  console.log('[CsvParsingAgent] 配置参数:', {
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    baseURL,
    model,
    csvContentLength: csvContent?.length,
  });

  console.log(`[CsvParsingAgent] 使用官方OpenAI SDK兼容API开始CSV解析...`);

  // --- 1. Construct the Prompt (Remains the same) ---
  console.log('[CsvParsingAgent] 🔨 构建解析提示词');

  const prompt = `
You are an expert data extraction assistant specializing in carbon footprint lifecycle analysis.
Your task is to meticulously parse the following CSV data. Each row likely represents a material, component, or process step in a product's lifecycle.

Follow these instructions precisely:

1.  **提取标签:** 为每行提取清晰简洁的名称或标识符。这必须放在每个'data'对象内的'label'字段中。'label'字段不能为空。

2.  **提取所有基础数据:** 对每行，始终填充以下基础字段:
    * label: 描述性标签(必填)
    * nodeId: 节点名称(必填)
    * lifecycleStage: 生命周期阶段(必填) // 请从以下选项中选择一个：原材料获取阶段、生产制造阶段、分销运输阶段、使用阶段、寿命终止阶段
    * emissionType: 排放类型(必填) // 请从以下选项中选择一个：原材料运输、原材料获取、生产制造、分销运输、产品使用、废弃物处理
    * quantity: 数量(必填) // 数量后面不要加单位
    * activityUnit: 数量单位(必填) // 把数量后面的单位加上（重量、体积、计数、包装、能源）, example: kg, 本, 吨, m³, 加仑, kWh, 箱
    * activitydataSource: 活动数据来源(有则填，无则设为空字符串)
    * activityScore: 活动评分(有则填，无则设为空字符串)
    * activityScorelevel: 活动评分等级(有则填，无则设为空字符串)
    
    

3.  **根据生命周期阶段提取专属数据:** 根据第2步确定的lifecycleStage，每行还需要包含相应字段:
    * 如果是原材料获取阶段:
      - material: 材料种类
      - weight_per_unit: 单位重量(数值，无则设为0)
      - weight: 重量(数值，无则设为0)
      - supplier: 供应商(无则设为空字符串)
      - isRecycled: 是否回收(布尔值，无则设为false)
      - recycledContent: 回收成分(无则设为空字符串)
      - recycledContentPercentage: 回收成分百分比(数值，无则设为0)
      - sourcingRegion: 采购区域(无则设为空字符串)

    * 如果是生产阶段:
      - energyConsumption: 能源消耗(数值，无则设为0)
      - energyType: 能源类型(无则设为空字符串)
      - productionMethod: 生产方法(无则设为空字符串)
      - waterConsumption: 水消耗(数值，无则设为0)
      - processEfficiency: 工艺效率(数值，无则设为0)
      - wasteGeneration: 废物产生(数值，无则设为0)

    * 如果是分销运输阶段:
      - transportationMode: 运输方式(无则设为空字符串)
      - transportationDistance: 运输距离(数值，无则设为0)
      - startPoint: 起点(无则设为空字符串)
      - endPoint: 终点(无则设为空字符串)
      - packagingMaterial: 包装材料(无则设为空字符串)
      - vehicleType: 车辆类型(无则设为空字符串)
      - fuelType: 燃料类型(无则设为空字符串)

    * 如果是使用阶段:
      - lifespan: 寿命(数值，无则设为0)
      - energyConsumptionPerUse: 每次使用能耗(数值，无则设为0)
      - waterConsumptionPerUse: 每次使用水耗(数值，无则设为0)
      - usageFrequency: 使用频率(数值，无则设为0)
      - maintenanceFrequency: 维护频率(数值，无则设为0)

    * 如果是寿命终止阶段:
      - recyclingRate: 回收率(数值，无则设为0)
      - landfillPercentage: 填埋比例(数值，无则设为0)
      - disposalMethod: 处置方法(无则设为空字符串)
      - endOfLifeTreatment: 生命周期结束处理(无则设为空字符串)
      - hazardousWasteContent: 有害废物含量(数值，无则设为0)

4.  **处理缺失数据:** 如果某行缺少关键字段，提取其他可用信息，但不要编造数据。

5.  **数量跟重量的填写：** 当这个表的数量跟重量是同一个字段时，请将数量设定为重量, 并且给出单位

6.  **输出格式:** 您的*整个*输出必须是单个有效的JSON数组。数组中的每个对象代表一个成功解析的行，并且必须具有以下结构：
    {
      "data": {          
        "label": "必需的标签",
        "nodeId": "必需的标签(同label)",
        "lifecycleStage": "生命周期阶段",
        "emissionType": "排放类型",
        "quantity": "数量",
        "activityUnit": "数量单位",
        "其他所有必要字段": "对应值"
      }
    }

7.  **严格JSON数组:** 不要在JSON数组之前或之后包含*任何*文本。没有介绍、解释、道歉或markdown格式。只有JSON数组本身。

CSV Data:
\`\`\`
${csvContent}
\`\`\`
`;

  console.log('[CsvParsingAgent] 提示词长度:', prompt.length);

  // --- 2. Call LLM API using official OpenAI SDK ---
  let llmResponseText: string | null = null; // Initialize to null

  console.log('[CsvParsingAgent] 🚀 初始化OpenAI客户端');

  const openai = new OpenAI({
    apiKey,
    baseURL,
  });

  try {
    console.log(`[CsvParsingAgent] 📡 调用LLM API - 模型: ${model}, 时间: ${new Date().toISOString()}`);

    // Define messages with types compatible with OpenAI SDK
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: 'You are an expert data extraction assistant.' },
      { role: 'user', content: prompt },
    ];

    console.log('[CsvParsingAgent] 请求参数:', {
      model,
      messagesCount: messages.length,
      maxTokens: 8192,
    });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: 8192, // Ensure this parameter is appropriate and supported
      // temperature: 0, // Optional: for deterministic output, if needed
    });

    console.log(`[CsvParsingAgent] ✅ LLM API调用完成 - 时间: ${new Date().toISOString()}`);

    if (
      completion &&
      completion.choices &&
      completion.choices[0] &&
      completion.choices[0].message &&
      completion.choices[0].message.content
    ) {
      llmResponseText = completion.choices[0].message.content;
      console.log(`[CsvParsingAgent] 收到响应内容，长度: ${llmResponseText.length}`);

      // console.log("[CsvParsingAgent] Raw LLM Response content:", llmResponseText); // Uncomment for full response
    } else {
      console.error('[CsvParsingAgent] ❌ 无法从LLM响应中提取内容');
      console.error('[CsvParsingAgent] 响应结构:', JSON.stringify(completion, null, 2));
      throw new Error('Could not extract content from LLM response.');
    }

    // Log usage if available and needed
    if (completion.usage) {
      console.log(`[CsvParsingAgent] Token使用情况: ${JSON.stringify(completion.usage)}`);
    }
  } catch (error: any) {
    console.error(`[CsvParsingAgent] ❌ OpenAI API调用或处理过程中发生错误:`);
    console.error('[CsvParsingAgent] 完整错误对象:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    if (error.status) {
      console.error('[CsvParsingAgent] 错误状态:', error.status);
    }

    if (error.message) {
      console.error('[CsvParsingAgent] 错误消息:', error.message);
    }

    if (error.response && error.response.data) {
      console.error('[CsvParsingAgent] 错误响应数据:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.error) {
      console.error('[CsvParsingAgent] 嵌套错误详情:', JSON.stringify(error.error, null, 2));
    }

    // It's important to also log the state of llmResponseText if an error occurs after it might have been (or not been) set.
    console.error(`[CsvParsingAgent] 错误时状态: llmResponseText="${llmResponseText}"`);
    throw error;
  }

  if (!llmResponseText || llmResponseText.trim() === '') {
    console.error('[CsvParsingAgent] ❌ LLM响应内容为空或null');
    throw new Error('LLM response content was empty or null after API call.');
  }

  console.log('[CsvParsingAgent] 🔍 开始解析和验证响应');

  // --- 3. Parse and Validate Response (Remains largely the same) ---
  let parsedJson: any;

  try {
    const cleanedResponse = llmResponseText.trim().replace(/^```json\\s*|\\s*```$/g, '');
    console.log('[CsvParsingAgent] 清理后的响应长度:', cleanedResponse.length);

    parsedJson = JSON.parse(cleanedResponse);
    console.log('[CsvParsingAgent] ✅ JSON解析成功');
  } catch (error) {
    console.error('[CsvParsingAgent] ❌ LLM响应JSON解析失败:', error);
    console.error('[CsvParsingAgent] 导致错误的原始响应:', llmResponseText);
    throw new Error(`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(parsedJson)) {
    console.error('[CsvParsingAgent] ❌ 解析的JSON不是数组');
    console.error('[CsvParsingAgent] 响应内容:', parsedJson);
    throw new Error('Parsed JSON response is not an array.');
  }

  console.log(`[CsvParsingAgent] 📊 开始验证 ${parsedJson.length} 个项目`);

  // --- 4. Validate Individual Items and Filter ---
  const validItems: CsvParseResultItem[] = [];

  for (const [index, item] of parsedJson.entries()) {
    console.log(`[CsvParsingAgent] 验证第 ${index + 1}/${parsedJson.length} 个项目`);

    if (
      item &&
      typeof item === 'object' &&
      item.data &&
      typeof item.data === 'object' &&
      typeof item.data.label === 'string' &&
      item.data.label.trim() !== ''
    ) {
      console.log(`[CsvParsingAgent] ✅ 项目 ${index + 1} 验证通过: ${item.data.label}`);
      validItems.push(item as CsvParseResultItem);
    } else {
      console.warn(`[CsvParsingAgent] ⚠️ 跳过无效项目 ${index + 1}:`, item);
    }
  }

  if (validItems.length === 0) {
    console.error('[CsvParsingAgent] ❌ 解析和验证后没有找到有效项目');
    console.error('[CsvParsingAgent] 原始解析数组:', parsedJson);
    throw new Error('No valid items found in the LLM response after parsing and validation.');
  }

  console.log(`[CsvParsingAgent] ✅ CSV解析完成，成功验证 ${validItems.length} 个项目`);
  console.log(
    '[CsvParsingAgent] 有效项目预览:',
    validItems.slice(0, 2).map((item) => ({
      label: item.data.label,
    })),
  );

  return validItems;
}
