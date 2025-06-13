import type { CarbonFlowAction } from '~/types/actions';
import type { Node, Edge } from 'reactflow';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 根據 nodeId 刪除節點及其相關邊
 * @param store Zustand store
 * @param action CarbonFlowAction，需包含 nodeId
 */
export async function handleDeleteNode(store: typeof useCarbonFlowStore, action: CarbonFlowAction): Promise<void> {
  let nodeId: string | undefined;

  // 僅從 action.content 解析 nodeId
  if (action.content) {
    try {
      const contentObj = typeof action.content === 'string' ? JSON.parse(action.content) : action.content;
      nodeId = contentObj.nodeId;
    } catch {}
  }

  if (!nodeId) {
    console.error('[handleDeleteNode] 缺少 nodeId');
    return;
  }

  const nodes = store.getState().nodes;
  const edges = store.getState().edges;
  const nodeToDelete = nodes.find((n) => n.id === nodeId || n.data?.nodeId === nodeId);

  if (!nodeToDelete) {
    console.warn(`[handleDeleteNode] 未找到要刪除的節點: ${nodeId}`);
    return;
  }

  const filteredNodes = nodes.filter((n) => n.id !== nodeToDelete.id);
  const filteredEdges = edges.filter((e) => e.source !== nodeToDelete.id && e.target !== nodeToDelete.id);
  store.getState().setNodes(filteredNodes);
  store.getState().setEdges(filteredEdges);

  /*
   * 刪除後自動重新計算
   * 可根據需要調用 handleCalculate
   * await handleCalculate(store, { ...action, operation: 'calculate', content: 'Recalculate after delete' });
   * 如需事件通知可加上
   * window.dispatchEvent(new CustomEvent('carbonflow-data-updated', { detail: { action: 'DELETE_NODE', nodeId } }));
   */
}
