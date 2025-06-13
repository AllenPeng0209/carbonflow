import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';
import type { Node, Edge } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import { CheckpointManager } from '~/lib/checkpoints/CheckpointManager';
import { CheckpointSyncService } from '~/lib/services/checkpointSyncService';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { chatMessagesStore } from '~/lib/stores/chatMessagesStore';
import type { CheckpointMetadata, CheckpointData, SyncResult } from './types';

/**
 * 检查点管理Hook
 */
export const useCheckpoint = () => {
  // 状态管理
  const [checkpoints, setCheckpoints] = useState<CheckpointMetadata[]>([]);
  const [isCheckpointModalVisible, setIsCheckpointModalVisible] = useState(false);
  const [checkpointName, setCheckpointName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Store状态
  const { aiSummary } = useCarbonFlowStore();

  // 加载检查点列表
  const loadCheckpoints = useCallback(async () => {
    try {
      const list = await CheckpointManager.listCheckpoints();
      setCheckpoints(list);
    } catch (error) {
      console.error('加载检查点列表失败:', error);
    }
  }, []);

  // 初始化时加载检查点
  useEffect(() => {
    loadCheckpoints().catch(console.error);
  }, [loadCheckpoints]);

  // 保存检查点
  const handleSaveCheckpoint = useCallback(
    async (nodes: Node<NodeData>[], edges: Edge[]) => {
      if (!checkpointName.trim()) {
        message.error('请输入检查点名称');
        return;
      }

      if (isSaving) {
        return;
      }

      setIsSaving(true);
      message.loading({ content: '正在保存检查点...', key: 'saveCheckpoint' });

      try {
        const currentAiSummary = useCarbonFlowStore.getState().aiSummary;
        await CheckpointManager.saveCheckpoint(
          checkpointName,
          {
            nodes,
            edges,
            aiSummary: currentAiSummary,
            settings: {
              theme: localStorage.getItem('theme') || 'light',
              language: localStorage.getItem('language') || 'zh-CN',
              notifications: localStorage.getItem('notifications') === 'true',
              eventLogs: localStorage.getItem('eventLogs') === 'true',
              timezone: localStorage.getItem('timezone') || 'UTC',
              contextOptimization: localStorage.getItem('contextOptimization') === 'true',
              autoSelectTemplate: localStorage.getItem('autoSelectTemplate') === 'true',
            },
            chatHistory: chatMessagesStore.get(),
          },
          {
            description: '手动保存的检查点',
            tags: ['manual-save'],
          },
        );
        message.success({ content: '本地保存成功!', key: 'saveCheckpoint', duration: 1 });

        const updatedLocalCheckpoints = await CheckpointManager.listCheckpoints();
        setCheckpoints(updatedLocalCheckpoints);

        const newlySavedCheckpointMeta = updatedLocalCheckpoints.find((cp) => cp.name === checkpointName);

        if (!newlySavedCheckpointMeta) {
          message.error({ content: `本地元数据错误，无法同步检查点 '${checkpointName}'`, key: 'syncDb', duration: 5 });
          setIsSaving(false);

          return;
        }

        message.loading({ content: '正在同步到数据库...', key: 'syncDb' });

        const syncResult = await CheckpointSyncService.syncSingleCheckpointToSupabase(checkpointName);

        if (syncResult.success) {
          message.success({ content: '成功同步到数据库!', key: 'syncDb', duration: 2 });
        } else {
          throw new Error(syncResult.error || '同步到数据库失败');
        }

        setCheckpointName('');
        setIsCheckpointModalVisible(false);
      } catch (error: any) {
        const errorMessage = `保存检查点失败: ${error.message || error}`;
        console.error(errorMessage);
        message.error({ content: errorMessage, key: 'saveCheckpoint', duration: 3 });
        message.error({ content: '数据库同步可能也已失败', key: 'syncDb', duration: 3 });
      } finally {
        setIsSaving(false);
      }
    },
    [checkpointName, isSaving],
  );

  // 恢复检查点
  const handleRestoreCheckpoint = useCallback(
    async (name: string, onNodesChange: (nodes: Node<NodeData>[]) => void, onEdgesChange: (edges: Edge[]) => void) => {
      try {
        const data = await CheckpointManager.restoreCheckpoint(name);

        if (data) {
          onNodesChange(data.nodes);
          onEdgesChange(data.edges);

          if (data.aiSummary) {
            const store = useCarbonFlowStore.getState();

            if (store.setAiSummary) {
              store.setAiSummary(data.aiSummary);
            }
          }

          if (data.settings) {
            Object.entries(data.settings).forEach(([key, value]) => {
              if (value !== undefined) {
                localStorage.setItem(key, String(value));
              }
            });
          }

          if (data.chatHistory && Array.isArray(data.chatHistory)) {
            chatMessagesStore.set(data.chatHistory);
            window.dispatchEvent(
              new CustomEvent('chatHistoryUpdated', {
                detail: { messages: data.chatHistory },
              }),
            );
          } else {
            chatMessagesStore.set([]);
            window.dispatchEvent(
              new CustomEvent('chatHistoryUpdated', {
                detail: { messages: [] },
              }),
            );
          }
        }

        setIsCheckpointModalVisible(false);
        message.success('检查点恢复成功');
      } catch (error) {
        console.error('恢复检查点失败:', error);
        message.error('恢复检查点失败');
      }
    },
    [],
  );

  // 导出检查点
  const handleExportCheckpoint = useCallback(async (name: string) => {
    try {
      const checkpointData = await CheckpointManager.exportCheckpoint(name);

      if (!checkpointData) {
        message.error('导出检查点失败: 未找到数据');
        return;
      }

      const blob = new Blob([checkpointData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('检查点导出成功');
    } catch (error) {
      console.error('导出检查点时出错:', error);
      message.error('导出检查点失败');
    }
  }, []);

  // 导入检查点
  const handleImportCheckpoint = useCallback(async (file: RcFile): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            const content = e.target?.result as string;

            if (!content) {
              message.error('文件内容为空');
              reject(new Error('File content is empty'));

              return;
            }

            await CheckpointManager.importCheckpoint(content);

            const updatedCheckpoints = await CheckpointManager.listCheckpoints();
            setCheckpoints(updatedCheckpoints);
            message.success('检查点导入成功');
            resolve(false);
          } catch (importError) {
            console.error('导入检查点操作失败:', importError);
            message.error(`导入检查点失败: ${importError instanceof Error ? importError.message : '未知错误'}`);
            reject(importError);
          }
        };

        reader.onerror = (error) => {
          console.error('文件读取错误:', error);
          message.error('读取文件失败');
          reject(error);
        };
        reader.readAsText(file);
      } catch (error) {
        console.error('设置导入检查点失败:', error);
        message.error('导入检查点失败');
        reject(error);
      }
    });
  }, []);

  // 删除检查点
  const handleDeleteCheckpoint = useCallback(async (name: string) => {
    try {
      await CheckpointManager.deleteCheckpoint(name);

      const updatedCheckpoints = await CheckpointManager.listCheckpoints();
      setCheckpoints(updatedCheckpoints);
      message.success('检查点删除成功');
    } catch (error) {
      console.error('删除检查点失败:', error);
      message.error('删除检查点失败');
    }
  }, []);

  // 同步检查点
  const handleSyncCheckpoints = useCallback(async () => {
    try {
      message.loading({ content: '正在同步检查点到云端...', key: 'syncAllCheckpoints' });

      const syncResult = await CheckpointSyncService.syncAllCheckpointsToSupabase();

      if (syncResult.success) {
        message.success({ content: '所有检查点同步成功!', key: 'syncAllCheckpoints', duration: 2 });
      } else {
        throw new Error(syncResult.error || '同步失败');
      }
    } catch (error: any) {
      console.error('同步检查点失败:', error);
      message.error({ content: `同步失败: ${error.message || error}`, key: 'syncAllCheckpoints', duration: 3 });
    }
  }, []);

  // 从云端恢复
  const handleRestoreFromCloud = useCallback(async () => {
    try {
      message.loading({ content: '正在从云端恢复检查点...', key: 'restoreFromCloud' });

      const result = await CheckpointSyncService.restoreAllCheckpointsFromSupabase();

      if (result.success) {
        await loadCheckpoints();
        message.success({ content: '从云端恢复成功!', key: 'restoreFromCloud', duration: 2 });
      } else {
        throw new Error(result.error || '恢复失败');
      }
    } catch (error: any) {
      console.error('从云端恢复失败:', error);
      message.error({ content: `恢复失败: ${error.message || error}`, key: 'restoreFromCloud', duration: 3 });
    }
  }, [loadCheckpoints]);

  return {
    // 状态
    checkpoints,
    isCheckpointModalVisible,
    checkpointName,
    isSaving,

    // 设置器
    setIsCheckpointModalVisible,
    setCheckpointName,

    // 操作方法
    handleSaveCheckpoint,
    handleRestoreCheckpoint,
    handleExportCheckpoint,
    handleImportCheckpoint,
    handleDeleteCheckpoint,
    handleSyncCheckpoints,
    handleRestoreFromCloud,
    loadCheckpoints,
  };
};
