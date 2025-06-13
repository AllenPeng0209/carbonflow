/**
 * app/types/lcia.ts
 * 生命周期影响评估（LCIA）类型定义
 * 基于ISO 14040/14044标准
 */

// 环境影响类别
export type EnvironmentalImpactCategory =
  | 'climate_change' // 气候变化
  | 'ozone_depletion' // 臭氧层耗竭
  | 'acidification' // 酸化
  | 'eutrophication_freshwater' // 淡水富营养化
  | 'eutrophication_marine' // 海洋富营养化
  | 'eutrophication_terrestrial' // 陆地富营养化
  | 'human_toxicity_cancer' // 人体毒性-致癌
  | 'human_toxicity_non_cancer' // 人体毒性-非致癌
  | 'ecotoxicity_freshwater' // 淡水生态毒性
  | 'ecotoxicity_marine' // 海洋生态毒性
  | 'ecotoxicity_terrestrial' // 陆地生态毒性
  | 'photochemical_ozone_formation' // 光化学臭氧生成
  | 'resource_depletion_fossil' // 化石资源耗竭
  | 'resource_depletion_mineral' // 矿物资源耗竭
  | 'land_use' // 土地使用
  | 'water_use' // 水资源使用
  | 'ionizing_radiation' // 电离辐射
  | 'particulate_matter_formation'; // 颗粒物形成

// LCIA方法
export type LCIAMethod =
  | 'ReCiPe' // ReCiPe方法
  | 'CML' // CML方法
  | 'IMPACT2002+' // IMPACT 2002+
  | 'EF' // 欧盟环境足迹
  | 'TRACI' // TRACI (美国)
  | 'Ecological_Scarcity' // 生态稀缺性
  | 'LIME' // LIME (日本)
  | 'USEtox'; // USEtox

// 特征化因子
export interface CharacterizationFactor {
  id: string;
  substance: string; // 物质名称
  casNumber?: string; // CAS号
  compartment: 'air' | 'water' | 'soil'; // 环境介质
  impactCategory: EnvironmentalImpactCategory;
  method: LCIAMethod;
  value: number; // 特征化因子数值
  unit: string; // 因子单位

  // 质量信息
  uncertainty?: {
    type: 'normal' | 'lognormal' | 'triangular' | 'uniform';
    parameters: Record<string, number>; // 分布参数
  };

  // 适用性信息
  geographicalScope?: string; // 地理范围
  temporalScope?: string; // 时间范围
  technologyScope?: string; // 技术范围

  // 元数据
  source: string; // 数据来源
  version: string; // 版本
  lastUpdated: string; // 最后更新时间
}

// 影响评估结果
export interface ImpactAssessmentResult {
  id: string;
  workflowId: string;
  nodeId?: string; // 如果是节点级别结果
  flowId?: string; // 如果是流级别结果

  impactCategory: EnvironmentalImpactCategory;
  method: LCIAMethod;
  value: number; // 影响结果数值
  unit: string; // 结果单位

  // 贡献分析
  contributions?: Array<{
    sourceType: 'node' | 'flow' | 'substance';
    sourceId: string;
    sourceName: string;
    value: number;
    percentage: number;
  }>;

  // 不确定性信息
  uncertainty?: {
    min: number;
    max: number;
    mean: number;
    standardDeviation: number;
    confidence: number; // 置信度
  };

  calculatedAt: string; // 计算时间
  calculatedBy: string; // 计算者/系统
}

// LCIA配置
export interface LCIAConfiguration {
  workflowId: string;
  selectedMethods: LCIAMethod[];
  selectedCategories: EnvironmentalImpactCategory[];

  // 归一化和加权配置
  normalization?: {
    enabled: boolean;
    method: string; // 归一化方法
    referenceValues: Record<EnvironmentalImpactCategory, number>;
  };

  weighting?: {
    enabled: boolean;
    method: string; // 加权方法
    weights: Record<EnvironmentalImpactCategory, number>;
  };

  // 区域化配置
  regionalization?: {
    enabled: boolean;
    targetRegion: string;
    spatialResolution: 'country' | 'region' | 'grid';
  };

  // 计算选项
  calculationOptions: {
    includeUncertainty: boolean;
    monteCarloIterations?: number;
    cutoffThreshold?: number; // 截断阈值
    substituteData: boolean; // 是否使用替代数据
  };
}

// 单一影响指标（Single Score）
export interface SingleScoreResult {
  workflowId: string;
  method: LCIAMethod;
  totalScore: number;
  unit: string; // 通常是 Pt (points)

  // 影响类别贡献
  categoryContributions: Array<{
    category: EnvironmentalImpactCategory;
    normalizedValue: number;
    weightedValue: number;
    contribution: number; // 对总分的贡献百分比
  }>;

  // 生命周期阶段贡献
  stageContributions?: Array<{
    stageName: string;
    stageId: string;
    score: number;
    contribution: number;
  }>;

  calculatedAt: string;
}

// 比较分析结果
export interface ComparativeAssessment {
  id: string;
  name: string;
  description?: string;

  // 比较的工作流
  workflows: Array<{
    workflowId: string;
    name: string;
    functionalUnit: string;
  }>;

  // 影响比较结果
  comparisons: Array<{
    category: EnvironmentalImpactCategory;
    method: LCIAMethod;
    results: Array<{
      workflowId: string;
      value: number;
      normalizedValue?: number; // 相对于基准的比值
    }>;
  }>;

  // 热点分析
  hotspots?: Array<{
    workflowId: string;
    category: EnvironmentalImpactCategory;
    criticalNodes: Array<{
      nodeId: string;
      contribution: number;
    }>;
  }>;

  createdAt: string;
  updatedAt: string;
}
