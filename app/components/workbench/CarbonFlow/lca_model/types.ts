/**
 * LCA计算引擎类型定义
 * 基于 ISO 14040/14044 标准
 */

import type { NodeData } from '~/types/nodes';
import type { Flow } from '~/types/flows';
import type { Node, Edge } from 'reactflow';

/**
 * LCA计算结果接口
 */
export interface LCAResult {
  // 系统信息
  systemInfo: {
    studyId: string;
    functionalUnit: string;
    systemBoundary: string;
    referenceFlow: string;
    calculationTimestamp: Date;
  };

  // 生命周期清单分析结果 (LCI)
  inventoryResults: {
    materialInputs: MaterialInventory[];
    energyInputs: EnergyInventory[];
    emissions: EmissionInventory[];
    wastes: WasteInventory[];
    totalMass: number;
    totalEnergy: number;
  };

  // 生命周期影响评价结果 (LCIA)
  impactResults: {
    globalWarmingPotential: ImpactResult;
    acidificationPotential: ImpactResult;
    eutrophicationPotential: ImpactResult;
    ozoneDepletionPotential: ImpactResult;
    photochemicalOxidationPotential: ImpactResult;
    abioticDepletionPotential: ImpactResult;
    humanToxicityPotential: ImpactResult;
    ecotoxicityPotential: ImpactResult;
    landUse: ImpactResult;
    waterUse: ImpactResult;
    [customCategory: string]: ImpactResult;
  };

  // 贡献分析
  contributionAnalysis: {
    byLifecycleStage: Record<string, ContributionResult>;
    byProcess: Record<string, ContributionResult>;
    byMaterial: Record<string, ContributionResult>;
    byEnergy: Record<string, ContributionResult>;
  };

  // 不确定性分析
  uncertaintyAnalysis?: {
    confidenceLevel: number;
    uncertaintyRange: {
      min: number;
      max: number;
      standardDeviation: number;
    };
    sensitivityAnalysis: SensitivityResult[];
  };

  // 数据质量评估
  dataQuality: {
    overallScore: number;
    reliability: DataQualityScore;
    completeness: DataQualityScore;
    temporalCorrelation: DataQualityScore;
    geographicalCorrelation: DataQualityScore;
    technologyCorrelation: DataQualityScore;
  };
}

/**
 * 清单分析结果
 */
export interface MaterialInventory {
  materialId: string;
  materialName: string;
  quantity: number;
  unit: string;
  category: 'renewable' | 'non_renewable' | 'recycled';
  source: string;
  uncertainty?: number;
}

export interface EnergyInventory {
  energyId: string;
  energyType: string;
  quantity: number;
  unit: string;
  source: string;
  renewableContent: number; // 0-1
  carbonIntensity: number;
  uncertainty?: number;
}

export interface EmissionInventory {
  substanceId: string;
  substanceName: string;
  quantity: number;
  unit: string;
  compartment: 'air' | 'water' | 'soil';
  characterizationFactors: Record<string, number>; // impact category -> CF
  uncertainty?: number;
}

export interface WasteInventory {
  wasteId: string;
  wasteType: string;
  quantity: number;
  unit: string;
  treatmentMethod: string;
  recyclingContent: number; // 0-1
  uncertainty?: number;
}

/**
 * 影响评价结果
 */
export interface ImpactResult {
  category: string;
  value: number;
  unit: string;
  method: string;
  uncertainty?: {
    standardDeviation: number;
    confidenceInterval: [number, number];
  };
  contributionByProcess: Record<string, number>;
}

/**
 * 贡献分析结果
 */
export interface ContributionResult {
  absoluteValue: number;
  relativeContribution: number; // 0-1
  unit: string;
  rank: number;
}

/**
 * 敏感性分析结果
 */
export interface SensitivityResult {
  parameterId: string;
  parameterName: string;
  baseValue: number;
  perturbation: number; // 扰动百分比
  resultChange: number; // 结果变化百分比
  sensitivityIndex: number; // 敏感性指数
}

/**
 * 数据质量评分
 */
export interface DataQualityScore {
  score: 1 | 2 | 3 | 4 | 5; // 1=高质量, 5=低质量
  description: string;
  improvementSuggestions: string[];
}

/**
 * LCA计算配置
 */
export interface LCACalculationConfig {
  // 方法学配置
  methodology: {
    impactMethod: 'ReCiPe' | 'CML' | 'TRACI' | 'EF' | 'custom';
    characterizationFactors: Record<string, Record<string, number>>;
    normalizationFactors?: Record<string, number>;
    weightingFactors?: Record<string, number>;
  };

  // 系统边界
  systemBoundary: {
    includedStages: string[];
    cutoffCriteria: number; // 如 0.01 代表 1%
    geographicalScope: string;
    temporalScope: string;
    technologyScope: string;
  };

  // 分配规则
  allocation: {
    defaultMethod: 'mass' | 'economic' | 'physical' | 'causal';
    processSpecificMethods: Record<string, string>;
    avoidAllocation: boolean;
  };

  // 不确定性分析配置
  uncertaintyAnalysis?: {
    enabled: boolean;
    method: 'monte_carlo' | 'analytical' | 'fuzzy';
    iterations?: number;
    confidenceLevel: number;
    sensitivityAnalysis: boolean;
  };

  // 数据质量要求
  dataQualityRequirements: {
    minimumScore: number;
    requireUncertaintyData: boolean;
    temporalThreshold: number; // 年
    geographicalRelevance: string[];
  };
}

/**
 * LCA计算上下文
 */
export interface LCACalculationContext {
  nodes: Node<NodeData>[];
  edges: Edge[];
  flows: Record<string, Flow>;
  config: LCACalculationConfig;

  // 系统信息
  functionalUnit: {
    value: number;
    unit: string;
    description: string;
  };

  referenceFlow: {
    nodeId: string;
    value: number;
    unit: string;
  };

  // 外部数据
  characterizationFactors: Record<string, Record<string, number>>;
  backgroundData?: Record<string, any>;
}

/**
 * LCA计算步骤状态
 */
export interface LCACalculationStep {
  stepId: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number; // 0-1
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: any;
}

/**
 * LCA计算会话
 */
export interface LCACalculationSession {
  sessionId: string;
  context: LCACalculationContext;
  steps: LCACalculationStep[];
  finalResult?: LCAResult;

  // 状态管理
  status: 'initializing' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;

  // 计算元数据
  metadata: {
    calculationMethod: string;
    softwareVersion: string;
    operator: string;
    notes?: string;
  };
}

/**
 * 批量计算结果比较
 */
export interface LCAComparison {
  baselineResult: LCAResult;
  alternativeResults: Array<{
    id: string;
    name: string;
    result: LCAResult;
    improvements: Record<string, number>; // impact category -> improvement %
  }>;

  comparisonMetrics: {
    dominatingAlternative: string;
    tradeoffs: Array<{
      category1: string;
      category2: string;
      description: string;
    }>;
  };
}
