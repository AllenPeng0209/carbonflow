/**
 * AI风险评测服务
 * 专业的碳数据风险评估算法和建议生成系统
 */

import type { NodeData } from '~/types/nodes';

// 风险评估配置
export interface RiskAssessmentConfig {
  weights: {
    dataQuality: number;
    compliance: number;
    supplyChain: number;
    methodology: number;
    temporal: number;
    geographic: number;
  };
  thresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  industryStandards: {
    euTaxonomy: boolean;
    iso14067: boolean;
    ghgProtocol: boolean;
    cbam: boolean; // 碳边境调节机制
  };
}

// 默认配置
const DEFAULT_CONFIG: RiskAssessmentConfig = {
  weights: {
    dataQuality: 0.3,
    compliance: 0.25,
    supplyChain: 0.2,
    methodology: 0.15,
    temporal: 0.05,
    geographic: 0.05,
  },
  thresholds: {
    critical: 40,
    high: 60,
    medium: 75,
    low: 85,
  },
  industryStandards: {
    euTaxonomy: true,
    iso14067: true,
    ghgProtocol: true,
    cbam: true,
  },
};

// 风险因子权重（基于碳管理最佳实践）
const RISK_FACTOR_WEIGHTS = {
  // 数据质量维度
  dataCompleteness: 0.4,
  dataAccuracy: 0.3,
  dataConsistency: 0.2,
  dataTimeliness: 0.1,

  // 合规性维度
  regulatoryCompliance: 0.5,
  standardCompliance: 0.3,
  certificationStatus: 0.2,

  // 供应链维度
  supplierTier: 0.3,
  supplierCredibility: 0.25,
  dataTraceability: 0.25,
  verificationLevel: 0.2,

  // 方法学维度
  calculationMethod: 0.4,
  emissionFactorQuality: 0.35,
  allocationMethod: 0.25,
};

// 行业基准数据
const INDUSTRY_BENCHMARKS = {
  manufacturing: {
    averageDataQuality: 72,
    complianceRate: 85,
    supplierRiskThreshold: 65,
  },
  energy: {
    averageDataQuality: 78,
    complianceRate: 90,
    supplierRiskThreshold: 70,
  },
  transportation: {
    averageDataQuality: 68,
    complianceRate: 80,
    supplierRiskThreshold: 60,
  },
  default: {
    averageDataQuality: 70,
    complianceRate: 82,
    supplierRiskThreshold: 65,
  },
};

export class AIRiskAssessmentService {
  private config: RiskAssessmentConfig;

  constructor(config?: Partial<RiskAssessmentConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行综合风险评估
   */
  async performComprehensiveAssessment(nodes: NodeData[], workflowId: string, industryType?: string) {
    const startTime = Date.now();

    try {
      // 1. 预处理和数据验证
      const validatedNodes = this.validateAndPreprocessNodes(nodes);

      // 2. 计算各维度风险
      const dimensionRisks = await this.calculateDimensionRisks(validatedNodes, industryType);

      // 3. 节点级风险评估
      const nodeRisks = await this.assessNodeRisks(validatedNodes);

      // 4. 识别关键风险问题
      const criticalIssues = this.identifyCriticalIssues(validatedNodes, nodeRisks);

      // 5. 生成智能建议
      const recommendations = await this.generateIntelligentRecommendations(
        validatedNodes,
        nodeRisks,
        dimensionRisks,
        industryType,
      );

      // 6. 计算综合风险评分
      const overallRiskScore = this.calculateOverallRiskScore(dimensionRisks);

      // 7. 生成风险趋势预测
      const riskTrends = this.predictRiskTrends(nodeRisks, dimensionRisks);

      const processingTime = Date.now() - startTime;

      return {
        overallRiskScore,
        riskLevel: this.getRiskLevel(overallRiskScore),
        dimensions: dimensionRisks,
        criticalIssues,
        recommendations,
        nodeRisks,
        riskTrends,
        metadata: {
          assessmentDate: new Date().toISOString(),
          processingTime,
          nodeCount: validatedNodes.length,
          industryType: industryType || 'default',
          configVersion: '1.0',
        },
      };
    } catch (error) {
      console.error('风险评估失败:', error);
      throw new Error(`风险评估执行失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 数据验证和预处理
   */
  private validateAndPreprocessNodes(nodes: NodeData[]): NodeData[] {
    return nodes.filter((node) => {
      // 基本数据完整性检查
      if (!node.id || !node.label) {
        return false;
      }

      // 排除测试或临时节点
      if (node.label.includes('test') || node.label.includes('临时')) {
        return false;
      }

      return true;
    });
  }

  /**
   * 计算各维度风险
   */
  private async calculateDimensionRisks(nodes: NodeData[], industryType?: string) {
    const benchmark =
      INDUSTRY_BENCHMARKS[industryType as keyof typeof INDUSTRY_BENCHMARKS] || INDUSTRY_BENCHMARKS.default;

    return {
      dataQuality: await this.assessDataQualityRisk(nodes, benchmark),
      compliance: await this.assessComplianceRisk(nodes),
      supplyChain: await this.assessSupplyChainRisk(nodes, benchmark),
      methodology: await this.assessMethodologyRisk(nodes),
      temporal: await this.assessTemporalRisk(nodes),
      geographic: await this.assessGeographicRisk(nodes),
    };
  }

  /**
   * 数据质量风险评估
   */
  private async assessDataQualityRisk(nodes: NodeData[], benchmark: any) {
    const scores = nodes.map((node) => {
      let score = 100;

      // 完整性检查
      if (!node.carbonFactor || node.carbonFactor === '0') {
        score -= 25;
      }

      if (!node.quantity || node.quantity === '0') {
        score -= 20;
      }

      if (!node.activityUnit) {
        score -= 15;
      }

      if (!node.carbonFactorName) {
        score -= 10;
      }

      if (!node.emissionFactorGeographicalRepresentativeness) {
        score -= 10;
      }

      if (!node.emissionFactorTemporalRepresentativeness) {
        score -= 10;
      }

      if (!node.supplementaryInfo) {
        score -= 5;
      }

      if (!node.carbonFactordataSource) {
        score -= 5;
      }

      // 数据来源质量
      if (node.activitydataSource === 'AI生成') {
        score -= 10;
      }

      if (node.activitydataSource === '估算') {
        score -= 15;
      }

      // 验证状态
      if (node.verificationStatus === '已验证') {
        score += 10;
      } else if (node.verificationStatus === '验证失败') {
        score -= 20;
      }

      return Math.max(0, score);
    });

    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const issues = [];
    const recommendations = [];

    if (avgScore < benchmark.averageDataQuality) {
      issues.push(`数据质量低于行业平均水平(${benchmark.averageDataQuality}分)`);
      recommendations.push('建立数据质量管理体系');
    }

    const incompleteNodes = scores.filter((s) => s < 70).length;

    if (incompleteNodes > 0) {
      issues.push(`${incompleteNodes}个节点数据不完整`);
      recommendations.push('完善缺失的关键数据字段');
    }

    return {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      issues,
      recommendations,
      details: {
        averageCompleteness: avgScore,
        incompleteNodeCount: incompleteNodes,
        benchmarkComparison: avgScore - benchmark.averageDataQuality,
      },
    };
  }

  /**
   * 合规性风险评估
   */
  private async assessComplianceRisk(nodes: NodeData[]) {
    const complianceChecks = nodes.map((node) => {
      let score = 50; // 基础分

      // EU合规性
      if (node.euCompliantFactor) {
        score += 30;
      } else {
        score -= 20;
      }

      // 验证状态
      if (node.verificationStatus === '已验证') {
        score += 15;
      } else if (node.verificationStatus === '验证失败') {
        score -= 25;
      }

      // 数据源权威性
      if (node.carbonFactordataSource?.includes('官方') || node.carbonFactordataSource?.includes('政府')) {
        score += 20;
      } else if (node.carbonFactordataSource?.includes('行业协会')) {
        score += 10;
      }

      // 标准符合性
      if (node.carbonFactorName?.includes('ISO') || node.carbonFactorName?.includes('GHG')) {
        score += 10;
      }

      return Math.min(100, Math.max(0, score));
    });

    const avgScore = complianceChecks.reduce((sum, score) => sum + score, 0) / complianceChecks.length;
    const nonCompliantCount = complianceChecks.filter((s) => s < 60).length;

    const issues = [];
    const recommendations = [];

    if (nonCompliantCount > 0) {
      issues.push(`${nonCompliantCount}个节点存在合规风险`);
      recommendations.push('更新为符合最新法规要求的排放因子');
    }

    const euNonCompliantCount = nodes.filter((n) => !n.euCompliantFactor).length;

    if (euNonCompliantCount > 0) {
      issues.push(`${euNonCompliantCount}个节点不符合EU标准`);
      recommendations.push('准备CBAM合规性文件');
    }

    return {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      issues,
      recommendations,
      details: {
        euComplianceRate: ((nodes.length - euNonCompliantCount) / nodes.length) * 100,
        nonCompliantNodeCount: nonCompliantCount,
        verificationRate: (nodes.filter((n) => n.verificationStatus === '已验证').length / nodes.length) * 100,
      },
    };
  }

  /**
   * 供应链风险评估
   */
  private async assessSupplyChainRisk(nodes: NodeData[], benchmark: any) {
    const supplyChainScores = nodes.map((node) => {
      if (!node.supplierInfo) {
        return 60;
      } // 默认中等风险

      let score = 70;

      // 供应商层级风险
      if (node.supplierInfo.isDirectSupplier) {
        score += 20;
      } else {
        const tier = node.supplierInfo.tier || 1;

        if (tier === 1) {
          score += 15;
        } else if (tier === 2) {
          score += 5;
        } else if (tier === 3) {
          score -= 10;
        } else {
          score -= 20;
        } // 深层供应商高风险
      }

      // 数据可追溯性
      if (node.hasEvidenceFiles) {
        score += 10;
      }

      if (node.evidenceVerificationStatus === '已验证') {
        score += 15;
      }

      // 地理风险
      const geographic = node.emissionFactorGeographicalRepresentativeness;

      if (geographic?.includes('中国')) {
        score += 10;
      } else if (geographic?.includes('发展中国家')) {
        score -= 10;
      }

      return Math.min(100, Math.max(0, score));
    });

    const avgScore = supplyChainScores.reduce((sum, score) => sum + score, 0) / supplyChainScores.length;
    const highRiskSuppliers = supplyChainScores.filter((s) => s < benchmark.supplierRiskThreshold).length;

    const issues = [];
    const recommendations = [];

    if (highRiskSuppliers > 0) {
      issues.push(`${highRiskSuppliers}个高风险供应商节点`);
      recommendations.push('建立供应商ESG评估体系');
    }

    const deepTierCount = nodes.filter((n) => n.supplierInfo && n.supplierInfo.tier && n.supplierInfo.tier > 2).length;

    if (deepTierCount > 0) {
      issues.push(`${deepTierCount}个深层供应商数据`);
      recommendations.push('加强深层供应链数据验证');
    }

    return {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      issues,
      recommendations,
      details: {
        directSupplierRatio: (nodes.filter((n) => n.supplierInfo?.isDirectSupplier).length / nodes.length) * 100,
        averageSupplierTier: nodes.reduce((sum, n) => sum + (n.supplierInfo?.tier || 1), 0) / nodes.length,
        highRiskSupplierCount: highRiskSuppliers,
      },
    };
  }

  /**
   * 方法学风险评估
   */
  private async assessMethodologyRisk(nodes: NodeData[]) {
    const methodologyScores = nodes.map((node) => {
      let score = 60; // 基础分

      // 排放因子质量
      if (node.carbonFactordataSource?.includes('IPCC')) {
        score += 20;
      } else if (node.carbonFactordataSource?.includes('国家')) {
        score += 15;
      } else if (node.carbonFactordataSource?.includes('行业')) {
        score += 10;
      }

      // 计算方法透明度
      if (node.supplementaryInfo && node.supplementaryInfo.length > 50) {
        score += 10;
      }

      // 不确定性信息
      if (node.dataRisk && node.dataRisk !== '无') {
        score += 5;
      }

      // 活动数据质量
      if (node.activityScore && node.activityScore > 4) {
        score += 15;
      } else if (node.activityScore && node.activityScore < 3) {
        score -= 10;
      }

      return Math.min(100, Math.max(0, score));
    });

    const avgScore = methodologyScores.reduce((sum, score) => sum + score, 0) / methodologyScores.length;

    return {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      issues: avgScore < 70 ? ['方法学透明度不足'] : [],
      recommendations: avgScore < 70 ? ['完善计算方法文档', '提供不确定性分析'] : [],
      details: {
        averageMethodologyScore: avgScore,
        transparencyLevel: avgScore > 80 ? 'high' : avgScore > 60 ? 'medium' : 'low',
      },
    };
  }

  /**
   * 时间相关性风险评估
   */
  private async assessTemporalRisk(nodes: NodeData[]) {
    const currentYear = new Date().getFullYear();

    const temporalScores = nodes.map((node) => {
      const temporal = node.emissionFactorTemporalRepresentativeness;

      if (!temporal) {
        return 30;
      }

      // 提取年份信息
      const yearMatch = temporal.match(/(\d{4})/);

      if (!yearMatch) {
        return 40;
      }

      const factorYear = parseInt(yearMatch[1]);
      const yearDiff = currentYear - factorYear;

      if (yearDiff <= 1) {
        return 95;
      }

      if (yearDiff <= 2) {
        return 85;
      }

      if (yearDiff <= 3) {
        return 75;
      }

      if (yearDiff <= 5) {
        return 60;
      }

      return 40;
    });

    const avgScore = temporalScores.reduce((sum, score) => sum + score, 0) / temporalScores.length;
    const outdatedCount = temporalScores.filter((s) => s < 60).length;

    return {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      issues: outdatedCount > 0 ? [`${outdatedCount}个节点使用过时排放因子`] : [],
      recommendations: outdatedCount > 0 ? ['更新为最新年份排放因子'] : [],
      details: {
        averageDataAge: avgScore,
        outdatedFactorCount: outdatedCount,
      },
    };
  }

  /**
   * 地理相关性风险评估
   */
  private async assessGeographicRisk(nodes: NodeData[]) {
    const geographicScores = nodes.map((node) => {
      const geographic = node.emissionFactorGeographicalRepresentativeness;

      if (!geographic) {
        return 40;
      }

      // 地理匹配度评分
      if (geographic.includes('中国') || geographic.includes('CN')) {
        return 90;
      }

      if (geographic.includes('亚洲') || geographic.includes('Asia')) {
        return 75;
      }

      if (geographic.includes('全球') || geographic.includes('Global')) {
        return 65;
      }

      if (geographic.includes('欧洲') || geographic.includes('Europe')) {
        return 60;
      }

      return 50;
    });

    const avgScore = geographicScores.reduce((sum, score) => sum + score, 0) / geographicScores.length;
    const lowRelevanceCount = geographicScores.filter((s) => s < 60).length;

    return {
      score: avgScore,
      level: this.getRiskLevel(avgScore),
      issues: lowRelevanceCount > 0 ? [`${lowRelevanceCount}个节点地理代表性不足`] : [],
      recommendations: lowRelevanceCount > 0 ? ['使用本地化排放因子'] : [],
      details: {
        averageGeographicRelevance: avgScore,
        lowRelevanceCount,
      },
    };
  }

  /**
   * 节点级风险评估
   */
  private async assessNodeRisks(nodes: NodeData[]) {
    return nodes.map((node) => {
      const riskFactors = {
        dataCompleteness: this.calculateDataCompleteness(node),
        factorReliability: this.calculateFactorReliability(node),
        temporalRelevance: this.calculateTemporalRelevance(node),
        geographicRelevance: this.calculateGeographicRelevance(node),
        supplierCredibility: this.calculateSupplierCredibility(node),
      };

      const overallRisk = Object.entries(riskFactors).reduce((sum, [key, score]) => {
        const weight = this.config.weights[key as keyof typeof this.config.weights] || 0.2;
        return sum + score * weight;
      }, 0);

      const criticalFlags = this.identifyNodeCriticalFlags(node, riskFactors);

      return {
        nodeId: node.id,
        nodeId: node.label,
        overallRisk,
        riskFactors,
        criticalFlags,
        riskLevel: this.getRiskLevel(overallRisk),
        recommendations: this.generateNodeRecommendations(node, riskFactors),
      };
    });
  }

  /**
   * 识别节点关键风险标志
   */
  private identifyNodeCriticalFlags(node: NodeData, riskFactors: any): string[] {
    const flags = [];

    if (riskFactors.dataCompleteness < 60) {
      flags.push('数据不完整');
    }

    if (riskFactors.factorReliability < 50) {
      flags.push('排放因子可靠性低');
    }

    if (riskFactors.temporalRelevance < 40) {
      flags.push('时间相关性差');
    }

    if (!node.euCompliantFactor) {
      flags.push('非EU合规');
    }

    if (node.supplierInfo?.tier && node.supplierInfo.tier > 3) {
      flags.push('深层供应商风险');
    }

    if (node.verificationStatus === '验证失败') {
      flags.push('验证失败');
    }

    if (!node.hasEvidenceFiles) {
      flags.push('缺少证据文件');
    }

    return flags;
  }

  /**
   * 生成节点级建议
   */
  private generateNodeRecommendations(node: NodeData, riskFactors: any): string[] {
    const recommendations = [];

    if (riskFactors.dataCompleteness < 70) {
      recommendations.push('完善活动数据和排放因子信息');
    }

    if (riskFactors.factorReliability < 60) {
      recommendations.push('选择更权威的排放因子数据源');
    }

    if (!node.euCompliantFactor) {
      recommendations.push('更换为EU合规排放因子');
    }

    if (!node.hasEvidenceFiles) {
      recommendations.push('上传相关证据文件');
    }

    if (node.verificationStatus !== '已验证') {
      recommendations.push('进行第三方验证');
    }

    return recommendations;
  }

  /**
   * 识别关键风险问题
   */
  private identifyCriticalIssues(nodes: NodeData[], nodeRisks: any[]) {
    const issues = [];

    // 高风险节点
    const highRiskNodes = nodeRisks.filter((node) => node.overallRisk < this.config.thresholds.high);

    if (highRiskNodes.length > 0) {
      issues.push({
        id: 'high-risk-nodes',
        severity: 'HIGH' as const,
        category: '数据质量',
        description: `发现${highRiskNodes.length}个高风险节点`,
        affectedNodes: highRiskNodes.map((n) => n.nodeId),
        impact: '可能导致碳足迹计算结果不准确，影响决策可靠性',
        recommendation: '优先处理这些节点的数据质量问题',
        urgency: 'immediate',
        estimatedImpact: 'high',
      });
    }

    // 合规性问题
    const nonCompliantNodes = nodes.filter((node) => !node.euCompliantFactor);

    if (nonCompliantNodes.length > 0) {
      issues.push({
        id: 'compliance-issues',
        severity: 'MEDIUM' as const,
        category: '合规性',
        description: `${nonCompliantNodes.length}个节点存在合规风险`,
        affectedNodes: nonCompliantNodes.map((n) => n.label),
        impact: '可能不符合欧盟CBAM要求，影响产品出口',
        recommendation: '更新为EU合规的排放因子',
        urgency: 'high',
        estimatedImpact: 'medium',
      });
    }

    // 供应链风险
    const deepTierNodes = nodes.filter((n) => n.supplierInfo && n.supplierInfo.tier && n.supplierInfo.tier > 2);

    if (deepTierNodes.length > 0) {
      issues.push({
        id: 'supply-chain-risk',
        severity: 'MEDIUM' as const,
        category: '供应链',
        description: `${deepTierNodes.length}个深层供应商节点存在风险`,
        affectedNodes: deepTierNodes.map((n) => n.label),
        impact: '深层供应链数据可信度低，增加整体不确定性',
        recommendation: '建立供应商数据验证机制',
        urgency: 'medium',
        estimatedImpact: 'medium',
      });
    }

    return issues;
  }

  /**
   * 生成智能建议
   */
  private async generateIntelligentRecommendations(
    nodes: NodeData[],
    nodeRisks: any[],
    dimensionRisks: any,
    industryType?: string,
  ) {
    const recommendations = [];

    // 基于整体风险水平的建议
    const avgRisk = nodeRisks.reduce((sum, node) => sum + node.overallRisk, 0) / nodeRisks.length;

    if (avgRisk < this.config.thresholds.medium) {
      recommendations.push({
        priority: 'HIGH' as const,
        category: '数据质量提升',
        action: '实施全面的数据质量改进计划',
        expectedImpact: '提升整体风险评分至80分以上',
        timeframe: '1-2个月',
        resources: ['数据管理专员', '质量控制系统'],
        cost: 'medium',
        roi: 'high',
      });
    }

    // 合规性建议
    if (dimensionRisks.compliance.score < this.config.thresholds.medium) {
      recommendations.push({
        priority: 'HIGH' as const,
        category: '合规性提升',
        action: '建立CBAM合规管理体系',
        expectedImpact: '确保产品符合欧盟碳边境调节机制要求',
        timeframe: '2-3个月',
        resources: ['合规专家', '法务支持'],
        cost: 'high',
        roi: 'very_high',
      });
    }

    // 自动化建议
    recommendations.push({
      priority: 'MEDIUM' as const,
      category: '自动化监控',
      action: '建立AI驱动的持续风险监控机制',
      expectedImpact: '实时识别和预警风险变化',
      timeframe: '2-3个月',
      resources: ['AI开发团队', '监控系统'],
      cost: 'medium',
      roi: 'high',
    });

    // 供应链建议
    if (dimensionRisks.supplyChain.score < this.config.thresholds.medium) {
      recommendations.push({
        priority: 'MEDIUM' as const,
        category: '供应链管理',
        action: '建立供应商ESG评估和数据验证体系',
        expectedImpact: '提升供应链数据可信度和透明度',
        timeframe: '3-6个月',
        resources: ['供应链管理团队', 'ESG专家'],
        cost: 'high',
        roi: 'medium',
      });
    }

    return recommendations;
  }

  /**
   * 预测风险趋势
   */
  private predictRiskTrends(nodeRisks: any[], dimensionRisks: any) {
    // 基于当前数据预测未来风险趋势
    const currentRisk = nodeRisks.reduce((sum, node) => sum + node.overallRisk, 0) / nodeRisks.length;

    return {
      currentRisk,
      projectedRisk: {
        oneMonth: currentRisk - 2, // 假设有改进措施
        threeMonths: currentRisk - 8,
        sixMonths: currentRisk - 15,
      },
      trendFactors: ['数据质量持续改进', '合规性要求日趋严格', '供应链透明度提升'],
      riskDrivers: Object.entries(dimensionRisks)
        .sort(([, a], [, b]) => a.score - b.score)
        .slice(0, 3)
        .map(([key]) => key),
    };
  }

  /**
   * 计算综合风险评分
   */
  private calculateOverallRiskScore(dimensionRisks: any): number {
    return Object.entries(this.config.weights).reduce((sum, [dimension, weight]) => {
      const riskData = dimensionRisks[dimension];
      return sum + (riskData ? riskData.score * weight : 0);
    }, 0);
  }

  /**
   * 获取风险等级
   */
  private getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= this.config.thresholds.low) {
      return 'LOW';
    }

    if (score >= this.config.thresholds.medium) {
      return 'MEDIUM';
    }

    if (score >= this.config.thresholds.high) {
      return 'HIGH';
    }

    return 'CRITICAL';
  }

  // 辅助计算方法
  private calculateDataCompleteness(node: NodeData): number {
    let score = 100;

    if (!node.carbonFactor || node.carbonFactor === '0') {
      score -= 30;
    }

    if (!node.quantity || node.quantity === '0') {
      score -= 20;
    }

    if (!node.activityUnit) {
      score -= 15;
    }

    if (!node.carbonFactorName) {
      score -= 15;
    }

    if (!node.emissionFactorGeographicalRepresentativeness) {
      score -= 10;
    }

    if (!node.emissionFactorTemporalRepresentativeness) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  private calculateFactorReliability(node: NodeData): number {
    let score = 50;

    if (node.carbonFactordataSource?.includes('官方') || node.carbonFactordataSource?.includes('政府')) {
      score += 30;
    } else if (node.carbonFactordataSource?.includes('行业协会')) {
      score += 20;
    } else if (node.carbonFactordataSource?.includes('第三方')) {
      score += 10;
    }

    if (node.activitydataSource === '手动填写') {
      score += 10;
    } else if (node.activitydataSource === '文件解析') {
      score += 5;
    }

    if (node.verificationStatus === '已验证') {
      score += 10;
    }

    return Math.min(100, score);
  }

  private calculateTemporalRelevance(node: NodeData): number {
    const temporal = node.emissionFactorTemporalRepresentativeness;

    if (!temporal) {
      return 30;
    }

    if (temporal.includes('2024') || temporal.includes('2023')) {
      return 90;
    }

    if (temporal.includes('2022') || temporal.includes('2021')) {
      return 75;
    }

    if (temporal.includes('2020') || temporal.includes('2019')) {
      return 60;
    }

    return 40;
  }

  private calculateGeographicRelevance(node: NodeData): number {
    const geographic = node.emissionFactorGeographicalRepresentativeness;

    if (!geographic) {
      return 40;
    }

    if (geographic.includes('中国') || geographic.includes('CN')) {
      return 90;
    }

    if (geographic.includes('亚洲') || geographic.includes('Asia')) {
      return 70;
    }

    if (geographic.includes('全球') || geographic.includes('Global')) {
      return 60;
    }

    return 50;
  }

  private calculateSupplierCredibility(node: NodeData): number {
    if (!node.supplierInfo) {
      return 60;
    }

    let score = 70;

    if (node.supplierInfo.isDirectSupplier) {
      score += 20;
    }

    if (node.supplierInfo.tier === 1) {
      score += 10;
    } else if (node.supplierInfo.tier === 2) {
      score += 5;
    } else if (node.supplierInfo.tier && node.supplierInfo.tier > 3) {
      score -= 20;
    }

    return Math.min(100, score);
  }
}
