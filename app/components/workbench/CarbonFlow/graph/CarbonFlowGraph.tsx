import React, { useCallback, useRef, useMemo, useEffect, createContext, useContext } from 'react';
import ReactFlow, {
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ConnectionMode,
  type Node,
  type Edge,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './CarbonFlowGraph.css';

import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { useSankeyLayout } from './layout/useSankeyLayout';
import { SankeyEdge } from './edges/SankeyEdge';
import type { NodeData } from '~/types/nodes';
import type { GraphCanvasProps } from './types';
import { MINIMAP_CONFIG } from './constants';

// 导入节点组件
import { ProductNode } from './nodes/ProductNode';
import { ManufacturingNode } from './nodes/ManufacturingNode';
import { DistributionNode } from './nodes/DistributionNode';
import { UsageNode } from './nodes/UsageNode';
import { DisposalNode } from './nodes/DisposalNode';
import { FinalProductNode } from './nodes/FinalProductNode';

// 定义节点类型映射 - 支持英文和中文节点类型
const nodeTypes = {
  // 英文节点类型
  product: ProductNode,
  manufacturing: ManufacturingNode,
  distribution: DistributionNode,
  usage: UsageNode,
  disposal: DisposalNode,
  finalProduct: FinalProductNode,

  // 中文节点类型映射
  原材料获取阶段: ProductNode,
  生产制造阶段: ManufacturingNode,
  分销运输阶段: DistributionNode,
  使用阶段: UsageNode,
  寿命终止阶段: DisposalNode,
} as const;

// 定义边类型映射
const edgeTypes = {
  sankeyEdge: SankeyEdge,
};

// 创建桑基图模式Context - 始终为true
const SankeyModeContext = createContext<boolean>(true);
export const useSankeyMode = () => useContext(SankeyModeContext);

// 32800-7.5Ah电池案例演示数据 - 含分配机制版本
const batteryDemoNodes: Node<NodeData>[] = [
  // === 原材料获取阶段 ===
  {
    id: 'raw-lithium-materials',
    type: 'product',
    position: { x: 0, y: 0 },
    data: {
      id: 'raw-lithium-materials',
      nodeId: 'raw-lithium-materials',
      workflowId: 'battery-demo',
      label: '锂原料开采\n(磷酸铁锂55.2g)',
      lifecycleStage: '原材料获取阶段',
      emissionType: 'scope3',
      quantity: '55.21',
      activityUnit: 'g',
      carbonFactor: '8.5',
      activitydataSource: 'database',
      activityScore: 4,
      carbonFootprint: '46.93', // 55.21 * 8.5 / 10
      verificationStatus: 'verified',
    } as NodeData,
  },
  {
    id: 'raw-graphite-materials',
    type: 'product',
    position: { x: 0, y: 200 },
    data: {
      id: 'raw-graphite-materials',
      nodeId: 'raw-graphite-materials',
      workflowId: 'battery-demo',
      label: '石墨原料开采\n(天目TM-15P 26.1g)',
      lifecycleStage: '原材料获取阶段',
      emissionType: 'scope3',
      quantity: '26.07',
      activityUnit: 'g',
      carbonFactor: '12.3',
      activitydataSource: 'database',
      activityScore: 4,
      carbonFootprint: '32.07', // 26.07 * 12.3 / 10
      verificationStatus: 'verified',
    } as NodeData,
  },
  {
    id: 'raw-metal-materials',
    type: 'product',
    position: { x: 0, y: 400 },
    data: {
      id: 'raw-metal-materials',
      nodeId: 'raw-metal-materials',
      workflowId: 'battery-demo',
      label: '金属原料\n(铝箔+铜箔+钢壳)',
      lifecycleStage: '原材料获取阶段',
      emissionType: 'scope3',
      quantity: '42.07',
      activityUnit: 'g',
      carbonFactor: '15.2',
      activitydataSource: 'database',
      activityScore: 3,
      carbonFootprint: '63.95', // (5.99+10.44+26.24) * 15.2 / 10
      verificationStatus: 'verified',
    } as NodeData,
  },
  {
    id: 'raw-electrolyte-materials',
    type: 'product',
    position: { x: 0, y: 600 },
    data: {
      id: 'raw-electrolyte-materials',
      nodeId: 'raw-electrolyte-materials',
      workflowId: 'battery-demo',
      label: '电解液原料\n(骅驰HC8030 24g)',
      lifecycleStage: '原材料获取阶段',
      emissionType: 'scope3',
      quantity: '24.0',
      activityUnit: 'g',
      carbonFactor: '6.8',
      activitydataSource: 'database',
      activityScore: 4,
      carbonFootprint: '16.32', // 24 * 6.8 / 10
      verificationStatus: 'verified',
    } as NodeData,
  },

  // === 生产制造阶段 ===
  {
    id: 'manufacturing-electrode',
    type: 'manufacturing',
    position: { x: 450, y: 100 },
    data: {
      id: 'manufacturing-electrode',
      nodeId: 'manufacturing-electrode',
      workflowId: 'battery-demo',
      label: '正负极制造\n(涂布+干燥+分切)',
      lifecycleStage: '生产制造阶段',
      emissionType: 'scope2',
      quantity: '1',
      activityUnit: 'set',
      carbonFactor: '28.5',
      activitydataSource: 'measurement',
      activityScore: 5,
      carbonFootprint: '28.5', // 电极制造工艺能耗
      verificationStatus: 'verified',
    } as NodeData,
  },
  {
    id: 'manufacturing-assembly',
    type: 'manufacturing',
    position: { x: 450, y: 350 },
    data: {
      id: 'manufacturing-assembly',
      nodeId: 'manufacturing-assembly',
      workflowId: 'battery-demo',
      label: '电芯装配\n(卷绕+入壳+注液)',
      lifecycleStage: '生产制造阶段',
      emissionType: 'scope2',
      quantity: '1',
      activityUnit: 'unit',
      carbonFactor: '22.8',
      activitydataSource: 'measurement',
      activityScore: 5,
      carbonFootprint: '22.8', // 装配工艺能耗
      verificationStatus: 'verified',
    } as NodeData,
  },
  {
    id: 'manufacturing-formation',
    type: 'manufacturing',
    position: { x: 450, y: 600 },
    data: {
      id: 'manufacturing-formation',
      nodeId: 'manufacturing-formation',
      workflowId: 'battery-demo',
      label: '化成老化\n(首次充放电)',
      lifecycleStage: '生产制造阶段',
      emissionType: 'scope2',
      quantity: '1',
      activityUnit: 'unit',
      carbonFactor: '15.6',
      activitydataSource: 'measurement',
      activityScore: 4,
      carbonFootprint: '15.6', // 化成工艺能耗
      verificationStatus: 'verified',
    } as NodeData,
  },

  // === 分销运输阶段 ===
  {
    id: 'distribution-logistics',
    type: 'distribution',
    position: { x: 900, y: 350 },
    data: {
      id: 'distribution-logistics',
      nodeId: 'distribution-logistics',
      workflowId: 'battery-demo',
      label: '物流配送\n(包装+运输)',
      lifecycleStage: '分销运输阶段',
      emissionType: 'scope3',
      quantity: '500',
      activityUnit: 'km',
      carbonFactor: '0.15',
      activitydataSource: 'calculation',
      activityScore: 3,
      carbonFootprint: '7.5', // 包装2.0 + 运输5.5
      verificationStatus: 'verified',
    } as NodeData,
  },

  // === 使用阶段 ===
  {
    id: 'usage-lifecycle',
    type: 'usage',
    position: { x: 1350, y: 350 },
    data: {
      id: 'usage-lifecycle',
      nodeId: 'usage-lifecycle',
      workflowId: 'battery-demo',
      label: '使用阶段\n(2000次循环)',
      lifecycleStage: '使用阶段',
      emissionType: 'scope2',
      quantity: '2000',
      activityUnit: 'cycles',
      carbonFactor: '0.025',
      activitydataSource: 'measurement',
      activityScore: 4,
      carbonFootprint: '50.0', // 2000次 * 0.025 充电排放
      verificationStatus: 'verified',
    } as NodeData,
  },

  // === 最终产品 ===
  {
    id: 'final-battery',
    type: 'finalProduct',
    position: { x: 1800, y: 350 },
    data: {
      id: 'final-battery',
      nodeId: 'final-battery',
      workflowId: 'battery-demo',
      label: '32800锂电池\n(7.5Ah总计)',
      lifecycleStage: '最终产品',
      emissionType: 'total',
      quantity: '1',
      activityUnit: 'unit',
      carbonFactor: '283.77',
      activitydataSource: 'calculation',
      activityScore: 5,
      carbonFootprint: '283.77', // 总碳足迹: 159.27(原料) + 66.9(制造) + 7.5(物流) + 50.0(使用)
      verificationStatus: 'verified',
    } as NodeData,
  },

  // === 寿命终止阶段 ===
  {
    id: 'disposal-recycling',
    type: 'disposal',
    position: { x: 2250, y: 350 },
    data: {
      id: 'disposal-recycling',
      nodeId: 'disposal-recycling',
      workflowId: 'battery-demo',
      label: '电池回收\n(金属回收)',
      lifecycleStage: '寿命终止阶段',
      emissionType: 'scope3',
      quantity: '1',
      activityUnit: 'unit',
      carbonFactor: '-12.8',
      activitydataSource: 'database',
      activityScore: 3,
      carbonFootprint: '-12.8', // 回收效益: 金属回收-15.2 + 处理成本2.4
      verificationStatus: 'verified',
    } as NodeData,
  },
];

const batteryDemoEdges: Edge[] = [
  // 原材料到制造阶段
  {
    id: 'lithium-to-electrode',
    source: 'raw-lithium-materials',
    target: 'manufacturing-electrode',
    type: 'sankeyEdge',
  },
  {
    id: 'graphite-to-electrode',
    source: 'raw-graphite-materials',
    target: 'manufacturing-electrode',
    type: 'sankeyEdge',
  },
  {
    id: 'metal-to-electrode',
    source: 'raw-metal-materials',
    target: 'manufacturing-electrode',
    type: 'sankeyEdge',
  },
  {
    id: 'electrolyte-to-assembly',
    source: 'raw-electrolyte-materials',
    target: 'manufacturing-assembly',
    type: 'sankeyEdge',
  },
  // 制造流程
  {
    id: 'electrode-to-assembly',
    source: 'manufacturing-electrode',
    target: 'manufacturing-assembly',
    type: 'sankeyEdge',
  },
  {
    id: 'assembly-to-formation',
    source: 'manufacturing-assembly',
    target: 'manufacturing-formation',
    type: 'sankeyEdge',
  },
  // 后续流程
  {
    id: 'formation-to-logistics',
    source: 'manufacturing-formation',
    target: 'distribution-logistics',
    type: 'sankeyEdge',
  },
  {
    id: 'logistics-to-usage',
    source: 'distribution-logistics',
    target: 'usage-lifecycle',
    type: 'sankeyEdge',
  },
  {
    id: 'usage-to-final',
    source: 'usage-lifecycle',
    target: 'final-battery',
    type: 'sankeyEdge',
  },
  {
    id: 'final-to-recycling',
    source: 'final-battery',
    target: 'disposal-recycling',
    type: 'sankeyEdge',
  },
];

// 碳足迹图例组件
const CarbonFootprintLegend: React.FC = () => (
  <div
    className="carbon-footprint-legend"
    style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '16px',
      color: 'white',
      fontSize: '12px',
      zIndex: 1000,
    }}
  >
    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>碳足迹强度</div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {[
        { color: '#6b7280', label: '无数据', level: 'none' },
        { color: '#10b981', label: '< 10 kgCO₂e', level: 'low' },
        { color: '#f59e0b', label: '10-50 kgCO₂e', level: 'medium' },
        { color: '#ef4444', label: '> 50 kgCO₂e', level: 'high' },
      ].map((item) => (
        <div key={item.level} className="legend-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: item.color,
              borderRadius: '2px',
            }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>流量粗细</div>
      <div style={{ fontSize: '11px', color: '#ccc' }}>基于节点碳足迹值</div>
    </div>
  </div>
);

// 布局控制面板组件
const LayoutControlPanel: React.FC<{
  onSankeyLayout: () => void;
  onClearEdges: () => void;
  onAutoConnect: () => void;
  onLoadDemo: () => void;
  edgeCount: number;
}> = ({ onSankeyLayout, onClearEdges, onAutoConnect, onLoadDemo, edgeCount }) => (
  <div
    style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}
  >
    <div style={{ color: 'white', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>
      32800-7.5Ah锂电池生命周期桑基图
    </div>
    <div style={{ color: '#ccc', fontSize: '10px', marginBottom: '8px' }}>
      原材料 → 电极制造 → 装配 → 化成 → 分销 → 使用 → 成品 → 回收
    </div>
    
    <button
      onClick={onSankeyLayout}
      style={{
        background: 'linear-gradient(135deg, #10b981, #059669)',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      }}
    >
      🌊 重新布局
    </button>
    
    <button
      onClick={onLoadDemo}
      style={{
        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
        border: 'none',
        borderRadius: '6px',
        color: 'white',
        padding: '8px 16px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
      }}
    >
      🔋 重新加载电池案例
    </button>
    
    <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', marginTop: '4px', paddingTop: '8px' }}>
      <div style={{ color: 'white', fontSize: '11px', marginBottom: '6px' }}>连线管理 ({edgeCount} 条)</div>
      <button
        onClick={onAutoConnect}
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
          border: 'none',
          borderRadius: '6px',
          color: 'white',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          width: '100%',
          marginBottom: '4px',
        }}
      >
        🔗 智能连线
      </button>
      <button
        onClick={onClearEdges}
        disabled={edgeCount === 0}
        style={{
          background: edgeCount > 0 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          borderRadius: '6px',
          color: edgeCount > 0 ? 'white' : '#666',
          padding: '6px 12px',
          fontSize: '11px',
          fontWeight: '600',
          cursor: edgeCount > 0 ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          boxShadow: edgeCount > 0 ? '0 2px 4px rgba(0, 0, 0, 0.3)' : 'none',
          width: '100%',
          marginBottom: '4px',
        }}
      >
        🗑️ 清空连线
      </button>
    </div>
  </div>
);

// 连线信息显示组件
const EdgeInfoPanel: React.FC<{ edges: Edge[] }> = ({ edges }) => (
  <div
    style={{
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0, 0, 0, 0.8)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '8px',
      padding: '12px',
      color: 'white',
      fontSize: '12px',
      zIndex: 1000,
      maxWidth: '300px',
      maxHeight: '200px',
      overflowY: 'auto',
    }}
  >
    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>连线信息 ({edges.length} 条)</div>
    {edges.length === 0 ? (
      <div style={{ color: '#ccc', fontStyle: 'italic' }}>暂无连线。拖拽节点的连接点来创建连线。</div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {edges.slice(0, 8).map((edge) => {
          const flowValue = edge.data?.flowValue || 0;
          const sourceLabel = edge.data?.sourceNode?.data?.label || edge.source;
          const targetLabel = edge.data?.targetNode?.data?.label || edge.target;

          return (
            <div
              key={edge.id}
              style={{
                padding: '4px 8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                fontSize: '11px',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>
                {sourceLabel} → {targetLabel}
              </div>
              <div style={{ color: '#ccc' }}>
                {flowValue > 0 ? `${flowValue.toFixed(1)} kgCO₂e` : '无碳足迹数据'}
                {edge.type && ` • ${edge.type}`}
              </div>
            </div>
          );
        })}
        {edges.length > 8 && (
          <div style={{ color: '#ccc', fontStyle: 'italic', textAlign: 'center' }}>
            还有 {edges.length - 8} 条连线...
          </div>
        )}
      </div>
    )}
  </div>
);

/**
 * 图形画布组件 - 专注于桑基图可视化
 */
export const CarbonFlowGraph: React.FC<GraphCanvasProps> = ({
  workflowId: _workflowId,
  readOnly = false,
  onNodeClick,
  onNodeDoubleClick,
  onEdgeClick,
}) => {
  // Store状态
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
  } = useCarbonFlowStore();

  // ReactFlow状态
  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const [isLayouting, setIsLayouting] = React.useState(false);
  const [hasLoadedDemo, setHasLoadedDemo] = React.useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // 桑基图布局Hook
  const { sankeyLayout } = useSankeyLayout();

  // 手动触发桑基图布局
  const handleSankeyLayout = useCallback(() => {
    if (nodes.length === 0 || isLayouting) {
      return;
    }

    console.log('[CarbonFlowGraph] 手动触发桑基图布局');
    setIsLayouting(true);

    const handleNodesUpdate = (updatedNodes: Node<NodeData>[]) => {
      setNodes(updatedNodes);
      setStoreNodes(updatedNodes);
      setIsLayouting(false);
    };

    const handleEdgesUpdate = (updatedEdges: Edge[]) => {
      setEdges(updatedEdges);
      setStoreEdges(updatedEdges);
    };

    sankeyLayout(nodes, edges, handleNodesUpdate, handleEdgesUpdate);
  }, [nodes, edges, isLayouting, sankeyLayout, setNodes, setStoreNodes, setEdges, setStoreEdges]);

  // 加载电池案例演示数据
  const handleLoadBatteryDemo = useCallback(() => {
    console.log('[CarbonFlowGraph] 加载电池案例演示数据');

    setNodes(batteryDemoNodes);
    setStoreNodes(batteryDemoNodes);
    setEdges(batteryDemoEdges);
    setStoreEdges(batteryDemoEdges);
    setHasLoadedDemo(true);

    // 立即触发桑基图布局
    setTimeout(() => {
      console.log('[CarbonFlowGraph] 触发桑基图布局');

      if (batteryDemoNodes.length > 0) {
        const handleNodesUpdate = (updatedNodes: Node<NodeData>[]) => {
          setNodes(updatedNodes);
          setStoreNodes(updatedNodes);
        };

        const handleEdgesUpdate = (updatedEdges: Edge[]) => {
          setEdges(updatedEdges);
          setStoreEdges(updatedEdges);
        };

        sankeyLayout(batteryDemoNodes, batteryDemoEdges, handleNodesUpdate, handleEdgesUpdate);
      }
    }, 100);
  }, [setNodes, setStoreNodes, setEdges, setStoreEdges, sankeyLayout]);

  // 清空所有连线
  const handleClearEdges = useCallback(() => {
    console.log('[CarbonFlowGraph] 清空所有连线');
    setEdges([]);
    setStoreEdges([]);
  }, [setEdges, setStoreEdges]);

  // 智能连线 - 根据节点层级自动创建连线
  const handleAutoConnect = useCallback(() => {
    if (nodes.length < 2) {
      console.warn('[CarbonFlowGraph] 节点数量不足，无法自动连线');
      return;
    }

    console.log('[CarbonFlowGraph] 开始智能连线');

    // 创建电池生命周期连线
    const newEdges: Edge[] = [
      // 原材料到制造阶段
      {
        id: 'auto-lithium-electrode',
        source: 'raw-lithium-materials',
        target: 'manufacturing-electrode',
        type: 'sankeyEdge',
      },
      {
        id: 'auto-graphite-electrode',
        source: 'raw-graphite-materials',
        target: 'manufacturing-electrode',
        type: 'sankeyEdge',
      },
      {
        id: 'auto-metal-electrode',
        source: 'raw-metal-materials',
        target: 'manufacturing-electrode',
        type: 'sankeyEdge',
      },
      {
        id: 'auto-electrolyte-assembly',
        source: 'raw-electrolyte-materials',
        target: 'manufacturing-assembly',
        type: 'sankeyEdge',
      },

      // 制造流程
      {
        id: 'auto-electrode-assembly',
        source: 'manufacturing-electrode',
        target: 'manufacturing-assembly',
        type: 'sankeyEdge',
      },
      {
        id: 'auto-assembly-formation',
        source: 'manufacturing-assembly',
        target: 'manufacturing-formation',
        type: 'sankeyEdge',
      },

      // 后续流程
      {
        id: 'auto-formation-logistics',
        source: 'manufacturing-formation',
        target: 'distribution-logistics',
        type: 'sankeyEdge',
      },
      { id: 'auto-logistics-usage', source: 'distribution-logistics', target: 'usage-lifecycle', type: 'sankeyEdge' },
      { id: 'auto-usage-final', source: 'usage-lifecycle', target: 'final-battery', type: 'sankeyEdge' },
      { id: 'auto-final-recycling', source: 'final-battery', target: 'disposal-recycling', type: 'sankeyEdge' },
    ];

    // 过滤掉已存在的连线
    const existingEdgeIds = new Set(edges.map((e) => `${e.source}-${e.target}`));
    const filteredEdges = newEdges.filter((edge) => !existingEdgeIds.has(`${edge.source}-${edge.target}`));

    if (filteredEdges.length > 0) {
      const updatedEdges = [...edges, ...filteredEdges];
      setEdges(updatedEdges);
      setStoreEdges(updatedEdges);
      console.log(`[CarbonFlowGraph] 智能连线完成，新增 ${filteredEdges.length} 条连线`);

      // 重新触发桑基图布局
      setTimeout(() => {
        handleSankeyLayout();
      }, 100);
    } else {
      console.log('[CarbonFlowGraph] 没有需要创建的新连线');
    }
  }, [nodes, edges, setEdges, setStoreEdges, handleSankeyLayout]);

  // 默认自动加载电池案例 - 仅在首次加载时执行
  useEffect(() => {
    if (!hasLoadedDemo && storeNodes.length === 0) {
      console.log('[CarbonFlowGraph] 默认加载电池案例演示数据');

      const timer = setTimeout(() => {
        handleLoadBatteryDemo();
      }, 500);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [hasLoadedDemo, storeNodes.length, handleLoadBatteryDemo]);

  // 同步本地状态和store状态
  React.useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // 自动布局触发 - 首次加载时自动使用桑基图
  useEffect(() => {
    if (nodes.length > 0 && !isLayouting && hasLoadedDemo) {
      console.log('[CarbonFlowGraph] 首次加载自动桑基图布局，节点数:', nodes.length);

      const layoutTimer = setTimeout(() => {
        handleSankeyLayout();
      }, 1000);

      return () => clearTimeout(layoutTimer);
    }

    return undefined;
  }, [nodes.length > 0 && hasLoadedDemo ? 1 : 0]);

  // 连接处理
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) {
        return;
      }

      // 查找源节点和目标节点
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) {
        console.warn('[CarbonFlowGraph] 连接失败：找不到源节点或目标节点');
        return;
      }

      // 计算连线的碳足迹流量（使用较小的值作为流量）
      const sourceCarbonFootprint = parseFloat(sourceNode.data.carbonFootprint || '0');
      const targetCarbonFootprint = parseFloat(targetNode.data.carbonFootprint || '0');
      const flowValue = Math.min(sourceCarbonFootprint, targetCarbonFootprint);

      // 创建新连线，桑基图模式下使用sankeyEdge类型
      const newEdge = {
        id: `${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        type: 'sankeyEdge',
        animated: flowValue > 10, // 高碳足迹的连线有动画
        style: {
          stroke: flowValue > 50 ? '#ef4444' : flowValue > 10 ? '#f59e0b' : '#10b981',
          strokeWidth: Math.max(10, flowValue * 2),
        },
        label: flowValue > 0 ? `${flowValue.toFixed(1)} kgCO₂e` : undefined,
        labelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
          fill: '#ffffff',
          background: 'rgba(0,0,0,0.8)',
          padding: '2px 4px',
          borderRadius: '4px',
        },
        data: {
          flowValue,
          sourceNode,
          targetNode,
          carbonFootprint: flowValue,
          createdAt: new Date().toISOString(),
          createdBy: 'manual',
        },
      };

      console.log('[CarbonFlowGraph] 创建新桑基图连线:', {
        source: sourceNode.data.label,
        target: targetNode.data.label,
        flowValue,
      });

      const updatedEdges = addEdge(newEdge, edges);
      setEdges(updatedEdges);
      setStoreEdges(updatedEdges);
    },
    [edges, setEdges, setStoreEdges, readOnly, nodes],
  );

  // 节点点击处理
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      onNodeClick?.(node);
    },
    [onNodeClick],
  );

  // 节点双击处理
  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: Node<NodeData>) => {
      onNodeDoubleClick?.(node);
    },
    [onNodeDoubleClick],
  );

  // 边点击处理
  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      onEdgeClick?.(edge);
    },
    [onEdgeClick],
  );

  // 拖放处理
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly) {
        return;
      }

      const type = event.dataTransfer.getData('application/reactflow');

      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // 创建符合NodeData接口的数据结构
      const newNode: Node<NodeData> = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          id: `${type}-${Date.now()}`,
          nodeId: `${type}-${Date.now()}`,
          workflowId: _workflowId || '',
          label: `新${type}节点`,
          lifecycleStage: type,
          emissionType: 'unknown',
          quantity: '',
          activityUnit: '',
          carbonFactor: '0',
          activitydataSource: 'unknown',
          activityScore: 0,
          carbonFootprint: '0',
          verificationStatus: 'pending',
        } as NodeData,
      };

      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      setStoreNodes(updatedNodes);
    },
    [screenToFlowPosition, nodes, setNodes, setStoreNodes, readOnly, _workflowId],
  );

  // 节点颜色映射 - 基于碳足迹强度
  const nodeColor = useCallback((node: Node<NodeData>) => {
    const carbonFootprint = parseFloat(node.data?.carbonFootprint || '0');

    // 根据碳足迹值返回不同颜色
    if (carbonFootprint === 0) {
      return '#6b7280'; // 灰色 - 无数据
    } else if (carbonFootprint < 10) {
      return '#10b981'; // 绿色 - 低碳足迹
    } else if (carbonFootprint < 50) {
      return '#f59e0b'; // 橙色 - 中等碳足迹
    } else {
      return '#ef4444'; // 红色 - 高碳足迹
    }
  }, []);

  // ReactFlow配置
  const reactFlowProps = useMemo(
    () => ({
      nodes,
      edges,
      nodeTypes,
      edgeTypes,
      onNodesChange,
      onEdgesChange,
      onConnect,
      onNodeClick: handleNodeClick,
      onNodeDoubleClick: handleNodeDoubleClick,
      onEdgeClick: handleEdgeClick,
      onDrop,
      onDragOver,
      connectionMode: ConnectionMode.Loose,
      fitView: true,
      attributionPosition: 'bottom-left' as const,
      className: 'carbon-flow-graph',
      deleteKeyCode: readOnly ? null : ['Backspace', 'Delete'],
    }),
    [
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      onConnect,
      handleNodeClick,
      handleNodeDoubleClick,
      handleEdgeClick,
      onDrop,
      onDragOver,
      readOnly,
    ],
  );

  return (
    <div
      ref={reactFlowWrapper}
      style={{
        width: '100%',
        height: '100%',
        background: '#0f0f0f',
        position: 'relative',
      }}
    >
      <SankeyModeContext.Provider value={true}>
        <ReactFlow {...reactFlowProps}>
          {/* 控制按钮 */}
          <Controls
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          />

          {/* 小地图 */}
          <MiniMap
            nodeColor={nodeColor}
            nodeStrokeColor="transparent"
            maskColor={MINIMAP_CONFIG.maskColor}
            position={MINIMAP_CONFIG.position}
            style={{
              background: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          />

          {/* 网格背景 */}
          <Background
            color="#333"
            gap={20}
            style={{
              background: '#0f0f0f',
            }}
          />

          {/* 碳足迹图例 */}
          <CarbonFootprintLegend />

          {/* 布局控制面板 */}
          <LayoutControlPanel
            onSankeyLayout={handleSankeyLayout}
            onLoadDemo={handleLoadBatteryDemo}
            onClearEdges={handleClearEdges}
            onAutoConnect={handleAutoConnect}
            edgeCount={edges.length}
          />

          {/* 连线信息面板 */}
          <EdgeInfoPanel edges={edges} />
        </ReactFlow>
      </SankeyModeContext.Provider>
    </div>
  );
};
