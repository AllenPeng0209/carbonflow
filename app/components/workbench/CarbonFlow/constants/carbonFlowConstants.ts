/**
 * 碳流量相关常量定义
 */

// 生命周期阶段
export const LIFECYCLE_STAGES = ['全部', '原材料获取阶段', '生产制造阶段', '分销运输阶段', '使用阶段', '寿命终止阶段'];

// 生命周期阶段到节点类型的映射
export const LIFECYCLE_STAGE_TO_NODE_TYPE_MAP: Record<string, string> = {
  原材料获取阶段: 'product',
  生产制造阶段: 'manufacturing',
  分销运输阶段: 'distribution',
  使用阶段: 'usage',
  寿命终止阶段: 'disposal',
};

// 节点类型到生命周期阶段的映射
export const NODE_TYPE_TO_LIFECYCLE_STAGE_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(LIFECYCLE_STAGE_TO_NODE_TYPE_MAP).map(([key, value]) => [value, key]),
);

// 本地存储键
export const KEY_CARBON_PANEL_COLLAPSE = 'carbon-panel-collapse';

// 文件类型选项
export const FILE_TYPE_OPTIONS = [
  { label: '活动数据', value: 'activity' },
  { label: '碳因子数据', value: 'carbon_factor' },
  { label: '产品规格', value: 'product_spec' },
  { label: '其他', value: 'other' },
];

// 排放源类别
export const EMISSION_TYPES = ['直接排放', '间接排放', '其他间接排放', '上游排放', '下游排放'];

// 数据状态
export const DATA_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

// 验证级别
export const VERIFICATION_LEVELS = ['一级验证', '二级验证', '三级验证'] as const;
