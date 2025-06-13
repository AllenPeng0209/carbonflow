import type { Node, Edge } from 'reactflow';
import type { NodeData } from '~/types/nodes';

/**
 * 检查点元数据接口
 */
export interface CheckpointMetadata {
  name: string;
  timestamp: number;
  metadata?: {
    description?: string;
    tags?: string[];
    version?: string;
  };
}

/**
 * 检查点数据接口
 */
export interface CheckpointData {
  nodes: Node<NodeData>[];
  edges: Edge[];
  aiSummary?: any;
  settings?: {
    theme?: string;
    language?: string;
    notifications?: boolean;
    eventLogs?: boolean;
    timezone?: string;
    contextOptimization?: boolean;
    autoSelectTemplate?: boolean;
  };
  chatHistory?: any[];
}

/**
 * 检查点操作相关的props
 */
export interface CheckpointManagerProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: (nodes: Node<NodeData>[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
}

/**
 * 同步结果接口
 */
export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}
