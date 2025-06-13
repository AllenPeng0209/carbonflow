import { useState, useEffect, useCallback, useRef } from 'react';
import type { Message } from 'ai';
import { WorkflowChatService } from '~/lib/services/workflowChatService';
import { chatMessagesStore } from '~/lib/stores/chatMessagesStore';

interface UseWorkflowChatProps {
  workflowId?: string;
  enabled?: boolean; // 是否启用工作流聊天记录
}

interface UseWorkflowChatReturn {
  // 状态
  isLoading: boolean;
  isReady: boolean;
  hasChatHistory: boolean;
  hasError: boolean;
  error: string | null;
  
  // 方法
  loadChatHistory: () => Promise<Message[]>;
  saveChatHistory: (messages: Message[]) => Promise<void>;
  clearChatHistory: () => Promise<void>;
  
  // 自动保存控制
  enableAutoSave: () => void;
  disableAutoSave: () => void;
  isAutoSaveEnabled: boolean;
}

/**
 * 工作流聊天记录管理Hook
 * 提供加载、保存、自动保存等功能
 */
export function useWorkflowChat({ 
  workflowId, 
  enabled = true 
}: UseWorkflowChatProps): UseWorkflowChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasChatHistory, setHasChatHistory] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  
  const currentMessagesRef = useRef<Message[]>([]);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const prevWorkflowIdRef = useRef(workflowId);

  // 清除错误状态
  const clearError = useCallback(() => {
    setHasError(false);
    setError(null);
  }, []);

  // 设置错误状态
  const setErrorState = useCallback((errorMessage: string) => {
    console.error('[useWorkflowChat] 错误:', errorMessage);
    setHasError(true);
    setError(errorMessage);
  }, []);

  // 当 workflowId 变化时，重置状态以强制重新加载
  useEffect(() => {
    if (prevWorkflowIdRef.current !== workflowId) {
      console.log(`[useWorkflowChat] Workflow ID 变更: ${prevWorkflowIdRef.current} -> ${workflowId}. 重置状态。`);
      prevWorkflowIdRef.current = workflowId;
      setIsReady(false);
      setHasChatHistory(false);
      chatMessagesStore.set([]); // 清空 store 以避免显示旧内容
    }
  }, [workflowId]);

  // 加载聊天记录
  const loadChatHistory = useCallback(async (): Promise<Message[]> => {
    if (!workflowId || !enabled) {
      setIsReady(true); // 确保在没有ID时也处于就绪状态
      setIsLoading(false);
      return [];
    }

    try {
      setIsLoading(true);
      clearError();

      console.log('[useWorkflowChat] 开始加载聊天记录:', workflowId);
      
      const messages = await WorkflowChatService.loadChatHistory(workflowId);
      
      // 更新状态
      setHasChatHistory(messages.length > 0);
      currentMessagesRef.current = messages;
      
      // 更新全局聊天消息store
      chatMessagesStore.set(messages);
      
      console.log('[useWorkflowChat] 聊天记录加载完成:', messages.length, '条消息');
      
      return messages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载聊天记录失败';
      setErrorState(errorMessage);
      return [];
    } finally {
      setIsLoading(false);
      setIsReady(true);
    }
  }, [workflowId, enabled, clearError, setErrorState]);

  // 保存聊天记录
  const saveChatHistory = useCallback(async (messages: Message[]): Promise<void> => {
    if (!workflowId || !enabled || messages.length === 0) {
      return;
    }

    try {
      clearError();
      
      // 检查消息是否发生变化
      const messagesChanged = 
        messages.length !== currentMessagesRef.current.length ||
        messages.some((msg, index) => 
          msg.id !== currentMessagesRef.current[index]?.id ||
          msg.content !== currentMessagesRef.current[index]?.content
        );

      if (!messagesChanged) {
        console.log('[useWorkflowChat] 消息未变化，跳过保存');
        return;
      }

      console.log('[useWorkflowChat] 保存聊天记录:', workflowId, messages.length, '条消息');
      
      await WorkflowChatService.saveChatHistory(workflowId, messages);
      
      // 更新本地状态
      currentMessagesRef.current = messages;
      setHasChatHistory(messages.length > 0);
      
      // 更新全局 store，以确保其他组件能获取最新消息
      chatMessagesStore.set(messages);
      
      console.log('[useWorkflowChat] 聊天记录保存成功');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存聊天记录失败';
      setErrorState(errorMessage);
      throw err; // 重新抛出错误，让调用方可以处理
    }
  }, [workflowId, enabled, clearError, setErrorState]);

  // 清空聊天记录
  const clearChatHistory = useCallback(async (): Promise<void> => {
    if (!workflowId || !enabled) {
      return;
    }

    try {
      clearError();
      
      console.log('[useWorkflowChat] 清空聊天记录:', workflowId);
      
      await WorkflowChatService.clearChatHistory(workflowId);
      
      // 更新状态
      setHasChatHistory(false);
      currentMessagesRef.current = [];
      
      // 清空全局store
      chatMessagesStore.set([]);
      
      console.log('[useWorkflowChat] 聊天记录已清空');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '清空聊天记录失败';
      setErrorState(errorMessage);
      throw err;
    }
  }, [workflowId, enabled, clearError, setErrorState]);

  // 启用自动保存
  const enableAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(true);
    console.log('[useWorkflowChat] 自动保存已启用');
  }, []);

  // 禁用自动保存
  const disableAutoSave = useCallback(() => {
    setIsAutoSaveEnabled(false);
    
    // 清除待处理的自动保存任务
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = undefined;
    }
    
    console.log('[useWorkflowChat] 自动保存已禁用');
  }, []);

  // 监听chatMessagesStore变化，实现自动保存
  useEffect(() => {
    if (!isAutoSaveEnabled || !workflowId || !enabled || !isReady) {
      return;
    }

    const unsubscribe = chatMessagesStore.subscribe((messages) => {
      if (messages.length === 0) {
        return;
      }

      // 清除之前的自动保存任务
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // 延迟保存，避免频繁保存
      autoSaveTimeoutRef.current = setTimeout(() => {
        // 通过扩展运算符(...)创建一个可变副本以解决类型问题
        saveChatHistory([...messages]).catch((err) => {
          console.error('[useWorkflowChat] 自动保存失败:', err);
        });
      }, 1000); // 1秒延迟
    });

    return () => {
      unsubscribe();
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isAutoSaveEnabled, workflowId, enabled, isReady, saveChatHistory]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  // 初始化时加载聊天记录
  useEffect(() => {
    if (workflowId && enabled && !isReady) {
      loadChatHistory();
    }
  }, [workflowId, enabled, isReady, loadChatHistory]);

  return {
    // 状态
    isLoading,
    isReady,
    hasChatHistory,
    hasError,
    error,
    
    // 方法
    loadChatHistory,
    saveChatHistory,
    clearChatHistory,
    
    // 自动保存控制
    enableAutoSave,
    disableAutoSave,
    isAutoSaveEnabled,
  };
} 