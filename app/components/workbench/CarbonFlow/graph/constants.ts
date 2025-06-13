/**
 * 图形相关常量定义
 */

// 默认节点尺寸
export const DEFAULT_NODE_WIDTH = 200;
export const DEFAULT_NODE_HEIGHT = 100;

// 默认间距
export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_NODE_SPACING = 100;
export const DEFAULT_RANK_SPACING = 150;

/**
 * LCA建模常量
 */
// LCA生命周期阶段层级定义（符合图片中的理论）
export const LCA_LIFECYCLE_LAYERS = {
  EMISSIONS_SOURCE: { layer: 0, name: '排放源', types: ['disposal'] },
  USAGE: { layer: 1, name: '使用阶段', types: ['usage'] },
  DISTRIBUTION: { layer: 2, name: '分销阶段', types: ['distribution'] },
  MANUFACTURING: { layer: 3, name: '制造阶段', types: ['manufacturing'] },
  PRODUCT: { layer: 4, name: '产品阶段', types: ['product'] },
  FINAL_PRODUCT: { layer: 5, name: '最终产品', types: ['finalProduct'] },
} as const;

// LCA产品分类（基于图片理论）
export const LCA_PRODUCT_CATEGORIES = {
  MAIN: 'main', // 主要产品（每个系统只能有一个）
  CO_PRODUCT: 'co_product', // 联产品
  BYPRODUCT: 'byproduct', // 副产品
  AVOIDED_PRODUCT: 'avoided_product', // 避免产品
} as const;

// LCA过程类型
export const LCA_PROCESS_TYPES = {
  UNIT_PROCESS: 'unit_process', // 单元过程（最小分析单元）
  SYSTEM_PROCESS: 'system_process', // 系统过程
} as const;

// LCA物质流类型
export const LCA_FLOW_TYPES = {
  ELEMENTARY: 'elementary', // 基本流（环境中的物质）
  PRODUCT: 'product', // 产品流
  WASTE: 'waste', // 废物流
} as const;

// LCA功能单位常用类型
export const LCA_FUNCTIONAL_UNITS = {
  PIECE: { unit: '个', description: '单个产品' },
  KG: { unit: 'kg', description: '质量单位' },
  KWH: { unit: 'kWh', description: '能量单位' },
  LITER: { unit: 'L', description: '体积单位' },
  M2: { unit: 'm²', description: '面积单位' },
  SERVICE_YEAR: { unit: '服务年', description: '服务时间单位' },
} as const;

// 连接线样式
export const EDGE_STYLES = {
  default: {
    stroke: '#d1d5db',
    strokeWidth: 2,
  },
  selected: {
    stroke: '#3b82f6',
    strokeWidth: 3,
  },
  animated: {
    stroke: '#10b981',
    strokeWidth: 2,
    animated: true,
  },
};

// 节点颜色方案
export const NODE_COLORS = {
  product: '#3b82f6',
  manufacturing: '#8b5cf6',
  distribution: '#f59e0b',
  usage: '#10b981',
  disposal: '#ef4444',
  default: '#6b7280',
};

// 布局算法配置
export const LAYOUT_CONFIGS = {
  dagre: {
    algorithm: 'dagre' as const,
    direction: 'TB' as const,
    spacing: {
      node: DEFAULT_NODE_SPACING,
      rank: DEFAULT_RANK_SPACING,
    },
  },
  hierarchical: {
    algorithm: 'hierarchical' as const,
    direction: 'TB' as const,
    spacing: {
      node: DEFAULT_NODE_SPACING,
      rank: DEFAULT_RANK_SPACING,
    },
  },
};

// 导出格式配置
export const EXPORT_FORMATS = {
  png: {
    extension: 'png',
    mimeType: 'image/png',
    quality: 1.0,
  },
  jpg: {
    extension: 'jpg',
    mimeType: 'image/jpeg',
    quality: 0.8,
  },
  svg: {
    extension: 'svg',
    mimeType: 'image/svg+xml',
    quality: 1.0,
  },
  json: {
    extension: 'json',
    mimeType: 'application/json',
    quality: 1.0,
  },
};

// 小地图配置
export const MINIMAP_CONFIG = {
  position: 'bottom-right' as const,
  nodeColor: '#3b82f6',
  maskColor: 'rgba(0, 0, 0, 0.1)',
  width: 200,
  height: 150,
};

// 检查点相关常量
export const CHECKPOINT_LIMITS = {
  maxCheckpoints: 10,
  maxNameLength: 50,
  maxDescriptionLength: 200,
};

// 图形验证规则
export const VALIDATION_RULES = {
  maxNodes: 1000,
  maxEdges: 2000,
  maxDepth: 20,
  minNodeSpacing: 50,
};
