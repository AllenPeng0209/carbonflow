import { useEffect } from 'react';
import type { CarbonFlowAction } from '~/types/actions';
import { CarbonFlowActionHandler } from '~/components/workbench/CarbonFlow/action/CarbonFlowActions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 事件处理Hook
 */
export const useEventHandlers = (actionHandler?: CarbonFlowActionHandler) => {
  useEffect(() => {
    console.log('[useEventHandlers] Setting up event listeners for carbonflow-action events');

    if (!actionHandler) {
      return;
    }

    const handleActionEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const eventDetail = customEvent.detail;

      console.log('[useEventHandlers] ===== 收到carbonflow-action事件 =====');
      console.log('[useEventHandlers] 事件时间:', new Date().toISOString());
      console.log('[useEventHandlers] 事件详情:', JSON.stringify(eventDetail, null, 2));

      // Extract the actual action from eventDetail
      if (eventDetail && typeof eventDetail === 'object' && 'action' in eventDetail) {
        const actualAction = eventDetail.action as CarbonFlowAction & { traceId?: string };

        console.log('[useEventHandlers] 提取到的actualAction:', {
          type: actualAction.type,
          operation: actualAction.operation,
          fileName: (actualAction as any).fileName,
          dataLength: actualAction.data?.length,
          hasTraceId: !!actualAction.traceId,
        });

        if (actualAction && actualAction.type === 'carbonflow') {
          console.log('[useEventHandlers] ✅ 确认为CarbonFlow操作');

          if (actualAction.operation === 'file_parser') {
            console.log('[useEventHandlers] 🔍 检测到文件解析操作', {
              fileName: (actualAction as any).fileName,
              contentLength: actualAction.data?.length,
              contentPreview: actualAction.data?.substring(0, 100) + '...',
            });
          }

          if (actualAction.data && actualAction.operation !== 'file_parser') {
            try {
              const parsedData = JSON.parse(actualAction.data);
              console.log('[useEventHandlers] 解析的数据:', JSON.stringify(parsedData, null, 2));
            } catch (e) {
              console.error('[useEventHandlers] 数据解析失败:', actualAction.data, e);
            }
          }

          if (actionHandler) {
            console.log('[useEventHandlers] 🚀 开始调用actionHandler.handleAction');
            console.log('[useEventHandlers] 操作类型:', actualAction.operation);

            try {
              actionHandler.handleAction(actualAction);
              console.log('[useEventHandlers] ✅ actionHandler.handleAction调用完成');
            } catch (error) {
              console.error('[useEventHandlers] ❌ actionHandler.handleAction调用失败:', error);
            }
          } else {
            console.warn('[useEventHandlers] ⚠️ actionHandler未初始化');
          }

          // Emit success response
          console.log('[useEventHandlers] 发送carbonflow-action-result事件');
          window.dispatchEvent(
            new CustomEvent('carbonflow-action-result', {
              detail: { success: true, traceId: actualAction.traceId, nodeId: actualAction.nodeId },
            }),
          );
        } else {
          console.warn('[useEventHandlers] ❌ 无效的action或类型不是carbonflow', {
            actualActionType: actualAction?.type,
            hasActualAction: !!actualAction,
          });
        }
      } else {
        console.error('[useEventHandlers] ❌ 事件详情缺少action属性或不是对象');
        console.error('[useEventHandlers] 收到的详情:', JSON.stringify(eventDetail, null, 2));
      }

      console.log('[useEventHandlers] ===== carbonflow-action事件处理完成 =====');
    };

    const handlePanelDataUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { nodes, edges } = customEvent.detail;

      console.log('[useEventHandlers] Panel data updated - nodes:', nodes?.length, 'edges:', edges?.length);

      if (nodes) {
        const store = useCarbonFlowStore.getState();
        store.setNodes(nodes);
      }

      if (edges) {
        const store = useCarbonFlowStore.getState();
        store.setEdges(edges);
      }
    };

    window.addEventListener('carbonflow-action', handleActionEvent);
    window.addEventListener('carbonflow-data-updated', handlePanelDataUpdated);

    return () => {
      window.removeEventListener('carbonflow-action', handleActionEvent);
      window.removeEventListener('carbonflow-data-updated', handlePanelDataUpdated);

      if (typeof window !== 'undefined') {
        (window as any).carbonFlowInitialized = false;
      }
    };
  }, [actionHandler]);

  // 设置全局标识
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).carbonFlowInitialized = true;
    }
  }, []);
};
