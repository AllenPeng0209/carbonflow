import type { CarbonFlowAction } from '~/types/actions';
import type { Node } from 'reactflow';
import type {
  NodeData,
  ProductNodeData,
  ManufacturingNodeData,
  DistributionNodeData,
} from '~/types/nodes';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { optimizeCarbonFactorSearchWithLlmAgent } from '~/lib/agents/carbon-factor-search-optimizer-agent';
import { rerankCarbonFactorResultsWithLlmAgent } from '~/lib/agents/carbon-factor-result-reranker-agent';
import type { CarbonFactorCandidate } from '~/lib/agents/carbon-factor-result-reranker-agent';

// 定义 NodeType 类型（临时修复）
type NodeType =
  | 'product'
  | 'manufacturing'
  | 'distribution'
  | 'usage'
  | 'disposal'
  | 'finalProduct';

interface ClimatiqEstimateResponse {
  co2e: number;
  co2e_unit: string;
  emission_factor: {
    name: string;
    activity_id: string;
    // ... any other fields from emission_factor
  };
  // ... any other top-level fields
}

interface CarbonFactorResult {
  factor: number;
  activityName?: string;
  unit?: string;
  geography?: string;
  activityUUID?: string;
  dataSource?: string;
  importDate?: string;
  score?: number; // 添加评分字段用于AI重排
}

/**
 * 碳因子匹配：遍历节点，对缺少碳因子的节点调用外部API进行匹配，并自动填充对应字段。
 * @param store Zustand store
 * @param action CarbonFlowAction
 */
async function _fetchCarbonFactorFromClimatesealAPI(
  node: Node<NodeData>,
): Promise<CarbonFactorResult | null> {
  try {
    const label = node.data.label || '';

    if (!label || label.trim() === '') {
      console.warn(`节点 ${node.id} 没有有效的标签用于碳因子查询`);
      return null;
    }

    let searchQuery = label;
    // let aiConfidence = 1.0; // Default confidence when not using AI - This is not used later, so commented out.
    try {
      // 🔥 使用AI优化搜索词
      const aiOptimization = await optimizeCarbonFactorSearchWithLlmAgent({
        input: {
          nodeLabel: label,
          nodeType: node.type as NodeType,
          lifecycleStage: node.data.lifecycleStage,
          emissionType: node.data.emissionType,
          contextData: {
            material: (node.data as ProductNodeData).material,
            weight: (node.data as ProductNodeData).weight,
            energyType: (node.data as ManufacturingNodeData).energyType,
            transportationMode: (
              node.data as DistributionNodeData
            ).transportationMode,
          },
        },
      });

      searchQuery = aiOptimization.optimizedQuery;
      // aiConfidence = aiOptimization.confidence;
      console.log(
        `🔍 AI优化搜索词: "${label}" -> "${searchQuery}" (置信度: ${aiOptimization.confidence})`,
      );
      console.log(`💡 优化原因: ${aiOptimization.reasoning}`);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('DASHSCOPE_API_KEY') ||
          error.message.includes('OPENAI_API_KEY'))
      ) {
        console.warn(
          `🚧 未检测到AI API密钥，跳过搜索词优化，将使用原始标签: "${label}"`,
        );
      } else {
        // 对于其他AI错误，仍然抛出
        throw error;
      }
    }

    console.log(
      `尝试为节点 ${node.id} (${searchQuery}) 从Climateseal API获取碳因子`,
    );

    const requestBody = {
      labels: [searchQuery], // 使用AI优化后的搜索词
      top_k: 5, // 增加候选结果数量供AI重排
      min_score: 0.2, // 降低最低分数阈值
      embedding_model: 'dashscope_v3',
      search_method: 'script_score',
    };

    console.log('Climateseal requestBody', requestBody);

    const response = await fetch('https://api.climateseals.com/match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Climateseal API返回错误状态: ${response.status}`);
    }

    const data = (await response.json()) as {
      success: boolean;
      results: Array<{
        query_label: string;
        matches: Array<{
          kg_co2eq: number;
          activity_name: string;
          reference_product_unit: string;
          geography: string;
          activity_uuid_product_uuid: string;
          data_source: string;
          import_date: string;
          [key: string]: any;
        }>;
        error: string | null;
      }>;
    };
    console.log('Climateseal 碳因子API响应:', data);

    if (
      data.results &&
      data.results.length > 0 &&
      data.results[0].matches &&
      data.results[0].matches.length > 0
    ) {
      // 将API结果转换为标准格式
      const candidates: CarbonFactorCandidate[] = data.results[0].matches.map(
        (match) => ({
          factor: match.kg_co2eq,
          activityName: match.activity_name || '',
          unit: match.reference_product_unit || 'kg',
          geography: match.geography,
          activityUUID: match.activity_uuid_product_uuid || undefined,
          dataSource: match.data_source || undefined,
          importDate: match.import_date || undefined,
        }),
      );

      let bestMatch;
      try {
        // 🔥 使用AI重排序结果
        const rerankResult = await rerankCarbonFactorResultsWithLlmAgent({
          input: {
            nodeLabel: label,
            nodeType: node.type as NodeType,
            lifecycleStage: node.data.lifecycleStage,
            emissionType: node.data.emissionType,
            contextData: {
              material: (node.data as ProductNodeData).material,
              weight: (node.data as ProductNodeData).weight,
              energyType: (node.data as ManufacturingNodeData).energyType,
              transportationMode: (
                node.data as DistributionNodeData
              ).transportationMode,
            },
            candidates,
          },
        });

        bestMatch = rerankResult.bestMatch;
        console.log(
          `🎯 AI重排序完成，最佳匹配: ${rerankResult.bestMatch.activityName} (得分: ${rerankResult.bestMatch.aiScore})`,
        );
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('DASHSCOPE_API_KEY') ||
            error.message.includes('OPENAI_API_KEY'))
        ) {
          console.warn(
            `🚧 未检测到AI API密钥，跳过结果重排序，将使用第一个候选结果。`,
          );
          bestMatch = { ...candidates[0], aiScore: 0.5 }; // Use first candidate and add a default score
        } else {
          // For other errors, still throw them
          throw error;
        }
      }

      return {
        factor: bestMatch.factor,
        activityName: bestMatch.activityName,
        unit: bestMatch.unit,
        geography: bestMatch.geography,
        activityUUID: bestMatch.activityUUID,
        dataSource: bestMatch.dataSource,
        importDate: bestMatch.importDate,
        score: bestMatch.aiScore,
      };
    } else {
      console.warn('Climateseal API没有返回匹配结果');
      return null;
    }
  } catch (error) {
    console.error(`从Climateseal获取碳因子时出错:`, error);
    console.log(`Climateseal API调用失败，不使用默认碳因子`);

    return null;
  }
}

async function _fetchCarbonFactorFromClimatiqAPI(
  node: Node<NodeData>,
): Promise<CarbonFactorResult | null> {
  try {
    const label = node.data.label || '';

    if (!label || label.trim() === '') {
      console.warn(`节点 ${node.id} 没有有效的标签用于碳因子查询`);
      return null;
    }

    let searchQuery = label;
    let aiConfidence = 1.0; // Default confidence when not using AI
    try {
      // 🔥 使用AI优化搜索词
      const aiOptimization = await optimizeCarbonFactorSearchWithLlmAgent({
        input: {
          nodeLabel: label,
          nodeType: node.type as NodeType,
          lifecycleStage: node.data.lifecycleStage,
          emissionType: node.data.emissionType,
          contextData: {
            material: (node.data as ProductNodeData).material,
            weight: (node.data as ProductNodeData).weight,
            energyType: (node.data as ManufacturingNodeData).energyType,
            transportationMode: (
              node.data as DistributionNodeData
            ).transportationMode,
          },
        },
      });
      searchQuery = aiOptimization.optimizedQuery;
      aiConfidence = aiOptimization.confidence;
      console.log(`🔍 AI优化搜索词 (Climatiq): "${label}" -> "${searchQuery}"`);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('DASHSCOPE_API_KEY') ||
          error.message.includes('OPENAI_API_KEY'))
      ) {
        console.warn(
          `🚧 未检测到AI API密钥，跳过Climatiq的搜索词优化，将使用原始标签: "${label}"`,
        );
      } else {
        // 对于其他AI错误，仍然抛出
        throw error;
      }
    }

    console.log(`尝试为节点 ${node.id} (${label}) 从Climatiq API获取碳因子`);

    const requestBody = {
      emission_factor: {
        activity_id: searchQuery,
        data_version: '^21',
      },
      parameters: {
        ...(node.type === 'product' && {
          weight: Number((node.data as ProductNodeData).weight) || 1000,
          weight_unit: 'kg',
        }),
        ...(node.type === 'distribution' && {
          distance:
            Number(
              (node.data as DistributionNodeData).transportationDistance,
            ) || 100,
          distance_unit: 'km',
        }),
        ...(node.type === 'manufacturing' && {
          energy:
            Number((node.data as ManufacturingNodeData).energyConsumption) ||
            1000,
          energy_unit: 'kWh',
        }),
      },
    };

    console.log('Climatiq requestBody', requestBody);

    const CLIMATIQ_API_KEY = 'KSBRPY3WYN3HZ5XBCKD0FYD80R';
    const response = await fetch('https://api.climatiq.io/data/v1/estimate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CLIMATIQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Climatiq API Error Body:', errorBody);
      throw new Error(`Climatiq API返回错误状态: ${response.status}`);
    }

    const data = (await response.json()) as ClimatiqEstimateResponse;
    console.log('Climatiq 碳因子API响应:', data);

    let activityValue = 1;
    let activityUnit = 'unit'; // Default unit

    if (node.type === 'product') {
      activityValue = Number((node.data as ProductNodeData).weight) || 1;
      activityUnit = (node.data as any).unit || 'kg';
    } else if (node.type === 'distribution') {
      activityValue =
        Number((node.data as DistributionNodeData).transportationDistance) || 1;
      activityUnit = 'km';
    } else if (node.type === 'manufacturing') {
      activityValue =
        Number((node.data as ManufacturingNodeData).energyConsumption) || 1;
      activityUnit = 'kWh';
    }

    if (
      data &&
      data.co2e !== undefined &&
      typeof data.co2e === 'number' &&
      activityValue !== 0
    ) {
      let factorKgCo2ePerActivityUnit = data.co2e / activityValue;

      if (data.co2e_unit === 'g') {
        factorKgCo2ePerActivityUnit /= 1000;
      } else if (data.co2e_unit === 't') {
        factorKgCo2ePerActivityUnit *= 1000;
      } else if (data.co2e_unit !== 'kg') {
        console.warn(
          `Climatiq CO2e unit is ${data.co2e_unit}. Factor is ${factorKgCo2ePerActivityUnit} [${data.co2e_unit}/${activityUnit}]. Conversion to kgCO2e might be inaccurate if not 'g', 't', or 'kg'.`,
        );
      }

      return {
        factor: factorKgCo2ePerActivityUnit,
        activityName: data.emission_factor?.name || searchQuery,
        unit: activityUnit,
        geography: undefined, // Climatiq /estimate doesn't directly provide this for the factor itself
        activityUUID: searchQuery, // Use the activity_id used for the query
        dataSource: 'Climatiq API',
        importDate: new Date().toISOString(),
        score: aiConfidence,
      };
    } else {
      console.warn('Climatiq API没有返回有效的碳因子结果');
      return null;
    }
  } catch (error) {
    console.error(`从Climatiq获取碳因子时出错:`, error);
    return null;
  }
}

export async function handleCarbonFactorMatchWithAI(
  store: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> {
  console.log('Handling Carbon Factor Match action:', action);

  type NodeUpdateInfo = {
    node: Node<NodeData>;
    factor: number;
    activityName: string;
    unit: string;
    geography?: string;
    activityUUID?: string;
    dataSource?: string;
    importDate?: string;
  };

  const nodesToUpdate: NodeUpdateInfo[] = [];

  const matchResults = {
    success: [] as string[],
    failed: [] as string[],
    logs: [] as string[],
  };

  const nodeIdsInput = action.nodeId;
  let nodesToProcess: Node<NodeData>[] = [];

  if (nodeIdsInput) {
    const ids = nodeIdsInput
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id);

    for (const id of ids) {
      const node = store.getState().nodes.find((n) => n.id === id);

      if (node) {
        nodesToProcess.push(node);
      } else {
        matchResults.logs.push(`未找到ID为 "${id}" 的节点`);
      }
    }
  } else {
    nodesToProcess = store.getState().nodes;
  }

  for (const node of nodesToProcess) {
    const currentFactor = node.data.carbonFactor;

    if (currentFactor && parseFloat(currentFactor) !== 0) {
      matchResults.logs.push(
        `跳过节点 "${
          node.data.label || node.id
        }"，因为它已经有碳因子: ${currentFactor}`,
      );
    } else {
      try {
        const climatiqResult = await _fetchCarbonFactorFromClimatiqAPI(node);

        if (climatiqResult) {
          nodesToUpdate.push({
            node,
            factor: climatiqResult.factor,
            activityName: climatiqResult.activityName || 'Unknown Activity',
            unit: climatiqResult.unit || 'unit',
            geography: climatiqResult.geography,
            activityUUID: climatiqResult.activityUUID,
            dataSource: climatiqResult.dataSource,
            importDate: climatiqResult.importDate,
          });

          matchResults.success.push(node.id);
          matchResults.logs.push(
            `节点 "${
              node.data.label || node.id
            }" 通过Climatiq API匹配成功，碳因子: ${climatiqResult.factor}`,
          );
        } else {
          const climatesealResult =
            await _fetchCarbonFactorFromClimatesealAPI(node);

          if (climatesealResult) {
            nodesToUpdate.push({
              node,
              factor: climatesealResult.factor,
              activityName:
                climatesealResult.activityName || 'Unknown Activity',
              unit: climatesealResult.unit || 'unit',
              geography: climatesealResult.geography,
              activityUUID: climatesealResult.activityUUID,
              dataSource: climatesealResult.dataSource,
              importDate: climatesealResult.importDate,
            });

            matchResults.success.push(node.id);
            matchResults.logs.push(
              `节点 "${
                node.data.label || node.id
              }" 通过Climateseal API匹配成功，碳因子: ${
                climatesealResult.factor
              }`,
            );
          } else {
            matchResults.failed.push(node.id);
            matchResults.logs.push(
              `节点 "${
                node.data.label || node.id
              }" 无法从任何API匹配到碳因子`,
            );
          }
        }
      } catch (error: any) {
        matchResults.failed.push(node.id);
        matchResults.logs.push(
          `处理节点 "${node.data.label || node.id}" 时发生错误: ${
            error.message
          }`,
        );
        console.error(
          `处理节点 "${node.data.label || node.id}" 时发生错误:`,
          error,
        );
      }
    }
  }

  if (nodesToUpdate.length > 0) {
    const allNodesFromState = store.getState().nodes;
    const finalNodesList = allNodesFromState.map((existingNode) => {
      const updateForThisNode = nodesToUpdate.find(
        (upd) => upd.node.id === existingNode.id,
      );

      if (updateForThisNode) {
        return {
          ...existingNode,
          data: {
            ...existingNode.data,
            carbonFactor: String(updateForThisNode.factor), // Ensure it's a string
            carbonFactorName: updateForThisNode.activityName, // Map to carbonFactorName
            carbonFactorUnit: updateForThisNode.unit, // Map to carbonFactorUnit
            emissionFactorGeographicalRepresentativeness:
              updateForThisNode.geography, // Map to emissionFactorGeographicalRepresentativeness
            activityUUID: updateForThisNode.activityUUID, // Stays as activityUUID
            carbonFactordataSource: updateForThisNode.dataSource, // Map to carbonFactordataSource
            emissionFactorTemporalRepresentativeness: updateForThisNode.importDate, // Map to emissionFactorTemporalRepresentativeness
          },
        };
      }

      return existingNode;
    });

    store.getState().setNodes(finalNodesList);
    matchResults.logs.push(`${nodesToUpdate.length} 个节点的碳因子已更新。`);
  }

  console.log(
    'Carbon factor match operation completed, updated:',
    nodesToUpdate.length > 0,
  );
  console.log('Match results:', matchResults);

  console.log('[handleCarbonFactorMatch] 准备派发carbonflow-match-results事件');
  console.log('[handleCarbonFactorMatch] 事件详情:', matchResults);

  window.dispatchEvent(
    new CustomEvent('carbonflow-match-results', {
      detail: matchResults,
    }),
  );

  console.log('[handleCarbonFactorMatch] carbonflow-match-results事件已派发');

  // 也派发旧的事件以保持兼容性
  window.dispatchEvent(
    new CustomEvent('carbonFlowEvent', {
      detail: {
        type: 'factor_match_complete',
        matchResults,
      },
    }),
  );
}
