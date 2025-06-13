/**
 * LCA服务接口实现
 * 提供面向应用的高级LCA计算服务
 */

import { LCACalculationEngine } from './LCACalculationEngine';
import { LCAConfigFactory } from './LCAConfigFactory';

import type {
  LCAResult,
  LCACalculationContext,
  LCACalculationConfig,
  LCACalculationSession,
  LCAComparison,
} from './types';

import type { NodeData } from '~/types/nodes';
import type { Flow } from '~/types/flows';
import type { Node, Edge } from 'reactflow';

/**
 * LCA服务主类
 */
export class LCAService {
  private engine: LCACalculationEngine;
  private configs: Map<string, LCACalculationConfig> = new Map();

  constructor() {
    this.engine = new LCACalculationEngine();
    this.initializeDefaultConfigs();
  }

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigs(): void {
    this.configs.set('basic', LCAConfigFactory.getBasicConfig());
    this.configs.set('professional', LCAConfigFactory.getProfessionalConfig());
    this.configs.set('research', LCAConfigFactory.getResearchConfig());
    this.configs.set('carbon_footprint', LCAConfigFactory.getCarbonFootprintConfig());
  }

  /**
   * 快速LCA计算（使用基础配置）
   */
  async quickAssessment(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
  ): Promise<LCAResult> {
    const context = this.buildCalculationContext(nodes, edges, flows, functionalUnit, 'basic');

    const session = await this.engine.startCalculation(context);

    return this.waitForCompletion(session);
  }

  /**
   * 专业LCA计算（符合ISO标准）
   */
  async professionalAssessment(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
    customConfig?: Partial<LCACalculationConfig>,
  ): Promise<LCAResult> {
    let config = this.configs.get('professional')!;

    if (customConfig) {
      config = this.mergeConfigs(config, customConfig);
    }

    const context = this.buildCalculationContext(nodes, edges, flows, functionalUnit, config);

    const session = await this.engine.startCalculation(context);

    return this.waitForCompletion(session);
  }

  /**
   * 产品对比LCA计算
   */
  async compareProducts(
    baselineProduct: {
      nodes: Node<NodeData>[];
      edges: Edge[];
      flows: Record<string, Flow>;
      functionalUnit: { value: number; unit: string; description: string };
    },
    alternativeProducts: Array<{
      id: string;
      name: string;
      nodes: Node<NodeData>[];
      edges: Edge[];
      flows: Record<string, Flow>;
      functionalUnit: { value: number; unit: string; description: string };
    }>,
    configType: 'basic' | 'professional' | 'research' = 'professional',
  ): Promise<LCAComparison> {
    // 计算基准产品
    const baselineResult = await this.calculateProduct(
      baselineProduct.nodes,
      baselineProduct.edges,
      baselineProduct.flows,
      baselineProduct.functionalUnit,
      configType,
    );

    // 计算对比产品
    const alternativeResults = [];

    for (const product of alternativeProducts) {
      const result = await this.calculateProduct(
        product.nodes,
        product.edges,
        product.flows,
        product.functionalUnit,
        configType,
      );

      // 计算改善百分比
      const improvements = this.calculateImprovements(baselineResult, result);

      alternativeResults.push({
        id: product.id,
        name: product.name,
        result,
        improvements,
      });
    }

    // 确定最优方案
    const comparisonMetrics = this.analyzeComparison(baselineResult, alternativeResults);

    return {
      baselineResult,
      alternativeResults,
      comparisonMetrics,
    };
  }

  /**
   * 碳足迹专项计算
   */
  async calculateCarbonFootprint(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
  ): Promise<{
    totalCarbonFootprint: number;
    unit: string;
    breakdown: {
      byLifecycleStage: Record<string, number>;
      byProcess: Record<string, number>;
      byMaterial: Record<string, number>;
    };
    recommendations: string[];
  }> {
    const config = this.configs.get('carbon_footprint')!;
    const context = this.buildCalculationContext(nodes, edges, flows, functionalUnit, config);

    const session = await this.engine.startCalculation(context);
    const result = await this.waitForCompletion(session);

    // 提取碳足迹相关数据
    const carbonFootprint = result.impactResults.globalWarmingPotential;
    const breakdown = {
      byLifecycleStage: this.extractCarbonByStage(result),
      byProcess: this.extractCarbonByProcess(result),
      byMaterial: this.extractCarbonByMaterial(result),
    };

    const recommendations = this.generateCarbonRecommendations(result);

    return {
      totalCarbonFootprint: carbonFootprint.value,
      unit: carbonFootprint.unit,
      breakdown,
      recommendations,
    };
  }

  /**
   * 批量产品LCA计算
   */
  async batchCalculation(
    products: Array<{
      id: string;
      name: string;
      nodes: Node<NodeData>[];
      edges: Edge[];
      flows: Record<string, Flow>;
      functionalUnit: { value: number; unit: string; description: string };
    }>,
    configType: 'basic' | 'professional' | 'research' = 'basic',
  ): Promise<
    Array<{
      productId: string;
      productName: string;
      result: LCAResult;
      status: 'completed' | 'failed';
      error?: string;
    }>
  > {
    const results = [];

    for (const product of products) {
      try {
        const result = await this.calculateProduct(
          product.nodes,
          product.edges,
          product.flows,
          product.functionalUnit,
          configType,
        );

        results.push({
          productId: product.id,
          productName: product.name,
          result,
          status: 'completed' as const,
        });
      } catch (error) {
        results.push({
          productId: product.id,
          productName: product.name,
          result: {} as LCAResult,
          status: 'failed' as const,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return results;
  }

  /**
   * 获取LCA热点分析
   */
  async getHotspotAnalysis(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
  ): Promise<{
    carbonHotspots: Array<{
      nodeId: string;
      contribution: number;
      percentage: number;
      recommendations: string[];
    }>;
    materialHotspots: Array<{
      material: string;
      contribution: number;
      percentage: number;
      alternatives: string[];
    }>;
    energyHotspots: Array<{
      energyType: string;
      contribution: number;
      percentage: number;
      improvements: string[];
    }>;
  }> {
    const result = await this.professionalAssessment(nodes, edges, flows, functionalUnit);

    // 分析碳热点
    const carbonHotspots = this.identifyCarbonHotspots(nodes, result);
    const materialHotspots = this.identifyMaterialHotspots(result);
    const energyHotspots = this.identifyEnergyHotspots(result);

    return {
      carbonHotspots,
      materialHotspots,
      energyHotspots,
    };
  }

  /**
   * 获取数据质量报告
   */
  async getDataQualityReport(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
  ): Promise<{
    overallScore: number;
    detailedScores: {
      reliability: { score: number; description: string; suggestions: string[] };
      completeness: { score: number; description: string; suggestions: string[] };
      temporal: { score: number; description: string; suggestions: string[] };
      geographical: { score: number; description: string; suggestions: string[] };
      technological: { score: number; description: string; suggestions: string[] };
    };
    improvementPlan: Array<{
      priority: 'high' | 'medium' | 'low';
      action: string;
      expectedImprovement: string;
      effort: string;
    }>;
  }> {
    const result = await this.professionalAssessment(nodes, edges, flows, functionalUnit);
    const dataQuality = result.dataQuality;

    const improvementPlan = this.generateImprovementPlan(dataQuality);

    return {
      overallScore: dataQuality.overallScore,
      detailedScores: {
        reliability: {
          score: dataQuality.reliability.score,
          description: dataQuality.reliability.description,
          suggestions: dataQuality.reliability.improvementSuggestions,
        },
        completeness: {
          score: dataQuality.completeness.score,
          description: dataQuality.completeness.description,
          suggestions: dataQuality.completeness.improvementSuggestions,
        },
        temporal: {
          score: dataQuality.temporalCorrelation.score,
          description: dataQuality.temporalCorrelation.description,
          suggestions: dataQuality.temporalCorrelation.improvementSuggestions,
        },
        geographical: {
          score: dataQuality.geographicalCorrelation.score,
          description: dataQuality.geographicalCorrelation.description,
          suggestions: dataQuality.geographicalCorrelation.improvementSuggestions,
        },
        technological: {
          score: dataQuality.technologyCorrelation.score,
          description: dataQuality.technologyCorrelation.description,
          suggestions: dataQuality.technologyCorrelation.improvementSuggestions,
        },
      },
      improvementPlan,
    };
  }

  /**
   * 创建自定义配置
   */
  createCustomConfig(
    baseConfig: 'basic' | 'professional' | 'research',
    customizations: Partial<LCACalculationConfig>,
  ): string {
    const base = this.configs.get(baseConfig)!;
    const customConfig = this.mergeConfigs(base, customizations);

    const configId = `custom-${Date.now()}`;
    this.configs.set(configId, customConfig);

    return configId;
  }

  /**
   * 验证输入数据
   */
  validateInputData(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 验证节点数据
    if (nodes.length === 0) {
      errors.push('至少需要一个过程节点');
    }

    // 验证主要产品
    const mainProducts = nodes.filter((node) => node.data.isMainProduct);

    if (mainProducts.length === 0) {
      errors.push('必须标识一个主要产品');
    } else if (mainProducts.length > 1) {
      errors.push('只能有一个主要产品');
    }

    // 验证功能单位
    if (!functionalUnit.value || functionalUnit.value <= 0) {
      errors.push('功能单位数值必须大于0');
    }

    if (!functionalUnit.unit || functionalUnit.unit.trim() === '') {
      errors.push('功能单位必须指定单位');
    }

    // 验证数据完整性
    const incompleteNodes = nodes.filter(
      (node) => !node.data.carbonFactor || !node.data.quantity || !node.data.activitydataSource,
    );

    if (incompleteNodes.length > 0) {
      warnings.push(`${incompleteNodes.length} 个节点缺少完整的数据`);
      suggestions.push('完善节点的碳排放因子、活动数据和数据来源信息');
    }

    // 验证连接性
    const connectedNodes = new Set<string>();
    edges.forEach((edge) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const isolatedNodes = nodes.filter((node) => !connectedNodes.has(node.id));

    if (isolatedNodes.length > 0) {
      warnings.push(`发现 ${isolatedNodes.length} 个孤立节点`);
      suggestions.push('确保所有过程节点都正确连接到系统中');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
    };
  }

  /**
   * 私有辅助方法
   */
  private async calculateProduct(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
    configType: string | LCACalculationConfig,
  ): Promise<LCAResult> {
    const context = this.buildCalculationContext(nodes, edges, flows, functionalUnit, configType);
    const session = await this.engine.startCalculation(context);

    return this.waitForCompletion(session);
  }

  private buildCalculationContext(
    nodes: Node<NodeData>[],
    edges: Edge[],
    flows: Record<string, Flow>,
    functionalUnit: { value: number; unit: string; description: string },
    configOrType: string | LCACalculationConfig,
  ): LCACalculationContext {
    const config = typeof configOrType === 'string' ? this.configs.get(configOrType)! : configOrType;

    // 确定基准流
    const mainProduct = nodes.find((node) => node.data.isMainProduct);

    if (!mainProduct) {
      throw new Error('未找到主要产品节点');
    }

    const referenceFlow = {
      nodeId: mainProduct.id,
      value: functionalUnit.value,
      unit: functionalUnit.unit,
    };

    return {
      nodes,
      edges,
      flows,
      config,
      functionalUnit,
      referenceFlow,
      characterizationFactors: config.methodology.characterizationFactors,
    };
  }

  private async waitForCompletion(session: LCACalculationSession): Promise<LCAResult> {
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const currentSession = this.engine.getSession(session.sessionId);

        if (!currentSession) {
          reject(new Error('计算会话不存在'));
          return;
        }

        if (currentSession.status === 'completed' && currentSession.finalResult) {
          resolve(currentSession.finalResult);
        } else if (currentSession.status === 'failed') {
          reject(new Error('LCA计算失败'));
        } else {
          // 继续等待
          setTimeout(checkStatus, 1000);
        }
      };

      checkStatus();
    });
  }

  private mergeConfigs(base: LCACalculationConfig, custom: Partial<LCACalculationConfig>): LCACalculationConfig {
    return {
      ...base,
      ...custom,
      methodology: {
        ...base.methodology,
        ...custom.methodology,
      },
      systemBoundary: {
        ...base.systemBoundary,
        ...custom.systemBoundary,
      },
      allocation: {
        ...base.allocation,
        ...custom.allocation,
      },
      dataQualityRequirements: {
        ...base.dataQualityRequirements,
        ...custom.dataQualityRequirements,
      },
    };
  }

  private calculateImprovements(baseline: LCAResult, alternative: LCAResult): Record<string, number> {
    const improvements: Record<string, number> = {};

    Object.entries(baseline.impactResults).forEach(([category, baselineImpact]) => {
      const alternativeImpact = alternative.impactResults[category];

      if (alternativeImpact && baselineImpact.value > 0) {
        const improvement = ((baselineImpact.value - alternativeImpact.value) / baselineImpact.value) * 100;
        improvements[category] = improvement;
      }
    });

    return improvements;
  }

  private analyzeComparison(
    baseline: LCAResult,
    alternatives: Array<{ id: string; name: string; result: LCAResult; improvements: Record<string, number> }>,
  ): {
    dominatingAlternative: string;
    tradeoffs: Array<{
      category1: string;
      category2: string;
      description: string;
    }>;
  } {
    // 找出总体最优方案
    let bestAlternative = alternatives[0];
    let bestScore = 0;

    alternatives.forEach((alt) => {
      const avgImprovement =
        Object.values(alt.improvements).reduce((sum, val) => sum + val, 0) / Object.values(alt.improvements).length;

      if (avgImprovement > bestScore) {
        bestScore = avgImprovement;
        bestAlternative = alt;
      }
    });

    // 识别权衡取舍
    const tradeoffs: Array<{
      category1: string;
      category2: string;
      description: string;
    }> = [];

    // 简化实现：检查是否存在一个方案在某些影响类别表现更好，但在其他类别表现较差
    alternatives.forEach((alt) => {
      const improvements = Object.entries(alt.improvements);
      const positive = improvements.filter(([_, value]) => value > 0);
      const negative = improvements.filter(([_, value]) => value < 0);

      if (positive.length > 0 && negative.length > 0) {
        tradeoffs.push({
          category1: positive[0][0],
          category2: negative[0][0],
          description: `${alt.name} 在 ${positive[0][0]} 方面表现更好，但在 ${negative[0][0]} 方面表现较差`,
        });
      }
    });

    return {
      dominatingAlternative: bestAlternative.name,
      tradeoffs,
    };
  }

  private extractCarbonByStage(result: LCAResult): Record<string, number> {
    // 从贡献分析中提取按生命周期阶段的碳排放
    const stageContributions: Record<string, number> = {};
    Object.entries(result.contributionAnalysis.byLifecycleStage).forEach(([stage, contribution]) => {
      stageContributions[stage] = contribution.absoluteValue;
    });

    return stageContributions;
  }

  private extractCarbonByProcess(result: LCAResult): Record<string, number> {
    const processContributions: Record<string, number> = {};
    Object.entries(result.contributionAnalysis.byProcess).forEach(([process, contribution]) => {
      processContributions[process] = contribution.absoluteValue;
    });

    return processContributions;
  }

  private extractCarbonByMaterial(result: LCAResult): Record<string, number> {
    const materialContributions: Record<string, number> = {};
    Object.entries(result.contributionAnalysis.byMaterial).forEach(([material, contribution]) => {
      materialContributions[material] = contribution.absoluteValue;
    });

    return materialContributions;
  }

  private generateCarbonRecommendations(result: LCAResult): string[] {
    const recommendations: string[] = [];

    // 基于贡献分析生成建议
    const stages = Object.entries(result.contributionAnalysis.byLifecycleStage).sort(
      ([, a], [, b]) => b.absoluteValue - a.absoluteValue,
    );

    if (stages.length > 0) {
      const topStage = stages[0];
      recommendations.push(
        `重点关注 ${topStage[0]} 阶段，该阶段贡献了 ${(topStage[1].relativeContribution * 100).toFixed(1)}% 的碳排放`,
      );
    }

    // 基于数据质量生成建议
    if (result.dataQuality.overallScore > 3) {
      recommendations.push('提高数据质量可以获得更准确的碳足迹计算结果');
    }

    return recommendations;
  }

  private identifyCarbonHotspots(
    nodes: Node<NodeData>[],
    result: LCAResult,
  ): Array<{
    nodeId: string;
    contribution: number;
    percentage: number;
    recommendations: string[];
  }> {
    const hotspots = Object.entries(result.contributionAnalysis.byProcess)
      .map(([nodeId, contribution]) => {
        const node = nodes.find((n) => n.id === nodeId);
        return {
          nodeId: node?.data.label || nodeId,
          contribution: contribution.absoluteValue,
          percentage: contribution.relativeContribution * 100,
          recommendations: this.generateNodeRecommendations(node),
        };
      })
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 5); // Top 5 hotspots

    return hotspots;
  }

  private identifyMaterialHotspots(result: LCAResult): Array<{
    material: string;
    contribution: number;
    percentage: number;
    alternatives: string[];
  }> {
    return Object.entries(result.contributionAnalysis.byMaterial)
      .map(([material, contribution]) => ({
        material,
        contribution: contribution.absoluteValue,
        percentage: contribution.relativeContribution * 100,
        alternatives: this.suggestMaterialAlternatives(material),
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);
  }

  private identifyEnergyHotspots(result: LCAResult): Array<{
    energyType: string;
    contribution: number;
    percentage: number;
    improvements: string[];
  }> {
    return Object.entries(result.contributionAnalysis.byEnergy)
      .map(([energyType, contribution]) => ({
        energyType,
        contribution: contribution.absoluteValue,
        percentage: contribution.relativeContribution * 100,
        improvements: this.suggestEnergyImprovements(energyType),
      }))
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3);
  }

  private generateNodeRecommendations(node?: Node<NodeData>): string[] {
    if (!node) {
      return [];
    }

    const recommendations: string[] = [];

    if (node.data.nodeType === 'manufacturing') {
      recommendations.push('考虑提高制造效率', '使用可再生能源', '优化生产工艺');
    } else if (node.data.nodeType === 'product') {
      recommendations.push('选择低碳材料', '减少材料用量', '提高材料回收率');
    } else if (node.data.nodeType === 'distribution') {
      recommendations.push('优化运输路线', '选择低碳运输方式', '提高装载率');
    }

    return recommendations;
  }

  private suggestMaterialAlternatives(material: string): string[] {
    const alternatives: Record<string, string[]> = {
      钢材: ['铝合金', '复合材料', '再生钢'],
      塑料: ['生物塑料', '再生塑料', '纸质材料'],
      水泥: ['高炉矿渣水泥', '粉煤灰水泥', '地聚合物'],
      玻璃: ['再生玻璃', '轻质玻璃', '塑料替代品'],
    };

    return alternatives[material] || ['考虑可再生材料', '提高回收利用率'];
  }

  private suggestEnergyImprovements(energyType: string): string[] {
    const improvements: Record<string, string[]> = {
      电力: ['使用可再生能源', '提高能源效率', '安装节能设备'],
      天然气: ['提高燃烧效率', '考虑可再生替代品', '余热回收'],
      煤炭: ['替换为清洁能源', '提高燃烧效率', '碳捕获技术'],
      石油: ['替换为生物燃料', '提高设备效率', '减少能源消耗'],
    };

    return improvements[energyType] || ['提高能源效率', '考虑可再生能源'];
  }

  private generateImprovementPlan(dataQuality: any): Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    expectedImprovement: string;
    effort: string;
  }> {
    const plan = [];

    if (dataQuality.reliability.score >= 4) {
      plan.push({
        priority: 'high' as const,
        action: '增加数据验证和证据文件',
        expectedImprovement: '提高可靠性评分至2分以下',
        effort: '中等',
      });
    }

    if (dataQuality.completeness.score >= 4) {
      plan.push({
        priority: 'high' as const,
        action: '完善缺失的必填字段',
        expectedImprovement: '提高数据完整性至80%以上',
        effort: '低',
      });
    }

    return plan;
  }
}
