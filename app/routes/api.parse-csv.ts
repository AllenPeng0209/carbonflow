import { type ActionFunctionArgs, json } from '@remix-run/node'; // or @remix-run/cloudflare
import { parseCsvWithLlmAgent } from '~/lib/agents/csv-parser';

/**
 * Constants for the Aliyun Dashscope LLM configuration.
 */
const LLM_PROVIDER_NAME = 'Aliyun';
const DASHSCOPE_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const DASHSCOPE_MODEL = 'qwen-plus'; // Or your preferred model, e.g., qwen-turbo, qwen-max

/**
 * Fallback API key - ensure this is a valid key if you rely on this fallback mechanism.
 * It is strongly recommended to set the API key via .env and bindings.
 */
const FALLBACK_DASHSCOPE_API_KEY = 'sk-fa57208fc8184dd89310666789d16faa'; // Replace with your actual fallback or remove if not needed

export async function action({ request, context }: ActionFunctionArgs) {
  console.log('[API /api/parse-csv] ===== 收到解析请求 =====');
  console.log('[API /api/parse-csv] 请求时间:', new Date().toISOString());

  // --- BEGIN DETAILED DEBUGGING ---
  console.log('[API /api/parse-csv] 检查context.cloudflare.env对象:');

  if (context && context.cloudflare && context.cloudflare.env) {
    console.log('[API /api/parse-csv] cloudflare.env存在');

    const rawApiKeyFromEnv = context.cloudflare.env.DASHSCOPE_API_KEY;
    console.log(`[API /api/parse-csv] 原始DASHSCOPE_API_KEY: "${rawApiKeyFromEnv}"`);
    console.log(`[API /api/parse-csv] API Key类型: ${typeof rawApiKeyFromEnv}`);
  } else {
    console.log('[API /api/parse-csv] ❌ context.cloudflare.env不可用');
  }

  // --- END DETAILED DEBUGGING ---

  if (request.method !== 'POST') {
    console.warn('[API /api/parse-csv] ❌ 请求方法不是POST，返回405');
    return json({ error: 'Method Not Allowed' }, { status: 405 });
  }

  console.log('[API /api/parse-csv] ✅ 请求方法验证通过');

  const dashscopeApiKeyFromEnv = context?.cloudflare?.env?.DASHSCOPE_API_KEY as string | undefined;
  let apiKeyToUse: string | undefined = dashscopeApiKeyFromEnv;
  const apiKeySource = 'Cloudflare binding (context.cloudflare.env.DASHSCOPE_API_KEY)';

  console.log('[API /api/parse-csv] API Key配置:', {
    source: apiKeySource,
    hasKey: !!apiKeyToUse,
    keyLength: apiKeyToUse?.length,
    keyType: typeof apiKeyToUse,
  });

  if (!apiKeyToUse) {
    console.warn(`[API /api/parse-csv] ⚠️ 从${apiKeySource}获取API Key失败，使用备用Key`);
    apiKeyToUse = FALLBACK_DASHSCOPE_API_KEY;

    if (!apiKeyToUse || apiKeyToUse === 'YOUR_FALLBACK_DASHSCOPE_API_KEY_HERE' || apiKeyToUse.length < 10) {
      console.error('[API /api/parse-csv] ❌ 备用API Key无效或为占位符');
      return json({ error: 'LLM Service Misconfigured: Invalid Fallback API Key' }, { status: 500 });
    }

    console.log('[API /api/parse-csv] ✅ 使用备用API Key');
  }

  try {
    console.log('[API /api/parse-csv] 🔍 开始解析请求体');

    const payload = (await request.json()) as {
      csvContent?: unknown;
      fileContentAsCsvString?: unknown;
      originalFileName?: string;
    };

    // 支持新旧参数名，优先使用新的参数名
    const { csvContent, fileContentAsCsvString, originalFileName } = payload;
    const contentToProcess = fileContentAsCsvString || csvContent;

    console.log('[API /api/parse-csv] 请求负载:', {
      hasFileContentAsCsvString: !!fileContentAsCsvString,
      hasCsvContent: !!csvContent,
      hasOriginalFileName: !!originalFileName,
      contentType: typeof contentToProcess,
      contentLength: typeof contentToProcess === 'string' ? contentToProcess.length : 'N/A',
      originalFileName,
    });

    if (!contentToProcess || typeof contentToProcess !== 'string' || contentToProcess.trim() === '') {
      console.warn('[API /api/parse-csv] ❌ 请求负载中缺少或无效的文件内容');
      return json({ error: 'Missing or invalid csvContent' }, { status: 400 });
    }

    console.log('[API /api/parse-csv] ✅ 请求负载验证通过');
    console.log('[API /api/parse-csv] 文件内容预览:', contentToProcess.substring(0, 200) + '...');

    console.log('[API /api/parse-csv] 🚀 调用parseCsvWithLlmAgent...');
    console.log('[API /api/parse-csv] LLM配置:', {
      provider: LLM_PROVIDER_NAME,
      endpoint: DASHSCOPE_ENDPOINT,
      model: DASHSCOPE_MODEL,
      hasApiKey: !!apiKeyToUse,
      originalFileName,
    });

    const parsedItems = await parseCsvWithLlmAgent({
      csvContent: contentToProcess,
      llmProviderName: LLM_PROVIDER_NAME,
      apiKey: apiKeyToUse,
      baseURL: DASHSCOPE_ENDPOINT,
      model: DASHSCOPE_MODEL,
    });

    console.log(`[API /api/parse-csv] ✅ 解析成功，获得 ${parsedItems.length} 个项目`);
    console.log('[API /api/parse-csv] 解析结果预览:', parsedItems.slice(0, 2));

    const response = { success: true, data: parsedItems };
    console.log('[API /api/parse-csv] 返回响应:', {
      success: response.success,
      dataLength: response.data.length,
    });

    return json(response);
  } catch (error) {
    console.error('[API /api/parse-csv] ❌ CSV处理或LLM交互过程中发生错误:', error);
    console.error('[API /api/parse-csv] 错误详情:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined,
    });

    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

    return json({ error: `Failed to parse CSV: ${errorMessage}` }, { status: 500 });
  } finally {
    console.log('[API /api/parse-csv] ===== 请求处理完成 =====');
  }
}

/*
 * Optional: Add a loader function if you need to handle GET requests for this route
 * export async function loader({ request }: LoaderFunctionArgs) {
 *   return json({ message: "POST requests only for CSV parsing." });
 * }
 */
