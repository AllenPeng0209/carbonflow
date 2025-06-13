/**
 * 场景信息处理工具
 * 负责处理场景信息保存时的合规报告自动生成
 */

import type { SceneInfoType } from '~/types/scene';
import type { Workflow } from '~/types/workflow';
import type { Node } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import {
  generateComplianceReport,
  parseStandardsFromSceneInfo,
  createComplianceConfiguration,
  getStandardDisplayName,
} from '~/components/workbench/CarbonFlow/compliance/complianceReportGenerator';

/**
 * 处理场景信息保存，自动生成或更新合规报告
 */
export async function handleSceneInfoSave(
  sceneInfo: SceneInfoType,
  workflow: Workflow,
  nodes: Node<NodeData>[] = []
): Promise<Partial<Workflow>> {
  const updateData: Partial<Workflow> = {
    sceneInfo,
    updatedAt: new Date().toISOString(),
  };

  // 解析标准
  const detectedStandards = parseStandardsFromSceneInfo(sceneInfo);
  
  console.log('🔍 场景信息标准解析结果:', {
    inputStandard: sceneInfo.standard,
    inputReportType: sceneInfo.reportType,
    detectedStandards: detectedStandards.map(std => getStandardDisplayName(std)),
  });

  if (detectedStandards.length > 0) {
    // 生成合规报告
    try {
      const complianceReport = generateComplianceReport(
        workflow.workflowId,
        sceneInfo,
        nodes,
        workflow
      );

      // 生成合规配置
      const complianceConfiguration = createComplianceConfiguration(detectedStandards, {
        reportFormat: 'detailed',
        includeRecommendations: true,
        includeNodeLevel: true,
        autoRefresh: true,
      });

      updateData.complianceReport = complianceReport;
      updateData.complianceConfiguration = complianceConfiguration;

      console.log('✅ 合规报告自动生成成功:', {
        standards: complianceReport.standards.length,
        averageScore: complianceReport.aggregateScore.averageScore,
        commonIssues: complianceReport.commonIssues.length,
        actionItems: complianceReport.actionItems.length,
      });
    } catch (error) {
      console.error('❌ 合规报告生成失败:', error);
      
      // 即使生成失败，也保存配置信息
      const fallbackConfiguration = createComplianceConfiguration(detectedStandards);
      updateData.complianceConfiguration = fallbackConfiguration;
    }
  } else {
    console.log('ℹ️ 未检测到支持的合规标准，跳过合规报告生成');
  }

  return updateData;
}

/**
 * 验证场景信息的合规标准设置
 */
export function validateComplianceStandards(sceneInfo: SceneInfoType): {
  isValid: boolean;
  detectedStandards: string[];
  warnings: string[];
} {
  const detectedStandards = parseStandardsFromSceneInfo(sceneInfo);
  const warnings: string[] = [];
  
  // 检查是否有冲突的标准组合
  const hasISO14067 = detectedStandards.includes('ISO_14067');
  const hasEUBattery = detectedStandards.includes('EU_BATTERY_REGULATION');
  
  if (hasISO14067 && hasEUBattery) {
    warnings.push('同时选择了ISO 14067和欧盟电池法，请确认产品是否为电池类产品');
  }
  
  // 检查中国标准与国际标准的兼容性
  const hasChinaStandards = detectedStandards.some(std => std.startsWith('CHINA_') || std.startsWith('GB_T_'));
  const hasInternationalStandards = detectedStandards.some(std => 
    std.startsWith('ISO_') || std.startsWith('PAS_') || std.startsWith('EU_')
  );
  
  if (hasChinaStandards && hasInternationalStandards) {
    warnings.push('同时选择了中国标准和国际标准，建议确认适用的地理范围');
  }

  return {
    isValid: detectedStandards.length > 0,
    detectedStandards: detectedStandards.map(std => getStandardDisplayName(std)),
    warnings,
  };
}

/**
 * 获取推荐的标准组合
 */
export function getRecommendedStandardCombinations(sceneInfo: SceneInfoType): {
  combination: string;
  standards: string[];
  description: string;
}[] {
  const recommendations = [];
  
  // 基于产品类型推荐
  if (sceneInfo.productName?.includes('电池') || sceneInfo.productName?.includes('锂电')) {
    recommendations.push({
      combination: '电池产品',
      standards: ['EU 2023/1542', 'ISO 14067'],
      description: '适用于电池类产品的欧盟法规和产品碳足迹标准',
    });
  }
  
  // 基于功能单位推荐
  if (sceneInfo.functionalUnit?.includes('台') || sceneInfo.functionalUnit?.includes('个')) {
    recommendations.push({
      combination: '产品级碳足迹',
      standards: ['ISO 14067', 'PAS 2050'],
      description: '适用于单个产品碳足迹核算的国际标准',
    });
  }
  
  // 基于报告类型推荐
  if (sceneInfo.reportType === 'ghg_protocol') {
    recommendations.push({
      combination: 'GHG Protocol标准',
      standards: ['GHG Protocol', 'ISO 14064'],
      description: '适用于企业级温室气体核算和报告',
    });
  }
  
  // 默认推荐
  if (recommendations.length === 0) {
    recommendations.push({
      combination: '通用碳足迹',
      standards: ['ISO 14067'],
      description: '产品碳足迹核算的基础国际标准',
    });
  }
  
  return recommendations;
}

/**
 * 生成场景信息摘要（用于报告）
 */
export function generateSceneInfoSummary(sceneInfo: SceneInfoType): string {
  const parts: string[] = [];
  
  if (sceneInfo.taskName) {
    parts.push(`任务：${sceneInfo.taskName}`);
  }
  
  if (sceneInfo.productName) {
    parts.push(`产品：${sceneInfo.productName}`);
  }
  
  if (sceneInfo.functionalUnit) {
    parts.push(`功能单位：${sceneInfo.functionalUnit}`);
  }
  
  if (sceneInfo.standard) {
    parts.push(`核算标准：${sceneInfo.standard}`);
  }
  
  if (sceneInfo.lifecycleType) {
    const lifecycleTypeNames = {
      half: '摇篮到大门',
      full: '摇篮到坟墓',
      custom: '自定义阶段',
    };
    parts.push(`生命周期类型：${lifecycleTypeNames[sceneInfo.lifecycleType] || sceneInfo.lifecycleType}`);
  }
  
  if (sceneInfo.dataCollectionStartDate && sceneInfo.dataCollectionEndDate) {
    parts.push(`数据收集期间：${sceneInfo.dataCollectionStartDate} 至 ${sceneInfo.dataCollectionEndDate}`);
  }
  
  return parts.join('；');
} 