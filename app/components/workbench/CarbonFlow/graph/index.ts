// 导出主要组件
export { CarbonFlowGraph } from './CarbonFlowGraph';
export { CarbonFlowInner } from './CarbonFlowInner';

// 导出类型
export type {
  GraphCanvasProps,
  NodeOperation,
  EdgeOperation,
  DragDropData,
  AutoLayoutConfig,
  Checkpoint,
  GraphState,
  GraphControlsProps,
  MiniMapViewProps,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from './types';

// 导出常量
export {
  DEFAULT_NODE_WIDTH,
  DEFAULT_NODE_HEIGHT,
  DEFAULT_GRID_SIZE,
  DEFAULT_NODE_SPACING,
  DEFAULT_RANK_SPACING,
  EDGE_STYLES,
  NODE_COLORS,
  LAYOUT_CONFIGS,
  EXPORT_FORMATS,
  MINIMAP_CONFIG,
  CHECKPOINT_LIMITS,
  VALIDATION_RULES,
} from './constants';
