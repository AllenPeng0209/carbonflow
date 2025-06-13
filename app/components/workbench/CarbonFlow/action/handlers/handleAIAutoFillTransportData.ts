import type { CarbonFlowAction } from '~/types/actions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * AI一鍵補全運輸數據：模擬將指定節點的運輸欄位自動填入
 * @param store Zustand store
 * @param action CarbonFlowAction，需包含 nodeId（逗號分隔）
 */
export async function handleAIAutoFillTransportData(
  store: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> {
  if (!action.nodeId) {
    return;
  }

  const nodeIds = action.nodeId
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!nodeIds.length) {
    return;
  }

  const nodes = store.getState().nodes;
  const updatedNodes = nodes.map((node) => {
    if (nodeIds.includes(node.id)) {
      // 模擬自動填入運輸距離與方式
      return {
        ...node,
        data: {
          ...node.data,
          transportationDistance: '100',
          transportationMethod: 'AI自動補全',
        },
      };
    }

    return node;
  });
  store.getState().setNodes(updatedNodes);
}
