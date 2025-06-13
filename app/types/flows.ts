/**
 * LCA流分类体系
 * 基于ISO 14040/14044标准和图片中的LCA理论
 */

// 基础流类型
export type FlowCategory =
  | 'material' // 物质流
  | 'energy' // 能量流
  | 'resource' // 资源流
  | 'emission' // 排放流
  | 'waste' // 废物流
  | 'service' // 服务流
  | 'information'; // 信息流

// 流方向
export type FlowDirection = 'input' | 'output';

// 基础流接口
export interface BaseFlow {
  id: string;
  name: string;
  category: FlowCategory;
  direction: FlowDirection;
  quantity: number;
  unit: string;
  description?: string;

  // 质量评估
  dataQuality?: {
    reliability: 1 | 2 | 3 | 4 | 5; // 1=高可靠, 5=低可靠
    completeness: 1 | 2 | 3 | 4 | 5;
    temporalCorrelation: 1 | 2 | 3 | 4 | 5;
    geographicalCorrelation: 1 | 2 | 3 | 4 | 5;
    technologyCorrelation: 1 | 2 | 3 | 4 | 5;
  };
}

/**
 * 1. 物质流 (Material Flow)
 * 包括原材料、中间产品、最终产品等有形物质
 */
export interface MaterialFlow extends BaseFlow {
  category: 'material';
  materialType:
    | 'raw_material' // 原材料：金属、化学品等
    | 'intermediate' // 中间产品：半成品、组件
    | 'product' // 主要产品
    | 'co_product' // 联产品：同时产出的有价值产品
    | 'byproduct' // 副产品：次要产出
    | 'packaging' // 包装材料
    | 'auxiliary'; // 辅助材料：催化剂、润滑剂等

  // 物质属性
  substance: string; // 物质名称
  casNumber?: string; // CAS号
  composition?: Array<{
    // 成分构成
    component: string;
    percentage: number;
  }>;

  // 物理属性
  physicalState: 'solid' | 'liquid' | 'gas' | 'plasma';
  density?: number; // 密度
  temperature?: number; // 温度
  pressure?: number; // 压力

  // 环境属性
  renewability: 'renewable' | 'non_renewable' | 'mixed';
  recyclability: number; // 可回收性 (0-1)
  toxicity?: 'low' | 'medium' | 'high' | 'very_high';
}

/**
 * 2. 能量流 (Energy Flow)
 * 包括电力、热能、机械能等
 */
export interface EnergyFlow extends BaseFlow {
  category: 'energy';
  energyType:
    | 'electricity' // 电力
    | 'thermal' // 热能
    | 'mechanical' // 机械能
    | 'chemical' // 化学能（燃料）
    | 'nuclear' // 核能
    | 'solar' // 太阳能
    | 'wind' // 风能
    | 'hydro' // 水力
    | 'geothermal'; // 地热

  // 能量属性
  energyContent: number; // 能量含量 (MJ, kWh等)
  efficiency?: number; // 转换效率 (0-1)

  // 来源信息
  source: {
    provider: string; // 供应商
    grid?: string; // 电网类型
    renewablePercentage?: number; // 可再生能源比例
    location?: string; // 地理位置
  };

  // 碳强度
  carbonIntensity?: number; // 碳强度 (kg CO2-eq/kWh)
}

/**
 * 3. 资源流 (Resource Flow)
 * 自然资源的直接提取和使用
 */
export interface ResourceFlow extends BaseFlow {
  category: 'resource';
  resourceType:
    | 'water' // 水资源
    | 'land' // 土地资源
    | 'mineral' // 矿物资源
    | 'fossil' // 化石资源
    | 'biotic' // 生物资源
    | 'air'; // 大气资源

  // 资源属性
  extractionLocation: string; // 提取地点
  renewability: 'renewable' | 'non_renewable' | 'slowly_renewable';
  scarcity?: 'abundant' | 'moderate' | 'scarce' | 'critical';

  // 水资源特定属性
  waterSource?: 'groundwater' | 'surface_water' | 'seawater' | 'rainwater';
  waterQuality?: 'potable' | 'industrial' | 'cooling' | 'process';

  // 土地使用特定属性
  landUseType?: 'agricultural' | 'forest' | 'urban' | 'industrial' | 'natural';
  landArea?: number; // 土地面积 (m²)
  landDuration?: number; // 使用持续时间 (年)
}

/**
 * 4. 排放流 (Emission Flow)
 * 向环境释放的物质
 */
export interface EmissionFlow extends BaseFlow {
  category: 'emission';
  compartment: 'air' | 'water' | 'soil'; // 环境介质

  // 排放属性
  substance: string; // 排放物质
  casNumber?: string; // CAS号

  // 环境影响潜力
  globalWarmingPotential?: number; // 全球变暖潜力 (GWP)
  ozoneDeplectionPotential?: number; // 臭氧消耗潜力 (ODP)
  acidificationPotential?: number; // 酸化潜力 (AP)
  eutrophicationPotential?: number; // 富营养化潜力 (EP)

  // 排放源信息
  emissionSource: {
    processStage: string; // 排放过程阶段
    technology: string; // 排放控制技术
    efficiency?: number; // 控制效率
  };

  // 地理和时间信息
  location?: string; // 排放地点
  timePattern?: 'continuous' | 'periodic' | 'instantaneous';
}

/**
 * 5. 废物流 (Waste Flow)
 * 需要处理或处置的物质
 */
export interface WasteFlow extends BaseFlow {
  category: 'waste';
  wasteType:
    | 'municipal' // 城市固废
    | 'industrial' // 工业废物
    | 'hazardous' // 危险废物
    | 'electronic' // 电子废物
    | 'construction' // 建筑废物
    | 'organic' // 有机废物
    | 'inert'; // 惰性废物

  // 废物属性
  composition?: Array<{
    // 废物成分
    material: string;
    percentage: number;
  }>;

  // 处理信息
  treatment: {
    method: 'landfill' | 'incineration' | 'recycling' | 'composting' | 'reuse';
    facility?: string; // 处理设施
    efficiency?: number; // 处理效率
    recovery?: Array<{
      // 回收产物
      material: string;
      quantity: number;
      unit: string;
    }>;
  };

  // 环境风险
  hazardClass?: string; // 危险等级
  leachingPotential?: number; // 浸出潜力
  biodegradability?: number; // 生物降解性 (0-1)
}

/**
 * 6. 服务流 (Service Flow)
 * 无形的服务和功能
 */
export interface ServiceFlow extends BaseFlow {
  category: 'service';
  serviceType:
    | 'transportation' // 运输服务
    | 'treatment' // 处理服务
    | 'maintenance' // 维护服务
    | 'consulting' // 咨询服务
    | 'financial' // 金融服务
    | 'information'; // 信息服务

  // 服务属性
  provider: string; // 服务提供商
  serviceLevel?: string; // 服务等级
  duration?: number; // 服务持续时间
  frequency?: number; // 服务频率

  // 运输服务特定属性
  transportMode?: 'road' | 'rail' | 'sea' | 'air' | 'pipeline';
  distance?: number; // 运输距离 (km)
  loadFactor?: number; // 载重率 (0-1)
  vehicle?: string; // 车辆类型
  fuel?: string; // 燃料类型
}

/**
 * 7. 信息流 (Information Flow)
 * 数据、信号、知识等
 */
export interface InformationFlow extends BaseFlow {
  category: 'information';
  informationType:
    | 'data' // 数据
    | 'signal' // 控制信号
    | 'knowledge' // 知识
    | 'instruction'; // 指令

  // 信息属性
  dataFormat?: string; // 数据格式
  size?: number; // 数据大小
  frequency?: number; // 传输频率
  protocol?: string; // 传输协议
}

// 联合类型
export type Flow = MaterialFlow | EnergyFlow | ResourceFlow | EmissionFlow | WasteFlow | ServiceFlow | InformationFlow;

/**
 * 流之间的关系
 */
export interface FlowRelationship {
  id: string;
  sourceFlowId: string;
  targetFlowId: string;
  relationshipType:
    | 'transformation' // 转化关系：原料 → 产品
    | 'substitution' // 替代关系：再生材料替代原料
    | 'causation' // 因果关系：能源消耗 → 排放
    | 'dependency' // 依赖关系：服务 → 物质流
    | 'allocation'; // 分配关系：多产品分配

  conversionFactor?: number; // 转换系数
  efficiency?: number; // 转换效率
  description?: string;
}

/**
 * 流的聚合和分类
 */
export interface FlowAggregation {
  id: string;
  name: string;
  description: string;
  flowIds: string[]; // 包含的流ID
  aggregationType:
    | 'category' // 按类别聚合
    | 'substance' // 按物质聚合
    | 'impact' // 按环境影响聚合
    | 'process'; // 按过程聚合

  totalQuantity?: number; // 聚合总量
  unit?: string; // 聚合单位
}
