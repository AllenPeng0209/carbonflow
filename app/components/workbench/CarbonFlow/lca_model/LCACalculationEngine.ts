/**
 * LCA计算引擎核心实现
 * 基于 ISO 14040/14044 标准的完整计算流程
 */

import type {
  LCAResult,
  LCACalculationContext,
  LCACalculationConfig,
  LCACalculationSession,
  LCACalculationStep,
  MaterialInventory,
  EnergyInventory,
  EmissionInventory,
  WasteInventory,
  ImpactResult,
  ContributionResult,
  DataQualityScore,
} from './types';

import type { NodeData } from '~/types/nodes';
import type { MaterialFlow, EnergyFlow, EmissionFlow, WasteFlow } from '~/types/flows';
import type { Node, Edge } from 'reactflow';
import { FlowMatchingService } from '../services/FlowMatchingService';

/**
 * LCA计算引擎主类
 */
export class LCACalculationEngine {
  private sessions: Map<string, LCACalculationSession> = new Map();
  private flowMatchingService: FlowMatchingService;

  constructor() {
    this.flowMatchingService = new FlowMatchingService();
  }

  /**
   * 启动LCA计算会话
   */
  async startCalculation(context: LCACalculationContext): Promise<LCACalculationSession> {
    const sessionId = this.generateSessionId();

    const session: LCACalculationSession = {
      sessionId,
      context,
      steps: this.initializeCalculationSteps(),
      status: 'initializing',
      startTime: new Date(),
      metadata: {
        calculationMethod: 'ISO 14044 compliance',
        softwareVersion: '1.0.0',
        operator: 'system',
      },
    };

    this.sessions.set(sessionId, session);

    // 开始异步计算
    this.executeCalculation(session);

    return session;
  }

  /**
   * 初始化计算步骤
   */
  private initializeCalculationSteps(): LCACalculationStep[] {
    return [
      {
        stepId: 'validation',
        name: '系统验证',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'goal_scope',
        name: '目标与范围确定',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'inventory_analysis',
        name: '生命周期清单分析 (LCI)',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'impact_assessment',
        name: '生命周期影响评价 (LCIA)',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'contribution_analysis',
        name: '贡献分析',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'uncertainty_analysis',
        name: '不确定性分析',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'data_quality',
        name: '数据质量评估',
        status: 'pending',
        progress: 0,
      },
      {
        stepId: 'finalization',
        name: '结果汇总',
        status: 'pending',
        progress: 0,
      },
    ];
  }

  /**
   * 执行完整的LCA计算流程
   */
  private async executeCalculation(session: LCACalculationSession): Promise<void> {
    try {
      session.status = 'running';

      // 步骤1: 系统验证
      await this.executeStep(session, 'validation', () => this.validateSystem(session.context));

      // 步骤2: 目标与范围确定
      await this.executeStep(session, 'goal_scope', () => this.defineGoalAndScope(session.context));

      // 步骤3: 生命周期清单分析
      const inventoryResults = await this.executeStep(session, 'inventory_analysis', () =>
        this.performInventoryAnalysis(session.context),
      );

      // 步骤4: 生命周期影响评价
      const impactResults = await this.executeStep(session, 'impact_assessment', () =>
        this.performImpactAssessment(inventoryResults, session.context.config),
      );

      // 步骤5: 贡献分析
      const contributionResults = await this.executeStep(session, 'contribution_analysis', () =>
        this.performContributionAnalysis(inventoryResults, impactResults, session.context),
      );

      // 步骤6: 不确定性分析
      const uncertaintyResults = session.context.config.uncertaintyAnalysis?.enabled
        ? await this.executeStep(session, 'uncertainty_analysis', () =>
            this.performUncertaintyAnalysis(session.context),
          )
        : undefined;

      // 步骤7: 数据质量评估
      const dataQualityResults = await this.executeStep(session, 'data_quality', () =>
        this.assessDataQuality(session.context),
      );

      // 步骤8: 结果汇总
      const finalResult = await this.executeStep(session, 'finalization', () =>
        this.finalizeResults({
          inventoryResults,
          impactResults,
          contributionResults,
          uncertaintyResults,
          dataQualityResults,
          context: session.context,
        }),
      );

      session.finalResult = finalResult;
      session.status = 'completed';
      session.endTime = new Date();
    } catch (error) {
      session.status = 'failed';
      session.endTime = new Date();
      throw error;
    }
  }

  /**
   * 执行单个计算步骤
   */
  private async executeStep<T>(session: LCACalculationSession, stepId: string, executor: () => Promise<T>): Promise<T> {
    const step = session.steps.find((s) => s.stepId === stepId);

    if (!step) {
      throw new Error(`Step ${stepId} not found`);
    }

    step.status = 'running';
    step.startTime = new Date();

    try {
      const result = await executor();
      step.result = result;
      step.status = 'completed';
      step.progress = 1;
      step.endTime = new Date();

      return result;
    } catch (error) {
      step.status = 'error';
      step.error = error instanceof Error ? error.message : String(error);
      step.endTime = new Date();
      throw error;
    }
  }

  /**
   * 1. 系统验证
   */
  private async validateSystem(context: LCACalculationContext): Promise<void> {
    // 验证主要产品唯一性
    const mainProducts = context.nodes.filter((node) => node.data.isMainProduct);

    if (mainProducts.length !== 1) {
      throw new Error('系统必须有且仅有一个主要产品');
    }

    // 验证功能单位定义
    if (!context.functionalUnit || !context.functionalUnit.value || !context.functionalUnit.unit) {
      throw new Error('功能单位定义不完整');
    }

    // 验证基准流定义
    if (!context.referenceFlow || !context.referenceFlow.nodeId) {
      throw new Error('基准流定义不完整');
    }

    // 验证系统连通性
    this.validateSystemConnectivity(context.nodes, context.edges);
  }

  /**
   * 验证系统连通性
   */
  private validateSystemConnectivity(nodes: Node<NodeData>[], edges: Edge[]): void {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const connectedNodes = new Set<string>();

    // 从边构建连接关系
    edges.forEach((edge) => {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        connectedNodes.add(edge.source);
        connectedNodes.add(edge.target);
      }
    });

    // 检查孤立节点
    const isolatedNodes = nodes.filter((node) => !connectedNodes.has(node.id));

    if (isolatedNodes.length > 0) {
      console.warn(
        `发现 ${isolatedNodes.length} 个孤立节点:`,
        isolatedNodes.map((n) => n.data.label),
      );
    }
  }

  /**
   * 2. 目标与范围确定
   */
  private async defineGoalAndScope(context: LCACalculationContext): Promise<void> {
    // 确认研究目标
    const studyGoal = {
      intendedApplication: '产品环境影响评价',
      reasons: '量化产品生命周期环境影响',
      targetAudience: '内部决策支持',
      comparativeStudy: false,
    };

    // 确认系统边界
    const systemBoundary = context.config.systemBoundary;

    // 验证边界完整性
    if (!systemBoundary.includedStages || systemBoundary.includedStages.length === 0) {
      throw new Error('系统边界必须包含至少一个生命周期阶段');
    }

    // 记录范围定义
    console.log('LCA研究范围已确定:', {
      functionalUnit: context.functionalUnit,
      systemBoundary,
      studyGoal,
    });
  }

  /**
   * 3. 生命周期清单分析 (LCI)
   */
  private async performInventoryAnalysis(context: LCACalculationContext): Promise<{
    materialInputs: MaterialInventory[];
    energyInputs: EnergyInventory[];
    emissions: EmissionInventory[];
    wastes: WasteInventory[];
    totalMass: number;
    totalEnergy: number;
  }> {
    const materialInputs: MaterialInventory[] = [];
    const energyInputs: EnergyInventory[] = [];
    const emissions: EmissionInventory[] = [];
    const wastes: WasteInventory[] = [];

    // 遍历所有节点，收集流数据
    for (const node of context.nodes) {
      const nodeData = node.data;

      // 处理LCA流数据
      if (nodeData.lcaFlows) {
        // 物质流
        if (nodeData.lcaFlows.materialFlows) {
          for (const flow of nodeData.lcaFlows.materialFlows) {
            const materialFlow = context.flows[flow.flowId] as MaterialFlow;

            if (materialFlow) {
              materialInputs.push(this.convertToMaterialInventory(materialFlow, flow, nodeData));
            }
          }
        }

        // 能量流
        if (nodeData.lcaFlows.energyFlows) {
          for (const flow of nodeData.lcaFlows.energyFlows) {
            const energyFlow = context.flows[flow.flowId] as EnergyFlow;

            if (energyFlow) {
              energyInputs.push(this.convertToEnergyInventory(energyFlow, flow, nodeData));
            }
          }
        }

        // 排放流
        if (nodeData.lcaFlows.emissionFlows) {
          for (const flow of nodeData.lcaFlows.emissionFlows) {
            const emissionFlow = context.flows[flow.flowId] as EmissionFlow;

            if (emissionFlow) {
              emissions.push(this.convertToEmissionInventory(emissionFlow, flow, nodeData));
            }
          }
        }

        // 废物流
        if (nodeData.lcaFlows.wasteFlows) {
          for (const flow of nodeData.lcaFlows.wasteFlows) {
            const wasteFlow = context.flows[flow.flowId] as WasteFlow;

            if (wasteFlow) {
              wastes.push(this.convertToWasteInventory(wasteFlow, flow, nodeData));
            }
          }
        }
      }
    }

    // 计算总量
    const totalMass = materialInputs.reduce((sum, item) => sum + item.quantity, 0);
    const totalEnergy = energyInputs.reduce((sum, item) => sum + item.quantity, 0);

    // 应用分配方法
    this.applyAllocation(materialInputs, energyInputs, emissions, wastes, context.config.allocation);

    return {
      materialInputs,
      energyInputs,
      emissions,
      wastes,
      totalMass,
      totalEnergy,
    };
  }

  /**
   * 转换流数据为清单数据
   */
  private convertToMaterialInventory(materialFlow: MaterialFlow, flowRef: any, nodeData: NodeData): MaterialInventory {
    return {
      materialId: materialFlow.id,
      materialName: materialFlow.name,
      quantity: flowRef.localOverrides?.quantity || flowRef.quantity,
      unit: flowRef.localOverrides?.unit || flowRef.unit,
      category: materialFlow.renewability,
      source: nodeData.label,
      uncertainty: materialFlow.dataQuality?.reliability ? 0.1 * materialFlow.dataQuality.reliability : undefined,
    };
  }

  private convertToEnergyInventory(energyFlow: EnergyFlow, flowRef: any, nodeData: NodeData): EnergyInventory {
    return {
      energyId: energyFlow.id,
      energyType: energyFlow.energyType,
      quantity: flowRef.localOverrides?.quantity || flowRef.quantity,
      unit: flowRef.localOverrides?.unit || flowRef.unit,
      source: energyFlow.source.provider,
      renewableContent: energyFlow.source.renewablePercentage || 0,
      carbonIntensity: energyFlow.carbonIntensity || 0,
      uncertainty: energyFlow.dataQuality?.reliability ? 0.1 * energyFlow.dataQuality.reliability : undefined,
    };
  }

  private convertToEmissionInventory(emissionFlow: EmissionFlow, flowRef: any, nodeData: NodeData): EmissionInventory {
    return {
      substanceId: emissionFlow.id,
      substanceName: emissionFlow.substance,
      quantity: flowRef.localOverrides?.quantity || flowRef.quantity,
      unit: flowRef.localOverrides?.unit || flowRef.unit,
      compartment: emissionFlow.compartment,
      characterizationFactors: {
        globalWarmingPotential: emissionFlow.globalWarmingPotential || 0,
        acidificationPotential: emissionFlow.acidificationPotential || 0,
        eutrophicationPotential: emissionFlow.eutrophicationPotential || 0,
      },
      uncertainty: emissionFlow.dataQuality?.reliability ? 0.1 * emissionFlow.dataQuality.reliability : undefined,
    };
  }

  private convertToWasteInventory(wasteFlow: WasteFlow, flowRef: any, nodeData: NodeData): WasteInventory {
    return {
      wasteId: wasteFlow.id,
      wasteType: wasteFlow.wasteType,
      quantity: flowRef.localOverrides?.quantity || flowRef.quantity,
      unit: flowRef.localOverrides?.unit || flowRef.unit,
      treatmentMethod: wasteFlow.treatment.method,
      recyclingContent: wasteFlow.treatment.method === 'recycling' ? 1 : 0,
      uncertainty: wasteFlow.dataQuality?.reliability ? 0.1 * wasteFlow.dataQuality.reliability : undefined,
    };
  }

  /**
   * 应用分配方法
   */
  private applyAllocation(
    materialInputs: MaterialInventory[],
    energyInputs: EnergyInventory[],
    emissions: EmissionInventory[],
    wastes: WasteInventory[],
    allocationConfig: any,
  ): void {
    // 根据分配方法调整数量
    const allocationFactor = 1.0; // 简化处理，实际应根据具体分配方法计算

    [materialInputs, energyInputs, emissions, wastes].forEach((inventory) => {
      inventory.forEach((item) => {
        item.quantity *= allocationFactor;
      });
    });
  }

  /**
   * 4. 生命周期影响评价 (LCIA)
   */
  private async performImpactAssessment(
    inventoryResults: any,
    config: LCACalculationConfig,
  ): Promise<Record<string, ImpactResult>> {
    const impactResults: Record<string, ImpactResult> = {};

    // 全球变暖潜力 (GWP)
    impactResults.globalWarmingPotential = this.calculateGlobalWarmingPotential(
      inventoryResults.emissions,
      config.methodology.characterizationFactors,
    );

    // 酸化潜力 (AP)
    impactResults.acidificationPotential = this.calculateAcidificationPotential(
      inventoryResults.emissions,
      config.methodology.characterizationFactors,
    );

    // 富营养化潜力 (EP)
    impactResults.eutrophicationPotential = this.calculateEutrophicationPotential(
      inventoryResults.emissions,
      config.methodology.characterizationFactors,
    );

    // 其他影响类别...
    impactResults.ozoneDepletionPotential = this.calculateOzoneDepletionPotential(
      inventoryResults.emissions,
      config.methodology.characterizationFactors,
    );

    return impactResults;
  }

  /**
   * 计算全球变暖潜力
   */
  private calculateGlobalWarmingPotential(
    emissions: EmissionInventory[],
    characterizationFactors: Record<string, Record<string, number>>,
  ): ImpactResult {
    let totalGWP = 0;
    const contributionByProcess: Record<string, number> = {};

    emissions.forEach((emission) => {
      const gwpFactor = emission.characterizationFactors.globalWarmingPotential || 0;
      const contribution = emission.quantity * gwpFactor;
      totalGWP += contribution;
      contributionByProcess[emission.substanceId] = contribution;
    });

    return {
      category: 'Global Warming Potential',
      value: totalGWP,
      unit: 'kg CO2-eq',
      method: 'IPCC GWP 100',
      contributionByProcess,
    };
  }

  private calculateAcidificationPotential(
    emissions: EmissionInventory[],
    characterizationFactors: Record<string, Record<string, number>>,
  ): ImpactResult {
    let totalAP = 0;
    const contributionByProcess: Record<string, number> = {};

    emissions.forEach((emission) => {
      const apFactor = emission.characterizationFactors.acidificationPotential || 0;
      const contribution = emission.quantity * apFactor;
      totalAP += contribution;
      contributionByProcess[emission.substanceId] = contribution;
    });

    return {
      category: 'Acidification Potential',
      value: totalAP,
      unit: 'kg SO2-eq',
      method: 'CML 2001',
      contributionByProcess,
    };
  }

  private calculateEutrophicationPotential(
    emissions: EmissionInventory[],
    characterizationFactors: Record<string, Record<string, number>>,
  ): ImpactResult {
    let totalEP = 0;
    const contributionByProcess: Record<string, number> = {};

    emissions.forEach((emission) => {
      const epFactor = emission.characterizationFactors.eutrophicationPotential || 0;
      const contribution = emission.quantity * epFactor;
      totalEP += contribution;
      contributionByProcess[emission.substanceId] = contribution;
    });

    return {
      category: 'Eutrophication Potential',
      value: totalEP,
      unit: 'kg PO4-eq',
      method: 'CML 2001',
      contributionByProcess,
    };
  }

  private calculateOzoneDepletionPotential(
    emissions: EmissionInventory[],
    characterizationFactors: Record<string, Record<string, number>>,
  ): ImpactResult {
    // 简化实现
    return {
      category: 'Ozone Depletion Potential',
      value: 0,
      unit: 'kg CFC-11-eq',
      method: 'WMO 1999',
      contributionByProcess: {},
    };
  }

  /**
   * 5. 贡献分析
   */
  private async performContributionAnalysis(
    inventoryResults: any,
    impactResults: Record<string, ImpactResult>,
    context: LCACalculationContext,
  ): Promise<{
    byLifecycleStage: Record<string, ContributionResult>;
    byProcess: Record<string, ContributionResult>;
    byMaterial: Record<string, ContributionResult>;
    byEnergy: Record<string, ContributionResult>;
  }> {
    // 按生命周期阶段分析
    const byLifecycleStage = this.analyzeContributionByLifecycleStage(context.nodes, impactResults);

    // 按过程分析
    const byProcess = this.analyzeContributionByProcess(context.nodes, impactResults);

    // 按材料分析
    const byMaterial = this.analyzeContributionByMaterial(inventoryResults.materialInputs);

    // 按能源分析
    const byEnergy = this.analyzeContributionByEnergy(inventoryResults.energyInputs);

    return {
      byLifecycleStage,
      byProcess,
      byMaterial,
      byEnergy,
    };
  }

  private analyzeContributionByLifecycleStage(
    nodes: Node<NodeData>[],
    impactResults: Record<string, ImpactResult>,
  ): Record<string, ContributionResult> {
    const stageContributions: Record<string, ContributionResult> = {};

    // 按节点类型分组
    const stageGroups = nodes.reduce(
      (groups, node) => {
        const stage = node.data.lifecycleStage || node.data.nodeType || 'unknown';

        if (!groups[stage]) {
          groups[stage] = [];
        }

        groups[stage].push(node);

        return groups;
      },
      {} as Record<string, Node<NodeData>[]>,
    );

    // 计算每个阶段的贡献
    Object.entries(stageGroups).forEach(([stage, stageNodes]) => {
      const stageContribution = this.calculateStageContribution(stageNodes, impactResults);
      stageContributions[stage] = stageContribution;
    });

    return stageContributions;
  }

  private analyzeContributionByProcess(
    nodes: Node<NodeData>[],
    impactResults: Record<string, ImpactResult>,
  ): Record<string, ContributionResult> {
    const processContributions: Record<string, ContributionResult> = {};

    nodes.forEach((node) => {
      const processContribution = this.calculateProcessContribution(node, impactResults);
      processContributions[node.id] = processContribution;
    });

    return processContributions;
  }

  private analyzeContributionByMaterial(materialInputs: MaterialInventory[]): Record<string, ContributionResult> {
    const materialContributions: Record<string, ContributionResult> = {};

    const totalMass = materialInputs.reduce((sum, material) => sum + material.quantity, 0);

    materialInputs.forEach((material, index) => {
      materialContributions[material.materialId] = {
        absoluteValue: material.quantity,
        relativeContribution: totalMass > 0 ? material.quantity / totalMass : 0,
        unit: material.unit,
        rank: index + 1,
      };
    });

    return materialContributions;
  }

  private analyzeContributionByEnergy(energyInputs: EnergyInventory[]): Record<string, ContributionResult> {
    const energyContributions: Record<string, ContributionResult> = {};

    const totalEnergy = energyInputs.reduce((sum, energy) => sum + energy.quantity, 0);

    energyInputs.forEach((energy, index) => {
      energyContributions[energy.energyId] = {
        absoluteValue: energy.quantity,
        relativeContribution: totalEnergy > 0 ? energy.quantity / totalEnergy : 0,
        unit: energy.unit,
        rank: index + 1,
      };
    });

    return energyContributions;
  }

  private calculateStageContribution(
    stageNodes: Node<NodeData>[],
    impactResults: Record<string, ImpactResult>,
  ): ContributionResult {
    // 简化实现：基于节点数量
    const nodeCount = stageNodes.length;
    const totalGWP = impactResults.globalWarmingPotential?.value || 0;

    return {
      absoluteValue: totalGWP * (nodeCount / 10), // 简化计算
      relativeContribution: nodeCount / 10,
      unit: 'kg CO2-eq',
      rank: 1,
    };
  }

  private calculateProcessContribution(
    node: Node<NodeData>,
    impactResults: Record<string, ImpactResult>,
  ): ContributionResult {
    // 简化实现：基于节点的碳足迹
    const carbonFootprint = parseFloat(node.data.carbonFootprint) || 0;
    const totalGWP = impactResults.globalWarmingPotential?.value || 1;

    return {
      absoluteValue: carbonFootprint,
      relativeContribution: totalGWP > 0 ? carbonFootprint / totalGWP : 0,
      unit: 'kg CO2-eq',
      rank: 1,
    };
  }

  /**
   * 6. 不确定性分析
   */
  private async performUncertaintyAnalysis(context: LCACalculationContext): Promise<any> {
    // 蒙特卡洛模拟
    const iterations = context.config.uncertaintyAnalysis?.iterations || 1000;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      // 在每次迭代中，对输入参数进行随机采样
      const perturbedContext = this.perturbParameters(context);

      // 重新计算结果
      const result = await this.performSingleIteration(perturbedContext);
      results.push(result);
    }

    // 统计分析
    const mean = results.reduce((sum, val) => sum + val, 0) / results.length;
    const variance = results.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (results.length - 1);
    const standardDeviation = Math.sqrt(variance);

    return {
      mean,
      standardDeviation,
      confidenceInterval: [mean - 1.96 * standardDeviation, mean + 1.96 * standardDeviation],
      distribution: results,
    };
  }

  private perturbParameters(context: LCACalculationContext): LCACalculationContext {
    // 简化实现：对关键参数添加随机扰动
    const perturbedContext = JSON.parse(JSON.stringify(context));

    // 对节点的碳排放因子添加不确定性
    perturbedContext.nodes.forEach((node: Node<NodeData>) => {
      const carbonFactor = parseFloat(node.data.carbonFactor) || 0;
      const uncertainty = 0.1; // 10%不确定性
      const perturbedValue = carbonFactor * (1 + (Math.random() - 0.5) * 2 * uncertainty);
      node.data.carbonFactor = perturbedValue.toString();
    });

    return perturbedContext;
  }

  private async performSingleIteration(context: LCACalculationContext): Promise<number> {
    // 简化实现：计算总碳足迹
    return context.nodes.reduce((total, node) => {
      const carbonFootprint = parseFloat(node.data.carbonFootprint) || 0;
      return total + carbonFootprint;
    }, 0);
  }

  /**
   * 7. 数据质量评估
   */
  private async assessDataQuality(context: LCACalculationContext): Promise<{
    overallScore: number;
    reliability: DataQualityScore;
    completeness: DataQualityScore;
    temporalCorrelation: DataQualityScore;
    geographicalCorrelation: DataQualityScore;
    technologyCorrelation: DataQualityScore;
  }> {
    // 评估各个维度的数据质量
    const reliability = this.assessReliability(context.nodes);
    const completeness = this.assessCompleteness(context.nodes);
    const temporalCorrelation = this.assessTemporalCorrelation(context);
    const geographicalCorrelation = this.assessGeographicalCorrelation(context);
    const technologyCorrelation = this.assessTechnologyCorrelation(context);

    // 计算综合评分
    const overallScore =
      (reliability.score +
        completeness.score +
        temporalCorrelation.score +
        geographicalCorrelation.score +
        technologyCorrelation.score) /
      5;

    return {
      overallScore,
      reliability,
      completeness,
      temporalCorrelation,
      geographicalCorrelation,
      technologyCorrelation,
    };
  }

  private assessReliability(nodes: Node<NodeData>[]): DataQualityScore {
    // 基于验证状态评估可靠性
    const verifiedNodes = nodes.filter(
      (node) => node.data.verificationStatus === 'verified' || node.data.evidenceVerificationStatus === '已验证',
    );

    const reliabilityRatio = nodes.length > 0 ? verifiedNodes.length / nodes.length : 0;

    let score: 1 | 2 | 3 | 4 | 5;

    if (reliabilityRatio >= 0.9) {
      score = 1;
    } else if (reliabilityRatio >= 0.7) {
      score = 2;
    } else if (reliabilityRatio >= 0.5) {
      score = 3;
    } else if (reliabilityRatio >= 0.3) {
      score = 4;
    } else {
      score = 5;
    }

    return {
      score,
      description: `${(reliabilityRatio * 100).toFixed(1)}% 的数据已验证`,
      improvementSuggestions: score > 2 ? ['增加数据验证', '提供证据文件'] : [],
    };
  }

  private assessCompleteness(nodes: Node<NodeData>[]): DataQualityScore {
    // 基于必填字段完整性评估
    const requiredFields = ['carbonFactor', 'quantity', 'activitydataSource'];
    const completenessScores = nodes.map((node) => {
      const filledFields = requiredFields.filter(
        (field) => node.data[field as keyof NodeData] && String(node.data[field as keyof NodeData]).trim() !== '',
      );
      return filledFields.length / requiredFields.length;
    });

    const avgCompleteness = completenessScores.reduce((sum, score) => sum + score, 0) / completenessScores.length;

    let score: 1 | 2 | 3 | 4 | 5;

    if (avgCompleteness >= 0.95) {
      score = 1;
    } else if (avgCompleteness >= 0.8) {
      score = 2;
    } else if (avgCompleteness >= 0.6) {
      score = 3;
    } else if (avgCompleteness >= 0.4) {
      score = 4;
    } else {
      score = 5;
    }

    return {
      score,
      description: `平均数据完整性: ${(avgCompleteness * 100).toFixed(1)}%`,
      improvementSuggestions: score > 2 ? ['完善缺失字段', '添加详细描述'] : [],
    };
  }

  private assessTemporalCorrelation(context: LCACalculationContext): DataQualityScore {
    // 简化实现
    return {
      score: 2,
      description: '时间相关性良好',
      improvementSuggestions: [],
    };
  }

  private assessGeographicalCorrelation(context: LCACalculationContext): DataQualityScore {
    // 简化实现
    return {
      score: 2,
      description: '地理相关性良好',
      improvementSuggestions: [],
    };
  }

  private assessTechnologyCorrelation(context: LCACalculationContext): DataQualityScore {
    // 简化实现
    return {
      score: 2,
      description: '技术相关性良好',
      improvementSuggestions: [],
    };
  }

  /**
   * 8. 结果汇总
   */
  private async finalizeResults(data: {
    inventoryResults: any;
    impactResults: Record<string, ImpactResult>;
    contributionResults: any;
    uncertaintyResults?: any;
    dataQualityResults: any;
    context: LCACalculationContext;
  }): Promise<LCAResult> {
    const { inventoryResults, impactResults, contributionResults, uncertaintyResults, dataQualityResults, context } =
      data;

    return {
      systemInfo: {
        studyId: `lca-${Date.now()}`,
        functionalUnit: `${context.functionalUnit.value} ${context.functionalUnit.unit}`,
        systemBoundary: context.config.systemBoundary.includedStages.join(', '),
        referenceFlow: `${context.referenceFlow.value} ${context.referenceFlow.unit}`,
        calculationTimestamp: new Date(),
      },
      inventoryResults,
      impactResults,
      contributionAnalysis: contributionResults,
      uncertaintyAnalysis: uncertaintyResults,
      dataQuality: dataQualityResults,
    };
  }

  /**
   * 工具方法
   */
  private generateSessionId(): string {
    return `lca-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取计算会话
   */
  getSession(sessionId: string): LCACalculationSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * 获取所有会话
   */
  getAllSessions(): LCACalculationSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * 清理完成的会话
   */
  cleanupCompletedSessions(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.status === 'completed' && session.endTime && session.endTime < cutoffTime) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * 🆕 基于Flow的特征化计算 - 替代简化的碳因子方法
   */
  private async calculateFlowBasedCharacterization(
    node: NodeData,
    functionalUnit: FunctionalUnit,
  ): Promise<LCAImpactResults> {
    const results: LCAImpactResults = {
      globalWarmingPotential: 0,
      acidificationPotential: 0,
      eutrophicationPotential: 0,
      ozoneDepletionPotential: 0,
      photochemicalOxidationPotential: 0,
      humanToxicityPotential: 0,
      ecotoxicityPotential: 0,
      details: [],
    };

    // 1. 获取节点的Flow匹配结果
    const matchResult = await this.flowMatchingService.batchMatchNodeFlows(node);

    // 2. 为每个匹配的Flow计算影响
    for (const flowResult of matchResult.results) {
      if (flowResult.matchStatus !== 'no_match') {
        const flowImpacts = this.calculateFlowImpacts(flowResult, functionalUnit);

        // 累加到总结果
        Object.keys(flowImpacts).forEach((category) => {
          if (category !== 'details' && results[category] !== undefined) {
            results[category] += flowImpacts[category];
          }
        });

        // 添加详细信息
        results.details.push({
          nodeId: node.id,
          flowId: flowResult.flowId,
          category: this.getFlowCategory(flowResult),
          impact: flowImpacts,
          matchStatus: flowResult.matchStatus,
          confidence: flowResult.confidence,
        });
      }
    }

    return results;
  }

  /**
   * 计算单个Flow的环境影响
   */
  private calculateFlowImpacts(flowResult: any, functionalUnit: FunctionalUnit): Record<string, number> {
    const impacts: Record<string, number> = {};

    // 获取Flow的量（需要从实际Flow数据中获取）
    const flowQuantity = this.getFlowQuantity(flowResult.flowId);

    // 计算功能单位的比例因子
    const scalingFactor = this.calculateScalingFactor(flowQuantity, functionalUnit);

    // 为每个影响类别计算结果
    Object.entries(flowResult.matchedFactors).forEach(([category, factor]) => {
      if (typeof factor === 'number') {
        impacts[category] = flowQuantity * factor * scalingFactor;
      }
    });

    return impacts;
  }

  /**
   * 🆕 升级的计算主流程 - 整合Flow计算
   */
  async calculateEnhanced(workflow: Workflow, config: LCACalculationConfig): Promise<LCAResults> {
    const results: LCAResults = {
      totalImpact: { globalWarmingPotential: 0 } as LCAImpactResults,
      nodeResults: [],
      flowResults: [], // 新增：Flow级别的结果
      uncertaintyAnalysis: undefined,
      sensitivityAnalysis: undefined,
      dataQualityAssessment: undefined,
      metadata: {
        calculationDate: new Date(),
        methodology: config.methodology,
        version: '2.0.0-enhanced',
        configUsed: config,
      },
    };

    // 1. Flow匹配阶段
    console.log('🔍 开始Flow匹配阶段...');

    const flowMatchResults = await this.performFlowMatching(workflow);
    results.flowResults = flowMatchResults;

    // 2. 特征化计算阶段（基于Flow）
    console.log('🧮 开始Flow特征化计算...');

    for (const node of workflow.nodes) {
      const nodeResult = await this.calculateFlowBasedCharacterization(node.data, config.functionalUnit);

      results.nodeResults.push({
        nodeId: node.id,
        impact: nodeResult,
        uncertaintyRange: undefined, // 待实现
      });

      // 累加到总影响
      Object.keys(nodeResult).forEach((category) => {
        if (category !== 'details' && typeof nodeResult[category] === 'number') {
          if (!results.totalImpact[category]) {
            results.totalImpact[category] = 0;
          }

          results.totalImpact[category] += nodeResult[category];
        }
      });
    }

    // 3. 边（Flow连接）的处理
    console.log('🔗 处理Edge连接的Flow传递...');
    await this.processEdgeFlows(workflow.edges, results);

    // 4. 数据质量评估
    if (config.includeDataQuality) {
      results.dataQualityAssessment = this.assessDataQuality(flowMatchResults);
    }

    // 5. 不确定性分析
    if (config.includeUncertainty) {
      results.uncertaintyAnalysis = await this.performUncertaintyAnalysis(results, config.uncertaintyMethod);
    }

    return results;
  }

  /**
   * 对整个工作流进行Flow匹配
   */
  private async performFlowMatching(workflow: Workflow): Promise<any[]> {
    const flowResults = [];

    for (const node of workflow.nodes) {
      const matchResult = await this.flowMatchingService.batchMatchNodeFlows(node.data);
      flowResults.push(matchResult);
    }

    return flowResults;
  }

  /**
   * 处理Edge连接的Flow传递
   */
  private async processEdgeFlows(edges: any[], results: LCAResults): Promise<void> {
    for (const edge of edges) {
      if (edge.data && edge.data.flows) {
        // 处理Edge中定义的Flow
        for (const flow of edge.data.flows) {
          const flowMatchResult = await this.flowMatchingService.matchFlowFactors(flow);

          if (flowMatchResult.matchStatus !== 'no_match') {
            const flowImpacts = this.calculateFlowImpacts(flowMatchResult, {
              amount: 1,
              unit: 'unit',
            } as FunctionalUnit);

            // 将Edge Flow的影响分配给相关节点
            this.distributeEdgeFlowImpacts(edge, flowImpacts, results);
          }
        }
      }
    }
  }

  /**
   * 分配Edge Flow的环境影响
   */
  private distributeEdgeFlowImpacts(edge: any, impacts: Record<string, number>, results: LCAResults): void {
    // 找到源节点和目标节点的结果
    const sourceNodeResult = results.nodeResults.find((r) => r.nodeId === edge.source);
    const targetNodeResult = results.nodeResults.find((r) => r.nodeId === edge.target);

    if (sourceNodeResult && targetNodeResult) {
      // 50-50分配（可以根据实际情况调整分配策略）
      Object.entries(impacts).forEach(([category, impact]) => {
        if (typeof impact === 'number') {
          sourceNodeResult.impact[category] = (sourceNodeResult.impact[category] || 0) + impact * 0.5;
          targetNodeResult.impact[category] = (targetNodeResult.impact[category] || 0) + impact * 0.5;
        }
      });
    }
  }

  /**
   * 评估数据质量
   */
  private assessDataQuality(flowMatchResults: any[]): any {
    const totalFlows = flowMatchResults.reduce((sum, result) => sum + result.totalFlows, 0);
    const matchedFlows = flowMatchResults.reduce((sum, result) => sum + result.matchedFlows, 0);
    const avgConfidence = flowMatchResults
      .flatMap((r) => r.results)
      .filter((r) => r.matchStatus !== 'no_match')
      .reduce((sum, r, _, arr) => sum + r.confidence / arr.length, 0);

    return {
      flowMatchingRate: totalFlows > 0 ? matchedFlows / totalFlows : 0,
      averageConfidence: avgConfidence,
      dataCompleteness: matchedFlows / totalFlows,
      qualityScore: (avgConfidence + matchedFlows / totalFlows) / 2,
      recommendations: this.generateDataQualityRecommendations(flowMatchResults),
    };
  }

  /**
   * 生成数据质量改进建议
   */
  private generateDataQualityRecommendations(flowMatchResults: any[]): string[] {
    const recommendations = [];

    const unmatchedCount = flowMatchResults.reduce(
      (sum, result) => sum + result.results.filter((r) => r.matchStatus === 'no_match').length,
      0,
    );

    if (unmatchedCount > 0) {
      recommendations.push(`有 ${unmatchedCount} 个Flow未找到匹配的特征化因子，建议完善数据库`);
    }

    const lowConfidenceCount = flowMatchResults.reduce(
      (sum, result) => sum + result.results.filter((r) => r.confidence < 0.7).length,
      0,
    );

    if (lowConfidenceCount > 0) {
      recommendations.push(`有 ${lowConfidenceCount} 个Flow的匹配置信度较低，建议人工审核`);
    }

    return recommendations;
  }
}
