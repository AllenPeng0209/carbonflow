import { useState, useCallback, useEffect, useRef } from 'react';
import { message } from 'antd';
import type { UploadedFile, ParsedEmissionSource } from '~/types/files';
import type { CarbonFlowAction } from '~/types/actions';

export const useAIFileOperations = () => {
  // AI功能状态
  const [isAIFileParseModalVisible, setIsAIFileParseModalVisible] = useState(false);
  const [isAIAutoFillModalVisible, setIsAIAutoFillModalVisible] = useState(false);
  const [parsedEmissionSources, setParsedEmissionSources] = useState<ParsedEmissionSource[]>([]);
  const [selectedParsedSourceKeys, setSelectedParsedSourceKeys] = useState<React.Key[]>([]);

  // AI自动填充相关状态
  const [aiAutoFillSelectedRowKeys, setAiAutoFillSelectedRowKeys] = useState<React.Key[]>([]);
  const [aiAutoFillResult, setAiAutoFillResult] = useState<{
    success: string[];
    failed: { id: string; reason: string }[];
  } | null>(null);

  // Loading message引用
  const loadingMessageRef = useRef<(() => void) | null>(null);

  // AI文件解析模态框处理
  const handleOpenAIFileParseModal = useCallback(() => {
    setIsAIFileParseModalVisible(true);
  }, []);

  const handleCloseAIFileParseModal = useCallback(() => {
    setIsAIFileParseModalVisible(false);
  }, []);

  // AI自动填充模态框处理
  const handleOpenAIAutoFillModal = useCallback(() => {
    setIsAIAutoFillModalVisible(true);
  }, []);

  const handleCloseAIAutoFillModal = useCallback(() => {
    setIsAIAutoFillModalVisible(false);
    setAiAutoFillSelectedRowKeys([]);
    setAiAutoFillResult(null);
  }, []);

  // 清除AI自动填充结果
  const clearAiAutoFillResult = useCallback(() => {
    setAiAutoFillResult(null);
  }, []);

  // AI碳因子匹配
  const handleAIAutofillCarbonFactorMatch = useCallback(async () => {
    console.log('AI Autofill Carbon Factor Match invoked for sources:', aiAutoFillSelectedRowKeys);

    if (!aiAutoFillSelectedRowKeys || aiAutoFillSelectedRowKeys.length === 0) {
      message.warning('请选择至少一个排放源进行匹配');
      return;
    }

    if (loadingMessageRef.current) {
      loadingMessageRef.current();
      loadingMessageRef.current = null;
    }

    try {
      loadingMessageRef.current = message.loading('正在进行碳因子匹配，请稍候...', 0);

      const action: CarbonFlowAction = {
        type: 'carbonflow',
        operation: 'carbon_factor_match',
        content: 'AI一键补全碳因子匹配',
        nodeId: aiAutoFillSelectedRowKeys.map((id) => String(id)).join(','),
      };

      window.dispatchEvent(
        new CustomEvent('carbonflow-action', {
          detail: { action },
        }),
      );

      console.log('AI Autofill 碳因子匹配请求已发送，等待事件回调...');

      // Loading message will be handled by 'carbonflow-match-results' event listener or catch block.
    } catch (error) {
      if (loadingMessageRef.current) {
        loadingMessageRef.current();
        loadingMessageRef.current = null;
      }

      console.error('执行 AI Autofill 碳因子匹配请求派发时出错:', error);
      message.error('发送 AI Autofill 碳因子匹配请求失败，请查看控制台');
    }
  }, [aiAutoFillSelectedRowKeys]);

  // 文件解析结果事件监听
  const setupFileParseEventListener = useCallback(
    (
      selectedFileForParse: UploadedFile | null,
      updateFileStatus: (fileId: string, status: string, content?: string) => void,
    ) => {


      const handleFileParseResult = (event: CustomEvent) => {
        console.log('[useAIFileOperations] ===== 收到文件解析结果事件 =====');
        console.log('[useAIFileOperations] 事件时间:', new Date().toISOString());

        const { fileId, sources, summary, status, error } = event.detail;

        console.log('[useAIFileOperations] 解析结果详情:', {
          fileId,
          status,
          sourcesCount: sources?.length,
          hasSummary: !!summary,
          hasError: !!error,
          error,
        });

        // 关闭loading消息
        console.log('[useAIFileOperations] 🔄 关闭loading消息');
        message.destroy('parsingFile');

        console.log('[useAIFileOperations] 🔄 更新主文件列表状态');

        // 更新主文件列表中的状态
        updateFileStatus(fileId, status, summary);

        // 如果这是当前在AI解析模态框中选中的文件，更新模态框特定状态
        if (selectedFileForParse?.id === fileId) {
          console.log('[useAIFileOperations] ✅ 匹配到当前选中文件，更新模态框状态');

          const chatTriggerPayload: any = {
            fileName: selectedFileForParse.name,
            status,
            error,
          };

          if (status === 'completed') {
            console.log('[useAIFileOperations] 🎉 解析成功，设置解析源数据');
            console.log('[useAIFileOperations] 解析源数量:', sources?.length || 0);

            setParsedEmissionSources(sources || []);
            message.success(`文件 ${selectedFileForParse.name} 解析成功。`);
            chatTriggerPayload.sourceCount = (sources || []).length;
          } else if (status === 'failed') {
            console.log('[useAIFileOperations] ❌ 解析失败');
            console.log('[useAIFileOperations] 失败原因:', error);

            setParsedEmissionSources([]);
            message.error(`文件 ${selectedFileForParse.name} 解析失败: ${error || '未知错误'}`);
          }

          console.log('[useAIFileOperations] 📡 派发聊天触发事件');
          console.log('[useAIFileOperations] 聊天负载:', chatTriggerPayload);

          // 派发事件以触发聊天响应
          const fileParseEvent = new CustomEvent('carbonflow-fileparsed-trigger-chat', {
            detail: chatTriggerPayload,
          });
          window.dispatchEvent(fileParseEvent);

          console.log('[useAIFileOperations] ✅ 聊天触发事件已派发');
        } else {
          console.log('[useAIFileOperations] ℹ️ 解析结果不匹配当前选中文件', {
            resultFileId: fileId,
            selectedFileId: selectedFileForParse?.id,
          });
        }

        console.log('[useAIFileOperations] ===== 文件解析结果事件处理完成 =====');
      };

      window.addEventListener('carbonflow-file-parse-result', handleFileParseResult as EventListener);

      return () => {
        window.removeEventListener('carbonflow-file-parse-result', handleFileParseResult as EventListener);
      };
    },
    [],
  );

  // 设置AI自动填充结果事件监听
  useEffect(() => {
    const handler = (event: any) => {
      console.log('[useAIFileOperations] 收到碳因子匹配结果事件:', event.type, event.detail);

      // 取消loading message
      if (loadingMessageRef.current) {
        console.log('[useAIFileOperations] 取消loading message');
        loadingMessageRef.current();
        loadingMessageRef.current = null;
      }

      const { success, failed, logs } = event.detail;
      setAiAutoFillResult({
        success: success || [],
        failed: (failed || []).map((id: string) => ({
          id,
          reason: logs?.find((l: string) => l.includes(id)) || '补全失败',
        })),
      });

      // 显示结果消息
      if (success?.length > 0 && (!failed || failed.length === 0)) {
        message.success('所有选定排放源均匹配成功！');
      } else if (success?.length > 0 && failed?.length > 0) {
        message.warning(`部分排放源匹配成功 (${success.length}个成功, ${failed.length}个失败)，请查看结果详情。`);
      } else if ((!success || success.length === 0) && failed?.length > 0) {
        message.error('所有选定排放源均匹配失败，请查看日志和结果详情。');
      } else {
        message.info('碳因子匹配处理完成，未发现需要更新的排放源。');
      }
    };

    console.log('[useAIFileOperations] 注册碳因子匹配结果事件监听器');

    // 监听两个事件：autofill-results 和 match-results
    window.addEventListener('carbonflow-autofill-results', handler);
    window.addEventListener('carbonflow-match-results', handler);

    return () => {
      console.log('[useAIFileOperations] 清理碳因子匹配结果事件监听器');
      window.removeEventListener('carbonflow-autofill-results', handler);
      window.removeEventListener('carbonflow-match-results', handler);
    };
  }, []);

  return {
    // 状态
    isAIFileParseModalVisible,
    isAIAutoFillModalVisible,
    parsedEmissionSources,
    selectedParsedSourceKeys,
    aiAutoFillSelectedRowKeys,
    aiAutoFillResult,

    // 操作函数
    handleOpenAIFileParseModal,
    handleCloseAIFileParseModal,
    handleOpenAIAutoFillModal,
    handleCloseAIAutoFillModal,
    handleAIAutofillCarbonFactorMatch,
    setupFileParseEventListener,
    setSelectedParsedSourceKeys,
    setParsedEmissionSources,
    setAiAutoFillSelectedRowKeys,
    setAiAutoFillResult,
    clearAiAutoFillResult,
  };
};
