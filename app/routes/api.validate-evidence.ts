import { type ActionFunctionArgs, json } from '@remix-run/node'; // or @remix-run/cloudflare
import { validateEvidenceWithLlmAgent } from '~/lib/agents/evidence-validator-agent';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const GOOGLE_GEMINI_MODEL = 'gemini-2.0-flash-001'; // 或其他适合的Gemini模型

const FALLBACK_GOOGLE_GEMINI_API_KEY = 'AIzaSyCgnMMooi1kxMlFxjXrSGyC6KmikYQR5tI'; // 替换为你的实际备用密钥或移除

export async function action({ request, context }: ActionFunctionArgs) {
  console.log('[API /api/validate-evidence] ===== 收到证据验证请求 =====');
  console.log('[API /api/validate-evidence] 请求时间:', new Date().toISOString());

  // 检查请求方法
  if (request.method !== 'POST') {
    console.warn('[API /api/validate-evidence] ❌ 请求方法不是POST，返回405');
    return json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  console.log('[API /api/validate-evidence] ✅ 请求方法验证通过');

  // 获取API密钥
  const geminiApiKeyFromEnv = context?.cloudflare?.env?.GOOGLE_GEMINI_API_KEY as string | undefined;
  let apiKeyToUse: string | undefined = geminiApiKeyFromEnv;
  const apiKeySource = 'Cloudflare binding (context.cloudflare.env.GOOGLE_GEMINI_API_KEY)';

  console.log('[API /api/validate-evidence] API Key配置:', {
    source: apiKeySource,
    hasKey: !!apiKeyToUse,
    keyLength: apiKeyToUse?.length,
    keyType: typeof apiKeyToUse,
  });

  if (!apiKeyToUse) {
    console.warn(`[API /api/validate-evidence] ⚠️ 从${apiKeySource}获取API Key失败，使用备用Key`);
    apiKeyToUse = FALLBACK_GOOGLE_GEMINI_API_KEY;

    if (!apiKeyToUse || apiKeyToUse === 'your-fallback-api-key' || apiKeyToUse.length < 10) {
      console.error('[API /api/validate-evidence] ❌ 备用API Key无效或为占位符');
      return json({ error: 'LLM Service Misconfigured: Invalid Fallback API Key' }, { status: 500 });
    }

    console.log('[API /api/validate-evidence] ✅ 使用备用API Key');
  }

  try {
    console.log('[API /api/validate-evidence] 🔍 开始解析请求体');

    // 使用FormData解析带有文件的请求
    const formData = await request.formData();
    
    // 提取表单数据
    const sourceName = formData.get('sourceName') as string;
    const activityValue = formData.get('activityValue') as string;
    const activityUnit = formData.get('activityUnit') as string;
    const evidenceFile = formData.get('evidenceFile') as File;

    console.log('[API /api/validate-evidence] 请求数据:', {
      sourceName,
      activityValue,
      activityUnit,
      hasEvidenceFile: !!evidenceFile,
      evidenceFileName: evidenceFile?.name,
      evidenceFileType: evidenceFile?.type,
      evidenceFileSize: evidenceFile?.size,
    });

    // 验证必要参数
    if (!sourceName || !activityValue || !activityUnit || !evidenceFile) {
      console.warn('[API /api/validate-evidence] ❌ 缺少必要参数');
      return json({ 
        error: 'Missing required parameters. Please provide sourceName, activityValue, activityUnit, and evidenceFile.' 
      }, { status: 400 });
    }

    // 检查文件类型
    const supportedImageFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!supportedImageFormats.includes(evidenceFile.type)) {
      console.warn(`[API /api/validate-evidence] ❌ 不支持的文件格式: ${evidenceFile.type}`);
      return json({ 
        error: `Unsupported file format: ${evidenceFile.type}. Supported formats: ${supportedImageFormats.join(', ')}` 
      }, { status: 400 });
    }

    // 将文件保存到临时目录
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(tempDir, `evidence-${Date.now()}-${evidenceFile.name}`);
    
    // 将文件内容转换为ArrayBuffer并保存
    const buffer = await evidenceFile.arrayBuffer();
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));
    
    console.log(`[API /api/validate-evidence] ✅ 证据文件保存至临时路径: ${tempFilePath}`);

    // 调用验证函数
    console.log('[API /api/validate-evidence] 🚀 调用validateEvidenceWithLlmAgent...');
    const validationResult = await validateEvidenceWithLlmAgent({
      sourceName,
      activityValue,
      activityUnit,
      evidencePath: tempFilePath,
      apiKey: apiKeyToUse,
      model: GOOGLE_GEMINI_MODEL,
    });

    // 清理临时文件
    try {
      fs.unlinkSync(tempFilePath);
      console.log(`[API /api/validate-evidence] ✅ 已删除临时文件: ${tempFilePath}`);
    } catch (cleanupError) {
      console.warn(`[API /api/validate-evidence] ⚠️ 无法删除临时文件: ${tempFilePath}`, cleanupError);
    }

    console.log('[API /api/validate-evidence] ✅ 验证完成，结果:', {
      isValid: validationResult.isValid,
      reason: validationResult.reason,
      hasDetails: !!validationResult.details,
    });

    // 返回结果，确保中文正确显示
    return json({
      success: true,
      data: validationResult
    }, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } catch (error) {
    console.error('[API /api/validate-evidence] ❌ 证据验证过程中发生错误:', error);
    console.error('[API /api/validate-evidence] 错误详情:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return json({ error: `Failed to validate evidence: ${errorMessage}` }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8'
      }
    });
  } finally {
    console.log('[API /api/validate-evidence] ===== 请求处理完成 =====');
  }
}