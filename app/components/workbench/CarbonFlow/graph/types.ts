import type { Node, Edge, Viewport } from 'reactflow';
import type { NodeData, ProductNodeData, FinalProductNodeData } from '~/types/nodes';

/**
 * 图形画布的属性接口
 */
export interface GraphCanvasProps {
  workflowId?: string;
  readOnly?: boolean;
  onNodeClick?: (node: Node<NodeData>) => void;
  onNodeDoubleClick?: (node: Node<NodeData>) => void;
  onEdgeClick?: (edge: Edge) => void;
}

/**
 * 节点操作相关的类型
 */
export interface NodeOperation {
  type: 'add' | 'update' | 'delete' | 'move';
  nodeId: string;
  data?: NodeData;
  position?: { x: number; y: number };
}

/**
 * 边操作相关的类型
 */
export interface EdgeOperation {
  type: 'add' | 'delete' | 'update';
  edgeId: string;
  source?: string;
  target?: string;
  data?: any;
}

/**
 * 拖放相关的类型
 */
export interface DragDropData {
  nodeType: string;
  nodeData: Partial<NodeData>;
}

/**
 * 自动布局配置
 */
export interface AutoLayoutConfig {
  algorithm: 'dagre' | 'elk' | 'force' | 'hierarchical';
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  spacing: {
    node: number;
    rank: number;
  };
  animate?: boolean;
  duration?: number;
}

/**
 * 检查点数据类型
 */
export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  timestamp: Date;
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
  metadata?: Record<string, any>;
}

/**
 * 图形状态类型
 */
export interface GraphState {
  nodes: Node<NodeData>[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodes: string[];
  selectedEdges: string[];
  isLoading: boolean;
  error?: string;
}

/**
 * 图形控制面板的属性
 */
export interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onAutoLayout: (config: AutoLayoutConfig) => void;
  onSaveCheckpoint: () => void;
  onLoadCheckpoint: (checkpoint: Checkpoint) => void;
  onExport: (format: 'png' | 'jpg' | 'svg' | 'json') => void;
  checkpoints: Checkpoint[];
}

/**
 * 小地图视图属性
 */
export interface MiniMapViewProps {
  nodeColor?: string | ((node: Node<NodeData>) => string);
  nodeStrokeColor?: string | ((node: Node<NodeData>) => string);
  maskColor?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * 图形验证结果
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'disconnected_node' | 'invalid_connection' | 'missing_data' | 'circular_dependency';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export interface ValidationWarning {
  type: 'performance' | 'best_practice' | 'data_quality';
  nodeId?: string;
  message: string;
  suggestion?: string;
}
