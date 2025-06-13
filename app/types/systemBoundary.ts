/**
 * app/types/systemBoundary.ts
 * LCA系统边界类型定义
 * 基于ISO 14040/14044标准
 */

// 系统边界类型
export type SystemBoundaryType =
  | 'cradle_to_gate' // 摇篮到大门
  | 'gate_to_gate' // 大门到大门
  | 'cradle_to_grave' // 摇篮到坟墓
  | 'cradle_to_cradle' // 摇篮到摇篮
  | 'well_to_wheel' // 油井到车轮
  | 'well_to_tank' // 油井到油箱
  | 'tank_to_wheel' // 油箱到车轮
  | 'custom'; // 自定义边界

// 地理边界范围
export type GeographicalScope =
  | 'global' // 全球
  | 'continental' // 大陆级
  | 'national' // 国家级
  | 'regional' // 区域级
  | 'local' // 本地级
  | 'site_specific'; // 特定场地

// 时间边界范围
export type TemporalScope =
  | 'integrated_over_time' // 时间积分
  | 'static' // 静态
  | 'dynamic' // 动态
  | 'consequential'; // 后果性

// 技术边界范围
export type TechnologicalScope =
  | 'specific_technology' // 特定技术
  | 'technology_mix' // 技术组合
  | 'best_available_technology' // 最佳可得技术
  | 'average_technology' // 平均技术
  | 'marginal_technology'; // 边际技术

// 截断规则
export interface CutoffRule {
  id: string;
  name: string;
  description: string;

  // 截断标准
  criteria: {
    type: 'mass' | 'energy' | 'environmental_relevance' | 'economic';
    threshold: number; // 截断阈值
    unit: string; // 阈值单位
  };

  // 适用范围
  applicableStages?: string[]; // 适用的生命周期阶段
  excludedProcesses?: string[]; // 排除的过程

  // 验证
  justification: string; // 截断理由
  sensitivityAnalysis?: boolean; // 是否进行敏感性分析
}

// 系统边界定义
export interface SystemBoundary {
  id: string;
  workflowId: string;
  name: string;
  description?: string;

  // 边界类型和范围
  boundaryType: SystemBoundaryType;
  geographicalScope: GeographicalScope;
  temporalScope: TemporalScope;
  technologicalScope: TechnologicalScope;

  // 详细边界定义
  boundaries: {
    // 包含的生命周期阶段
    includedStages: Array<{
      stageId: string;
      stageName: string;
      description?: string;
      isFullyIncluded: boolean; // 是否完全包含
      partialInclusion?: string; // 部分包含的描述
    }>;

    // 包含的过程
    includedProcesses: Array<{
      processId: string;
      processName: string;
      category: string;
      importance: 'high' | 'medium' | 'low';
    }>;

    // 排除的过程
    excludedProcesses: Array<{
      processId: string;
      processName: string;
      reason: string; // 排除原因
      estimatedContribution?: number; // 估计贡献度
    }>;
  };

  // 截断规则
  cutoffRules: CutoffRule[];

  // 地理和时间细节
  geographicalDetails?: {
    countries?: string[]; // 涉及的国家
    regions?: string[]; // 涉及的地区
    coordinates?: {
      // 地理坐标
      latitude: number;
      longitude: number;
      radius?: number; // 影响半径
    };
  };

  temporalDetails?: {
    startDate?: string; // 开始日期
    endDate?: string; // 结束日期
    referenceYear?: number; // 参考年份
    timeHorizon?: number; // 时间跨度（年）
    seasonality?: string; // 季节性考虑
  };

  // 多功能过程处理
  multifunctionalityHandling?: {
    approach: 'subdivision' | 'system_expansion' | 'allocation';
    allocationProcedure?: {
      method: 'mass' | 'economic' | 'energy' | 'physical_causality';
      justification: string;
      allocationFactors?: Record<string, number>;
    };
    systemExpansion?: {
      expandedFunctions: string[];
      creditedProducts: string[];
    };
  };

  // 数据需求
  dataRequirements?: {
    primaryDataNeeded: string[];
    secondaryDataAcceptable: string[];
    dataQualityRequirements: {
      temporalCorrelation: 1 | 2 | 3 | 4 | 5;
      geographicalCorrelation: 1 | 2 | 3 | 4 | 5;
      technologyCorrelation: 1 | 2 | 3 | 4 | 5;
      completeness: 1 | 2 | 3 | 4 | 5;
      reliability: 1 | 2 | 3 | 4 | 5;
    };
  };

  // 假设和限制
  assumptions?: Array<{
    id: string;
    description: string;
    category: 'methodological' | 'data' | 'modeling' | 'temporal' | 'geographical';
    impact: 'high' | 'medium' | 'low';
    justification: string;
  }>;

  limitations?: Array<{
    id: string;
    description: string;
    affectedResults: string[];
    mitigation?: string;
  }>;

  // 验证和审查
  validation?: {
    internalReview: boolean;
    externalReview: boolean;
    reviewers?: string[];
    reviewComments?: string;
    approvalStatus: 'draft' | 'under_review' | 'approved' | 'rejected';
  };

  // 元数据
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: string;
}

// 边界比较分析
export interface BoundaryComparison {
  id: string;
  name: string;
  description?: string;

  // 比较的边界
  boundaries: Array<{
    boundaryId: string;
    boundaryName: string;
    workflowId: string;
  }>;

  // 比较维度
  comparisonDimensions: {
    scope: boolean; // 范围比较
    processes: boolean; // 过程比较
    cutoffs: boolean; // 截断比较
    assumptions: boolean; // 假设比较
  };

  // 比较结果
  differences: Array<{
    dimension: string;
    boundaryId1: string;
    boundaryId2: string;
    difference: string;
    significance: 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;

  // 和谐化建议
  harmonizationRecommendations?: Array<{
    issue: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }>;

  createdAt: string;
  createdBy: string;
}

// 边界敏感性分析
export interface BoundarySensitivityAnalysis {
  id: string;
  workflowId: string;
  boundaryId: string;

  // 敏感性参数
  sensitivityParameters: Array<{
    parameterId: string;
    parameterName: string;
    baseValue: number;
    variation: {
      type: 'percentage' | 'absolute';
      range: {
        min: number;
        max: number;
      };
    };
  }>;

  // 分析结果
  results: Array<{
    parameterId: string;
    impactCategory: string;
    sensitivityIndex: number; // 敏感性指数
    variationRange: {
      min: number;
      max: number;
      mean: number;
    };
    significance: 'high' | 'medium' | 'low';
  }>;

  // 结论和建议
  conclusions: {
    criticalParameters: string[];
    robustness: 'high' | 'medium' | 'low';
    recommendations: string[];
  };

  analysisDate: string;
  analysisMethod: string;
}
