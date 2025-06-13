/**
 * app/types/complianceCheck.ts
 * 统一合规检查类型定义
 * 支持多种环境和碳足迹相关法规的评分
 */

import type { Node } from 'reactflow';
import type { NodeData } from './nodes';

// 支持的法规类型
export type ComplianceStandard =
  | 'ISO_14067' // 产品碳足迹
  | 'ISO_14040_14044' // LCA标准
  | 'ISO_14064' // 温室气体核算和报告
  | 'ISO_14001' // 环境管理体系
  | 'ISO_50001' // 能源管理体系
  | 'PAS_2050' // 商品和服务碳足迹
  | 'PAS_2060' // 碳中和规范
  | 'GHG_PROTOCOL' // 温室气体协议
  | 'CBAM' // 欧盟碳边境调节机制
  | 'EU_TAXONOMY' // 欧盟分类法
  | 'EU_ETS' // 欧盟排放交易体系
  | 'EU_BATTERY_REGULATION' // 欧盟电池法
  | 'TCFD' // 气候相关财务披露
  | 'CSRD' // 企业可持续发展报告指令
  | 'SBTI' // 科学碳目标倡议
  | 'CDP' // 碳披露项目
  | 'GRI' // 全球报告倡议
  | 'SASB' // 可持续发展会计准则委员会
  | 'IFRS_S1_S2' // IFRS可持续发展披露标准
  | 'CHINA_ETS' // 中国碳排放交易体系
  | 'CHINA_ENVIRONMENTAL_LAW' // 中国环境保护法
  | 'CHINA_ENERGY_LAW' // 中国节能法
  | 'CHINA_CLEANER_PRODUCTION' // 中国清洁生产促进法
  | 'CCER' // 中国核证自愿减排量
  | 'GB_T_32150' // 中国工业企业温室气体排放核算和报告通则
  | 'GB_T_32151' // 中国产品碳足迹核算要求和实施指南
  | 'SBTi_NET_ZERO' // 科学碳目标净零标准
  | 'RACE_TO_ZERO' // 奔向零排放倡议
  | 'UNGC' // 联合国全球契约
  | 'PARIS_AGREEMENT' // 巴黎协定
  | 'KYOTO_PROTOCOL'; // 京都议定书

// 合规性等级
export type ComplianceLevel =
  | 'full_compliance' // 完全合规 (90-100%)
  | 'substantial_compliance' // 基本合规 (75-89%)
  | 'partial_compliance' // 部分合规 (60-74%)
  | 'non_compliance'; // 不合规 (0-59%)

// 要求严重性
export type RequirementSeverity =
  | 'critical' // 关键要求（必须满足）
  | 'major' // 重要要求（强烈建议）
  | 'minor'; // 次要要求（建议）

// 合规检查项
export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  severity: RequirementSeverity;
  category: string; // 要求类别（如：数据质量、系统边界等）
  weight: number; // 权重 (0-1)
  mandatory: boolean; // 是否为强制要求
  checkCriteria: string[]; // 检查标准
  evidenceRequired: string[]; // 所需证据
}

// 合规检查结果
export interface ComplianceCheckResult {
  requirementId: string;
  compliant: boolean;
  score: number; // 0-100
  evidence: string[]; // 符合证据
  gaps: string[]; // 不符合项
  recommendations: string[]; // 改进建议
  notes?: string; // 额外备注
}

// 节点级合规问题
export interface NodeComplianceIssue {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  issues: Array<{
    requirementId: string;
    requirementName: string;
    severity: RequirementSeverity;
    description: string;
    recommendation: string;
  }>;
}

// 合规评分详情
export interface ComplianceScoreDetail {
  standard: ComplianceStandard;
  overallScore: number; // 0-100
  level: ComplianceLevel;

  // 分类得分
  categoryScores: Array<{
    category: string;
    score: number;
    weight: number;
    maxPossibleScore: number;
  }>;

  // 强制要求得分
  mandatoryScore: number; // 0-100
  mandatoryCompliance: boolean; // 是否满足所有强制要求

  // 推荐要求得分
  recommendedScore: number; // 0-100

  // 详细结果
  requirementResults: ComplianceCheckResult[];

  // 节点级问题
  nodeIssues: NodeComplianceIssue[];

  // 总结
  summary: {
    totalRequirements: number;
    compliantRequirements: number;
    criticalIssues: number;
    majorIssues: number;
    minorIssues: number;
  };

  // 改进建议
  improvements: Array<{
    priority: 'high' | 'medium' | 'low';
    area: string;
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

// 多标准合规报告
export interface MultiStandardComplianceReport {
  workflowId: string;
  reportDate: string;
  standards: ComplianceScoreDetail[];

  // 综合评分
  aggregateScore: {
    averageScore: number; // 所有标准的平均分
    weightedScore?: number; // 加权平均分（如果设置了权重）
    bestPerformingStandard: ComplianceStandard;
    worstPerformingStandard: ComplianceStandard;
  };

  // 通用问题
  commonIssues: Array<{
    description: string;
    affectedStandards: ComplianceStandard[];
    severity: RequirementSeverity;
    solution: string;
  }>;

  // 优先行动项
  actionItems: Array<{
    priority: number; // 1为最高优先级
    description: string;
    affectedStandards: ComplianceStandard[];
    estimatedImpact: number; // 预期改善的总分数
    effort: 'low' | 'medium' | 'high';
  }>;
}

// ISO 14067 特定要求
export const ISO_14067_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'iso14067_scope_definition',
    name: '适用范围定义',
    description: '四大类别：EV、LMT、工业、便携、SLI；动力/储能电池≃EV+工业，但应显式列出EV & Industrial（>2 kWh）',
    severity: 'critical',
    category: '适用范围',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '明确定义为CFP或partial CFP',
      '仅包含气候变化影响',
      '不包含碳抵消活动',
      '不包含社会/经济指标',
    ],
    evidenceRequired: ['范围定义文档', '影响类别说明'],
  },
  {
    id: 'iso14067_system_boundary',
    name: '系统边界定义',
    description: 'Cradle-to-Gate/Grave生命周期全覆盖：原材料获取、生产、运输、使用、废弃处理（条款5.2, 6.3.4.1）',
    severity: 'critical',
    category: '系统边界',
    weight: 0.15,
    mandatory: true,
    checkCriteria: [
      '覆盖原材料获取阶段',
      '覆盖生产阶段',
      '覆盖运输阶段',
      '覆盖使用阶段',
      '覆盖废弃处理阶段',
      '若为partial CFP，在报告中说明缩减边界及其合理性（6.3.4.1）',
    ],
    evidenceRequired: ['系统边界图', '生命周期阶段清单', '边界说明文件'],
  },
  {
    id: 'iso14067_exclusion_criteria',
    name: '排除条件',
    description: '经敏感性分析证实对结论无显著影响的流程（需说明理由）；资本品（如厂房设备）若不影响结论可排除；禁止纳入碳抵消活动',
    severity: 'critical',
    category: '系统边界',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '排除流程经敏感性分析证实无显著影响',
      '排除理由在报告中说明',
      '资本品排除有合理依据',
      '未纳入碳抵消活动',
      '在报告中披露排除流程及其对结果影响的验证',
    ],
    evidenceRequired: ['敏感性分析报告', '排除理由说明', '影响验证文件'],
  },
  {
    id: 'iso14067_cutoff_rules',
    name: '截止规则',
    description: '阈值由组织根据敏感性分析确定，需在报告中说明。须在报告中披露排除流程及其对结果影响的验证',
    severity: 'major',
    category: '截止规则',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '基于敏感性分析确定阈值',
      '阈值设定在报告中说明',
      '排除流程影响已验证',
      '验证结果在报告中披露',
    ],
    evidenceRequired: ['阈值设定文档', '敏感性分析', '影响验证报告'],
  },
  {
    id: 'iso14067_functional_unit',
    name: '功能单位和参考流',
    description: 'CFP→功能单位；partial CFP→声明单位；需明确关联功能/声明单位的参考流（如"烘干1双手所需纸张质量"）',
    severity: 'critical',
    category: '功能单位',
    weight: 0.12,
    mandatory: true,
    checkCriteria: [
      'CFP使用功能单位',
      'partial CFP使用声明单位',
      '参考流明确关联功能/声明单位',
      '功能单位可量化且明确',
    ],
    evidenceRequired: ['功能单位定义文件', '参考流说明', '量化标准文档'],
  },
  {
    id: 'iso14067_assessment_method',
    name: '评估方法',
    description: '核心方法：生命周期评估（LCA）四阶段；默认使用IPCC 100年GWP值（含碳反馈）；允许补充报告GTP值；生物碳处理：移除-1 kg CO₂e/kg CO₂，排放+1 kg CO₂e/kg CO₂',
    severity: 'critical',
    category: '评估方法',
    weight: 0.15,
    mandatory: true,
    checkCriteria: [
      '采用LCA四阶段方法（目标定义、清单分析、影响评价、解释）',
      '使用IPCC 100年GWP值（含碳反馈）',
      '可补充报告GTP值',
      '生物碳按标准处理（移除：-1 kg CO₂e/kg CO₂；排放：+1 kg CO₂e/kg CO₂）',
      '按Annex E或CFP-PCR具体方法换算',
    ],
    evidenceRequired: ['LCA方法说明', 'GWP值应用证明', '生物碳处理记录', '计算方法文档'],
  },
  {
    id: 'iso14067_data_collection',
    name: '数据收集和质量要求',
    description: '主数据：对财务/运营控制的过程必须使用现场特定数据；次级数据：仅允许用于主数据不可行或次要流程；数据质量维度包含10项指标',
    severity: 'critical',
    category: '数据收集',
    weight: 0.15,
    mandatory: true,
    checkCriteria: [
      '财务/运营控制过程使用现场特定数据',
      '次级数据仅用于主数据不可行或次要流程',
      '按10项指标评估数据质量（时间/地理/技术覆盖度、精度、完整性、代表性等）',
      '在报告中逐项说明数据质量评价结果',
    ],
    evidenceRequired: ['现场数据收集记录', '次级数据使用说明', '数据质量评估报告'],
  },
  {
    id: 'iso14067_primary_data_quality',
    name: '主数据质量要求',
    description: '优先收集关键流程（累计≥80% CFP贡献）的现场数据，制定并满足数据质量标准',
    severity: 'critical',
    category: '主数据质量',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '≥80% CFP贡献的单元过程使用现场数据覆盖',
      '制定了数据质量标准',
      '满足制定的数据质量标准',
      '关键流程识别准确',
    ],
    evidenceRequired: ['现场数据覆盖率证明', '数据质量标准文档', '关键流程识别报告'],
  },
  {
    id: 'iso14067_allocation_recycling',
    name: '分配和回收处理',
    description: '按顺序分配：①避免分配（系统扩展或拆分）；②按物理关系；③按经济价值；需做敏感性分析。闭环回收可视作原料替代免分配；开环需分配',
    severity: 'major',
    category: '分配和回收',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '优先避免分配（系统扩展或拆分）',
      '无法避免时按物理关系分配',
      '物理关系不适用时按经济价值分配',
      '进行了敏感性分析',
      '闭环回收按原料替代处理',
      '开环回收进行适当分配',
    ],
    evidenceRequired: ['分配方法说明', '敏感性分析报告', '回收处理证明'],
  },
  {
    id: 'iso14067_reporting_format',
    name: 'CFP报告格式',
    description: '报告须至少包含7.3(a-s)所列19项信息，并按7.2分别报告化石/生物源/土地利用变化等GHG值',
    severity: 'major',
    category: '报告格式',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '包含7.3(a-s)规定的19项信息',
      '按逻辑分组呈现',
      '分别报告化石源GHG值',
      '分别报告生物源GHG值',
      '分别报告土地利用变化GHG值',
    ],
    evidenceRequired: ['完整CFP报告', '信息项检查清单', 'GHG分类报告'],
  },
  {
    id: 'iso14067_verification',
    name: '第三方验证',
    description: '可选验证，但公开传播或比较时必须进行关键评审（按ISO/TS 14071）；验证标准：ISO 14064-3用于GHG声明验证',
    severity: 'major',
    category: '第三方验证',
    weight: 0.05,
    mandatory: false,
    checkCriteria: [
      '公开传播时进行关键评审',
      '比较声明时进行关键评审',
      '按ISO/TS 14071进行评审',
      '验证按ISO 14064-3标准执行',
    ],
    evidenceRequired: ['关键评审报告', '验证报告', '验证机构资质'],
  },
  {
    id: 'iso14067_special_provisions',
    name: '特色条款',
    description: '生物质碳、绿电细则、dLUC、飞机排放需单独报告；延迟排放需说明时间分布',
    severity: 'minor',
    category: '特殊要求',
    weight: 0.05,
    mandatory: true,
    checkCriteria: [
      '生物质碳单独报告',
      '绿电使用单独说明',
      '直接土地利用变化（dLUC）单独报告',
      '飞机排放单独报告',
      '延迟排放说明时间分布',
    ],
    evidenceRequired: ['特殊排放报告', '时间分布分析', '绿电证明文件'],
  },
  {
    id: 'iso14067_key_emission_sources',
    name: '重点排放源识别',
    description: '全生命周期GHG+LUC，常见热点：能源密集型单元（烧结/熔炼）、运输长距离、农用N₂O等',
    severity: 'major',
    category: '重点排放源',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '识别能源密集型单元排放',
      '识别长距离运输排放',
      '识别农业N₂O排放',
      '包含土地利用变化排放',
      '热点排放源分析完整',
    ],
    evidenceRequired: ['排放热点分析', '重点排放源清单', '能源使用分析'],
  },
  {
    id: 'iso14067_background_data_use',
    name: '背景数据使用',
    description: '当缺乏供应商专用电力数据时，应使用与消费区域相符的网格因子；若无追踪系统，则选择能代表该区域消费的网格，并做敏感性分析',
    severity: 'major',
    category: '背景数据',
    weight: 0.07,
    mandatory: true,
    checkCriteria: [
      '电力数据优先使用供应商专用数据',
      '缺乏专用数据时使用区域网格因子',
      '网格因子与消费区域相符',
      '无追踪系统时选择代表性网格',
      '进行敏感性分析',
    ],
    evidenceRequired: ['电力数据来源说明', '网格因子选择依据', '敏感性分析报告'],
  },
  {
    id: 'iso14067_temporal_representativeness',
    name: '时间代表性',
    description: '必须明确所代表的时间段，并提供选择该时间段的合理依据。10年阈值仅用于延迟排放说明',
    severity: 'major',
    category: '时间代表性',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '明确数据代表的时间段',
      '提供时间段选择的合理依据',
      '延迟排放按10年阈值说明',
      '时间代表性评估充分',
    ],
    evidenceRequired: ['时间段选择说明', '时间代表性评估', '延迟排放分析'],
  },
  {
    id: 'iso14067_geographical_representativeness',
    name: '地理代表性',
    description: '数据应匹配工厂/国家地理位置，确保地理代表性',
    severity: 'major',
    category: '地理代表性',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '数据与实际工厂位置匹配',
      '数据与相关国家/地区匹配',
      '地理代表性评估完整',
      '区域差异得到考虑',
    ],
    evidenceRequired: ['地理位置说明', '区域数据匹配证明', '地理代表性评估'],
  },
  {
    id: 'iso14067_technological_representativeness',
    name: '技术代表性',
    description: '显著技术差异需分开说明，是否"显著"由敏感性分析判定',
    severity: 'major',
    category: '技术代表性',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '识别显著技术差异',
      '技术差异分开说明',
      '通过敏感性分析判定显著性',
      '技术代表性评估充分',
    ],
    evidenceRequired: ['技术差异分析', '敏感性分析报告', '技术代表性评估'],
  },
];

// GHG Protocol 特定要求
export const GHG_PROTOCOL_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'ghg_scope1_identification',
    name: 'Scope 1 排放识别',
    description: '识别并量化直接温室气体排放',
    severity: 'critical',
    category: '排放核算',
    weight: 0.3,
    mandatory: true,
    checkCriteria: ['识别了所有直接排放源', '使用了适当的量化方法', '数据收集系统完善'],
    evidenceRequired: ['排放源清单', '监测数据', '计算工作表'],
  },
  {
    id: 'ghg_scope2_identification',
    name: 'Scope 2 排放识别',
    description: '识别并量化间接电力排放',
    severity: 'critical',
    category: '排放核算',
    weight: 0.25,
    mandatory: true,
    checkCriteria: [
      '识别了电力、蒸汽、供热等消耗',
      '使用了适当的排放因子',
      '选择了合适的核算方法（基于位置或基于市场）',
    ],
    evidenceRequired: ['电力消耗数据', '排放因子来源', '核算方法说明'],
  },
  {
    id: 'ghg_scope3_identification',
    name: 'Scope 3 排放识别',
    description: '识别并量化其他间接排放',
    severity: 'major',
    category: '排放核算',
    weight: 0.2,
    mandatory: false,
    checkCriteria: ['进行了相关性评估', '识别了重要的Scope 3类别', '使用了适当的量化方法'],
    evidenceRequired: ['相关性评估报告', 'Scope 3计算工作表'],
  },
  {
    id: 'ghg_base_year',
    name: '基准年设定',
    description: '设定和维护基准年排放',
    severity: 'major',
    category: '基准设定',
    weight: 0.15,
    mandatory: true,
    checkCriteria: ['基准年已明确设定', '基准年数据质量良好', '重算政策已制定'],
    evidenceRequired: ['基准年设定文件', '重算政策文档'],
  },
  {
    id: 'ghg_target_setting',
    name: '目标设定',
    description: '设定科学的减排目标',
    severity: 'minor',
    category: '目标管理',
    weight: 0.1,
    mandatory: false,
    checkCriteria: ['设定了定量减排目标', '目标覆盖主要排放源', '目标时间框架明确'],
    evidenceRequired: ['目标设定文档', '减排计划'],
  },
];

// CBAM 特定要求
export const CBAM_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'cbam_goods_classification',
    name: '商品分类',
    description: '正确分类CBAM适用商品',
    severity: 'critical',
    category: '商品识别',
    weight: 0.2,
    mandatory: true,
    checkCriteria: ['商品属于CBAM适用范围', 'CN代码正确分类', '产品技术规格明确'],
    evidenceRequired: ['商品分类证明', '技术规格文档'],
  },
  {
    id: 'cbam_carbon_content',
    name: '碳含量计算',
    description: '准确计算商品的碳含量',
    severity: 'critical',
    category: '碳含量',
    weight: 0.3,
    mandatory: true,
    checkCriteria: ['使用了认可的计算方法', '包含了直接排放', '包含了间接排放（如适用）', '使用了适当的排放因子'],
    evidenceRequired: ['碳含量计算报告', '排放因子证明'],
  },
  {
    id: 'cbam_production_route',
    name: '生产路径识别',
    description: '明确识别和记录生产路径',
    severity: 'major',
    category: '生产过程',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['生产路径清晰定义', '主要原料和能源来源已识别', '生产技术参数已记录'],
    evidenceRequired: ['生产流程图', '技术参数文档'],
  },
  {
    id: 'cbam_monitoring_reporting',
    name: '监测报告',
    description: '建立有效的监测和报告系统',
    severity: 'major',
    category: '监测系统',
    weight: 0.15,
    mandatory: true,
    checkCriteria: ['监测计划已制定', '数据收集系统有效', '报告程序完善'],
    evidenceRequired: ['监测计划', '数据管理程序'],
  },
  {
    id: 'cbam_verification',
    name: '验证要求',
    description: '满足第三方验证要求',
    severity: 'major',
    category: '验证',
    weight: 0.1,
    mandatory: true,
    checkCriteria: ['有合格的验证机构', '验证报告符合要求', '验证周期适当'],
    evidenceRequired: ['验证报告', '验证机构资质'],
  },
];

// 中国碳排放交易体系特定要求
export const CHINA_ETS_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'china_ets_quota_management',
    name: '配额管理',
    description: '合规管理碳排放配额',
    severity: 'critical',
    category: '配额管理',
    weight: 0.3,
    mandatory: true,
    checkCriteria: ['配额分配符合要求', '配额使用记录完整', '超额排放处理合规'],
    evidenceRequired: ['配额分配通知书', '配额使用记录', '排放报告'],
  },
  {
    id: 'china_ets_monitoring_plan',
    name: '监测计划',
    description: '制定和执行碳排放监测计划',
    severity: 'critical',
    category: '监测计划',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['监测计划已制定', '监测设备符合要求', '监测数据完整准确'],
    evidenceRequired: ['监测计划文件', '设备检定证书', '监测数据记录'],
  },
  {
    id: 'china_ets_verification_report',
    name: '核查报告',
    description: '委托第三方机构进行碳排放核查',
    severity: 'critical',
    category: '第三方核查',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['委托合格核查机构', '核查报告符合规范', '核查结论明确'],
    evidenceRequired: ['核查报告', '核查机构资质', '核查合同'],
  },
  {
    id: 'china_ets_data_quality',
    name: '数据质量控制',
    description: '确保碳排放数据质量',
    severity: 'major',
    category: '数据质量',
    weight: 0.2,
    mandatory: true,
    checkCriteria: ['数据收集规范', '数据存储安全', '数据追溯完整'],
    evidenceRequired: ['数据质量控制程序', '数据备份记录', '数据变更记录'],
  },
];

// GB/T 32150 工业企业温室气体排放核算要求
export const GB_T_32150_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'gbt32150_organizational_boundary',
    name: '组织边界设定',
    description: '明确温室气体排放核算的组织边界',
    severity: 'critical',
    category: '边界设定',
    weight: 0.2,
    mandatory: true,
    checkCriteria: ['组织边界清晰定义', '控制权方法选择合理', '边界变化及时更新'],
    evidenceRequired: ['组织架构图', '控制权证明文件', '边界设定说明'],
  },
  {
    id: 'gbt32150_emission_sources',
    name: '排放源识别',
    description: '全面识别温室气体排放源',
    severity: 'critical',
    category: '排放源管理',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['排放源清单完整', '排放源分类正确', '重要排放源已识别'],
    evidenceRequired: ['排放源清单', '设施设备清单', '工艺流程图'],
  },
  {
    id: 'gbt32150_activity_data',
    name: '活动数据收集',
    description: '收集准确的活动数据',
    severity: 'critical',
    category: '数据收集',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['数据收集方法合理', '数据准确性可验证', '数据记录完整'],
    evidenceRequired: ['原始数据记录', '计量设备检定证书', '数据收集程序'],
  },
  {
    id: 'gbt32150_emission_factors',
    name: '排放因子选择',
    description: '选择适当的温室气体排放因子',
    severity: 'major',
    category: '因子选择',
    weight: 0.15,
    mandatory: true,
    checkCriteria: ['排放因子来源权威', '因子适用性合理', '因子更新及时'],
    evidenceRequired: ['排放因子数据库', '因子选择说明', '因子更新记录'],
  },
  {
    id: 'gbt32150_calculation_method',
    name: '计算方法',
    description: '采用标准的温室气体排放计算方法',
    severity: 'major',
    category: '计算方法',
    weight: 0.15,
    mandatory: true,
    checkCriteria: ['计算公式正确', '计算过程透明', '计算结果可重现'],
    evidenceRequired: ['计算工作表', '计算方法说明', '计算过程记录'],
  },
];

// 科学碳目标倡议 (SBTi) 特定要求
export const SBTI_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'sbti_target_scope',
    name: '目标范围',
    description: '设定覆盖所有相关排放范围的目标',
    severity: 'critical',
    category: '目标设定',
    weight: 0.25,
    mandatory: true,
    checkCriteria: ['Scope 1和2目标必须设定', 'Scope 3目标按要求设定', '目标覆盖率符合要求'],
    evidenceRequired: ['目标设定文件', '排放清单', '目标覆盖率计算'],
  },
  {
    id: 'sbti_target_ambition',
    name: '目标雄心度',
    description: '目标与1.5°C路径一致',
    severity: 'critical',
    category: '目标雄心',
    weight: 0.3,
    mandatory: true,
    checkCriteria: ['减排速度符合1.5°C要求', '目标基于科学方法', '目标雄心度足够'],
    evidenceRequired: ['目标计算工作表', '科学方法证明', '路径分析报告'],
  },
  {
    id: 'sbti_target_timeframe',
    name: '目标时间框架',
    description: '设定合理的目标时间框架',
    severity: 'major',
    category: '时间框架',
    weight: 0.2,
    mandatory: true,
    checkCriteria: ['目标年份在5-15年范围内', '基准年选择合理', '中期目标已设定'],
    evidenceRequired: ['目标时间表', '基准年说明', '中期目标文件'],
  },
  {
    id: 'sbti_progress_tracking',
    name: '进展跟踪',
    description: '建立有效的目标进展跟踪机制',
    severity: 'major',
    category: '进展监控',
    weight: 0.15,
    mandatory: true,
    checkCriteria: ['进展跟踪系统建立', '定期报告进展', '偏差分析及时'],
    evidenceRequired: ['跟踪系统文档', '进展报告', '偏差分析报告'],
  },
  {
    id: 'sbti_public_disclosure',
    name: '公开披露',
    description: '公开披露目标和进展',
    severity: 'minor',
    category: '信息披露',
    weight: 0.1,
    mandatory: false,
    checkCriteria: ['目标公开披露', '进展定期更新', '披露信息完整'],
    evidenceRequired: ['公开披露文件', '网站更新记录', '年度报告'],
  },
];

// 欧盟电池法特定要求
export const EU_BATTERY_REGULATION_REQUIREMENTS: ComplianceRequirement[] = [
  {
    id: 'eu_battery_scope_definition',
    name: '适用范围定义',
    description: '四大类别：EV、LMT、工业、便携、SLI；动力/储能电池≃EV+工业，但应显式列出EV & Industrial（>2 kWh）',
    severity: 'critical',
    category: '适用范围',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '明确识别电池类别（EV/LMT/工业/便携/SLI）',
      '动力电池>2 kWh需显式标注',
      '储能电池>2 kWh需显式标注',
      '电池分类符合法规定义'
    ],
    evidenceRequired: ['电池分类证明', '技术规格文档', '容量测试报告'],
  },
  {
    id: 'eu_battery_system_boundary',
    name: '系统边界定义',
    description: '要求计算原料获取、部件生产、电池制造、分销、自备电力生产、EoL；使用阶段仅对外部储能电池计入',
    severity: 'critical',
    category: '系统边界',
    weight: 0.12,
    mandatory: true,
    checkCriteria: [
      '包含原料获取阶段',
      '包含部件生产阶段',
      '包含电池制造阶段',
      '包含分销阶段',
      '包含自备电力生产',
      '包含报废处理（EoL）阶段',
      '外部储能电池包含使用阶段'
    ],
    evidenceRequired: ['系统边界图', '生命周期阶段清单', '储能电池使用阶段数据'],
  },
  {
    id: 'eu_battery_exclusion_rules',
    name: '排除规则',
    description: '排除：组装生产线设备制造、OEM整车装配能耗等；使用阶段默认排除，但若设计导致显著影响需纳入。如制造设备影响被证实"可忽略"则可排除',
    severity: 'critical',
    category: '排除规则',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '排除组装生产线设备制造',
      '排除OEM整车装配能耗',
      '使用阶段按规则处理',
      '显著影响的设计因素需纳入',
      '制造设备影响需证实可忽略'
    ],
    evidenceRequired: ['排除项清单', '影响评估报告', '可忽略性证明'],
  },
  {
    id: 'eu_battery_functional_unit',
    name: '功能单位和参考流',
    description: 'kWh - 1 kWh电池全寿命可交付总能量。需满足功能单位所需的电池质量（kg/kWh或kg/kW·min/年）',
    severity: 'critical',
    category: '功能单位',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '功能单位为kWh',
      '定义1 kWh电池全寿命可交付总能量',
      '参考流按功能单位归一化',
      '电池质量按kg/kWh或kg/kW·min/年计算'
    ],
    evidenceRequired: ['功能单位定义', '能量交付能力测试', '质量归一化计算'],
  },
  {
    id: 'eu_battery_assessment_method',
    name: '评估方法',
    description: '采用PEF方法最新版与对应PEFCR；影响类别仅限Climate Change，使用EU JRC 2019推荐CF；结果以kg CO₂e给出，禁止归一化/加权；不得计入碳抵消',
    severity: 'critical',
    category: '评估方法',
    weight: 0.15,
    mandatory: true,
    checkCriteria: [
      '采用PEF方法最新版',
      '使用对应的PEFCR',
      '影响类别仅限Climate Change',
      '使用EU JRC 2019推荐特征化因子',
      '结果以kg CO₂e表示',
      '禁止归一化/加权',
      '不计入碳抵消',
      '可做碳抵消附加信息报告'
    ],
    evidenceRequired: ['PEF方法应用证明', 'PEFCR使用说明', 'JRC特征化因子', '计算结果报告'],
  },
  {
    id: 'eu_battery_inventory_data',
    name: '清单数据收集',
    description: '活动数据基于BOM+能耗+辅料；必须精确识别电芯活性材料、BMS等电子元件；所有清单数据均按参考流归一；与PEF一致的二级数据库要求',
    severity: 'critical',
    category: '清单数据',
    weight: 0.12,
    mandatory: true,
    checkCriteria: [
      '基于物料清单（BOM）收集数据',
      '包含完整能耗数据',
      '包含所有辅料数据',
      '精确识别电芯活性材料',
      '精确识别BMS等电子元件',
      '所有数据按参考流归一化',
      '二级数据库符合PEF要求'
    ],
    evidenceRequired: ['详细BOM清单', '能耗统计', '辅料清单', '电子元件规格', 'PEF数据库证明'],
  },
  {
    id: 'eu_battery_primary_data_quality',
    name: '主数据质量要求',
    description: '公司/现场专属数据，无数值阈值；须覆盖关键部件并随BOM/energy mix变化而重算。对阳极、阴极、电解液、隔膜、壳体等"电池-特定部件"强制使用公司/工厂级原始数据；不允许用缺省数据',
    severity: 'critical',
    category: '主数据质量',
    weight: 0.15,
    mandatory: true,
    checkCriteria: [
      '使用公司/现场专属数据',
      '覆盖所有关键部件',
      '随BOM变化重新计算',
      '随能源结构变化重新计算',
      '阳极材料使用工厂级原始数据',
      '阴极材料使用工厂级原始数据',
      '电解液使用工厂级原始数据',
      '隔膜使用工厂级原始数据',
      '壳体使用工厂级原始数据',
      '禁止使用缺省数据'
    ],
    evidenceRequired: ['现场数据收集记录', '关键部件数据', 'BOM变化追踪', '工厂级数据证明'],
  },
  {
    id: 'eu_battery_allocation_recycling',
    name: '分配和回收处理',
    description: '系统边界已强制包含收集-拆解-再生流程；按PEFCR（闭环/开环分配）执行',
    severity: 'major',
    category: '分配回收',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '包含电池收集流程',
      '包含电池拆解流程',
      '包含材料再生流程',
      '按PEFCR执行闭环分配',
      '按PEFCR执行开环分配'
    ],
    evidenceRequired: ['回收流程图', 'PEFCR分配方法', '再生流程数据'],
  },
  {
    id: 'eu_battery_cfp_reporting',
    name: 'CFP报告要求',
    description: '碳足迹声明每"型号-工厂"一份，至少含：制造商信息、型号、工厂地点；总CFP (kg CO₂e/kWh)及各阶段分项；EU合格声明编号；公共版研究报告链接',
    severity: 'critical',
    category: 'CFP报告',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '每型号-工厂组合单独报告',
      '包含制造商完整信息',
      '包含电池型号信息',
      '包含工厂地点信息',
      '报告总CFP (kg CO₂e/kWh)',
      '报告各阶段CFP分项',
      '包含EU合格声明编号',
      '提供公共版研究报告链接'
    ],
    evidenceRequired: ['CFP声明报告', '制造商信息', 'EU合格声明', '公共研究报告'],
  },
  {
    id: 'eu_battery_verification',
    name: '第三方验证要求',
    description: 'CFP计算须由公告机构依Art 21-33执行合格评定；供应链尽调政策亦需公告机构初审+定期审核；供应链尽调要求"独立第三方审计"；至少每3年进行一次系统性审核',
    severity: 'critical',
    category: '第三方验证',
    weight: 0.12,
    mandatory: true,
    checkCriteria: [
      'CFP计算由公告机构合格评定',
      '按Art 21-33执行评定程序',
      '供应链尽调政策需公告机构初审',
      '供应链尽调需定期审核',
      '独立第三方审计供应链尽调',
      '至少每3年系统性审核',
      '审核结果向主管机构报告'
    ],
    evidenceRequired: ['公告机构合格评定报告', '供应链尽调审核报告', '第三方审计报告', '定期审核记录'],
  },
  {
    id: 'eu_battery_passport',
    name: '电池护照要求',
    description: 'Battery Passport 2027年生效。每块电池需具备唯一标识符+数字电池护照，通过QR码公开关键数据（含CFP、回收含量等）',
    severity: 'critical',
    category: '数字护照',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '每块电池具备唯一标识符',
      '建立数字电池护照系统',
      'QR码可读取关键数据',
      '包含CFP数据',
      '包含回收含量数据',
      '2027年前完成系统建设'
    ],
    evidenceRequired: ['唯一标识符系统', '数字护照平台', 'QR码测试', '数据完整性证明'],
  },
  {
    id: 'eu_battery_special_requirements',
    name: '特殊要求',
    description: '危险物质限值：Hg 0.0005%、Cd 0.002%、Pb 0.01%(便携)；再生含量强制目标（Co/Pb/Li/Ni），自2031起；CFP绩效等级+最大阈值分阶段实施(2028-2033)；供应链尽调：钴、锂、镍、天然石墨等原料',
    severity: 'critical',
    category: '特殊要求',
    weight: 0.1,
    mandatory: true,
    checkCriteria: [
      '汞含量≤0.0005%',
      '镉含量≤0.002%',
      '便携电池铅含量≤0.01%',
      '2031年起满足钴再生含量目标',
      '2031年起满足铅再生含量目标',
      '2031年起满足锂再生含量目标',
      '2031年起满足镍再生含量目标',
      '2028-2033年满足CFP绩效要求',
      '对钴、锂、镍、天然石墨进行供应链尽调'
    ],
    evidenceRequired: ['危险物质检测报告', '再生含量证明', 'CFP绩效测试', '供应链尽调报告'],
  },
  {
    id: 'eu_battery_key_emission_sources',
    name: '关键排放源',
    description: '电极生产+制造阶段电力结构。电子元件（BMS、安全单元）及阴极材料往往成为CFP主要贡献者，需逐项精算',
    severity: 'major',
    category: '关键排放源',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '重点关注电极生产排放',
      '重点关注制造阶段电力结构',
      '精确计算BMS排放贡献',
      '精确计算安全单元排放贡献',
      '精确计算阴极材料排放贡献',
      '逐项计算主要贡献者'
    ],
    evidenceRequired: ['电极生产排放数据', '制造电力结构', 'BMS排放计算', '阴极材料排放分析'],
  },
  {
    id: 'eu_battery_database_requirements',
    name: '数据库要求',
    description: '应使用PEF-兼容二级数据集；影响因子由European Platform-LCA发布的官方清单',
    severity: 'major',
    category: '数据库',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '使用PEF-兼容二级数据集',
      '使用European Platform-LCA官方影响因子',
      '数据库来源权威可靠',
      '影响因子定期更新'
    ],
    evidenceRequired: ['PEF数据库证明', 'European Platform-LCA官方清单', '数据库更新记录'],
  },
  {
    id: 'eu_battery_background_data_quality',
    name: '背景数据质量',
    description: '二级数据须符合PEF数据质量规则（时间/地理/技术代表性、完整性等），并需在技术文件中说明来源适用性',
    severity: 'major',
    category: '背景数据质量',
    weight: 0.07,
    mandatory: true,
    checkCriteria: [
      '二级数据符合PEF质量规则',
      '满足时间代表性要求',
      '满足地理代表性要求',
      '满足技术代表性要求',
      '满足完整性要求',
      '在技术文件中说明来源适用性'
    ],
    evidenceRequired: ['PEF质量规则符合性证明', '代表性评估报告', '技术文件', '来源适用性说明'],
  },
  {
    id: 'eu_battery_background_data_use',
    name: '背景数据使用要求',
    description: 'Cell/Pack 100%一级数据。仅当原始数据不可行or次要流程，可使用二级数据；同一型号不同工厂禁止跨厂取样',
    severity: 'critical',
    category: '背景数据使用',
    weight: 0.08,
    mandatory: true,
    checkCriteria: [
      '电芯100%使用一级数据',
      '电池包100%使用一级数据',
      '仅在原始数据不可行时使用二级数据',
      '仅对次要流程使用二级数据',
      '同一型号不同工厂不得跨厂取样',
      '每个工厂独立数据收集'
    ],
    evidenceRequired: ['一级数据收集证明', '二级数据使用说明', '工厂独立性证明'],
  },
  {
    id: 'eu_battery_temporal_representativeness',
    name: '时间代表性',
    description: '数据≤最晚5年且覆盖代表期；规定数据代表性，并按生产厂点声明（必须能代表该生产厂点的实际情况）',
    severity: 'major',
    category: '时间代表性',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '数据不超过5年',
      '数据覆盖代表性时期',
      '按生产厂点声明数据代表性',
      '数据能代表厂点实际情况',
      '时间代表性评估充分'
    ],
    evidenceRequired: ['数据年份证明', '代表期说明', '厂点代表性评估'],
  },
  {
    id: 'eu_battery_geographical_representativeness',
    name: '地理代表性',
    description: '与制造/市场区域一致；确保数据地理适用性',
    severity: 'major',
    category: '地理代表性',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '数据与制造区域一致',
      '数据与市场区域一致',
      '地理适用性充分评估',
      '区域差异得到考虑'
    ],
    evidenceRequired: ['制造区域证明', '市场区域分析', '地理适用性评估'],
  },
  {
    id: 'eu_battery_technological_representativeness',
    name: '技术代表性',
    description: '化学体系区分；反映实际技术/工艺',
    severity: 'major',
    category: '技术代表性',
    weight: 0.06,
    mandatory: true,
    checkCriteria: [
      '按化学体系区分数据',
      '反映实际生产技术',
      '反映实际生产工艺',
      '技术差异得到识别',
      '工艺参数准确记录'
    ],
    evidenceRequired: ['化学体系分类', '技术工艺文档', '技术代表性评估'],
  },
];

// 合规检查器接口
export interface ComplianceChecker {
  standard: ComplianceStandard;
  requirements: ComplianceRequirement[];

  // 检查方法
  checkCompliance(nodes: Node<NodeData>[], workflowData?: any): ComplianceScoreDetail;

  // 生成改进建议
  generateImprovements(result: ComplianceScoreDetail): Array<{
    priority: 'high' | 'medium' | 'low';
    area: string;
    action: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }>;

  // 检查特定节点
  checkNodeCompliance(node: Node<NodeData>): NodeComplianceIssue | null;
}

// 合规检查配置
export interface ComplianceCheckConfiguration {
  enabledStandards: ComplianceStandard[];
  customWeights?: Record<ComplianceStandard, number>; // 自定义标准权重
  reportFormat: 'summary' | 'detailed' | 'executive';
  includeRecommendations: boolean;
  includeNodeLevel: boolean;
  autoRefresh: boolean;
  thresholds: {
    critical: number; // 关键问题阈值
    warning: number; // 警告阈值
    acceptable: number; // 可接受阈值
  };
}

// 合规监控事件
export interface ComplianceEvent {
  id: string;
  timestamp: string;
  type: 'score_change' | 'new_issue' | 'issue_resolved' | 'standard_added' | 'manual_check';
  standard: ComplianceStandard;
  description: string;
  oldScore?: number;
  newScore?: number;
  affectedNodes?: string[];
}

// 工厂函数：创建标准特定的检查器
export function createComplianceChecker(standard: ComplianceStandard): ComplianceChecker {
  const requirements = getStandardRequirements(standard);

  return {
    standard,
    requirements,
    checkCompliance: (nodes: Node<NodeData>[], workflowData?: any) => {
      return performStandardCheck(standard, requirements, nodes, workflowData);
    },
    generateImprovements: (result: ComplianceScoreDetail) => {
      return generateStandardImprovements(standard, result);
    },
    checkNodeCompliance: (node: Node<NodeData>) => {
      return checkNodeAgainstStandard(standard, requirements, node);
    },
  };
}

// 获取标准要求的辅助函数
function getStandardRequirements(standard: ComplianceStandard): ComplianceRequirement[] {
  switch (standard) {
    case 'ISO_14067':
      return ISO_14067_REQUIREMENTS;
    case 'GHG_PROTOCOL':
      return GHG_PROTOCOL_REQUIREMENTS;
    case 'CBAM':
      return CBAM_REQUIREMENTS;
    case 'CHINA_ETS':
      return CHINA_ETS_REQUIREMENTS;
    case 'GB_T_32150':
      return GB_T_32150_REQUIREMENTS;
    case 'SBTI':
      return SBTI_REQUIREMENTS;
    case 'EU_BATTERY_REGULATION':
      return EU_BATTERY_REGULATION_REQUIREMENTS;

    // 其他标准的要求可以后续添加
    default:
      return [];
  }
}

// 执行标准检查的辅助函数
function performStandardCheck(
  standard: ComplianceStandard,
  requirements: ComplianceRequirement[],
  nodes: Node<NodeData>[],
  workflowData?: any,
): ComplianceScoreDetail {
  /*
   * 实现具体的检查逻辑
   * 这里是示例实现，实际需要根据每个标准的具体要求来实现
   */

  const requirementResults: ComplianceCheckResult[] = requirements.map((req) => {
    // 根据要求检查节点和工作流数据
    const score = calculateRequirementScore(req, nodes, workflowData);

    return {
      requirementId: req.id,
      compliant: score >= 75, // 75分以上认为合规
      score,
      evidence: [], // 实际实现中需要收集证据
      gaps: [], // 实际实现中需要识别差距
      recommendations: [], // 实际实现中需要生成建议
    };
  });

  // 计算总分
  const weightedScore = requirements.reduce((total, req, index) => {
    return total + requirementResults[index].score * req.weight;
  }, 0);

  const overallScore = Math.round(weightedScore);
  const level = getComplianceLevel(overallScore);

  return {
    standard,
    overallScore,
    level,
    categoryScores: [], // 实际实现中需要按类别计算
    mandatoryScore: 0, // 实际实现中需要计算
    mandatoryCompliance: false, // 实际实现中需要检查
    recommendedScore: 0, // 实际实现中需要计算
    requirementResults,
    nodeIssues: [], // 实际实现中需要生成
    summary: {
      totalRequirements: requirements.length,
      compliantRequirements: requirementResults.filter((r) => r.compliant).length,
      criticalIssues: 0,
      majorIssues: 0,
      minorIssues: 0,
    },
    improvements: [], // 实际实现中需要生成
  };
}

// 计算要求得分的辅助函数
function calculateRequirementScore(
  _requirement: ComplianceRequirement,
  _nodes: Node<NodeData>[],
  _workflowData?: any,
): number {
  /*
   * 这里需要根据具体要求实现检查逻辑
   * 示例：简单返回随机分数
   */
  return Math.floor(Math.random() * 100);
}

// 获取合规等级的辅助函数
function getComplianceLevel(score: number): ComplianceLevel {
  if (score >= 90) {
    return 'full_compliance';
  }

  if (score >= 75) {
    return 'substantial_compliance';
  }

  if (score >= 60) {
    return 'partial_compliance';
  }

  return 'non_compliance';
}

// 生成改进建议的辅助函数
function generateStandardImprovements(
  _standard: ComplianceStandard,
  _result: ComplianceScoreDetail,
): Array<{
  priority: 'high' | 'medium' | 'low';
  area: string;
  action: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}> {
  // 根据检查结果生成改进建议
  return [];
}

// 检查单个节点的辅助函数
function checkNodeAgainstStandard(
  _standard: ComplianceStandard,
  _requirements: ComplianceRequirement[],
  _node: Node<NodeData>,
): NodeComplianceIssue | null {
  // 根据标准要求检查单个节点
  return null;
}
