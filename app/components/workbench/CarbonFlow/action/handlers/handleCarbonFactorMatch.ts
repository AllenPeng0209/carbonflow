import type { CarbonFlowAction } from '~/types/actions';
import type { Node } from 'reactflow';
import type { NodeData, ProductNodeData, ManufacturingNodeData, DistributionNodeData, NodeType } from '~/types/nodes';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

interface CarbonFactorResult {
  factor: number;
  activityName?: string;
  unit?: string;
  geography?: string;
  activityUUID?: string;
  dataSource?: string;
  importDate?: string;
}

/**
 * 碳因子匹配：遍历节点，对缺少碳因子的节点调用外部API进行匹配，并自动填充对应字段。
 * @param store Zustand store
 * @param action CarbonFlowAction
 */

async function _fetchCarbonFactorFromClimatesealAPI(node: Node<NodeData>): Promise<CarbonFactorResult | null> {
  try {
    const label = node.data.label || '';

    if (!label || label.trim() === '') {
      console.warn(`节点 ${node.id} 没有有效的标签用于碳因子查询`);
      return null;
    }

    console.log(`尝试为节点 ${node.id} (${label}) 从Climateseal API获取碳因子`);

    const requestBody = {
      labels: [label, node.type],
      top_k: 3,
      min_score: 0.3,
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

    if (data.results && data.results.length > 0 && data.results[0].matches && data.results[0].matches.length > 0) {
      const bestMatch = data.results[0].matches[0];
      return {
        factor: bestMatch.kg_co2eq,
        activityName: bestMatch.activity_name || '',
        unit: bestMatch.reference_product_unit || 'kg',
        geography: bestMatch.geography,
        activityUUID: bestMatch.activity_uuid_product_uuid || undefined,
        dataSource: bestMatch.data_source || undefined,
        importDate: bestMatch.import_date || undefined,
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

async function _fetchCarbonFactorFromClimatiqAPI(node: Node<NodeData>): Promise<CarbonFactorResult | null> {
  try {
    const label = node.data.label || '';

    if (!label || label.trim() === '') {
      console.warn(`节点 ${node.id} 没有有效的标签用于碳因子查询`);
      return null;
    }

    console.log(`尝试为节点 ${node.id} (${label}) 从Climatiq API获取碳因子`);

    let activityId = 'electricity-supply_grid-source_residual_mix';
    let activityValue = 1000;
    const activityUnitForFactor = 'kWh';

    switch (node.type as NodeType) {
      case 'product':
        activityId = 'material-production_average-steel-primary';
        activityValue = Number((node.data as ProductNodeData).weight) || 1000;
        break;
      case 'distribution':
        activityId = 'freight_vehicle-type_truck-size_heavy-fuel_source_diesel-distance_long';
        activityValue = Number((node.data as DistributionNodeData).transportationDistance) || 1000;
        break;
      case 'manufacturing':
        activityId = 'electricity-supply_grid-source_residual_mix';
        activityValue = Number((node.data as ManufacturingNodeData).energyConsumption) || 1000;
        break;
    }

    const requestBody = {
      emission_factor: {
        activity_id: activityId,
        data_version: '^21',
      },
      parameters: {
        energy: activityValue,
        energy_unit: activityUnitForFactor,
      },
    };

    console.log('Climatiq requestBody', requestBody);

    const API_KEY = 'KSBRPY3WYN3HZ5XBCKD0FYD80R';
    const response = await fetch('https://api.climatiq.io/data/v1/estimate', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Climatiq API返回错误状态: ${response.status}`);
    }

    const data = (await response.json()) as {
      co2e?: number;
      emission_factor?: { name?: string };
      co2e_unit?: string;
    };
    console.log('Climatiq 碳因子API响应:', data);

    if (data && data.co2e !== undefined && typeof data.co2e === 'number' && activityValue !== 0) {
      let factorKgCo2ePerActivityUnit = data.co2e / activityValue;

      if (data.co2e_unit === 'g') {
        factorKgCo2ePerActivityUnit /= 1000;
      } else if (data.co2e_unit === 't' || data.co2e_unit === 'tonne') {
        factorKgCo2ePerActivityUnit *= 1000;
      } else if (data.co2e_unit !== 'kg') {
        console.warn(
          `Climatiq CO2e unit is ${data.co2e_unit}. Factor is ${factorKgCo2ePerActivityUnit} [${data.co2e_unit}/${activityUnitForFactor}]. Conversion to kgCO2e might be inaccurate if not 'g', 't', or 'kg'.`,
        );
      }

      return {
        factor: factorKgCo2ePerActivityUnit,
        activityName: data.emission_factor?.name || activityId,
        unit: activityUnitForFactor,
        geography: undefined, // Climatiq /estimate doesn't directly provide this for the factor itself
        activityUUID: activityId, // Use the activity_id used for the query
        dataSource: 'Climatiq API',
        importDate: new Date().toISOString(),
      };
    } else {
      console.warn('Climatiq API响应格式不符合预期或 activityValue (energy parameter) 为0');
      return null;
    }
  } catch (error) {
    console.error(`从Climatiq获取碳因子时出错:`, error);
    console.log(`Climatiq API调用失败`);

    return null;
  }
}

export async function handleCarbonFactorMatch(
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
      matchResults.logs.push(`跳过节点 "${node.data.label || node.id}"，因为它已经有碳因子: ${currentFactor}`);
    } else {
      try {
        // 先尝试 Climateseal API（新的默认接口）
        const climatesealResult = await _fetchCarbonFactorFromClimatesealAPI(node);

        if (climatesealResult) {
          nodesToUpdate.push({
            node,
            factor: climatesealResult.factor,
            activityName: climatesealResult.activityName || 'Unknown Activity',
            unit: climatesealResult.unit || 'unit',
            geography: climatesealResult.geography,
            activityUUID: climatesealResult.activityUUID,
            dataSource: climatesealResult.dataSource,
            importDate: climatesealResult.importDate,
          });

          matchResults.success.push(node.id);
          matchResults.logs.push(
            `节点 "${node.data.label || node.id}" 通过Climateseal API匹配成功，碳因子: ${climatesealResult.factor}`,
          );
        } else {
          // Climateseal API 失败后，尝试 Climatiq API 作为备选
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
              `节点 "${node.data.label || node.id}" 通过Climatiq API匹配成功，碳因子: ${climatiqResult.factor}`,
            );
          } else {
            matchResults.failed.push(node.id);
            matchResults.logs.push(`节点 "${node.data.label || node.id}" 无法从任何API匹配到碳因子`);
          }
        }
      } catch (error: any) {
        matchResults.failed.push(node.id);
        matchResults.logs.push(`处理节点 "${node.data.label || node.id}" 时发生错误: ${error.message}`);
        console.error(`处理节点 "${node.data.label || node.id}" 时发生错误:`, error);
      }
    }
  }

  if (nodesToUpdate.length > 0) {
    const allNodesFromState = store.getState().nodes;
    const finalNodesList = allNodesFromState.map((existingNode) => {
      const updateForThisNode = nodesToUpdate.find((upd) => upd.node.id === existingNode.id);

      if (updateForThisNode) {
        return {
          ...existingNode,
          data: {
            ...existingNode.data,
            carbonFactor: String(updateForThisNode.factor), // Ensure it's a string
            carbonFactorName: updateForThisNode.activityName, // Map to carbonFactorName
            carbonFactorUnit: updateForThisNode.unit, // Map to carbonFactorUnit
            emissionFactorGeographicalRepresentativeness: updateForThisNode.geography, // Map to emissionFactorGeographicalRepresentativeness
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

  console.log('Carbon factor match operation completed, updated:', nodesToUpdate.length > 0);
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
