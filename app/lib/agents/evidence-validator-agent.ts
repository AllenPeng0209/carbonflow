import { GoogleGenAI } from '@google/genai';
import * as fs from 'fs';
import * as path from 'path';
// 确保Blob在较老版本的Node.js中可用
if (typeof globalThis.Blob === 'undefined') {
  const { Blob } = require('buffer');
  globalThis.Blob = Blob;
}

/**
 * 定义证据验证结果的接口
 * 包含验证是否通过以及相关原因
 */
export interface EvidenceValidationResult {
  isValid: boolean;           // 验证是否通过
  reason: string;             // 验证结果的原因
  details?: Record<string, any>; // 可选的详细信息
}

/**
 * 定义证据验证代理选项的接口
 */
interface EvidenceValidatorAgentOptions {
  sourceName: string;         // 排放源名称，例如"电力"
  activityValue: number | string; // 活动数据值，例如12334
  activityUnit: string;       // 活动数据单位，例如"kWh"
  evidencePath: string;       // 证据文件路径
  apiKey?: string;            // Gemini API密钥
  model?: string;             // 使用的模型名称
}

/**
 * 子代理: EvidenceValidatorAgent
 * 
 * 负责调用Gemini API验证排放源证据，判断图片内容是否能够作为排放源数据的有效证据。
 * 
 * @param options - 配置，包括排放源名称、活动数据值、活动数据单位、证据文件路径、API密钥和模型名称。
 * @returns Promise，解析为包含验证结果的EvidenceValidationResult对象。
 * @throws {Error} 如果API调用失败，或者证据文件不存在/不是图片格式。
 */
export async function validateEvidenceWithLlmAgent({
  sourceName,
  activityValue,
  activityUnit,
  evidencePath,
  apiKey = process.env.GOOGLE_GEMINI_API_KEY,
  model = 'gemini-2.0-flash-001',
}: EvidenceValidatorAgentOptions): Promise<EvidenceValidationResult> {
  console.log('[EvidenceValidatorAgent] ===== 开始证据验证 =====');
  console.log('[EvidenceValidatorAgent] 验证时间:', new Date().toISOString());
  console.log('[EvidenceValidatorAgent] 配置参数:', {
    sourceName,
    activityValue,
    activityUnit,
    evidencePath,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length,
    model,
  });

  // 检查API密钥是否可用
  if (!apiKey) {
    console.error('[EvidenceValidatorAgent] ❌ 缺少API密钥');
    throw new Error('缺少API密钥。请设置GOOGLE_GEMINI_API_KEY环境变量。');
  }

  // 检查证据文件是否存在
  if (!fs.existsSync(evidencePath)) {
    console.error(`[EvidenceValidatorAgent] ❌ 证据文件不存在: ${evidencePath}`);
    throw new Error(`证据文件不存在: ${evidencePath}`);
  }

  // 检查文件是否为图片（通过扩展名）
  const fileExt = path.extname(evidencePath).toLowerCase();
  const supportedImageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  
  if (!supportedImageFormats.includes(fileExt)) {
    console.error(`[EvidenceValidatorAgent] ❌ 不支持的文件格式: ${fileExt}`);
    throw new Error(`不支持的文件格式: ${fileExt}。当前仅支持图片格式 (${supportedImageFormats.join(', ')})`);
  }

  console.log(`[EvidenceValidatorAgent] 使用Google Gemini API开始证据验证...`);

  // --- 1. 构建提示词 ---
  console.log('[EvidenceValidatorAgent] 🔨 构建验证提示词');

  const prompt = `
你是一位专业的碳排放数据审核专家。请分析以下图片，并验证其是否能够作为以下排放源数据的有效证据：

排放源名称: ${sourceName}
活动数据值: ${activityValue}
活动数据单位: ${activityUnit}

请检查以下几点:
1. 图片中是否能清晰看到与排放源相关的信息？
2. 图片中显示的数值是否与提供的活动数据值匹配或接近？
3. 图片中显示的单位是否与提供的活动数据单位匹配？
4. 图片是否看起来是真实的文件（如账单、发票、计量表读数等）？
5. 图片中的日期信息是否合理（如果有日期）？

请以JSON格式返回你的分析结果，格式如下：
{
  "isValid": true或false,
  "confidence": 0-100之间的数字，表示你对结论的置信度,
  "matchingPoints": [列出匹配的关键点],
  "discrepancies": [列出不匹配的关键点],
  "suggestion": "对用户的建议",
  "finalReason": "最终结论的简要解释"
}

只返回JSON格式，不要包含其他解释或markdown格式。
`;

  console.log('[EvidenceValidatorAgent] 提示词长度:', prompt.length);

  // --- 2. 调用Gemini API ---
  let llmResponseText: string | null = null; // 初始化为null

  console.log('[EvidenceValidatorAgent] 🚀 初始化Google Gemini客户端');

  try {
    console.log(`[EvidenceValidatorAgent] 📡 调用Gemini API - 模型: ${model}, 时间: ${new Date().toISOString()}`);

    // 初始化Google Gemini API
    const ai = new GoogleGenAI({apiKey});
    
    console.log('[EvidenceValidatorAgent] 请求参数:', {
      model,
      evidencePath,
    });

    // 上传文件
    console.log(`[EvidenceValidatorAgent] 上传证据文件: ${evidencePath}`);
    
    // 读取文件并创建Blob对象
    const fileBuffer = fs.readFileSync(evidencePath);
    const fileExtension = path.extname(evidencePath).toLowerCase();
    
    // 根据文件扩展名确定MIME类型
    let mimeType = 'image/jpeg'; // 默认
    if (fileExtension === '.png') mimeType = 'image/png';
    else if (fileExtension === '.gif') mimeType = 'image/gif';
    else if (fileExtension === '.webp') mimeType = 'image/webp';
    
    // 创建Blob对象
    const fileBlob = new Blob([fileBuffer], { type: mimeType });
    
    // 使用Blob上传文件
    const file = await ai.files.upload({
      file: fileBlob
    });
    
    console.log(`[EvidenceValidatorAgent] 文件上传成功, URI: ${file.uri}, 类型: ${file.mimeType}`);

    // 发送请求给Gemini
    const response = await ai.models.generateContent({
      model,
      contents: [
        prompt, 
        {fileData: {fileUri: file.uri, mimeType: file.mimeType}}
      ],
    });

    console.log(`[EvidenceValidatorAgent] ✅ Gemini API调用完成 - 时间: ${new Date().toISOString()}`);
    
    // 确保响应文本存在
    if (response && response.text) {
      llmResponseText = response.text;
      console.log(`[EvidenceValidatorAgent] 收到响应内容，长度: ${llmResponseText.length}`);
    } else {
      console.error('[EvidenceValidatorAgent] ❌ 未收到有效的响应文本');
      throw new Error('未收到有效的响应文本');
    }
    // console.log("[EvidenceValidatorAgent] 原始响应内容:", llmResponseText); // 取消注释以查看完整响应

  } catch (error: any) {
    console.error(`[EvidenceValidatorAgent] ❌ Gemini API调用或处理过程中发生错误:`);
    console.error('[EvidenceValidatorAgent] 完整错误对象:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

    if (error.message) {
      console.error('[EvidenceValidatorAgent] 错误消息:', error.message);
    }

    console.error(`[EvidenceValidatorAgent] 错误时状态: llmResponseText="${llmResponseText}"`);
    throw error;
  }

  if (!llmResponseText || llmResponseText.trim() === '') {
    console.error('[EvidenceValidatorAgent] ❌ Gemini响应内容为空或null');
    throw new Error('Gemini响应内容为空或null');
  }

  console.log('[EvidenceValidatorAgent] 🔍 开始解析和验证响应');

  // --- 3. 解析和验证响应 ---
  let parsedJson: any;

  try {
    // 尝试从响应中提取JSON（可能被markdown代码块包围）
    let jsonText = llmResponseText;
    const jsonMatch = llmResponseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
      console.log('[EvidenceValidatorAgent] 从markdown代码块中提取了JSON');
    }

    const cleanedResponse = jsonText.trim();
    console.log('[EvidenceValidatorAgent] 清理后的响应长度:', cleanedResponse.length);

    parsedJson = JSON.parse(cleanedResponse);
    console.log('[EvidenceValidatorAgent] ✅ JSON解析成功');
  } catch (error) {
    console.error('[EvidenceValidatorAgent] ❌ Gemini响应JSON解析失败:', error);
    console.error('[EvidenceValidatorAgent] 导致错误的原始响应:', llmResponseText);

    // 处理非JSON响应
    // 如果响应包含积极的语言，则假设验证通过
    const positiveIndicators = ['匹配', '一致', '有效', '通过', '正确', 'valid', 'match', 'confirm'];
    const hasPositiveIndication = positiveIndicators.some(term => llmResponseText.toLowerCase().includes(term));
    
    return {
      isValid: hasPositiveIndication,
      reason: hasPositiveIndication ? 
        '证据可能有效: AI无法提供结构化结果，但发现积极指标' : 
        '证据可能无效: AI无法提供结构化结果，且未发现积极指标',
      details: { rawResponse: llmResponseText }
    };
  }

  // --- 4. 验证JSON结构和返回结果 ---
  if (
    parsedJson &&
    typeof parsedJson === 'object' &&
    typeof parsedJson.isValid === 'boolean' &&
    typeof parsedJson.finalReason === 'string'
  ) {
    console.log(`[EvidenceValidatorAgent] ✅ 验证完成，结果: ${parsedJson.isValid ? '通过' : '未通过'}`);
    
    return {
      isValid: parsedJson.isValid,
      reason: parsedJson.finalReason,
      details: parsedJson
    };
  } else {
    console.error('[EvidenceValidatorAgent] ❌ 解析的JSON缺少必要字段');
    console.error('[EvidenceValidatorAgent] 解析的JSON:', parsedJson);
    
    // 尝试从响应中推断结果
    const isValidInferred = 
      typeof parsedJson.isValid === 'boolean' ? parsedJson.isValid :
      typeof parsedJson.valid === 'boolean' ? parsedJson.valid :
      llmResponseText.toLowerCase().includes('有效') || 
      llmResponseText.toLowerCase().includes('通过') ||
      llmResponseText.toLowerCase().includes('valid') || 
      llmResponseText.toLowerCase().includes('pass');
      
    return {
      isValid: isValidInferred,
      reason: parsedJson.finalReason || parsedJson.reason || 
        (isValidInferred ? '证据可能有效，但结构化响应不完整' : '证据可能无效，且结构化响应不完整'),
      details: parsedJson
    };
  }
}