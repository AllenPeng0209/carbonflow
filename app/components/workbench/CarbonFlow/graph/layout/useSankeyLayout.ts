import { useCallback } from 'react';
import { useReactFlow, type Node, type Edge } from 'reactflow';
import type { NodeData } from '~/types/nodes';

// 节点类型定义
type NodeType = 'product' | 'manufacturing' | 'distribution' | 'usage' | 'disposal' | 'finalProduct';

// 桑基图布局配置
const SANKEY_CONFIG = {
  LAYER_HEIGHT: 600, // 层间距（原200 * 3）
  NODE_WIDTH: 200, // 节点宽度（保持不变）
  NODE_MIN_HEIGHT: 40, // 节点最小高度（保持不变）
  NODE_MAX_HEIGHT: 120, // 节点最大高度（保持不变）
  LAYER_PADDING: 300, // 层边距（原100 * 3）
  NODE_PADDING: 300, // 节点间距（原20 * 3）
  LAYER_SPACING: 450, // 水平层间距（原150 * 3）
  CURVE_TENSION: 0.5, // 曲线张力（保持不变）
};

// 节点层级定义（从左到右的产品生命周期顺序）
const SANKEY_HIERARCHY: Record<NodeType, number> = {
  product: 0, // 原材料获取阶段 - 最左边
  manufacturing: 1, // 生产制造阶段
  distribution: 2, // 分销运输阶段
  usage: 3, // 使用阶段
  finalProduct: 4, // 最终产品阶段
  disposal: 5, // 寿命终止阶段 - 最右边
};

/**
 * 计算节点高度
 */
const calculateNodeHeight = (carbonFootprint: number, allCarbonFootprints: number[]): number => {
  if (allCarbonFootprints.length === 0 || carbonFootprint === 0) {
    return SANKEY_CONFIG.NODE_MIN_HEIGHT;
  }

  const maxFootprint = Math.max(...allCarbonFootprints);
  const minFootprint = Math.min(...allCarbonFootprints.filter((cf) => cf > 0));

  if (maxFootprint === minFootprint) {
    return SANKEY_CONFIG.NODE_MIN_HEIGHT;
  }

  const normalizedHeight =
    SANKEY_CONFIG.NODE_MIN_HEIGHT +
    ((carbonFootprint - minFootprint) / (maxFootprint - minFootprint)) *
      (SANKEY_CONFIG.NODE_MAX_HEIGHT - SANKEY_CONFIG.NODE_MIN_HEIGHT);

  return Math.max(SANKEY_CONFIG.NODE_MIN_HEIGHT, Math.min(SANKEY_CONFIG.NODE_MAX_HEIGHT, normalizedHeight));
};

/**
 * 计算桑基图边的宽度
 */
const calculateSankeyEdgeWidth = (
  sourceNode: Node<NodeData>,
  targetNode: Node<NodeData>,
  allNodes: Node<NodeData>[],
): number => {
  const sourceCarbonFootprint = parseFloat(sourceNode.data.carbonFootprint || '0');
  const targetCarbonFootprint = parseFloat(targetNode.data.carbonFootprint || '0');

  // 使用较小的碳足迹值作为流量
  const flowValue = Math.min(sourceCarbonFootprint, targetCarbonFootprint);

  // 计算所有节点的碳足迹范围
  const allCarbonFootprints = allNodes.map((node) => parseFloat(node.data.carbonFootprint || '0'));
  const maxCarbonFootprint = Math.max(...allCarbonFootprints, 1);
  const minCarbonFootprint = Math.min(...allCarbonFootprints.filter((cf) => cf > 0), 0);

  if (maxCarbonFootprint === minCarbonFootprint) {
    return 20; // 默认宽度
  }

  const normalizedFlow = (flowValue - minCarbonFootprint) / (maxCarbonFootprint - minCarbonFootprint);

  return 10 + normalizedFlow * 50; // 10-60px 范围
};

/**
 * 获取桑基图边的颜色渐变
 */
const getSankeyEdgeColor = (sourceNode: Node<NodeData>, targetNode: Node<NodeData>, _edgeWidth: number): string => {
  const sourceCarbon = parseFloat(sourceNode.data.carbonFootprint || '0');
  const targetCarbon = parseFloat(targetNode.data.carbonFootprint || '0');
  const avgCarbon = (sourceCarbon + targetCarbon) / 2;

  if (avgCarbon > 50) {
    return '#ef4444'; // 高碳足迹 - 红色
  } else if (avgCarbon > 10) {
    return '#f59e0b'; // 中等碳足迹 - 橙色
  } else {
    return '#10b981'; // 低碳足迹 - 绿色
  }
};

/**
 * 桑基图布局Hook
 */
export const useSankeyLayout = () => {
  const { fitView } = useReactFlow();

  // 桑基图布局算法
  const sankeyLayout = useCallback(
    (
      nodes: Node<NodeData>[],
      edges: Edge[],
      onNodesChange: (nodes: Node<NodeData>[]) => void,
      onEdgesChange?: (edges: Edge[]) => void,
    ) => {
      console.log('[Sankey Layout] 开始桑基图布局');

      if (nodes.length === 0) {
        return;
      }

      // 计算所有节点的碳足迹值
      const allCarbonFootprints = nodes.map((node) => parseFloat(node.data.carbonFootprint || '0'));

      // 按层级分组节点
      const nodesByLayer: Map<number, Node<NodeData>[]> = new Map();

      nodes.forEach((node) => {
        const nodeType = (node.type || node.data.lifecycleStage) as NodeType;
        const layer = SANKEY_HIERARCHY[nodeType] ?? 0;

        if (!nodesByLayer.has(layer)) {
          nodesByLayer.set(layer, []);
        }

        nodesByLayer.get(layer)!.push(node);
      });

      // 计算布局
      const positionedNodes: Node<NodeData>[] = [];
      const sortedLayers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);

      sortedLayers.forEach((layer) => {
        const layerNodes = nodesByLayer.get(layer)!;

        // 计算该层的X坐标（每层固定X）
        const layerX = SANKEY_CONFIG.LAYER_PADDING + layer * (SANKEY_CONFIG.NODE_WIDTH + SANKEY_CONFIG.LAYER_SPACING);

        // 按碳足迹排序节点（高碳足迹在前）
        const sortedLayerNodes = layerNodes.sort((a, b) => {
          const aCarbonFootprint = parseFloat(a.data.carbonFootprint || '0');
          const bCarbonFootprint = parseFloat(b.data.carbonFootprint || '0');

          return bCarbonFootprint - aCarbonFootprint;
        });

        // 计算节点总高度
        const nodeHeights = sortedLayerNodes.map((node) => {
          const carbonFootprint = parseFloat(node.data.carbonFootprint || '0');
          return calculateNodeHeight(carbonFootprint, allCarbonFootprints);
        });

        const totalHeight =
          nodeHeights.reduce((sum, height) => sum + height, 0) +
          (sortedLayerNodes.length - 1) * SANKEY_CONFIG.NODE_PADDING * 5; // 间距也调整为5倍

        // 计算起始Y坐标（居中）
        let currentY = SANKEY_CONFIG.LAYER_PADDING + 200 - totalHeight / 2;

        sortedLayerNodes.forEach((node, index) => {
          const carbonFootprint = parseFloat(node.data.carbonFootprint || '0');
          const nodeHeight = nodeHeights[index];

          positionedNodes.push({
            ...node,
            position: {
              x: layerX, // 同层节点X坐标相同
              y: currentY, // 垂直排列，Y坐标递增
            },
            style: {
              ...node.style,
              width: SANKEY_CONFIG.NODE_WIDTH,
              height: nodeHeight,
              background:
                carbonFootprint > 50
                  ? '#ef4444'
                  : carbonFootprint > 10
                    ? '#f59e0b'
                    : carbonFootprint > 0
                      ? '#10b981'
                      : '#6b7280',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px',
              textAlign: 'center',
              padding: '8px',
            },
          });

          // 移动到下一个节点的Y位置 - 增加更大的垂直间距
          currentY += nodeHeight + SANKEY_CONFIG.NODE_PADDING * 2; // 原来是1倍，现在改为2倍间距
        });
      });

      // 创建桑基图边
      const sankeyEdges = edges.map((edge) => {
        const sourceNode = positionedNodes.find((n) => n.id === edge.source);
        const targetNode = positionedNodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const edgeWidth = calculateSankeyEdgeWidth(sourceNode, targetNode, positionedNodes);
          const edgeColor = getSankeyEdgeColor(sourceNode, targetNode, edgeWidth);

          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: 'sankeyEdge', // 自定义边类型
            style: {
              stroke: edgeColor,
              strokeWidth: edgeWidth,
              fill: edgeColor,
              opacity: 0.7,
            },
            data: {
              sourceNode,
              targetNode,
              flowValue: Math.min(
                parseFloat(sourceNode.data.carbonFootprint || '0'),
                parseFloat(targetNode.data.carbonFootprint || '0'),
              ),
            },
            animated: edgeWidth > 30, // 大流量的边有动画
          };
        }

        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: 'sankeyEdge',
        };
      });

      console.log('[Sankey Layout] 布局完成，节点数:', positionedNodes.length, '边数:', sankeyEdges.length);

      // 应用布局
      onNodesChange(positionedNodes);

      if (onEdgesChange) {
        onEdgesChange(sankeyEdges);
      }

      // 延迟执行fitView
      setTimeout(() => {
        fitView({ duration: 1000, padding: 0.1 });
      }, 200);
    },
    [fitView],
  );

  return {
    sankeyLayout,
  };
};

/**
 * 桑基图渐变定义配置
 */
export const sankeyGradientConfig = {
  low: {
    id: 'sankeyGradientLow',
    colors: ['#10b981', '#059669'],
    opacity: [0.8, 0.6],
  },
  medium: {
    id: 'sankeyGradientMedium',
    colors: ['#f59e0b', '#d97706'],
    opacity: [0.8, 0.6],
  },
  high: {
    id: 'sankeyGradientHigh',
    colors: ['#ef4444', '#dc2626'],
    opacity: [0.8, 0.6],
  },
};
