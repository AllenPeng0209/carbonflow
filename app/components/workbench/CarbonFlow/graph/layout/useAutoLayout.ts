import { useCallback } from 'react';
import { useReactFlow, type Node, type Edge } from 'reactflow';
import type { NodeData } from '~/types/nodes';

// 节点类型定义
type NodeType = 'product' | 'manufacturing' | 'distribution' | 'usage' | 'disposal' | 'finalProduct';

// 节点层级定义 - 数字越小越靠上
const NODE_HIERARCHY: Record<NodeType, number> = {
  finalProduct: 0, // 最终产品在最上层
  product: 1, // 产品节点第二层
  manufacturing: 2, // 制造节点第三层
  distribution: 3, // 分销节点第四层
  usage: 4, // 使用节点第五层
  disposal: 5, // 废弃节点最下层（排放源）
};

// 布局配置
const LAYOUT_CONFIG = {
  LAYER_HEIGHT: 180, // 层间距
  NODE_SPACING: 280, // 节点间距
  START_Y: 100, // 起始Y坐标
  START_X: 100, // 起始X坐标
  EDGE_MIN_WIDTH: 2, // 边的最小宽度
  EDGE_MAX_WIDTH: 8, // 边的最大宽度
};

/**
 * 计算边的宽度基于碳足迹值
 */
const calculateEdgeWidth = (
  sourceNode: Node<NodeData>,
  targetNode: Node<NodeData>,
  allNodes: Node<NodeData>[],
): number => {
  const sourceCarbonFootprint = parseFloat(sourceNode.data.carbonFootprint || '0');
  const targetCarbonFootprint = parseFloat(targetNode.data.carbonFootprint || '0');

  // 使用较大的碳足迹值作为边的权重
  const edgeWeight = Math.max(sourceCarbonFootprint, targetCarbonFootprint);

  // 计算所有节点的碳足迹范围
  const allCarbonFootprints = allNodes.map((node) => parseFloat(node.data.carbonFootprint || '0'));
  const maxCarbonFootprint = Math.max(...allCarbonFootprints, 1); // 避免除零
  const minCarbonFootprint = Math.min(...allCarbonFootprints.filter((cf) => cf > 0), 0);

  // 归一化到边宽度范围
  if (maxCarbonFootprint === minCarbonFootprint) {
    return LAYOUT_CONFIG.EDGE_MIN_WIDTH;
  }

  const normalizedWeight = (edgeWeight - minCarbonFootprint) / (maxCarbonFootprint - minCarbonFootprint);

  return (
    LAYOUT_CONFIG.EDGE_MIN_WIDTH + normalizedWeight * (LAYOUT_CONFIG.EDGE_MAX_WIDTH - LAYOUT_CONFIG.EDGE_MIN_WIDTH)
  );
};

/**
 * 获取边的颜色基于碳足迹强度
 */
const getEdgeColor = (width: number): string => {
  const intensity =
    (width - LAYOUT_CONFIG.EDGE_MIN_WIDTH) / (LAYOUT_CONFIG.EDGE_MAX_WIDTH - LAYOUT_CONFIG.EDGE_MIN_WIDTH);

  if (intensity < 0.3) {
    return '#10b981';
  } // 低碳足迹 - 绿色

  if (intensity < 0.6) {
    return '#f59e0b';
  } // 中等碳足迹 - 橙色

  return '#ef4444'; // 高碳足迹 - 红色
};

/**
 * 自动布局Hook
 */
export const useAutoLayout = () => {
  const { fitView } = useReactFlow();

  // 专业碳足迹层次布局算法
  const carbonFootprintHierarchicalLayout = useCallback(
    (
      nodes: Node<NodeData>[],
      edges: Edge[],
      onNodesChange: (nodes: Node<NodeData>[]) => void,
      onEdgesChange?: (edges: Edge[]) => void,
    ) => {
      console.log('[CarbonFootprint Layout] 开始专业碳足迹层次布局');

      // 按层级分组节点
      const nodesByLayer: Map<number, Node<NodeData>[]> = new Map();

      nodes.forEach((node) => {
        const nodeType = (node.type || node.data.nodeType) as NodeType;
        const layer = NODE_HIERARCHY[nodeType] ?? 6; // 未知类型放在最下层

        if (!nodesByLayer.has(layer)) {
          nodesByLayer.set(layer, []);
        }

        nodesByLayer.get(layer)!.push(node);
      });

      // 如果没有最终产品节点，创建一个
      if (!nodesByLayer.has(0) || nodesByLayer.get(0)!.length === 0) {
        const finalProductNode: Node<NodeData> = {
          id: 'final-product-auto',
          type: 'finalProduct',
          position: { x: 0, y: 0 },
          data: {
            id: 'final-product-auto',
            workflowId: nodes[0]?.data.workflowId || '',
            label: '最终产品',
            nodeId: 'final_product_auto',
            lifecycleStage: 'finalProduct',
            emissionType: 'total',
            activityScore: 0,
            carbonFactor: '0',
            activitydataSource: 'calculated',
            carbonFootprint: '0',
            verificationStatus: 'pending',
            nodeType: 'finalProduct',
            quantity: '0',
            activityUnit: 'kg',
          } as NodeData,
        };

        nodesByLayer.set(0, [finalProductNode]);
        nodes = [...nodes, finalProductNode];
      }

      // 计算每层的布局
      const positionedNodes: Node<NodeData>[] = [];
      const sortedLayers = Array.from(nodesByLayer.keys()).sort((a, b) => a - b);

      sortedLayers.forEach((layer) => {
        const layerNodes = nodesByLayer.get(layer)!;
        const layerY = LAYOUT_CONFIG.START_Y + layer * LAYOUT_CONFIG.LAYER_HEIGHT;

        // 按碳足迹排序节点（碳足迹高的在中间）
        const sortedLayerNodes = layerNodes.sort((a, b) => {
          const aCarbonFootprint = parseFloat(a.data.carbonFootprint || '0');
          const bCarbonFootprint = parseFloat(b.data.carbonFootprint || '0');

          return bCarbonFootprint - aCarbonFootprint;
        });

        // 计算层的总宽度
        const totalWidth = (sortedLayerNodes.length - 1) * LAYOUT_CONFIG.NODE_SPACING;
        const startX = LAYOUT_CONFIG.START_X - totalWidth / 2;

        sortedLayerNodes.forEach((node, index) => {
          const x = startX + index * LAYOUT_CONFIG.NODE_SPACING;

          positionedNodes.push({
            ...node,
            position: { x, y: layerY },
          });
        });
      });

      // 更新边的样式基于碳足迹
      const updatedEdges = edges.map((edge) => {
        const sourceNode = positionedNodes.find((n) => n.id === edge.source);
        const targetNode = positionedNodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          const edgeWidth = calculateEdgeWidth(sourceNode, targetNode, positionedNodes);
          const edgeColor = getEdgeColor(edgeWidth);

          return {
            ...edge,
            type: undefined, // 重置为默认边类型
            data: undefined, // 清除桑基图数据
            style: {
              strokeWidth: edgeWidth,
              stroke: edgeColor,
            },
            animated: edgeWidth > LAYOUT_CONFIG.EDGE_MIN_WIDTH + 2, // 高碳足迹的边有动画
            label:
              sourceNode.data.carbonFootprint && parseFloat(sourceNode.data.carbonFootprint) > 0
                ? `${parseFloat(sourceNode.data.carbonFootprint).toFixed(2)} kgCO₂e`
                : undefined,
            labelStyle: {
              fontSize: 12,
              fontWeight: 'bold',
              fill: edgeColor,
              background: 'rgba(0,0,0,0.8)',
              padding: '2px 4px',
              borderRadius: '4px',
            },
          };
        }

        return {
          ...edge,
          type: undefined, // 重置为默认边类型
          data: undefined, // 清除桑基图数据
        };
      });

      console.log('[CarbonFootprint Layout] 布局完成，节点数:', positionedNodes.length, '边数:', updatedEdges.length);

      // 应用布局
      onNodesChange(positionedNodes);

      if (onEdgesChange) {
        onEdgesChange(updatedEdges);
      }

      // 延迟执行fitView以确保布局已应用
      setTimeout(() => {
        fitView({ duration: 800, padding: 0.15 });
      }, 100);
    },
    [fitView],
  );

  // 原有的自动布局算法（保持兼容性）
  const autoLayout = useCallback(
    (nodes: Node<NodeData>[], edges: Edge[], onNodesChange: (nodes: Node<NodeData>[]) => void) => {
      // 使用新的专业布局算法
      carbonFootprintHierarchicalLayout(nodes, edges, onNodesChange);
    },
    [carbonFootprintHierarchicalLayout],
  );

  // 层次布局
  const hierarchicalLayout = useCallback(
    (nodes: Node<NodeData>[], edges: Edge[], onNodesChange: (nodes: Node<NodeData>[]) => void) => {
      // 构建依赖关系图
      const dependencies: Map<string, string[]> = new Map();
      const inDegree: Map<string, number> = new Map();

      // 初始化
      nodes.forEach((node) => {
        dependencies.set(node.id, []);
        inDegree.set(node.id, 0);
      });

      // 构建依赖关系
      edges.forEach((edge) => {
        const deps = dependencies.get(edge.target) || [];
        deps.push(edge.source);
        dependencies.set(edge.target, deps);
        inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      });

      // 拓扑排序分层
      const layers: string[][] = [];
      const queue: string[] = [];
      const visited = new Set<string>();

      // 找出入度为0的节点作为第一层
      nodes.forEach((node) => {
        if ((inDegree.get(node.id) || 0) === 0) {
          queue.push(node.id);
        }
      });

      while (queue.length > 0) {
        const currentLayer: string[] = [...queue];
        layers.push(currentLayer);
        queue.length = 0;

        currentLayer.forEach((nodeId) => {
          visited.add(nodeId);

          // 找出所有依赖当前节点的节点
          edges.forEach((edge) => {
            if (edge.source === nodeId && !visited.has(edge.target)) {
              const newInDegree = (inDegree.get(edge.target) || 0) - 1;
              inDegree.set(edge.target, newInDegree);

              if (newInDegree === 0) {
                queue.push(edge.target);
              }
            }
          });
        });
      }

      // 为每层分配位置
      const positionedNodes = nodes.map((node) => {
        let layerIndex = 0;
        let positionInLayer = 0;

        // 找到节点所在的层
        for (let i = 0; i < layers.length; i++) {
          const layerPosition = layers[i].indexOf(node.id);

          if (layerPosition !== -1) {
            layerIndex = i;
            positionInLayer = layerPosition;
            break;
          }
        }

        return {
          ...node,
          position: {
            x: layerIndex * 300 + 100,
            y: positionInLayer * 150 + 100,
          },
        };
      });

      onNodesChange(positionedNodes);

      setTimeout(() => {
        fitView({ duration: 500, padding: 0.1 });
      }, 100);
    },
    [fitView],
  );

  // 环形布局
  const circularLayout = useCallback(
    (nodes: Node<NodeData>[], onNodesChange: (nodes: Node<NodeData>[]) => void) => {
      const centerX = 500;
      const centerY = 300;
      const radius = 200;

      const positionedNodes = nodes.map((node, index) => {
        const angle = (2 * Math.PI * index) / nodes.length;
        return {
          ...node,
          position: {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
          },
        };
      });

      onNodesChange(positionedNodes);

      setTimeout(() => {
        fitView({ duration: 500, padding: 0.1 });
      }, 100);
    },
    [fitView],
  );

  // 网格布局
  const gridLayout = useCallback(
    (nodes: Node<NodeData>[], onNodesChange: (nodes: Node<NodeData>[]) => void) => {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const spacing = 250;

      const positionedNodes = nodes.map((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        return {
          ...node,
          position: {
            x: col * spacing + 100,
            y: row * spacing + 100,
          },
        };
      });

      onNodesChange(positionedNodes);

      setTimeout(() => {
        fitView({ duration: 500, padding: 0.1 });
      }, 100);
    },
    [fitView],
  );

  return {
    autoLayout,
    hierarchicalLayout,
    circularLayout,
    gridLayout,
    carbonFootprintHierarchicalLayout, // 导出新的专业布局算法
  };
};
