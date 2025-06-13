import type { Message } from 'ai';
import { supabase } from '~/lib/supabase';
import type { ConversationThread, ConversationMessage } from '~/types/conversations';
import { debounce } from '~/utils/debounce';

/**
 * 工作流聊天记录管理服务
 * 负责聊天记录的加载、保存和管理
 */
export class WorkflowChatService {
  private static readonly DEBOUNCE_DELAY = 2000; // 2秒防抖

  /**
   * 从工作流中加载聊天记录
   */
  static async loadChatHistory(workflowId: string): Promise<Message[]> {
    try {
      console.log('[WorkflowChatService] 加载聊天记录:', workflowId);

      const { data: workflow, error } = await supabase
        .from('workflows')
        .select('conversation_history')
        .eq('id', workflowId)
        .single();

      if (error) {
        console.error('[WorkflowChatService] 加载聊天记录失败:', error);
        return [];
      }

      if (!workflow?.conversation_history || !Array.isArray(workflow.conversation_history)) {
        console.log('[WorkflowChatService] 没有找到聊天记录');
        return [];
      }

      // 转换 ConversationThread[] 为 Message[]
      const messages: Message[] = [];
      
      for (const thread of workflow.conversation_history as ConversationThread[]) {
        for (const msg of thread.messages) {
          messages.push({
            id: msg.messageId,
            role: msg.speaker === 'ai' ? 'assistant' : (msg.speaker as 'user' | 'system'),
            content: msg.text,
            createdAt: new Date(msg.timestamp),
          });
        }
      }

      // 按时间排序
      messages.sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

      console.log('[WorkflowChatService] 成功加载聊天记录:', messages.length, '条消息');
      return messages;
    } catch (error) {
      console.error('[WorkflowChatService] 加载聊天记录异常:', error);
      return [];
    }
  }

  /**
   * 保存聊天记录到工作流 (防抖处理)
   */
  static saveChatHistory = debounce(
    async (workflowId: string, messages: Message[]): Promise<void> => {
      return this._saveChatHistoryInternal(workflowId, messages);
    },
    WorkflowChatService.DEBOUNCE_DELAY
  );

  /**
   * 内部保存方法
   */
  private static async _saveChatHistoryInternal(workflowId: string, messages: Message[]): Promise<void> {
    try {
      console.log('[WorkflowChatService] 保存聊天记录:', workflowId, messages.length, '条消息');

      // 过滤掉空消息和隐藏消息
      const validMessages = messages.filter(msg => 
        msg.content?.trim() && 
        !msg.annotations?.includes('hidden') &&
        !msg.annotations?.includes('no-store')
      );

      if (validMessages.length === 0) {
        console.log('[WorkflowChatService] 没有有效消息需要保存');
        return;
      }

      // 检查是否需要更新（避免重复保存）
      const { data: currentWorkflow } = await supabase
        .from('workflows')
        .select('conversation_history')
        .eq('id', workflowId)
        .single();

      const currentMessageCount = this._getMessageCount(currentWorkflow?.conversation_history);
      
      if (currentMessageCount === validMessages.length) {
        console.log('[WorkflowChatService] 消息数量未变化，跳过保存');
        return;
      }

      // 转换 Message[] 为 ConversationThread[]
      const conversationHistory = this._convertMessagesToThreads(workflowId, validMessages);

      // 保存到数据库
      const { error } = await supabase
        .from('workflows')
        .update({
          conversation_history: conversationHistory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (error) {
        console.error('[WorkflowChatService] 保存聊天记录失败:', error);
        throw error;
      }

      console.log('[WorkflowChatService] 聊天记录保存成功');
    } catch (error) {
      console.error('[WorkflowChatService] 保存聊天记录异常:', error);
      throw error;
    }
  }

  /**
   * 立即保存聊天记录（不经过防抖）
   */
  static async saveChatHistoryImmediate(workflowId: string, messages: Message[]): Promise<void> {
    return this._saveChatHistoryInternal(workflowId, messages);
  }

  /**
   * 检查工作流是否有聊天记录
   */
  static async hasChatHistory(workflowId: string): Promise<boolean> {
    try {
      const { data: workflow } = await supabase
        .from('workflows')
        .select('conversation_history')
        .eq('id', workflowId)
        .single();

      return this._getMessageCount(workflow?.conversation_history) > 0;
    } catch (error) {
      console.error('[WorkflowChatService] 检查聊天记录失败:', error);
      return false;
    }
  }

  /**
   * 清空工作流聊天记录
   */
  static async clearChatHistory(workflowId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({
          conversation_history: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (error) {
        console.error('[WorkflowChatService] 清空聊天记录失败:', error);
        throw error;
      }

      console.log('[WorkflowChatService] 聊天记录已清空');
    } catch (error) {
      console.error('[WorkflowChatService] 清空聊天记录异常:', error);
      throw error;
    }
  }

  /**
   * 转换消息格式：Message[] -> ConversationThread[]
   */
  private static _convertMessagesToThreads(workflowId: string, messages: Message[]): ConversationThread[] {
    const threadId = `thread_${workflowId}_${Date.now()}`;
    const now = new Date().toISOString();

    const conversationMessages: ConversationMessage[] = messages.map((msg, index) => ({
      messageId: msg.id || `msg_${index}_${Date.now()}`,
      threadId,
      speaker: msg.role === 'assistant' ? 'ai' : msg.role as 'user' | 'system',
      text: msg.content,
      timestamp: msg.createdAt ? new Date(msg.createdAt).toISOString() : now,
      metadata: {
        annotations: msg.annotations,
        toolInvocations: msg.toolInvocations,
      },
    }));

    return [{
      threadId,
      workflowId,
      title: '工作流聊天记录',
      createdAt: conversationMessages[0]?.timestamp || now,
      lastUpdatedAt: conversationMessages[conversationMessages.length - 1]?.timestamp || now,
      messages: conversationMessages,
    }];
  }

  /**
   * 获取聊天记录中的消息数量
   */
  private static _getMessageCount(conversationHistory: any): number {
    if (!Array.isArray(conversationHistory)) {
      return 0;
    }

    return conversationHistory.reduce((count, thread) => {
      return count + (Array.isArray(thread.messages) ? thread.messages.length : 0);
    }, 0);
  }
} 