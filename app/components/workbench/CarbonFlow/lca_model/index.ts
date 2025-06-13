/**
 * LCA计算模型导出接口
 * 统一导出所有LCA相关的类型和服务
 */

// 类型定义
export type {
  LCAResult,
  LCACalculationContext,
  LCACalculationConfig,
  LCACalculationSession,
  LCACalculationStep,
  LCAComparison,
  MaterialInventory,
  EnergyInventory,
  EmissionInventory,
  WasteInventory,
  ImpactResult,
  ContributionResult,
  SensitivityResult,
  DataQualityScore,
} from './types';

// 核心服务
export { LCAService } from './LCAService';
export { LCACalculationEngine } from './LCACalculationEngine';
export { LCAConfigFactory } from './LCAConfigFactory';

// 默认导出 - LCA服务实例
export default new LCAService();

/**
 * 快速使用示例：
 *
 * import lcaService, { LCAConfigFactory } from './lca_model';
 *
 * // 快速LCA评估
 * const result = await lcaService.quickAssessment(nodes, edges, flows, functionalUnit);
 *
 * // 专业LCA评估
 * const professionalResult = await lcaService.professionalAssessment(
 *   nodes, edges, flows, functionalUnit
 * );
 *
 * // 产品对比
 * const comparison = await lcaService.compareProducts(
 *   baselineProduct,
 *   alternativeProducts
 * );
 *
 * // 碳足迹计算
 * const carbonFootprint = await lcaService.calculateCarbonFootprint(
 *   nodes, edges, flows, functionalUnit
 * );
 *
 * // 获取热点分析
 * const hotspots = await lcaService.getHotspotAnalysis(
 *   nodes, edges, flows, functionalUnit
 * );
 *
 * // 数据质量报告
 * const qualityReport = await lcaService.getDataQualityReport(
 *   nodes, edges, flows, functionalUnit
 * );
 *
 * // 自定义配置
 * const customConfig = LCAConfigFactory.createCustomConfig({
 *   impactMethod: 'ReCiPe',
 *   systemBoundary: {
 *     stages: ['原材料', '制造', '使用', '处置'],
 *     cutoff: 0.01
 *   },
 *   uncertaintyAnalysis: true
 * });
 */
