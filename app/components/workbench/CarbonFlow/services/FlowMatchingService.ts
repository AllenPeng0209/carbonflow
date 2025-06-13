/**
 * Flow匹配服务
 * 专门处理Flow层面的特征化因子匹配和计算
 */

import type { MaterialFlow, EnergyFlow, EmissionFlow, WasteFlow, FlowCategory } from '~/types/flows';
import type { NodeData } from '~/types/nodes';

/**
 * 特征化因子数据库接口
 */
interface CharacterizationFactorDB {
  methodology: string;
  version: string;
  factors: {
    globalWarmingPotential: Record<string, number>;
    acidificationPotential: Record<string, number>;
    eutrophicationPotential: Record<string, number>;
    ozoneDepletionPotential: Record<string, number>;
    photochemicalOxidationPotential: Record<string, number>;
    humanToxicityPotential: Record<string, number>;
    ecotoxicityPotential: Record<string, number>;
  };
}

/**
 * Flow匹配结果
 */
interface FlowMatchResult {
  flowId: string;
  matchStatus: 'perfect_match' | 'partial_match' | 'no_match' | 'manual_override';
  confidence: number; // 0-1
  matchedFactors: {
    globalWarmingPotential?: number;
    acidificationPotential?: number;
    eutrophicationPotential?: number;
    [key: string]: number | undefined;
  };
  alternativeMatches?: Array<{
    factorId: string;
    substance: string;
    confidence: number;
    factors: Record<string, number>;
  }>;
  recommendations?: string[];
}

/**
 * Flow智能匹配服务
 */
export class FlowMatchingService {
  private characterizationDB: CharacterizationFactorDB;
  private substanceAliases: Map<string, string[]> = new Map();
  private userMappings: Map<string, string> = new Map();

  constructor() {
    this.initializeCharacterizationDB();
    this.initializeSubstanceAliases();
  }

  /**
   * 初始化特征化因子数据库
   */
  private initializeCharacterizationDB(): void {
    this.characterizationDB = {
      methodology: 'ReCiPe 2016 v1.1',
      version: '2016',
      factors: {
        globalWarmingPotential: {
          // 温室气体
          CO2: 1,
          CH4: 28,
          N2O: 265,
          SF6: 23500,
          'HFC-134a': 1300,
          'PFC-14': 6630,
          CO2_biogenic: 0,
          CO2_fossil: 1,

          // 能源相关
          electricity_coal: 0.85,
          electricity_natural_gas: 0.35,
          electricity_renewable: 0.02,
          gasoline: 2.31,
          diesel: 2.68,
          natural_gas: 1.94,

          // 材料
          steel_primary: 2.3,
          steel_secondary: 0.5,
          aluminum_primary: 11.5,
          aluminum_secondary: 1.2,
          concrete: 0.13,
          plastic_PE: 1.9,
          plastic_PP: 1.9,
          plastic_PET: 2.9,
          glass: 0.85,
          paper: 1.1,
          wood: -0.9, // 负值表示碳储存
        },

        acidificationPotential: {
          SO2: 1.0,
          NH3: 1.88,
          NOx: 0.7,
          HCl: 0.88,
          H2S: 1.88,
        },

        eutrophicationPotential: {
          PO4: 1.0,
          NH3: 0.35,
          NOx: 0.13,
          N2O: 0.27,
          NH4: 0.33,
          NO3: 0.1,
        },

        ozoneDepletionPotential: {
          'CFC-11': 1.0,
          'CFC-12': 0.73,
          'HCFC-22': 0.034,
          'HCFC-141b': 0.086,
        },

        photochemicalOxidationPotential: {
          NMVOC: 1.0,
          NOx: 0.028,
          CO: 0.027,
          CH4: 0.006,
        },

        humanToxicityPotential: {
          Arsenic: 2.5,
          Cadmium: 9.9,
          Chromium_VI: 0.5,
          Lead: 5.1,
          Mercury: 13.0,
        },

        ecotoxicityPotential: {
          Copper: 1.9,
          Zinc: 0.74,
          Nickel: 2.6,
          PAH: 170,
        },
      },
    };
  }

  /**
   * 初始化物质别名映射
   */
  private initializeSubstanceAliases(): void {
    this.substanceAliases.set('CO2', ['二氧化碳', 'carbon dioxide', '碳排放']);
    this.substanceAliases.set('CH4', ['甲烷', 'methane', '沼气']);
    this.substanceAliases.set('N2O', ['氧化亚氮', 'nitrous oxide', '笑气']);
    this.substanceAliases.set('steel_primary', ['钢材', '钢铁', '原生钢', '初级钢材']);
    this.substanceAliases.set('steel_secondary', ['再生钢', '回收钢', '废钢']);
    this.substanceAliases.set('aluminum_primary', ['铝材', '原铝', '电解铝']);
    this.substanceAliases.set('aluminum_secondary', ['再生铝', '回收铝']);
    this.substanceAliases.set('electricity_coal', ['火电', '煤电', '燃煤发电']);
    this.substanceAliases.set('electricity_natural_gas', ['天然气发电', '燃气发电']);
    this.substanceAliases.set('electricity_renewable', ['可再生电力', '清洁电力', '绿电']);
    this.substanceAliases.set('concrete', ['混凝土', '水泥混凝土']);
    this.substanceAliases.set('plastic_PE', ['聚乙烯', 'PE塑料']);
    this.substanceAliases.set('plastic_PP', ['聚丙烯', 'PP塑料']);
    this.substanceAliases.set('plastic_PET', ['聚酯', 'PET塑料']);
  }

  /**
   * 智能匹配Flow的特征化因子
   */
  async matchFlowFactors(
    flow: MaterialFlow | EnergyFlow | EmissionFlow | WasteFlow,
    nodeContext?: NodeData,
  ): Promise<FlowMatchResult> {
    const substance = this.normalizeSubstance(flow.name, flow);
    const exactMatch = this.findExactMatch(substance);

    if (exactMatch) {
      return {
        flowId: flow.id,
        matchStatus: 'perfect_match',
        confidence: 1.0,
        matchedFactors: exactMatch,
        recommendations: ['已找到精确匹配的特征化因子'],
      };
    }

    // 尝试模糊匹配
    const fuzzyMatches = this.findFuzzyMatches(substance, nodeContext);

    if (fuzzyMatches.length > 0) {
      const bestMatch = fuzzyMatches[0];
      return {
        flowId: flow.id,
        matchStatus: 'partial_match',
        confidence: bestMatch.confidence,
        matchedFactors: bestMatch.factors,
        alternativeMatches: fuzzyMatches.slice(1, 4), // 提供3个备选
        recommendations: this.generateMatchRecommendations(substance, bestMatch),
      };
    }

    // 无匹配时的处理
    return {
      flowId: flow.id,
      matchStatus: 'no_match',
      confidence: 0,
      matchedFactors: {},
      recommendations: ['未找到匹配的特征化因子', '建议手动配置或联系数据库管理员添加该物质', `物质标识: ${substance}`],
    };
  }

  /**
   * 批量匹配节点的所有Flow
   */
  async batchMatchNodeFlows(node: NodeData): Promise<{
    nodeId: string;
    totalFlows: number;
    matchedFlows: number;
    results: FlowMatchResult[];
    suggestions: string[];
  }> {
    const results: FlowMatchResult[] = [];
    let matchedCount = 0;

    if (node.lcaFlows) {
      // 处理物质流
      if (node.lcaFlows.materialFlows) {
        for (const flowRef of node.lcaFlows.materialFlows) {
          /*
           * 这里需要根据flowId获取实际的MaterialFlow对象
           * 暂时使用flowRef作为flow对象进行匹配
           */
          const result = await this.matchFlowFactors(flowRef as any, node);
          results.push(result);

          if (result.matchStatus !== 'no_match') {
            matchedCount++;
          }
        }
      }

      // 处理能量流
      if (node.lcaFlows.energyFlows) {
        for (const flowRef of node.lcaFlows.energyFlows) {
          const result = await this.matchFlowFactors(flowRef as any, node);
          results.push(result);

          if (result.matchStatus !== 'no_match') {
            matchedCount++;
          }
        }
      }

      // 处理排放流
      if (node.lcaFlows.emissionFlows) {
        for (const flowRef of node.lcaFlows.emissionFlows) {
          const result = await this.matchFlowFactors(flowRef as any, node);
          results.push(result);

          if (result.matchStatus !== 'no_match') {
            matchedCount++;
          }
        }
      }

      // 处理废物流
      if (node.lcaFlows.wasteFlows) {
        for (const flowRef of node.lcaFlows.wasteFlows) {
          const result = await this.matchFlowFactors(flowRef as any, node);
          results.push(result);

          if (result.matchStatus !== 'no_match') {
            matchedCount++;
          }
        }
      }

      // 处理服务流
      if (node.lcaFlows.serviceFlows) {
        for (const flowRef of node.lcaFlows.serviceFlows) {
          const result = await this.matchFlowFactors(flowRef as any, node);
          results.push(result);

          if (result.matchStatus !== 'no_match') {
            matchedCount++;
          }
        }
      }
    }

    return {
      nodeId: node.id,
      totalFlows: results.length,
      matchedFlows: matchedCount,
      results,
      suggestions: this.generateNodeSuggestions(node, results),
    };
  }

  /**
   * 从Node数据创建Flow
   */
  createFlowsFromNode(node: NodeData): {
    materialFlows: MaterialFlow[];
    energyFlows: EnergyFlow[];
    emissionFlows: EmissionFlow[];
  } {
    const flows = {
      materialFlows: [],
      energyFlows: [],
      emissionFlows: [],
    };

    // 从简化的Node数据推断Flow
    if (node.emissionType && node.quantity && node.carbonFactor) {
      const quantity = parseFloat(node.quantity) || 0;
      const carbonFactor = parseFloat(node.carbonFactor) || 0;

      // 根据emissionType创建相应的Flow
      switch (node.emissionType) {
        case '原材料':
          flows.materialFlows.push(this.createMaterialFlow(node, quantity));
          break;
        case '能耗':
          flows.energyFlows.push(this.createEnergyFlow(node, quantity));
          break;
        case '直接排放':
        case '间接排放':
          flows.emissionFlows.push(this.createEmissionFlow(node, quantity, carbonFactor));
          break;
      }
    }

    return flows;
  }

  /**
   * 私有辅助方法
   */
  private normalizeSubstance(name: string, flow: any): string {
    // 标准化物质名称
    const normalized = name
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    // 查找别名映射
    for (const [key, aliases] of this.substanceAliases.entries()) {
      if (
        aliases.some((alias) => alias.toLowerCase().includes(normalized) || normalized.includes(alias.toLowerCase()))
      ) {
        return key;
      }
    }

    return normalized;
  }

  private findExactMatch(substance: string): Record<string, number> | null {
    const factors: Record<string, number> = {};
    let hasMatch = false;

    Object.entries(this.characterizationDB.factors).forEach(([category, categoryFactors]) => {
      if (categoryFactors[substance] !== undefined) {
        factors[category] = categoryFactors[substance];
        hasMatch = true;
      }
    });

    return hasMatch ? factors : null;
  }

  private findFuzzyMatches(
    substance: string,
    nodeContext?: NodeData,
  ): Array<{
    factorId: string;
    substance: string;
    confidence: number;
    factors: Record<string, number>;
  }> {
    const matches: Array<{
      factorId: string;
      substance: string;
      confidence: number;
      factors: Record<string, number>;
    }> = [];

    // 基于节点上下文的智能匹配
    if (nodeContext) {
      const contextualMatches = this.getContextualMatches(substance, nodeContext);
      matches.push(...contextualMatches);
    }

    // 基于字符串相似度的匹配
    const similarityMatches = this.getSimilarityMatches(substance);
    matches.push(...similarityMatches);

    // 去重并排序
    const uniqueMatches = matches.filter(
      (match, index, self) => index === self.findIndex((m) => m.factorId === match.factorId),
    );

    return uniqueMatches.sort((a, b) => b.confidence - a.confidence);
  }

  private getContextualMatches(
    substance: string,
    node: NodeData,
  ): Array<{
    factorId: string;
    substance: string;
    confidence: number;
    factors: Record<string, number>;
  }> {
    const matches = [];

    // 基于生命周期阶段的推断
    if (node.lifecycleStage === '制造阶段' && substance.includes('电')) {
      matches.push({
        factorId: 'electricity_coal',
        substance: 'electricity_coal',
        confidence: 0.8,
        factors: { globalWarmingPotential: 0.85 },
      });
    }

    // 基于排放类型的推断
    if (node.emissionType === '原材料' && substance.includes('钢')) {
      matches.push({
        factorId: 'steel_primary',
        substance: 'steel_primary',
        confidence: 0.9,
        factors: { globalWarmingPotential: 2.3 },
      });
    }

    return matches;
  }

  private getSimilarityMatches(substance: string): Array<{
    factorId: string;
    substance: string;
    confidence: number;
    factors: Record<string, number>;
  }> {
    const matches = [];
    const allSubstances = new Set<string>();

    // 收集所有已知物质
    Object.values(this.characterizationDB.factors).forEach((categoryFactors) => {
      Object.keys(categoryFactors).forEach((key) => allSubstances.add(key));
    });

    // 计算相似度
    for (const knownSubstance of allSubstances) {
      const similarity = this.calculateStringSimilarity(substance, knownSubstance);

      if (similarity > 0.6) {
        const factors = this.findExactMatch(knownSubstance);

        if (factors) {
          matches.push({
            factorId: knownSubstance,
            substance: knownSubstance,
            confidence: similarity,
            factors,
          });
        }
      }
    }

    return matches;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // 简化的字符串相似度算法（可以用更复杂的算法替换）
    const len1 = str1.length;
    const len2 = str2.length;
    const maxLen = Math.max(len1, len2);

    if (maxLen === 0) {
      return 1;
    }

    let matches = 0;

    for (let i = 0; i < Math.min(len1, len2); i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }

    return matches / maxLen;
  }

  private generateMatchRecommendations(substance: string, match: any): string[] {
    const recommendations = [
      `建议使用 ${match.substance} 作为特征化因子`,
      `匹配置信度: ${(match.confidence * 100).toFixed(1)}%`,
    ];

    if (match.confidence < 0.8) {
      recommendations.push('建议人工确认匹配结果的准确性');
    }

    return recommendations;
  }

  private generateNodeSuggestions(node: NodeData, results: FlowMatchResult[]): string[] {
    const suggestions = [];
    const unmatchedCount = results.filter((r) => r.matchStatus === 'no_match').length;

    if (unmatchedCount > 0) {
      suggestions.push(`有 ${unmatchedCount} 个流未找到匹配的特征化因子`);
      suggestions.push('建议完善物质名称或添加到因子数据库');
    }

    const lowConfidenceCount = results.filter((r) => r.confidence < 0.8).length;

    if (lowConfidenceCount > 0) {
      suggestions.push(`有 ${lowConfidenceCount} 个流的匹配置信度较低`);
      suggestions.push('建议人工审核匹配结果');
    }

    return suggestions;
  }

  private createMaterialFlow(node: NodeData, quantity: number): MaterialFlow {
    return {
      id: `material_${node.id}`,
      name: node.label || '材料流',
      category: 'material',
      direction: 'input',
      quantity,
      unit: node.activityUnit || 'kg',
      materialType: 'raw_material',
      substance: node.label || '未知材料',
      physicalState: 'solid',
      renewability: 'non_renewable',
      recyclability: 0,
      dataQuality: {
        reliability: 3,
        completeness: 3,
        temporalCorrelation: 3,
        geographicalCorrelation: 3,
        technologyCorrelation: 3,
      },
    };
  }

  private createEnergyFlow(node: NodeData, quantity: number): EnergyFlow {
    return {
      id: `energy_${node.id}`,
      name: node.label || '能量流',
      category: 'energy',
      direction: 'input',
      quantity,
      unit: node.activityUnit || 'kWh',
      energyType: 'electricity',
      energyContent: quantity,
      source: {
        provider: '电网',
        grid: '国家电网',
        renewablePercentage: 0.15,
        location: '中国',
      },
      carbonIntensity: parseFloat(node.carbonFactor) || 0.85,
      dataQuality: {
        reliability: 3,
        completeness: 3,
        temporalCorrelation: 3,
        geographicalCorrelation: 3,
        technologyCorrelation: 3,
      },
    };
  }

  private createEmissionFlow(node: NodeData, quantity: number, carbonFactor: number): EmissionFlow {
    return {
      id: `emission_${node.id}`,
      name: `${node.label || '排放流'}_CO2`,
      category: 'emission',
      direction: 'output',
      quantity: quantity * carbonFactor,
      unit: 'kg',
      compartment: 'air',
      substance: 'CO2',
      globalWarmingPotential: 1,
      emissionSource: {
        processStage: node.lifecycleStage,
        technology: '标准工艺',
        efficiency: 1,
      },
      dataQuality: {
        reliability: 3,
        completeness: 3,
        temporalCorrelation: 3,
        geographicalCorrelation: 3,
        technologyCorrelation: 3,
      },
    };
  }

  /**
   * 保存用户自定义映射
   */
  saveUserMapping(originalSubstance: string, mappedSubstance: string): void {
    this.userMappings.set(originalSubstance, mappedSubstance);

    // 这里可以持久化到数据库
  }

  /**
   * 获取特征化因子数据库信息
   */
  getDatabaseInfo(): CharacterizationFactorDB {
    return this.characterizationDB;
  }

  /**
   * 更新特征化因子数据库
   */
  updateDatabase(newDB: Partial<CharacterizationFactorDB>): void {
    this.characterizationDB = { ...this.characterizationDB, ...newDB };
  }
}
