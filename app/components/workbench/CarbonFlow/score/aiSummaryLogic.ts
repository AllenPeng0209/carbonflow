import type { Node } from 'reactflow';
import type { AISummaryReport } from '~/types/aiSummary';
import type {
  NodeData,
  ProductNodeData,
  ManufacturingNodeData,
  DistributionNodeData,
  FinalProductNodeData,
  EvidenceFile,
} from '~/types/nodes';

// Omit 'isExpanded' and 'expandedSection' as they are UI states managed by the component.
type CalculatedAiSummary = Omit<AISummaryReport, 'isExpanded' | 'expandedSection'>;

// This function contains the core logic for calculating the AI summary report.
// It is extracted to be reusable across different components.
export const calculateAiSummary = (currentNodes: Node<NodeData>[]): CalculatedAiSummary => {
  // Define mapping from node.type to Chinese lifecycle stage names
  const nodeTypeToLifecycleStageMap: Record<string, string> = {
    product: '原材料获取阶段',
    manufacturing: '生产阶段',
    distribution: '分销运输阶段',
    usage: '使用阶段',
    disposal: '寿命终止阶段',
  };

  const lifecycle = ['原材料获取阶段', '生产制造阶段', '分销运输阶段', '使用阶段', '寿命终止阶段'];

  // Use node.type and mapped stage names for calculating existing stages
  const existingStages = new Set(
    currentNodes.map((node) => (node.data.lifecycleStage ? node.data.lifecycleStage : undefined)).filter(Boolean),
  );
  const missingLifecycleStages = lifecycle.filter((stage) => !existingStages.has(stage));
  let lifecycleCompletenessScore = 0;

  if (lifecycle.length > 0) {
    lifecycleCompletenessScore = ((lifecycle.length - missingLifecycleStages.length) / lifecycle.length) * 100;
  }

  let totalFields = 0;
  let completedFields = 0;
  const completeIncompleteNodes: AISummaryReport['modelCompleteness']['incompleteNodes'] = [];

  currentNodes.forEach((node) => {
    const missingFields: string[] = [];
    if (!node.data) return;

    const mappedStage = node.data.lifecycleStage ? node.data.lifecycleStage : undefined;

    
    switch (mappedStage) {
      case '原材料获取阶段': {
        const productData = node.data as ProductNodeData;
        if (!node.data.carbonFactor || Number(node.data.carbonFactor) === 0) {
          totalFields++;
          missingFields.push('碳足迹因子');
        } else {
          completedFields++;
          totalFields++;
        }

        if (!productData.quantity || Number(productData.quantity) === 0) {
          totalFields++;
          missingFields.push('数量');
        } else {
          completedFields++;
          totalFields++;
        }
        break;
      }
      case '生产阶段': {
        const manufacturingData = node.data as ManufacturingNodeData;
        if (!node.data.carbonFactor || Number(node.data.carbonFactor) === 0) {
          totalFields++;
          missingFields.push('碳足迹因子');
        } else {
          completedFields++;
          totalFields++;
        }
        if (!manufacturingData.energyConsumption || Number(manufacturingData.energyConsumption) === 0) {
          totalFields++;
          missingFields.push('能源消耗');
        } else {
          completedFields++;
          totalFields++;
        }
        if (!manufacturingData.energyType) {
          totalFields++;
          missingFields.push('能源类型');
        } else {
          completedFields++;
          totalFields++;
        }
        break;
      }
      case '分销运输阶段': {
        const distributionData = node.data as DistributionNodeData;
        if (!node.data.carbonFactor || Number(node.data.carbonFactor) === 0) {
          totalFields++;
          missingFields.push('碳足迹因子');
        } else {
          completedFields++;
          totalFields++;
        }

        if (!distributionData.distributionStartPoint) {
          totalFields++;
          missingFields.push('分销起点');
        } else {
          completedFields++;
          totalFields++;
        }

        if (!distributionData.distributionEndPoint) {
          totalFields++;
          missingFields.push('分销终点');
        } else {
          completedFields++;
          totalFields++;
        }

        if (!distributionData.transportationMode) {
          totalFields++;
          missingFields.push('运输方式');
        } else {
          completedFields++;
          totalFields++;
        }

        if (!distributionData.transportationDistance || Number(distributionData.transportationDistance) === 0) {
          totalFields++;
          missingFields.push('运输距离');
        } else {
          completedFields++;
          totalFields++;
        }
        break;
      }
    }

    if (missingFields.length > 0) {
      completeIncompleteNodes.push({
        id: node.id,
        label: node.data.label || `Node ${node.id}`,
        missingFields,
      });
    }
  });

  
  const NodeCompletenessScore = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  const modelCompletenessScore = Math.round(0.25 * NodeCompletenessScore + 0.75 * lifecycleCompletenessScore);

  const massIncompleteNodes: AISummaryReport['massBalance']['incompleteNodes'] = [];
  let totalInputMass = 0;
  let totalOutputMass = 0;

  currentNodes.forEach((node) => {
    if (!node.data) return;

    if (node.type === 'product') {
      const productData = node.data as ProductNodeData;
      const finalProductData = node.data as Partial<FinalProductNodeData>;
      const quantity = Number(productData.quantity) || 0;

      if (typeof finalProductData.finalProductName === 'string' && finalProductData.finalProductName) {
        if (quantity === 0) {
          massIncompleteNodes.push({
            id: node.id,
            label: node.data.label || `Node ${node.id}`,
            missingFields: ['数量'],
          });
        }
        totalOutputMass += quantity;
      } else {
        if (quantity === 0) {
          massIncompleteNodes.push({
            id: node.id,
            label: node.data.label || `Node ${node.id}`,
            missingFields: ['数量'],
          });
        }
        totalInputMass += quantity;
      }
    }
  });

  const massBalanceScore = totalInputMass > 0 ? Math.min(100, Math.round((totalOutputMass / totalInputMass) * 100)) : 0;

  let totalTraceabilityNodes = 0;
  let traceableNodes = 0;
  const traceableIncompleteNodes: AISummaryReport['dataTraceability']['incompleteNodes'] = [];

  currentNodes.forEach((node) => {
    if (!node.data) return;
    totalTraceabilityNodes++;
    const hasEvidenceFiles = node.data.evidenceFiles && node.data.evidenceFiles.length > 0;
    const hasDatabaseSource = node.data.carbonFactor && Number(node.data.carbonFactor) > 0;
    if (hasEvidenceFiles || hasDatabaseSource) {
      traceableNodes++;
    } else {
      traceableIncompleteNodes.push({
        id: node.id,
        label: node.data.label || `Node ${node.id}`,
        missingFields: ['上传证据文件或配置数据库来源'],
      });
    }
  });

  const dataTraceabilityScore = totalTraceabilityNodes > 0 ? (traceableNodes / totalTraceabilityNodes) * 100 : 0;

  let totalValidationNodeNumber = 0;
  let dataOkValidationNodeNumber = 0;
  const validationIncompleteNodes: AISummaryReport['validation']['incompleteNodes'] = [];

  currentNodes.forEach((node) => {
    if (!node.data) return;
    totalValidationNodeNumber++;
    const hasValidatedFiles = node.data.evidenceFiles?.some((file: EvidenceFile) => file.status === 'verified');
    if (hasValidatedFiles) {
      dataOkValidationNodeNumber++;
    } else {
      validationIncompleteNodes.push({
        id: node.id,
        label: node.data.label || `Node ${node.id}`,
        missingFields: ['上传已验证的证据文件'],
      });
    }
  });

  const validationScore = Math.round(
    totalValidationNodeNumber > 0 ? (dataOkValidationNodeNumber / totalValidationNodeNumber) * 100 : 0,
  );

  const lifecycleCompletenessScore100 = Math.round(Math.max(0, Math.min(100, lifecycleCompletenessScore)));
  const NodeCompletenessScore100 = Math.round(Math.max(0, Math.min(100, NodeCompletenessScore)));
  const massBalanceScore100 = Math.round(Math.max(0, Math.min(100, massBalanceScore)));
  const dataTraceabilityScore100 = Math.round(Math.max(0, Math.min(100, dataTraceabilityScore)));
  const validationScore100 = Math.round(Math.max(0, Math.min(100, validationScore)));

  const credibilityScore = Math.round(
    0.1 * lifecycleCompletenessScore100 +
      0.3 * NodeCompletenessScore100 +
      0.1 * massBalanceScore100 +
      0.35 * dataTraceabilityScore100 +
      0.15 * validationScore100,
  );

  return {
    credibilityScore,
    missingLifecycleStages,
    modelCompleteness: {
      score: modelCompletenessScore,
      lifecycleCompleteness: lifecycleCompletenessScore,
      nodeCompleteness: NodeCompletenessScore,
      incompleteNodes: completeIncompleteNodes,
    },
    massBalance: {
      score: massBalanceScore100,
      ratio: totalInputMass > 0 ? totalOutputMass / totalInputMass : 0,
      incompleteNodes: massIncompleteNodes,
    },
    dataTraceability: {
      score: dataTraceabilityScore100,
      coverage: dataTraceabilityScore100,
      incompleteNodes: traceableIncompleteNodes,
    },
    validation: {
      score: validationScore100,
      consistency: validationScore100,
      incompleteNodes: validationIncompleteNodes,
    },
  };
}; 