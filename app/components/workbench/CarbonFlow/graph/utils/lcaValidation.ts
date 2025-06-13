import type { Node, Edge } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import { LCA_PRODUCT_CATEGORIES, LCA_LIFECYCLE_LAYERS } from '../constants';

/**
 * LCA理论验证结果
 */
export interface LCAValidationResult {
  isValid: boolean;
  errors: LCAValidationError[];
  warnings: LCAValidationWarning[];
  recommendations: LCARecommendation[];
}

export interface LCAValidationError {
  type:
    | 'no_main_product'
    | 'multiple_main_products'
    | 'invalid_flow_direction'
    | 'missing_functional_unit'
    | 'circular_dependency';
  nodeId?: string;
  message: string;
  severity: 'error';
}

export interface LCAValidationWarning {
  type: 'missing_reference_flow' | 'incomplete_process_info' | 'no_material_flows' | 'data_quality_low';
  nodeId?: string;
  message: string;
  severity: 'warning';
}

export interface LCARecommendation {
  type: 'add_functional_unit' | 'complete_material_flows' | 'add_allocation_method' | 'improve_data_quality';
  nodeId?: string;
  message: string;
  action?: string;
}

/**
 * 验证LCA模型是否符合理论要求
 */
export function validateLCAModel(nodes: Node<NodeData>[], edges: Edge[]): LCAValidationResult {
  const errors: LCAValidationError[] = [];
  const warnings: LCAValidationWarning[] = [];
  const recommendations: LCARecommendation[] = [];

  // 1. 验证主要产品（根据图片理论：主要产品只能有一个）
  validateMainProduct(nodes, errors);

  // 2. 验证功能单位和基准流
  validateFunctionalUnits(nodes, warnings, recommendations);

  // 3. 验证流向关系（符合生命周期阶段）
  validateFlowDirection(nodes, edges, errors, warnings);

  // 4. 验证过程完整性
  validateProcessCompleteness(nodes, warnings, recommendations);

  // 5. 验证循环依赖
  validateCircularDependency(nodes, edges, errors);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations,
  };
}

/**
 * 验证主要产品唯一性
 */
function validateMainProduct(nodes: Node<NodeData>[], errors: LCAValidationError[]): void {
  const mainProducts = nodes.filter(
    (node) => node.data.isMainProduct || node.data.productCategory === LCA_PRODUCT_CATEGORIES.MAIN,
  );

  if (mainProducts.length === 0) {
    errors.push({
      type: 'no_main_product',
      message: '系统中必须指定一个主要产品（Main Product）',
      severity: 'error',
    });
  } else if (mainProducts.length > 1) {
    mainProducts.forEach((node) => {
      errors.push({
        type: 'multiple_main_products',
        nodeId: node.id,
        message: `节点"${node.data.label}"被标记为主要产品，但系统中只能有一个主要产品`,
        severity: 'error',
      });
    });
  }
}

/**
 * 验证功能单位和基准流
 */
function validateFunctionalUnits(
  nodes: Node<NodeData>[],
  warnings: LCAValidationWarning[],
  recommendations: LCARecommendation[],
): void {
  const mainProduct = nodes.find(
    (node) => node.data.isMainProduct || node.data.productCategory === LCA_PRODUCT_CATEGORIES.MAIN,
  );

  if (mainProduct) {
    if (!mainProduct.data.functionalUnit) {
      warnings.push({
        type: 'missing_functional_unit',
        nodeId: mainProduct.id,
        message: `主要产品"${mainProduct.data.label}"缺少功能单位定义`,
        severity: 'warning',
      });

      recommendations.push({
        type: 'add_functional_unit',
        nodeId: mainProduct.id,
        message: '建议为主要产品添加功能单位，如"1台电脑"、"1kWh"等',
        action: '在节点属性中添加功能单位',
      });
    }

    if (!mainProduct.data.referenceFlow) {
      warnings.push({
        type: 'missing_reference_flow',
        nodeId: mainProduct.id,
        message: `主要产品"${mainProduct.data.label}"缺少基准流定义`,
        severity: 'warning',
      });
    }
  }
}

/**
 * 验证流向关系是否符合生命周期阶段
 */
function validateFlowDirection(
  nodes: Node<NodeData>[],
  edges: Edge[],
  errors: LCAValidationError[],
  warnings: LCAValidationWarning[],
): void {
  // 根据节点类型获取生命周期层级
  const getNodeLayer = (nodeType: string): number => {
    for (const [, layerInfo] of Object.entries(LCA_LIFECYCLE_LAYERS)) {
      if (layerInfo.types.includes(nodeType)) {
        return layerInfo.layer;
      }
    }
    return -1; // 未知类型
  };

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (sourceNode && targetNode) {
      const sourceLayer = getNodeLayer(sourceNode.data.nodeType || '');
      const targetLayer = getNodeLayer(targetNode.data.nodeType || '');

      // 检查流向是否正确（从低层级到高层级）
      if (sourceLayer >= 0 && targetLayer >= 0 && sourceLayer >= targetLayer) {
        errors.push({
          type: 'invalid_flow_direction',
          message: `从"${sourceNode.data.label}"到"${targetNode.data.label}"的流向违反了生命周期阶段规则`,
          severity: 'error',
        });
      }
    }
  });
}

/**
 * 验证过程完整性
 */
function validateProcessCompleteness(
  nodes: Node<NodeData>[],
  warnings: LCAValidationWarning[],
  recommendations: LCARecommendation[],
): void {
  nodes.forEach((node) => {
    // 检查过程信息
    if (!node.data.processInfo) {
      warnings.push({
        type: 'incomplete_process_info',
        nodeId: node.id,
        message: `节点"${node.data.label}"缺少过程信息`,
        severity: 'warning',
      });
    }

    // 检查物质流
    if (!node.data.inputs && !node.data.outputs) {
      warnings.push({
        type: 'no_material_flows',
        nodeId: node.id,
        message: `节点"${node.data.label}"缺少输入输出物质流信息`,
        severity: 'warning',
      });

      recommendations.push({
        type: 'complete_material_flows',
        nodeId: node.id,
        message: '建议完善节点的输入输出物质流信息',
        action: '添加原材料、能源、产品等物质流',
      });
    }

    // 检查分配方法（对于有多产品输出的过程）
    if (
      node.data.outputs &&
      node.data.outputs.length > 1 &&
      (!node.data.processInfo || !node.data.processInfo.allocationMethod)
    ) {
      recommendations.push({
        type: 'add_allocation_method',
        nodeId: node.id,
        message: '多产品输出过程建议指定分配方法',
        action: '选择经济分配、质量分配或能量分配方法',
      });
    }
  });
}

/**
 * 验证循环依赖
 */
function validateCircularDependency(nodes: Node<NodeData>[], edges: Edge[], errors: LCAValidationError[]): void {
  // 使用深度优先搜索检测环路
  const visited = new Set<string>();
  const inPath = new Set<string>();

  const hasCircle = (nodeId: string): boolean => {
    if (inPath.has(nodeId)) {
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    inPath.add(nodeId);

    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

    for (const edge of outgoingEdges) {
      if (hasCircle(edge.target)) {
        return true;
      }
    }

    inPath.delete(nodeId);

    return false;
  };

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCircle(node.id)) {
      errors.push({
        type: 'circular_dependency',
        nodeId: node.id,
        message: `检测到包含节点"${node.data.label}"的循环依赖`,
        severity: 'error',
      });
      break; // 找到一个循环就足够了
    }
  }
}

/**
 * 获取LCA建模建议
 */
export function getLCAModelingRecommendations(nodes: Node<NodeData>[]): LCARecommendation[] {
  const recommendations: LCARecommendation[] = [];

  // 检查是否遵循了完整的生命周期阶段
  const presentStages = new Set(nodes.map((node) => node.data.nodeType).filter(Boolean));
  const expectedStages = ['disposal', 'usage', 'distribution', 'manufacturing', 'product', 'finalProduct'];

  expectedStages.forEach((stage) => {
    if (!presentStages.has(stage)) {
      recommendations.push({
        type: 'add_functional_unit',
        message: `建议添加${stage}阶段的节点以完善生命周期分析`,
        action: `添加${stage}类型的节点`,
      });
    }
  });

  return recommendations;
}
