import type { CarbonFlowAction } from '~/types/actions';
import type { Node, Edge } from 'reactflow';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 根據 source/target 連接兩個節點，並自動生成 edge
 * @param store Zustand store
 * @param action CarbonFlowAction，需包含 source, target
 */
export async function handleConnectNodes(store: typeof useCarbonFlowStore, action: CarbonFlowAction): Promise<void> {
  const { source, target, content } = action;

  if (!source || !target) {
    console.error('[handleConnectNodes] 缺少 source 或 target');
    return;
  }

  const nodes = store.getState().nodes;
  const sourceNode = nodes.find((n) => n.id === source || n.data?.nodeId === source);
  const targetNode = nodes.find((n) => n.id === target || n.data?.nodeId === target);

  if (!sourceNode || !targetNode) {
    console.warn(`[handleConnectNodes] 未找到 source 或 target 節點: ${source}, ${target}`);
    return;
  }

  // Edge 可自定義 label/data
  let edgeData: Record<string, any> = {};

  try {
    if (content) {
      edgeData = typeof content === 'string' ? JSON.parse(content) : content;
    }
  } catch (e) {
    edgeData = {};
  }

  const newEdge: Edge = {
    id: `e-${sourceNode.id}-${targetNode.id}-${Date.now()}`,
    source: sourceNode.id,
    target: targetNode.id,
    label: edgeData.label || '',
    data: edgeData,
  };
  const edges = store.getState().edges;
  store.getState().setEdges([...edges, newEdge]);

  /*
   * 連接後自動重新計算
   * await handleCalculate(store, { ...action, operation: 'calculate', content: 'Recalculate after connect' });
   */
}
