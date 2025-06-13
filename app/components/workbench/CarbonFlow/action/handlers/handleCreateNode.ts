import type { Node } from 'reactflow';
import type { CarbonFlowAction } from '~/types/actions';
import type {
  NodeData,
  ProductNodeData,
  ManufacturingNodeData,
  DistributionNodeData,
  UsageNodeData,
  DisposalNodeData,
  FinalProductNodeData,
} from '~/types/nodes'; // Assuming these types are correctly pathed
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

// Basic safeGet utility function. Replace with your actual import if available.
function safeGet<T extends object, K extends keyof T>(obj: T | undefined | null, key: K, defaultValue: T[K]): T[K] {
  if (obj && typeof obj === 'object' && key in obj && obj[key] !== undefined && obj[key] !== null) {
    // Basic type check for numbers and booleans if defaultValue suggests them
    if (typeof defaultValue === 'number' && typeof obj[key] !== 'number') {
      const num = Number(obj[key]);
      return (isNaN(num) ? defaultValue : num) as T[K];
    }

    if (typeof defaultValue === 'boolean' && typeof obj[key] !== 'boolean') {
      return (String(obj[key]).toLowerCase() === 'true' || obj[key] === 1) as T[K];
    }

    return obj[key];
  }

  return defaultValue;
}

// 简化的 JSON 修复函数
function repairIncompleteJson(jsonStr: string): string {
  const trimmed = jsonStr.trim();
  
  if (trimmed.endsWith('}')) {
    return trimmed;
  }
  
  // 找到最后一个完整的属性
  const lastCommaIndex = trimmed.lastIndexOf(',');
  const lastColonIndex = trimmed.lastIndexOf(':');
  
  if (lastColonIndex > lastCommaIndex) {
    // 有未完成的属性，截取到最后一个逗号
    if (lastCommaIndex !== -1) {
      return trimmed.substring(0, lastCommaIndex) + '}';
    }
    // 如果没有逗号，尝试找到第一个完整属性后截取
    const firstCommaIndex = trimmed.indexOf(',');
    
    if (firstCommaIndex !== -1) {
      return trimmed.substring(0, firstCommaIndex) + '}';
    }
  }
  
  return trimmed + '}';
}

// 从部分 JSON 字符串中提取基本信息
function extractBasicInfo(content: string): Record<string, any> {
  const matches = {
    nodeId: content.match(/"nodeId":\s*"([^"]*)"/)?.[1] || '',
    label: content.match(/"label":\s*"([^"]*)"/)?.[1] || '解析失败的节点',
    lifecycleStage: content.match(/"lifecycleStage":\s*"([^"]*)"/)?.[1] || '分销运输阶段',
    emissionType: content.match(/"emissionType":\s*"([^"]*)"/)?.[1] || '分销运输',
    transportationMode: content.match(/"transportationMode":\s*"([^"]*)"/)?.[1] || '',
    transportationDistance: Number(content.match(/"transportationDistance":\s*(\d+)/)?.[1] || 0),
  };
  
  return matches;
}

export function handleCreateNode(store: typeof useCarbonFlowStore, action: CarbonFlowAction): void {
  if (!action.content) {
    console.error('[handleCreateNode] Action is missing content');
    return;
  }

  let inputData: Record<string, any> = {};

  try {
    if (typeof action.content === 'string') {
      console.log('[handleCreateNode] 原始 content 长度:', action.content.length);
      console.log('[handleCreateNode] 内容预览:', action.content.substring(0, 200) + '...');
      
      const repairedJson = repairIncompleteJson(action.content);
      console.log('[handleCreateNode] 修复后的 JSON:', repairedJson.substring(0, 200) + '...');
      
      inputData = JSON.parse(repairedJson);
    } else {
      inputData = action.content;
    }
  } catch (e) {
    console.error('[handleCreateNode] JSON 解析失败，尝试提取基本信息:', (e as Error).message);
    
    if (typeof action.content === 'string') {
      inputData = extractBasicInfo(action.content);
      console.log('[handleCreateNode] 提取的基本信息:', inputData);
    } else {
      inputData = { 
        label: '解析失败的节点', 
        lifecycleStage: '分销运输阶段',
        nodeId: `fallback-${Date.now()}`
      };
    }
  }

  const lifecycleStage = inputData.lifecycleStage;
  const nodeId = inputData.nodeId || `${lifecycleStage}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const workflowId = inputData.workflowId || store.getState().workflowId;

  if (!workflowId) {
    console.error('[handleCreateNode] content/workflowId 缺失，無法創建節點');
    return;
  }

  let data: NodeData;

  switch (lifecycleStage) {
    case '原材料获取阶段':
      data = {
        id: nodeId,
        workflowId: workflowId!,
        productId: nodeId, // Assuming productId is the same as nodeId for now
        label: String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`)),
        nodeId: String(safeGet(inputData, 'nodeId', nodeId)),
        lifecycleStage: String(safeGet(inputData, 'lifecycleStage', 'unknown')),
        emissionType: String(safeGet(inputData, 'emissionType', 'unknown')),
        quantity: String(safeGet(inputData, 'quantity', '')),
        activityUnit: String(safeGet(inputData, 'activityUnit', '')),
        carbonFactor: String(safeGet(inputData, 'carbonFactor', '0')),
        carbonFactorName: String(safeGet(inputData, 'carbonFactorName', '')),
        unitConversion: String(safeGet(inputData, 'unitConversion', '0')),
        carbonFactordataSource: String(safeGet(inputData, 'carbonFactordataSource', '')),
        activitydataSource: String(safeGet(inputData, 'activitydataSource', 'unknown')),
        activityScore: Number(safeGet(inputData, 'activityScore', 0)),
        carbonFootprint: String(safeGet(inputData, 'carbonFootprint', '0')),
        verificationStatus: String(safeGet(inputData, 'verificationStatus', 'pending')),
        material: String(safeGet(inputData, 'material', '')),
        weight_per_unit: String(safeGet(inputData, 'weight_per_unit', '')),
        isRecycled: Boolean(safeGet(inputData, 'isRecycled', false)),
        recycledContent: String(safeGet(inputData, 'recycledContent', '')),
        recycledContentPercentage: Number(safeGet(inputData, 'recycledContentPercentage', 0)),
        sourcingRegion: String(safeGet(inputData, 'sourcingRegion', '')),
        SourceLocation: String(safeGet(inputData, 'SourceLocation', '')),
        Destination: String(safeGet(inputData, 'Destination', '')),
        SupplierName: String(safeGet(inputData, 'SupplierName', '')),
        SupplierAddress: String(safeGet(inputData, 'SupplierAddress', '')),
        ProcessingPlantAddress: String(safeGet(inputData, 'ProcessingPlantAddress', '')),
        RefrigeratedTransport: Boolean(safeGet(inputData, 'RefrigeratedTransport', false)),
        weight: Number(safeGet(inputData, 'weight', 0)),
        supplier: String(safeGet(inputData, 'supplier', '')),
        certaintyPercentage: Number(safeGet(inputData, 'certaintyPercentage', 0)),
        dataSources: safeGet(inputData, 'dataSources', undefined) as string | undefined,
        parse_from_file_name: String(safeGet(inputData, 'parse_from_file_name', '')),
      } as ProductNodeData;
      break;
    case '生产制造阶段':
      data = {
        id: nodeId,
        workflowId: workflowId!,
        label: String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`)),
        nodeId: String(safeGet(inputData, 'nodeId', nodeId)),
        lifecycleStage: String(safeGet(inputData, 'lifecycleStage', 'unknown')),
        emissionType: String(safeGet(inputData, 'emissionType', 'unknown')),
        quantity: String(safeGet(inputData, 'quantity', '')),
        activityUnit: String(safeGet(inputData, 'activityUnit', '')),
        carbonFactor: String(safeGet(inputData, 'carbonFactor', '0')),
        activitydataSource: String(safeGet(inputData, 'activitydataSource', 'unknown')),
        activityScore: Number(safeGet(inputData, 'activityScore', 0)),
        carbonFootprint: String(safeGet(inputData, 'carbonFootprint', '0')),
        verificationStatus: String(safeGet(inputData, 'verificationStatus', 'pending')),
        ElectricityAccountingMethod: String(safeGet(inputData, 'ElectricityAccountingMethod', '')),
        ElectricityAllocationMethod: String(safeGet(inputData, 'ElectricityAllocationMethod', '')),
        EnergyConsumptionMethodology: String(safeGet(inputData, 'EnergyConsumptionMethodology', '')),
        EnergyConsumptionAllocationMethod: String(safeGet(inputData, 'EnergyConsumptionAllocationMethod', '')),
        energyConsumption: Number(safeGet(inputData, 'energyConsumption', 0)),
        energyType: String(safeGet(inputData, 'energyType', '')),
        chemicalsMaterial: String(safeGet(inputData, 'chemicalsMaterial', '')),
        MaterialAllocationMethod: String(safeGet(inputData, 'MaterialAllocationMethod', '')),
        WaterUseMethodology: String(safeGet(inputData, 'WaterUseMethodology', '')),
        WaterAllocationMethod: String(safeGet(inputData, 'WaterAllocationMethod', '')),
        waterConsumption: Number(safeGet(inputData, 'waterConsumption', 0)),
        packagingMaterial: String(safeGet(inputData, 'packagingMaterial', '')),
        direct_emission: String(safeGet(inputData, 'direct_emission', '')),
        WasteGasTreatment: String(safeGet(inputData, 'WasteGasTreatment', '')),
        WasteDisposalMethod: String(safeGet(inputData, 'WasteDisposalMethod', '')),
        WastewaterTreatment: String(safeGet(inputData, 'WastewaterTreatment', '')),
        productionMethod: String(safeGet(inputData, 'productionMethod', '')),
        processEfficiency: Number(safeGet(inputData, 'processEfficiency', 0)),
        wasteGeneration: Number(safeGet(inputData, 'wasteGeneration', 0)),
        recycledMaterialPercentage: Number(safeGet(inputData, 'recycledMaterialPercentage', 0)),
        productionCapacity: Number(safeGet(inputData, 'productionCapacity', 0)),
        machineUtilization: Number(safeGet(inputData, 'machineUtilization', 0)),
        qualityDefectRate: Number(safeGet(inputData, 'qualityDefectRate', 0)),
        processTechnology: String(safeGet(inputData, 'processTechnology', '')),
        manufacturingStandard: String(safeGet(inputData, 'manufacturingStandard', '')),
        automationLevel: String(safeGet(inputData, 'automationLevel', '')),
        manufacturingLocation: String(safeGet(inputData, 'manufacturingLocation', '')),
        byproducts: String(safeGet(inputData, 'byproducts', '')),
        emissionControlMeasures: String(safeGet(inputData, 'emissionControlMeasures', '')),
        dataSources: safeGet(inputData, 'dataSources', undefined) as string | undefined,
        productionMethodDataSource: String(safeGet(inputData, 'productionMethodDataSource', '')),
        productionMethodVerificationStatus: String(safeGet(inputData, 'productionMethodVerificationStatus', '')),
        productionMethodApplicableStandard: String(safeGet(inputData, 'productionMethodApplicableStandard', '')),
        productionMethodCompletionStatus: String(safeGet(inputData, 'productionMethodCompletionStatus', '')),
        parse_from_file_name: String(safeGet(inputData, 'parse_from_file_name', '')),
      } as ManufacturingNodeData;
      break;
    case '分销运输阶段':
      data = {
        id: nodeId,
        workflowId: workflowId!,
        label: String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`)),
        nodeId: String(safeGet(inputData, 'nodeId', nodeId)),
        lifecycleStage: String(safeGet(inputData, 'lifecycleStage', 'unknown')),
        emissionType: String(safeGet(inputData, 'emissionType', 'unknown')),
        quantity: String(safeGet(inputData, 'quantity', '')),
        activityUnit: String(safeGet(inputData, 'activityUnit', '')),
        carbonFactor: String(safeGet(inputData, 'carbonFactor', '0')),
        activitydataSource: String(safeGet(inputData, 'activitydataSource', 'unknown')),
        activityScore: Number(safeGet(inputData, 'activityScore', 0)),
        carbonFootprint: String(safeGet(inputData, 'carbonFootprint', '0')),
        verificationStatus: String(safeGet(inputData, 'verificationStatus', 'pending')),
        dataSources: safeGet(inputData, 'dataSources', undefined) as string | undefined,
        transportationMode: String(safeGet(inputData, 'transportationMode', '')),
        transportationDistance: Number(safeGet(inputData, 'transportationDistance', 0)),
        startPoint: String(safeGet(inputData, 'startPoint', '')),
        endPoint: String(safeGet(inputData, 'endPoint', '')),
        vehicleType: String(safeGet(inputData, 'vehicleType', '')),
        fuelType: String(safeGet(inputData, 'fuelType', '')),
        fuelEfficiency: Number(safeGet(inputData, 'fuelEfficiency', 0)),
        loadFactor: Number(safeGet(inputData, 'loadFactor', 0)),
        refrigeration: Boolean(safeGet(inputData, 'refrigeration', false)),
        packagingMaterial: String(safeGet(inputData, 'packagingMaterial', '')),
        packagingWeight: Number(safeGet(inputData, 'packagingWeight', 0)),
        warehouseEnergy: Number(safeGet(inputData, 'warehouseEnergy', 0)),
        storageTime: Number(safeGet(inputData, 'storageTime', 0)),
        storageConditions: String(safeGet(inputData, 'storageConditions', '')),
        distributionNetwork: String(safeGet(inputData, 'distributionNetwork', '')),
        aiRecommendation: String(safeGet(inputData, 'aiRecommendation', '')),
        returnLogistics: Boolean(safeGet(inputData, 'returnLogistics', false)),
        packagingRecyclability: Number(safeGet(inputData, 'packagingRecyclability', 0)),
        lastMileDelivery: String(safeGet(inputData, 'lastMileDelivery', '')),
        distributionMode: String(safeGet(inputData, 'distributionMode', '')),
        distributionDistance: Number(safeGet(inputData, 'distributionDistance', 0)),
        distributionStartPoint: String(safeGet(inputData, 'distributionStartPoint', '')),
        distributionEndPoint: String(safeGet(inputData, 'distributionEndPoint', '')),
        distributionTransportationMode: String(safeGet(inputData, 'distributionTransportationMode', '')),
        distributionTransportationDistance: Number(safeGet(inputData, 'distributionTransportationDistance', 0)),
        parse_from_file_name: String(safeGet(inputData, 'parse_from_file_name', '')),
      } as DistributionNodeData;
      break;
    case '使用阶段':
      data = {
        id: nodeId,
        workflowId: workflowId!,
        label: String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`)),
        nodeId: String(safeGet(inputData, 'nodeId', nodeId)),
        lifecycleStage: String(safeGet(inputData, 'lifecycleStage', 'unknown')),
        emissionType: String(safeGet(inputData, 'emissionType', 'unknown')),
        quantity: String(safeGet(inputData, 'quantity', '')),
        activityUnit: String(safeGet(inputData, 'activityUnit', '')),
        carbonFactor: String(safeGet(inputData, 'carbonFactor', '0')),
        activitydataSource: String(safeGet(inputData, 'activitydataSource', 'unknown')),
        activityScore: Number(safeGet(inputData, 'activityScore', 0)),
        carbonFootprint: String(safeGet(inputData, 'carbonFootprint', '0')),
        verificationStatus: String(safeGet(inputData, 'verificationStatus', 'pending')),
        dataSources: safeGet(inputData, 'dataSources', undefined) as string | undefined,
        lifespan: Number(safeGet(inputData, 'lifespan', 0)),
        energyConsumptionPerUse: Number(safeGet(inputData, 'energyConsumptionPerUse', 0)),
        waterConsumptionPerUse: Number(safeGet(inputData, 'waterConsumptionPerUse', 0)),
        consumablesUsed: String(safeGet(inputData, 'consumablesUsed', '')),
        consumablesWeight: Number(safeGet(inputData, 'consumablesWeight', 0)),
        usageFrequency: Number(safeGet(inputData, 'usageFrequency', 0)),
        maintenanceFrequency: Number(safeGet(inputData, 'maintenanceFrequency', 0)),
        repairRate: Number(safeGet(inputData, 'repairRate', 0)),
        userBehaviorImpact: Number(safeGet(inputData, 'userBehaviorImpact', 0)),
        efficiencyDegradation: Number(safeGet(inputData, 'efficiencyDegradation', 0)),
        standbyEnergyConsumption: Number(safeGet(inputData, 'standbyEnergyConsumption', 0)),
        usageLocation: String(safeGet(inputData, 'usageLocation', '')),
        usagePattern: String(safeGet(inputData, 'usagePattern', '')),
        userInstructions: String(safeGet(inputData, 'userInstructions', '')),
        upgradeability: Number(safeGet(inputData, 'upgradeability', 0)),
        secondHandMarket: Boolean(safeGet(inputData, 'secondHandMarket', false)),
        parse_from_file_name: String(safeGet(inputData, 'parse_from_file_name', '')),
      } as UsageNodeData;
      break;
    case '生命周期结束阶段':
      data = {
        id: nodeId,
        workflowId: workflowId!,
        label: String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`)),
        nodeId: String(safeGet(inputData, 'nodeId', nodeId)),
        lifecycleStage: String(safeGet(inputData, 'lifecycleStage', 'unknown')),
        emissionType: String(safeGet(inputData, 'emissionType', 'unknown')),
        quantity: String(safeGet(inputData, 'quantity', '')),
        activityUnit: String(safeGet(inputData, 'activityUnit', '')),
        carbonFactor: String(safeGet(inputData, 'carbonFactor', '0')),
        activitydataSource: String(safeGet(inputData, 'activitydataSource', 'unknown')),
        activityScore: Number(safeGet(inputData, 'activityScore', 0)),
        carbonFootprint: String(safeGet(inputData, 'carbonFootprint', '0')),
        verificationStatus: String(safeGet(inputData, 'verificationStatus', 'pending')),
        dataSources: safeGet(inputData, 'dataSources', undefined) as string | undefined,
        recyclingRate: Number(safeGet(inputData, 'recyclingRate', 0)),
        landfillPercentage: Number(safeGet(inputData, 'landfillPercentage', 0)),
        incinerationPercentage: Number(safeGet(inputData, 'incinerationPercentage', 0)),
        compostPercentage: Number(safeGet(inputData, 'compostPercentage', 0)),
        reusePercentage: Number(safeGet(inputData, 'reusePercentage', 0)),
        hazardousWasteContent: Number(safeGet(inputData, 'hazardousWasteContent', 0)),
        biodegradability: Number(safeGet(inputData, 'biodegradability', 0)),
        disposalEnergyRecovery: Number(safeGet(inputData, 'disposalEnergyRecovery', 0)),
        transportToDisposal: Number(safeGet(inputData, 'transportToDisposal', 0)),
        disposalMethod: String(safeGet(inputData, 'disposalMethod', '')),
        endOfLifeTreatment: String(safeGet(inputData, 'endOfLifeTreatment', '')),
        recyclingEfficiency: Number(safeGet(inputData, 'recyclingEfficiency', 0)),
        dismantlingDifficulty: String(safeGet(inputData, 'dismantlingDifficulty', '')),
        wasteRegulations: String(safeGet(inputData, 'wasteRegulations', '')),
        takeback: Boolean(safeGet(inputData, 'takeback', false)),
        circularEconomyPotential: Number(safeGet(inputData, 'circularEconomyPotential', 0)),
        parse_from_file_name: String(safeGet(inputData, 'parse_from_file_name', '')),
      } as DisposalNodeData;
      break;
    case '最终产品阶段':
      data = {
        id: nodeId,
        workflowId: workflowId!,
        label: String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`)),
        nodeId: String(safeGet(inputData, 'nodeId', nodeId)),
        lifecycleStage: String(safeGet(inputData, 'lifecycleStage', 'unknown')),
        emissionType: String(safeGet(inputData, 'emissionType', 'total')),
        quantity: String(safeGet(inputData, 'quantity', '')),
        activityUnit: String(safeGet(inputData, 'activityUnit', '')),
        carbonFactor: String(safeGet(inputData, 'carbonFactor', '0')),
        activitydataSource: String(safeGet(inputData, 'activitydataSource', 'calculated')),
        activityScore: Number(safeGet(inputData, 'activityScore', 0)),
        carbonFootprint: String(safeGet(inputData, 'carbonFootprint', '0')),
        verificationStatus: String(safeGet(inputData, 'verificationStatus', 'pending')),
        dataSources: safeGet(inputData, 'dataSources', undefined) as string | undefined,
        finalProductName: String(
          safeGet(inputData, 'finalProductName', String(safeGet(inputData, 'label', `${lifecycleStage}_${nodeId}`))),
        ),
        totalCarbonFootprint: Number(safeGet(inputData, 'totalCarbonFootprint', 0)),
        certificationStatus: String(safeGet(inputData, 'certificationStatus', 'pending')),
        environmentalImpact: String(safeGet(inputData, 'environmentalImpact', '')),
        sustainabilityScore: Number(safeGet(inputData, 'sustainabilityScore', 0)),
        productCategory: String(safeGet(inputData, 'productCategory', '')),
        marketSegment: String(safeGet(inputData, 'marketSegment', '')),
        marketCategory: String(safeGet(inputData, 'marketCategory', '')),
        targetRegion: String(safeGet(inputData, 'targetRegion', '')),
        complianceStatus: String(safeGet(inputData, 'complianceStatus', 'pending')),
        carbonLabel: String(safeGet(inputData, 'carbonLabel', '')),
        parse_from_file_name: String(safeGet(inputData, 'parse_from_file_name', '')),
      } as FinalProductNodeData;
      break;
    default: {
      console.error(`[handleCreateNode] Unknown node type encountered: ${lifecycleStage as string}`);
      return;
    }
  }

  // 優先從 content.positionX / positionY 取座標
  let position = { x: 100, y: 100 };

  if (typeof inputData.positionX === 'number' && typeof inputData.positionY === 'number') {
    position = { x: inputData.positionX, y: inputData.positionY };
  } else if (inputData.position && typeof inputData.position === 'object') {
    // 兼容 position: {x, y}
    if (typeof inputData.position.x === 'number' && typeof inputData.position.y === 'number') {
      position = { x: inputData.position.x, y: inputData.position.y };
    }
  }

  const newNode: Node<NodeData> = {
    id: nodeId,
    type: lifecycleStage as string,
    position,
    data,
  };

  const currentNodes = store.getState().nodes;

  if (currentNodes.some((node: Node<NodeData>) => node.id === newNode.id)) {
    console.warn(`[handleCreateNode] Node with ID ${newNode.id} already exists. Skipping creation.`);
  } else {
    console.log(`[handleCreateNode] Successfully created node: ${newNode.id} (${(newNode.data as NodeData).label})`);
    store.getState().setNodes([...currentNodes, newNode]);
  }
}
