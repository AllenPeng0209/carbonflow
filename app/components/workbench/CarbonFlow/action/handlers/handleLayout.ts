import type { CarbonFlowAction } from '~/types/actions';
import type { Node, Edge } from 'reactflow';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 根据 action.data 指定的 layout type，自动布局节点（vertical/horizontal/normal/radial）
 */
export async function handleLayout(store: typeof useCarbonFlowStore, action: CarbonFlowAction): Promise<void> {
  // 參數完全同步 CarbonFlow.tsx autoLayout
  const NODE_WIDTH = 250;
  const NODE_HEIGHT = 150;
  const HORIZONTAL_SPACING = 600;
  const VERTICAL_SPACING = 650;
  const PADDING = 400;
  const nodeTypeOrder = ['product', 'manufacturing', 'distribution', 'usage', 'disposal'] as const;

  const nodes = [...store.getState().nodes];

  if (!nodes || nodes.length === 0) {
    return;
  }

  // 分類
  const nodesByType: Record<string, Node<any>[]> = {
    product: [],
    manufacturing: [],
    distribution: [],
    usage: [],
    disposal: [],
    finalProduct: [],
  };
  nodes.forEach((node) => {
    const nodeType = node.type as string;

    if (nodeType in nodesByType) {
      nodesByType[nodeType].push(node);
    }
  });

  let finalProductNode = nodesByType.finalProduct[0];

  if (!finalProductNode) {
    // 若沒有終節點，補一個默認的
    finalProductNode = {
      id: 'final-product-1',
      type: 'finalProduct',
      position: { x: 0, y: 0 },
      data: {
        label: '最终产品',
        nodeId: 'final_product_1',
        lifecycleStage: 'finalProduct',
        emissionType: 'total',
        activityScore: 0,
        carbonFactor: '0',
        activitydataSource: 'calculated',
        carbonFootprint: '0',
        certificationMaterials: '',
        emissionFactor: '',
        calculationMethod: '',
        verificationStatus: 'pending',
        applicableStandard: '',
        completionStatus: 'incomplete',
        carbonFactorName: '',
        unitConversion: '1',
        finalProductName: '最终产品',
        totalCarbonFootprint: 0,
        certificationStatus: 'pending',
        environmentalImpact: '待评估',
        sustainabilityScore: 0,
        productCategory: '未分类',
        marketSegment: '未指定',
        targetRegion: '未指定',
        complianceStatus: '未验证',
        carbonLabel: '待认证',
        nodeType: 'finalProduct',
        quantity: '0',
      },
    } as Node<any>;
    nodesByType.finalProduct.push(finalProductNode);
  }

  // 保證 finalProductNode 一定在 nodes 列表裡
  const layoutNodes = [...nodes];

  if (!layoutNodes.find((n) => n.type === 'finalProduct')) {
    layoutNodes.push(finalProductNode);
  }

  // 非終節點布局
  const positionedNodes = layoutNodes
    .filter((node) => node.type !== 'finalProduct')
    .map((node) => {
      const nodeType = node.type as string;
      const typeIndex = nodeTypeOrder.indexOf(nodeType as any);
      const typeNodes = nodesByType[nodeType] || [];
      const nodeIndex = typeNodes.findIndex((n) => n.id === node.id);
      const x = PADDING + typeIndex * HORIZONTAL_SPACING;
      const y = PADDING + (nodeIndex >= 0 ? nodeIndex : 0) * VERTICAL_SPACING;

      return {
        ...node,
        position: { x, y },
        style: {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
        },
      };
    });

  const maxX = positionedNodes.length > 0 ? Math.max(...positionedNodes.map((node) => node.position.x)) : PADDING;
  const maxY = positionedNodes.length > 0 ? Math.max(...positionedNodes.map((node) => node.position.y)) : PADDING;
  const finalProductPosition = {
    x: maxX / 2,
    y: maxY + VERTICAL_SPACING,
  };

  const finalProductNodeRef = layoutNodes.find((n) => n.id === finalProductNode.id);

  if (!finalProductNodeRef) {
    return;
  }

  const finalProductNodeWithPosition = {
    ...finalProductNodeRef,
    position: finalProductPosition,
  };

  const allNodes = [...positionedNodes, finalProductNodeWithPosition];

  // 自動生成連線與碳足跡彙總
  const newEdges: any[] = [];
  let totalCarbonFootprint = 0;
  positionedNodes.forEach((node) => {
    newEdges.push({
      id: `edge-${node.id}-${finalProductNode.id}`,
      source: node.id,
      target: finalProductNode.id,
      type: 'smoothstep',
      animated: true,
    });

    const footprint = parseFloat(node.data.carbonFootprint || '0');

    if (!isNaN(footprint)) {
      totalCarbonFootprint += footprint;
    }
  });

  const updatedNodes = allNodes.map((node) => {
    if (node.id === finalProductNode.id) {
      const finalData = node.data;
      return {
        ...node,
        data: {
          ...finalData,
          totalCarbonFootprint,
          carbonFootprint: String(totalCarbonFootprint),
        },
      };
    }

    return node;
  });

  // 寫入 store
  store.getState().setNodes(updatedNodes);
  store.getState().setEdges(newEdges);
}
