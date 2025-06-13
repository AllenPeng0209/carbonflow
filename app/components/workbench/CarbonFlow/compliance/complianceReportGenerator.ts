/**
 * 合规报告自动生成器
 * 根据场景信息中选择的标准自动生成对应的合规检查报告
 */

import type {
  ComplianceStandard,
  MultiStandardComplianceReport,
  ComplianceScoreDetail,
  ComplianceCheckConfiguration,
} from '~/types/complianceCheck';
import type { SceneInfoType } from '~/types/scene';
import type { Node } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import { createComplianceChecker } from '~/types/complianceCheck';

// 标准映射：从场景信息的标准字符串映射到ComplianceStandard枚举
const STANDARD_MAPPING: Record<string, ComplianceStandard> = {
  // ISO标准系列
  'ISO 14067': 'ISO_14067',
  'ISO14067': 'ISO_14067',
  'iso 14067': 'ISO_14067',
  'iso14067': 'ISO_14067',
  
  'ISO 14040': 'ISO_14040_14044',
  'ISO 14044': 'ISO_14040_14044',
  'ISO 14040/14044': 'ISO_14040_14044',
  'iso 14040/14044': 'ISO_14040_14044',
  
  'ISO 14064': 'ISO_14064',
  'iso 14064': 'ISO_14064',
  
  'ISO 14001': 'ISO_14001',
  'iso 14001': 'ISO_14001',
  
  'ISO 50001': 'ISO_50001',
  'iso 50001': 'ISO_50001',
  
  // PAS标准系列
  'PAS 2050': 'PAS_2050',
  'pas 2050': 'PAS_2050',
  
  'PAS 2060': 'PAS_2060',
  'pas 2060': 'PAS_2060',
  
  // GHG Protocol
  'GHG Protocol': 'GHG_PROTOCOL',
  'ghg protocol': 'GHG_PROTOCOL',
  'GHG协议': 'GHG_PROTOCOL',
  
  // 欧盟法规
  'EU Battery Regulation': 'EU_BATTERY_REGULATION',
  'eu battery regulation': 'EU_BATTERY_REGULATION',
  '欧盟电池法': 'EU_BATTERY_REGULATION',
  'EU 2023/1542': 'EU_BATTERY_REGULATION',
  
  'CBAM': 'CBAM',
  'cbam': 'CBAM',
  '欧盟碳边境调节机制': 'CBAM',
  
  'EU Taxonomy': 'EU_TAXONOMY',
  'eu taxonomy': 'EU_TAXONOMY',
  '欧盟分类法': 'EU_TAXONOMY',
  
  'EU ETS': 'EU_ETS',
  'eu ets': 'EU_ETS',
  '欧盟排放交易体系': 'EU_ETS',
  
  // 中国标准
  'GB/T 32150': 'GB_T_32150',
  'gb/t 32150': 'GB_T_32150',
  'GBT 32150': 'GB_T_32150',
  
  'GB/T 32151': 'GB_T_32151',
  'gb/t 32151': 'GB_T_32151',
  'GBT 32151': 'GB_T_32151',
  
  'China ETS': 'CHINA_ETS',
  'china ets': 'CHINA_ETS',
  '中国碳排放交易体系': 'CHINA_ETS',
  
  'CCER': 'CCER',
  'ccer': 'CCER',
  '中国核证自愿减排量': 'CCER',
  
  // 其他国际标准
  'TCFD': 'TCFD',
  'tcfd': 'TCFD',
  '气候相关财务信息披露': 'TCFD',
  
  'SBTi': 'SBTI',
  'sbti': 'SBTI',
  '科学碳目标倡议': 'SBTI',
  
  'CDP': 'CDP',
  'cdp': 'CDP',
  '碳披露项目': 'CDP',
  
  'GRI': 'GRI',
  'gri': 'GRI',
  '全球报告倡议': 'GRI',
};

// 报告类型映射：从场景信息的报告类型映射到相关标准
const REPORT_TYPE_MAPPING: Record<string, ComplianceStandard[]> = {
  'ghg_protocol': ['GHG_PROTOCOL'],
  'iso_14064': ['ISO_14064'],
  'pas_2050': ['PAS_2050'],
  'pcr': ['ISO_14067'], // 产品种类规则通常与ISO 14067相关
  'other': [], // 其他类型暂不自动映射
};

/**
 * 从场景信息中解析合规标准
 */
export function parseStandardsFromSceneInfo(sceneInfo: SceneInfoType): ComplianceStandard[] {
  const standards: ComplianceStandard[] = [];
  
  // 从标准字段解析
  if (sceneInfo.standard) {
    const standardStr = sceneInfo.standard.trim();
    const mappedStandard = STANDARD_MAPPING[standardStr];
    if (mappedStandard) {
      standards.push(mappedStandard);
    }
  }
  
  // 从报告类型解析
  if (sceneInfo.reportType) {
    const reportTypeStandards = REPORT_TYPE_MAPPING[sceneInfo.reportType];
    if (reportTypeStandards) {
      standards.push(...reportTypeStandards);
    }
  }
  
  // 去重
  return [...new Set(standards)];
}

/**
 * 为单个标准创建初始合规评分详情
 */
function createInitialComplianceScore(
  standard: ComplianceStandard,
  workflowId: string,
  nodes: Node<NodeData>[] = [],
  workflowData?: any
): ComplianceScoreDetail {
  try {
    // 使用合规检查器进行实际检查
    const checker = createComplianceChecker(standard);
    return checker.checkCompliance(nodes, workflowData);
  } catch (error) {
    console.error(`Error creating compliance checker for ${standard}:`, error);
    
    // 回退到基本结构
    return {
      standard,
      overallScore: 0,
      level: 'non_compliance',
      categoryScores: [],
      mandatoryScore: 0,
      mandatoryCompliance: false,
      recommendedScore: 0,
      requirementResults: [],
      nodeIssues: [],
      summary: {
        totalRequirements: 0,
        compliantRequirements: 0,
        criticalIssues: 0,
        majorIssues: 0,
        minorIssues: 0,
      },
      improvements: [],
    };
  }
}

/**
 * 自动生成多标准合规报告
 */
export function generateComplianceReport(
  workflowId: string,
  sceneInfo: SceneInfoType,
  nodes: Node<NodeData>[] = [],
  workflowData?: any
): MultiStandardComplianceReport {
  const standards = parseStandardsFromSceneInfo(sceneInfo);
  
  if (standards.length === 0) {
    // 如果没有识别到标准，返回空报告
    return {
      workflowId,
      reportDate: new Date().toISOString(),
      standards: [],
      aggregateScore: {
        averageScore: 0,
        bestPerformingStandard: 'ISO_14067', // 默认值
        worstPerformingStandard: 'ISO_14067', // 默认值
      },
      commonIssues: [],
      actionItems: [],
    };
  }
  
  // 为每个标准生成合规评分
  const standardScores: ComplianceScoreDetail[] = standards.map(standard => 
    createInitialComplianceScore(standard, workflowId, nodes, workflowData)
  );
  
  // 计算综合评分
  const validScores = standardScores.filter(score => score.overallScore > 0);
  const averageScore = validScores.length > 0 
    ? validScores.reduce((sum, score) => sum + score.overallScore, 0) / validScores.length 
    : 0;
  
  const bestPerforming = validScores.length > 0 
    ? validScores.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      ).standard
    : standards[0];
    
  const worstPerforming = validScores.length > 0 
    ? validScores.reduce((worst, current) => 
        current.overallScore < worst.overallScore ? current : worst
      ).standard
    : standards[0];
  
  // 识别通用问题
  const commonIssues = findCommonIssues(standardScores);
  
  // 生成优先行动项
  const actionItems = generateActionItems(standardScores);
  
  return {
    workflowId,
    reportDate: new Date().toISOString(),
    standards: standardScores,
    aggregateScore: {
      averageScore,
      bestPerformingStandard: bestPerforming,
      worstPerformingStandard: worstPerforming,
    },
    commonIssues,
    actionItems,
  };
}

/**
 * 查找多个标准间的通用问题
 */
function findCommonIssues(standardScores: ComplianceScoreDetail[]) {
  const commonIssues: MultiStandardComplianceReport['commonIssues'] = [];
  
  if (standardScores.length < 2) return commonIssues;
  
  // 分析所有标准的改进建议，找出共同问题
  const allImprovements = standardScores.flatMap(score => 
    score.improvements.map(imp => ({
      ...imp,
      standard: score.standard,
    }))
  );
  
  // 按区域分组改进建议
  const improvementsByArea: Record<string, any[]> = {};
  allImprovements.forEach(imp => {
    if (!improvementsByArea[imp.area]) {
      improvementsByArea[imp.area] = [];
    }
    improvementsByArea[imp.area].push(imp);
  });
  
  // 识别影响多个标准的共同问题
  Object.entries(improvementsByArea).forEach(([area, improvements]) => {
    if (improvements.length >= 2) {
      const affectedStandards = [...new Set(improvements.map(imp => imp.standard))];
      if (affectedStandards.length >= 2) {
        commonIssues.push({
          description: `${area}方面需要改进`,
          affectedStandards,
          severity: improvements.some(imp => imp.priority === 'high') ? 'critical' : 'major',
          solution: improvements[0].action, // 使用第一个改进建议的行动
        });
      }
    }
  });
  
  return commonIssues;
}

/**
 * 生成优先行动项
 */
function generateActionItems(standardScores: ComplianceScoreDetail[]) {
  const actionItems: MultiStandardComplianceReport['actionItems'] = [];
  
  // 收集所有高优先级改进建议
  const allHighPriorityImprovements = standardScores.flatMap(score => 
    score.improvements
      .filter(imp => imp.priority === 'high')
      .map(imp => ({
        ...imp,
        standard: score.standard,
        currentScore: score.overallScore,
      }))
  );
  
  // 按影响程度排序并生成行动项
  allHighPriorityImprovements
    .sort((a, b) => {
      // 优先处理影响更大的改进
      const aImpact = estimateScoreImpact(a.impact, a.currentScore);
      const bImpact = estimateScoreImpact(b.impact, b.currentScore);
      return bImpact - aImpact;
    })
    .slice(0, 10) // 限制为前10个行动项
    .forEach((improvement, index) => {
      actionItems.push({
        priority: index + 1,
        description: improvement.action,
        affectedStandards: [improvement.standard],
        estimatedImpact: estimateScoreImpact(improvement.impact, improvement.currentScore),
        effort: improvement.effort,
      });
    });
  
  return actionItems;
}

/**
 * 估算改进对分数的影响
 */
function estimateScoreImpact(impactDescription: string, currentScore: number): number {
  // 简单的启发式方法估算分数提升
  const lowScore = currentScore < 30;
  const mediumScore = currentScore >= 30 && currentScore < 70;
  
  if (impactDescription.includes('显著') || impactDescription.includes('大幅')) {
    return lowScore ? 25 : mediumScore ? 15 : 10;
  } else if (impactDescription.includes('明显') || impactDescription.includes('较大')) {
    return lowScore ? 15 : mediumScore ? 10 : 5;
  } else {
    return lowScore ? 10 : mediumScore ? 5 : 3;
  }
}

/**
 * 创建合规检查配置
 */
export function createComplianceConfiguration(
  standards: ComplianceStandard[],
  options: Partial<ComplianceCheckConfiguration> = {}
): ComplianceCheckConfiguration {
  return {
    enabledStandards: standards,
    customWeights: options.customWeights,
    reportFormat: options.reportFormat || 'detailed',
    includeRecommendations: options.includeRecommendations ?? true,
    includeNodeLevel: options.includeNodeLevel ?? true,
    autoRefresh: options.autoRefresh ?? true,
    thresholds: {
      critical: 60,
      warning: 75,
      acceptable: 90,
      ...options.thresholds,
    },
  };
}

/**
 * 获取标准的中文显示名称
 */
export function getStandardDisplayName(standard: ComplianceStandard): string {
  const standardNames: Record<ComplianceStandard, string> = {
    ISO_14067: 'ISO 14067 产品碳足迹标准',
    EU_BATTERY_REGULATION: '欧盟电池法 (EU 2023/1542)',
    ISO_14040_14044: 'ISO 14040/14044 生命周期评估标准',
    ISO_14064: 'ISO 14064 温室气体核算标准',
    ISO_14001: 'ISO 14001 环境管理体系',
    ISO_50001: 'ISO 50001 能源管理体系',
    PAS_2050: 'PAS 2050 产品碳足迹规范',
    PAS_2060: 'PAS 2060 碳中和规范',
    GHG_PROTOCOL: '温室气体核算体系议定书',
    CBAM: '欧盟碳边境调节机制',
    EU_TAXONOMY: '欧盟分类法',
    EU_ETS: '欧盟排放交易体系',
    TCFD: '气候相关财务信息披露工作组',
    CSRD: '企业可持续发展报告指令',
    SBTI: '科学碳目标倡议',
    CDP: '碳披露项目',
    GRI: '全球报告倡议',
    SASB: '可持续发展会计准则委员会',
    IFRS_S1_S2: 'IFRS可持续发展披露标准',
    CHINA_ETS: '中国碳排放交易体系',
    CHINA_ENVIRONMENTAL_LAW: '中国环境保护法',
    CHINA_ENERGY_LAW: '中国节能法',
    CHINA_CLEANER_PRODUCTION: '中国清洁生产促进法',
    CCER: '中国核证自愿减排量',
    GB_T_32150: 'GB/T 32150 工业企业温室气体排放核算通则',
    GB_T_32151: 'GB/T 32151 产品碳足迹核算要求',
    SBTi_NET_ZERO: '科学碳目标净零标准',
    RACE_TO_ZERO: '奔向零排放倡议',
    UNGC: '联合国全球契约',
    PARIS_AGREEMENT: '巴黎协定',
    KYOTO_PROTOCOL: '京都议定书',
  };
  return standardNames[standard] || standard;
} 