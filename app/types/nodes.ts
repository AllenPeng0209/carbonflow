import type { Node } from 'reactflow';

// 新增因子表
import type { CarbonFactor } from './carbonfactor';
import type { EvidenceFile } from './evidenceFiles';
import type { Product } from './products';
import type { Enterprise } from './enterprises';

// NodeType definition
export type NodeType = 'product' | 'manufacturing' | 'distribution' | 'usage' | 'disposal' | 'finalProduct' | 'unknown';

// 基础节点数据接口
export interface BaseNodeData {
  id: string; // PK, from DB
  workflowId: string; // FK to workflows.id
  nodeId: string; // React Flow node ID, unique within a workflow
  positionX?: number | null;
  positionY?: number | null;
  label: string;

  // 活动
  lifecycleStage: string;
  emissionType: string; // Category of emission, e.g., '原材料', '能耗'
  activitydataSource: string;
  activityScore: number;
  activityScorelevel?: string;
  verificationStatus?: string; // General verification status
  supplementaryInfo?: string;
  hasEvidenceFiles?: boolean;
  evidenceVerificationStatus?: '待解析' | '解析中' | '已验证' | '验证失败' | '无需验证'; // Specific to evidence files
  dataRisk?: string;
  backgroundDataSourceTab?: 'database' | 'manual';

  // carbon footprint
  carbonFootprint: string; // Calculated carbon footprint value as string
  quantity: string; // Activity data quantity as string
  activityUnit?: string;
  CarbonFactorSource?: CarbonFactor;
  carbonFactor: string; // Carbon factor value as string
  carbonFactorName?: string;
  carbonFactorUnit?: string;
  unitConversion?: string; // Conversion factor as string
  carbonFactordataSource?: string;
  emissionFactorGeographicalRepresentativeness?: string;
  emissionFactorTemporalRepresentativeness?: string;
  activityUUID?: string;
  carbonfactorImportDate?: string;
  factorMatchStatus?: '未配置因子' | 'AI匹配失败' | 'AI匹配成功' | '已手动配置因子';
  taskStatus?: string; // 新增：用于表示任务的完成状态，例如 '已完成', '进行中', '未开始'
  activityData_aiGenerated?: boolean;
  activityUnit_aiGenerated?: boolean;
  conversionFactor_aiGenerated?: boolean;

  finishedProductOutput?: number; // 成品产量
  allocationRatio?: number; // 分配比例

  // 产量和分配比例相关字段
  outputQuantity?: {
    value: number;
    unit: string;
    description?: string;
    isMainOutput?: boolean; // 是否为主要产出
  };
  allocationInfo?: {
    method: 'mass' | 'economic' | 'physical' | 'causal' | 'none';
    ratio: number; // 分配比例（0-1之间的小数）
    basis?: string; // 分配依据
    description?: string; // 分配说明
  };

  // evidence and metadata
  evidenceFiles?: EvidenceFile[]; // Use the imported EvidenceFile type
  parse_from_file_id?: string;
  parse_from_file_name?: string;

  updated_at?: string;
  updated_by?: string;
  created_at?: string;
  created_by?: string;

  /**
   * LCA理论核心字段
   */
  // 主要产品标识
  isMainProduct?: boolean; // 是否为主要产品（每个工作流只能有一个）

  // 产品分类
  productCategory?: 'main' | 'co_product' | 'byproduct' | 'avoided_product'; // 产品分类

  // 基准流信息
  referenceFlow?: {
    value: number; // 基准流数值
    unit: string; // 基准流单位
    description?: string; // 基准流描述
  };

  // 功能单位详细信息
  functionalUnit?: {
    value: number; // 功能单位数值
    unit: string; // 功能单位（如：1台电脑、1kWh等）
    description?: string; // 功能单位描述
    standardReference?: string; // 标准参考
  };

  // 过程信息
  processInfo?: {
    processType: 'unit_process' | 'system_process'; // 过程类型：单元过程 vs 系统过程
    systemBoundary?: string; // 系统边界描述
    cutOffRules?: string; // 切断规则
    allocationMethod?: string; // 分配方法
  };

  lcaFlows?: LCAFlows;
  nodeConnections?: NodeConnections;
  lcaCalculation?: LCACalculation;
  parentNodeId?: string;
  childNodeIds?: string[];
  level?: number;
  isComposite?: boolean;
  compositionRatio?: number;
  supplierTier?: number;
}

// 产品节点数据
export interface ProductNodeData extends BaseNodeData {
  productId: string; // 关联的 products.id (设为必需)
  product?: Product | null; // (可选) 关联的产品对象 (用于前端)
  material?: string;
  weight_per_unit?: string;
  isRecycled?: boolean;
  recycledContent?: string;
  recycledContentPercentage?: number;
  sourcingRegion?: string;
  SourceLocation?: string;
  Destination?: string;

  // 供应商信息 (可以保留现有字段，并添加结构化关联)
  SupplierName?: string;
  SupplierAddress?: string;
  supplierEnterpriseId?: string; // (可选) 关联的 enterprises.enterprise_id (作为供应商)
  supplierEnterprise?: Enterprise | null; // (可选) 关联的供应商企业对象
  ProcessingPlantAddress?: string;
  RefrigeratedTransport?: boolean;
  weight?: number;
  certaintyPercentage?: number;

  // 供应商信息扩展
  supplierInfo?: {
    name?: string;
    address?: string;
    enterpriseId?: string;
    tier: number;
    isDirectSupplier: boolean;
    parentSupplierId?: string;
  };
}

// 制造节点数据
export interface ManufacturingNodeData extends BaseNodeData {
  ElectricityAccountingMethod: string;
  ElectricityAllocationMethod: string;
  EnergyConsumptionMethodology: string;
  EnergyConsumptionAllocationMethod: string;
  chemicalsMaterial: string;
  MaterialAllocationMethod: string;
  WaterUseMethodology: string;
  WaterAllocationMethod: string;
  packagingMaterial: string;
  direct_emission: string;
  WasteGasTreatment: string;
  WasteDisposalMethod: string;
  WastewaterTreatment: string;
  productionMethod?: string;
  productionMethodDataSource?: string;
  productionMethodVerificationStatus?: string;
  productionMethodApplicableStandard?: string;
  productionMethodCompletionStatus?: string;
  energyConsumption: number;
  energyType: string;
  processEfficiency: number;
  wasteGeneration: number;
  waterConsumption: number;
  recycledMaterialPercentage: number;
  productionCapacity: number;
  machineUtilization: number;
  qualityDefectRate: number;
  processTechnology: string;
  manufacturingStandard: string;
  automationLevel: string;
  manufacturingLocation: string;
  byproducts: string;
  emissionControlMeasures: string;
}

// 分销节点数据
export interface DistributionNodeData extends BaseNodeData {
  transportationMode: string;
  transportationDistance: number;

  // startPoint and endPoint are inherited from BaseNodeData if made common
  vehicleType: string;
  fuelType: string;
  fuelEfficiency: number;
  loadFactor: number;
  refrigeration: boolean;
  packagingMaterial: string;
  packagingWeight: number;
  warehouseEnergy: number;
  storageTime: number;
  storageConditions: string;
  distributionNetwork: string;
  aiRecommendation?: string;
  returnLogistics?: boolean;
  packagingRecyclability?: number;
  lastMileDelivery?: string;
  distributionMode?: string; // Potentially redundant with transportationMode if used for same purpose
  distributionDistance?: number; // Potentially redundant with transportationDistance
  distributionDistanceUnit?: string; // Note: carbonpanel uses number for unit, check consistency. Original was number.
  distributionTransportationDistance?: number; // Potentially redundant
}

// 使用节点数据
export interface UsageNodeData extends BaseNodeData {
  lifespan: number;
  energyConsumptionPerUse: number;
  waterConsumptionPerUse: number;
  consumablesUsed: string;
  consumablesWeight: number;
  usageFrequency: number;
  maintenanceFrequency: number;
  repairRate: number;
  userBehaviorImpact: number;
  efficiencyDegradation: number;
  standbyEnergyConsumption: number;
  usageLocation: string;
  usagePattern: string;
  userInstructions?: string;
  upgradeability?: number;
  secondHandMarket?: boolean;
}

// 处置节点数据
export interface DisposalNodeData extends BaseNodeData {
  recyclingRate: number;
  landfillPercentage: number;
  incinerationPercentage: number;
  compostPercentage: number;
  reusePercentage: number;
  hazardousWasteContent: number;
  biodegradability: number;
  disposalEnergyRecovery: number;
  transportToDisposal: number; // Assuming this is a distance or similar metric
  disposalMethod: string;
  endOfLifeTreatment: string;
  recyclingEfficiency: number;
  dismantlingDifficulty: string;
  wasteRegulations?: string;
  takeback?: boolean;
  circularEconomyPotential?: number;
}

// 最终产品节点数据
export interface FinalProductNodeData extends BaseNodeData {
  finalProductName: string; // This should be `label` or `name` from BaseNodeData ideally.
  totalCarbonFootprint: number;
  certificationStatus: string;
  environmentalImpact: string;
  sustainabilityScore: number;
  marketCategory: string; // This is likely `emissionType` from BaseNodeData.
  marketSegment: string;
  targetRegion: string;
  complianceStatus: string;
  carbonLabel: string;
}

// 联合类型定义
export type NodeData =
  | ProductNodeData
  | ManufacturingNodeData
  | DistributionNodeData
  | UsageNodeData
  | DisposalNodeData
  | FinalProductNodeData;

// 带数据的节点类型
export type DataNode = Node<NodeData>;

/**
 * 🔄 LCA流建模 - 集成 flows.ts 类型系统
 * 采用混合策略：支持完整Flow对象 + 快速节点引用
 */
export interface LCAFlows {
  // 详细流建模（引用 flows.ts 中的 Flow 类型）
  materialFlows?: Array<{
    flowId: string; // 引用独立的MaterialFlow对象
    direction: 'input' | 'output';
    quantity: number;
    unit: string;

    // 可选的本地覆盖（用于特定过程中的流属性调整）
    localOverrides?: {
      quantity?: number;
      unit?: string;
      description?: string;
    };
  }>;

  energyFlows?: Array<{
    flowId: string; // 引用独立的EnergyFlow对象
    direction: 'input' | 'output';
    quantity: number;
    unit: string;
    efficiency?: number; // 该过程中的能量转换效率
    localOverrides?: {
      quantity?: number;
      unit?: string;
      source?: string;
    };
  }>;

  emissionFlows?: Array<{
    flowId: string; // 引用独立的EmissionFlow对象
    direction: 'output'; // 排放通常只是输出
    quantity: number;
    unit: string;
    compartment: 'air' | 'water' | 'soil';
    localOverrides?: {
      quantity?: number;
      unit?: string;
      emissionFactor?: number;
    };
  }>;

  wasteFlows?: Array<{
    flowId: string; // 引用独立的WasteFlow对象
    direction: 'output'; // 废物通常只是输出
    quantity: number;
    unit: string;
    treatmentMethod?: string;
    localOverrides?: {
      quantity?: number;
      unit?: string;
      recoveryRate?: number;
    };
  }>;

  serviceFlows?: Array<{
    flowId: string; // 引用独立的ServiceFlow对象
    direction: 'input' | 'output';
    quantity: number;
    unit: string;
    localOverrides?: {
      quantity?: number;
      unit?: string;
      serviceLevel?: string;
    };
  }>;
}

/**
 * 🔗 快速节点连接 - 用于图形界面的直接节点连接
 * 补充详细流建模，支持快速原型和可视化
 */
export interface NodeConnections {
  inputs?: Array<{
    sourceNodeId: string; // 来源节点ID
    connectionType: 'material' | 'energy' | 'service';
    quantity?: number;
    unit?: string;
    description?: string;

    // 连接强度（用于桑基图可视化）
    strength?: number; // 0-1，影响连线粗细
  }>;

  outputs?: Array<{
    targetNodeId: string; // 目标节点ID
    connectionType: 'material' | 'energy' | 'emission' | 'waste';
    quantity?: number;
    unit?: string;
    description?: string;
    strength?: number;
  }>;
}

/**
 * 🎯 LCA计算配置
 */
export interface LCACalculation {
  // 分配方法（多产品过程必需）
  allocationMethod?: 'mass' | 'economic' | 'physical' | 'causal';
  allocationFactors?: Record<string, number>; // 产品ID -> 分配因子

  // 系统边界
  systemBoundary?: {
    includedStages: string[]; // 包含的生命周期阶段
    cutoffCriteria?: number; // 截断标准（如 1%）
    geographicalScope?: string; // 地理范围
    temporalScope?: string; // 时间范围
  };

  // 不确定性信息
  uncertaintyInfo?: {
    dataQuality: 'high' | 'medium' | 'low';
    uncertaintyRange?: {
      min: number;
      max: number;
      confidence: number; // 置信度
    };
  };
}
