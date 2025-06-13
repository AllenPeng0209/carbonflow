import type { CarbonFlowAction } from '~/types/actions';
import type { Node } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 根据 action 内容更新指定节点的资料
 * @param store Zustand store
 * @param action CarbonFlowAction，content 需包含 nodeId 及要更新的栏位
 */
export async function handleUpdateNode(store: typeof useCarbonFlowStore, action: CarbonFlowAction): Promise<void> {
  if (!action.content) {
    console.error('[handleUpdateNode] Action is missing content');
    return;
  }

  let inputData: Record<string, any> = {};

  try {
    inputData = typeof action.content === 'string' ? JSON.parse(action.content) : action.content;
  } catch (e) {
    console.error('[handleUpdateNode] Failed to parse action.content:', action.content, e);
    return;
  }

  const nodeId = inputData.nodeId;

  if (!nodeId) {
    console.error('[handleUpdateNode] content 缺少 nodeId');
    return;
  }

  console.log(`[handleUpdateNode] 尝试更新节点: "${nodeId}"`);

  // 取得当前节点阵列
  const currentNodes = store.getState().nodes;

  // 添加调试信息：列出当前所有节点的ID和名称
  console.log(
    '[handleUpdateNode] 当前存在的节点IDs:',
    currentNodes.map((node: Node<NodeData>) => `"${node.id}"`),
  );
  console.log(
    '[handleUpdateNode] 当前存在的节点Labels:',
    currentNodes.map((node: Node<NodeData>) => `"${node.data.label}"`),
  );
  console.log(
    '[handleUpdateNode] 当前存在的节点Names:',
    currentNodes.map((node: Node<NodeData>) => `"${node.data.nodeId}"`),
  );
  console.log('[handleUpdateNode] 节点总数:', currentNodes.length);

  // 尝试多种方式查找节点：ID、label、nodeId
  let nodeIdx = -1;
  let foundBy = '';

  // 1. 首先尝试通过 node.id 查找
  nodeIdx = currentNodes.findIndex((node: Node<NodeData>) => node.id === nodeId);

  if (nodeIdx !== -1) {
    foundBy = 'node.id';
  }

  // 2. 如果没找到，尝试通过 label 查找
  if (nodeIdx === -1) {
    nodeIdx = currentNodes.findIndex((node: Node<NodeData>) => node.data.label === nodeId);

    if (nodeIdx !== -1) {
      foundBy = 'data.label';
    }
  }

  // 3. 如果还没找到，尝试通过 nodeId 查找
  if (nodeIdx === -1) {
    nodeIdx = currentNodes.findIndex((node: Node<NodeData>) => node.data.nodeId === nodeId);

    if (nodeIdx !== -1) {
      foundBy = 'data.nodeId';
    }
  }

  if (nodeIdx === -1) {
    console.error(`[handleUpdateNode] Node with ID "${nodeId}" 不存在，无法更新`);
    console.error('[handleUpdateNode] 可能的原因：');
    console.error('1. 节点尚未创建');
    console.error('2. 节点ID不匹配（检查大小写、空格等）');
    console.error('3. 节点已被删除');
    console.error('4. 节点使用了不同的标识符格式');

    return;
  }

  console.log(`[handleUpdateNode] ✅ 找到节点，索引位置: ${nodeIdx}，匹配方式: ${foundBy}`);

  // 取得原始 node
  const oldNode = currentNodes[nodeIdx];

  // 合併新资料到 data
  const newData = { ...oldNode.data, ...inputData };

  // 保持座标不变（或可允许 position 更新）
  let newPosition = oldNode.position;

  if (typeof inputData.positionX === 'number' && typeof inputData.positionY === 'number') {
    newPosition = { x: inputData.positionX, y: inputData.positionY };
  } else if (inputData.position && typeof inputData.position === 'object') {
    if (typeof inputData.position.x === 'number' && typeof inputData.position.y === 'number') {
      newPosition = { x: inputData.position.x, y: inputData.position.y };
    }
  }

  const updatedNode: Node<NodeData> = {
    ...oldNode,
    data: newData,
    position: newPosition,
  };

  console.log('[handleUpdateNode] 🔄 更新节点资料:', {
    nodeId,
    foundBy,
    actualNodeId: oldNode.id,
    oldData: oldNode.data,
    newData: updatedNode.data,
    position: newPosition,
  });

  // 更新 nodes 阵列
  const newNodes = [...currentNodes.slice(0, nodeIdx), updatedNode, ...currentNodes.slice(nodeIdx + 1)];

  // 写回 store
  store.getState().setNodes(newNodes);

  console.log('[handleUpdateNode] ✅ 节点更新完成');
}
