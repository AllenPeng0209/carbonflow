import type { CarbonFlowAction } from '~/types/actions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { handleCreateNode } from './handleCreateNode';

/**
 * 文件解析與批量創建節點（支持多格式，API優先，前端兜底）
 */

// 定义解析结果项的接口（适应不输出nodeType的情况）
interface ParseResultItem {
  data: Record<string, any> & { label: string }; // data对象必须包含label
}

export async function handleFileParseAndCreateNodes(
  store: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> {
  console.log('[handleFileParseAndCreateNodes] ===== 开始文件解析和节点创建 =====');
  console.log('[handleFileParseAndCreateNodes] 执行时间:', new Date().toISOString());
  console.log('[handleFileParseAndCreateNodes] 输入参数:', {
    hasStore: !!store,
    actionType: action.type,
    operation: action.operation,
    fileName: (action as any).fileName,
    fileId: (action as any).fileId,
    dataLength: action.data?.length,
  });

  if (!action.data) {
    console.error('[handleFileParseAndCreateNodes] ❌ File Parse 操作缺少 data (file content) 字段');
    return;
  }

  const fileNameFromAction = (action as any).fileName || 'unknown_file';
  const fileIdFromAction = (action as any).fileId || fileNameFromAction; // 优先使用fileId，回退到fileName
  console.log('[handleFileParseAndCreateNodes] 文件名:', fileNameFromAction);
  console.log('[handleFileParseAndCreateNodes] 文件ID:', fileIdFromAction);

  const fileContent = action.data;
  console.log('[handleFileParseAndCreateNodes] 文件内容预览:', {
    contentLength: fileContent.length,
    contentPreview: fileContent.substring(0, 200) + '...',
    contentType: typeof fileContent,
  });

  let parsedResult: ParseResultItem[] = [];
  let parseError: string | null = null;

  console.log('[handleFileParseAndCreateNodes] 🚀 开始调用API解析文件');

  try {
    console.log('[handleFileParseAndCreateNodes] 发送POST请求到 /api/parse-csv');
    console.log('[handleFileParseAndCreateNodes] 请求体内容:', {
      csvContentLength: fileContent.length,
      csvContentPreview: fileContent.substring(0, 200) + '...',
    });

    const response = await fetch('/api/parse-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ csvContent: fileContent }),
    });

    console.log('[handleFileParseAndCreateNodes] API响应状态:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    if (!response.ok) {
      console.error('[handleFileParseAndCreateNodes] ❌ API响应不成功');

      const errorBody = await response.json().catch(() => ({ message: 'Failed to parse error response' }));
      console.error('[handleFileParseAndCreateNodes] 错误响应体:', errorBody);

      const errorMessage =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'error' in errorBody &&
        typeof errorBody.error === 'string'
          ? errorBody.error
          : typeof errorBody === 'object' &&
              errorBody !== null &&
              'message' in errorBody &&
              typeof errorBody.message === 'string'
            ? errorBody.message
            : response.statusText;
      throw new Error(`API Error (${response.status}): ${errorMessage}`);
    }

    console.log('[handleFileParseAndCreateNodes] ✅ API响应成功，开始解析响应体');

    const result = (await response.json()) as { success?: boolean; data?: ParseResultItem[] };

    console.log('[handleFileParseAndCreateNodes] API响应结果:', {
      success: result.success,
      dataIsArray: Array.isArray(result.data),
      dataLength: result.data?.length,
    });

    if (!result.success || !Array.isArray(result.data)) {
      console.error('[handleFileParseAndCreateNodes] ❌ API返回数据格式无效');
      console.error('[handleFileParseAndCreateNodes] 完整结果:', JSON.stringify(result, null, 2));
      throw new Error(`API returned unsuccessful or invalid data: ${JSON.stringify(result)}`);
    }

    parsedResult = result.data;
    console.log(`[handleFileParseAndCreateNodes] ✅ 从后端接收到 ${parsedResult.length} 个解析项目`);
    console.log('[handleFileParseAndCreateNodes] 解析结果预览:', parsedResult.slice(0, 2));
  } catch (error) {
    console.error('[handleFileParseAndCreateNodes] ❌ 调用 /api/parse-csv 失败:', error);
    console.error('[handleFileParseAndCreateNodes] 错误详情:', {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      fileName: fileNameFromAction,
      fileId: fileIdFromAction,
    });

    parseError = error instanceof Error ? error.message : String(error);
    
    // 派发解析失败事件
    console.log('[handleFileParseAndCreateNodes] 📡 派发解析失败事件');
    window.dispatchEvent(
      new CustomEvent('carbonflow-file-parse-result', {
        detail: {
          fileId: fileIdFromAction, // 使用正确的fileId
          fileName: fileNameFromAction,
          status: 'failed',
          error: parseError,
          sources: [],
          summary: `文件解析失败: ${parseError}`,
        },
      }),
    );

    return;
  }

  if (parsedResult.length === 0) {
    console.warn('[handleFileParseAndCreateNodes] ⚠️ 解析结果为空，没有节点需要创建');
    
    // 派发解析完成但无数据的事件
    console.log('[handleFileParseAndCreateNodes] 📡 派发解析完成（无数据）事件');
    window.dispatchEvent(
      new CustomEvent('carbonflow-file-parse-result', {
        detail: {
          fileId: fileNameFromAction,
          fileName: fileNameFromAction,
          status: 'completed',
          sources: [],
          summary: '文件解析完成，但没有找到可创建的数据项。',
        },
      }),
    );

    return;
  }

  console.log(`[handleFileParseAndCreateNodes] 🔨 开始创建 ${parsedResult.length} 个节点`);

  let createdNodeCount = 0;
  let nodeCreationErrors = 0;
  const createdSources: any[] = [];

  for (const [index, item] of parsedResult.entries()) {
    console.log(`[handleFileParseAndCreateNodes] 处理第 ${index + 1}/${parsedResult.length} 个项目:`, {
      hasData: !!item?.data,
      label: item?.data?.label,
    });

    if (
      !item ||
      typeof item !== 'object' ||
      !item.data ||
      typeof item.data !== 'object' ||
      !item.data.label ||
      typeof item.data.label !== 'string' ||
      item.data.label.trim() === ''
    ) {
      console.warn(`[handleFileParseAndCreateNodes] ⚠️ 跳过无效项目结构:`, item);
      nodeCreationErrors++;
      continue;
    }

    const nodeSpecificData = { ...item.data };
    nodeSpecificData.parse_from_file_name = fileNameFromAction;

    // 推断节点类型（修复原来的错误）
    const inferredNodeType = nodeSpecificData.nodeType || 'emission_source';

    console.log(`[handleFileParseAndCreateNodes] 准备创建节点:`, {
      label: nodeSpecificData.label,
      fileName: nodeSpecificData.parse_from_file_name,
      nodeType: inferredNodeType,
    });

    try {
      await handleCreateNode(store, {
        ...action,
        content: JSON.stringify({
          ...nodeSpecificData,
        }),
      });
      console.log(
        `[handleFileParseAndCreateNodes] ✅ 成功创建节点: ${nodeSpecificData.label} (类型: ${inferredNodeType})`,
      );
      createdNodeCount++;
      
      // 添加到已创建的源列表中
      createdSources.push({
        id: nodeSpecificData.label,
        label: nodeSpecificData.label,
        type: inferredNodeType,
        data: nodeSpecificData,
      });
    } catch (createError) {
      console.error(`[handleFileParseAndCreateNodes] ❌ 创建节点失败: ${nodeSpecificData.label}`, {
        error: createError,
        item,
        nodeSpecificData,
      });
      nodeCreationErrors++;
    }
  }

  console.log('[handleFileParseAndCreateNodes] 📊 节点创建统计:', {
    总数: parsedResult.length,
    成功创建: createdNodeCount,
    创建失败: nodeCreationErrors,
    成功率: `${((createdNodeCount / parsedResult.length) * 100).toFixed(1)}%`,
  });

  // 派发解析完成事件
  const parseStatus = createdNodeCount > 0 ? 'completed' : 'failed';
  const parseMessage =
    createdNodeCount > 0 ? `成功解析并创建了 ${createdNodeCount} 个节点` : '解析完成但节点创建失败';

  console.log('[handleFileParseAndCreateNodes] 📡 派发解析完成事件');
  window.dispatchEvent(
    new CustomEvent('carbonflow-file-parse-result', {
      detail: {
        fileId: fileNameFromAction,
        fileName: fileNameFromAction,
        status: parseStatus,
        sources: createdSources,
        summary: parseMessage,
        error: parseStatus === 'failed' ? '节点创建失败' : undefined,
      },
    }),
  );

  if (createdNodeCount > 0) {
    console.log('[handleFileParseAndCreateNodes] ✅ 有节点创建成功，可以考虑后续布局和计算');

    /*
     * 如需自動佈局與計算，請取消註釋
     * await handleLayout(store, { ...action, operation: 'layout', content: 'Layout after file parse' });
     * await handleCalculate(store, { ...action, operation: 'calculate', content: 'Calculate after file parse' });
     */
  } else {
    console.warn('[handleFileParseAndCreateNodes] ⚠️ 没有节点创建成功');
  }

  console.log('[handleFileParseAndCreateNodes] ===== 文件解析和节点创建完成 =====');
}
