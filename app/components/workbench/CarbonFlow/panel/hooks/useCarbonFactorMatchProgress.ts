import { useState, useEffect, useCallback } from 'react';
import type { MatchProgressItem } from '~/components/workbench/CarbonFlow/panel/components/CarbonFactorMatchProgressModal';

interface MatchProgressState {
  visible: boolean;
  totalNodes: number;
  progressItems: MatchProgressItem[];
  isCompleted: boolean;
  isCancelled: boolean;
}

export const useCarbonFactorMatchProgress = () => {
  const [state, setState] = useState<MatchProgressState>({
    visible: false,
    totalNodes: 0,
    progressItems: [],
    isCompleted: false,
    isCancelled: false,
  });

  // 开始匹配
  const startMatch = useCallback((nodeIds?: string[]) => {
    setState({
      visible: true,
      totalNodes: 0,
      progressItems: [],
      isCompleted: false,
      isCancelled: false,
    });
  }, []);

  // 关闭进度弹窗
  const closeProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      visible: false,
    }));
  }, []);

  // 取消匹配
  const cancelMatch = useCallback(() => {
    setState(prev => ({
      ...prev,
      isCancelled: true,
      visible: false,
    }));
    
    // 可以在这里添加取消匹配的逻辑
    window.dispatchEvent(new CustomEvent('carbonflow-match-cancel'));
  }, []);

  // 重置状态
  const resetProgress = useCallback(() => {
    setState({
      visible: false,
      totalNodes: 0,
      progressItems: [],
      isCompleted: false,
      isCancelled: false,
    });
  }, []);

  // 监听匹配开始事件
  useEffect(() => {
    const handleMatchStart = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { totalNodes, nodes } = customEvent.detail;

      console.log('[useCarbonFactorMatchProgress] 匹配开始:', { totalNodes, nodes });

      setState(prev => ({
        ...prev,
        visible: true,
        totalNodes,
        progressItems: nodes,
        isCompleted: false,
        isCancelled: false,
      }));
    };

    window.addEventListener('carbonflow-match-start', handleMatchStart);
    
    return () => {
      window.removeEventListener('carbonflow-match-start', handleMatchStart);
    };
  }, []);

  // 监听进度更新事件
  useEffect(() => {
    const handleProgressUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { nodeId, status, progress, result, error, logs } = customEvent.detail;

      console.log('[useCarbonFactorMatchProgress] 进度更新:', customEvent.detail);

      setState(prev => {
        const updatedItems = prev.progressItems.map(item => {
          if (item.nodeId === nodeId) {
            return {
              ...item,
              status,
              progress,
              result,
              error,
              logs: [...item.logs, ...(logs || [])],
            };
          }
          return item;
        });

        // 检查是否所有节点都已完成
        const allCompleted = updatedItems.every(item => 
          item.status === 'success' || item.status === 'failed'
        );

        return {
          ...prev,
          progressItems: updatedItems,
          isCompleted: allCompleted,
        };
      });
    };

    window.addEventListener('carbonflow-match-progress', handleProgressUpdate);
    
    return () => {
      window.removeEventListener('carbonflow-match-progress', handleProgressUpdate);
    };
  }, []);

  // 监听匹配完成事件
  useEffect(() => {
    const handleMatchComplete = (event: Event) => {
      console.log('[useCarbonFactorMatchProgress] 匹配完成');
      
      setState(prev => ({
        ...prev,
        isCompleted: true,
      }));
    };

    window.addEventListener('carbonflow-match-results', handleMatchComplete);
    
    return () => {
      window.removeEventListener('carbonflow-match-results', handleMatchComplete);
    };
  }, []);

  return {
    // 状态
    visible: state.visible,
    totalNodes: state.totalNodes,
    progressItems: state.progressItems,
    isCompleted: state.isCompleted,
    isCancelled: state.isCancelled,

    // 操作方法
    startMatch,
    closeProgress,
    cancelMatch,
    resetProgress,
  };
}; 