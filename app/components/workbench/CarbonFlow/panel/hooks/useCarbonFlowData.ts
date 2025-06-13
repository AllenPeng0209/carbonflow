import { useState, useCallback } from 'react';
import { Form, message } from 'antd';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { CarbonFlowDataService } from '~/components/workbench/CarbonFlow/store/carbonFlowDataService';
import { LIFECYCLE_STAGE_TO_NODE_TYPE_MAP } from '~/components/workbench/CarbonFlow/constants/carbonFlowConstants';
import type { SceneInfoType } from '~/types/scene';
import type { ProductNodeData } from '~/types/nodes';

export const useCarbonFlowData = (workflowId: string) => {
  // 从全局store获取状态和方法
  const { sceneInfo, nodes, setNodes, setSceneInfo, loadWorkflowFromDatabase, saveCurrentWorkflow } = useCarbonFlowStore();

  // 本地状态
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // 表单实例
  const [settingsForm] = Form.useForm();
  const [emissionForm] = Form.useForm();

  // 加载数据 - 使用store的方法
  const loadData = useCallback(async () => {
    try {
      await loadWorkflowFromDatabase(workflowId);
    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('加载数据失败');
    }
  }, [workflowId, loadWorkflowFromDatabase]);

  // 保存场景信息
  const handleSaveSettings = useCallback(
    async (values: SceneInfoType) => {
      try {
        await CarbonFlowDataService.saveWorkflowSceneInfo(workflowId, values);
        setSceneInfo(values);
        message.success('场景信息保存成功');
      } catch (error) {
        console.error('保存场景信息失败:', error);
        message.error('保存场景信息失败');
      }
    },
    [workflowId, setSceneInfo],
  );

  // 添加排放源
  const handleAddEmissionSource = useCallback(() => {
    setEditingNodeId(null);
    emissionForm.resetFields();
  }, [emissionForm]);

  // 编辑排放源
  const handleEditEmissionSource = useCallback(
    (nodeId: string) => {
      const nodeToEdit = nodes.find((n: any) => n.id === nodeId);

      if (!nodeToEdit) {
        message.error('未找到要编辑的节点');
        return;
      }

      setEditingNodeId(nodeId);

      // 设置表单初始值
      emissionForm.setFieldsValue({
        ...nodeToEdit.data,
        label: nodeToEdit.data?.label || '',
      });
    },
    [nodes, emissionForm],
  );

  // 保存排放源
  const handleSaveEmissionSource = useCallback(
    async (values: any) => {
      try {
        const nodeData = {
          ...values,
          id: editingNodeId || `node_${Date.now()}`,
          type: LIFECYCLE_STAGE_TO_NODE_TYPE_MAP[values.lifecycleStage] || 'product',
        };

        if (editingNodeId) {
          // 更新现有节点
          const updatedNodes = nodes.map((node: any) =>
            node.id === editingNodeId ? { ...node, data: { ...node.data, ...nodeData } } : node,
          );
          setNodes(updatedNodes);
        } else {
          // 添加新节点
          const newNode = {
            id: nodeData.id,
            type: nodeData.type,
            data: nodeData,
            position: { x: 0, y: 0 },
          };
          setNodes([...nodes, newNode]);
        }

        // 保存到数据库 - 使用store的方法
        await saveCurrentWorkflow();
        message.success(editingNodeId ? '更新成功' : '添加成功');
      } catch (error) {
        console.error('保存失败:', error);
        message.error('保存失败');
      }
    },
    [editingNodeId, nodes, setNodes, saveCurrentWorkflow],
  );

  // 删除排放源
  const handleDeleteEmissionSource = useCallback(
    async (id: string) => {
      try {
        const filteredNodes = nodes.filter((node: any) => node.id !== id);
        setNodes(filteredNodes);

        // 保存到数据库 - 使用store的方法
        await saveCurrentWorkflow();
        message.success('删除成功');
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      }
    },
    [nodes, setNodes, saveCurrentWorkflow],
  );

  // 关闭排放源抽屉
  const handleCloseEmissionDrawer = useCallback(() => {
    setEditingNodeId(null);
    emissionForm.resetFields();
  }, [emissionForm]);

  // 添加子级节点
  const handleAddChildNode = useCallback(
    async (parentNodeId: string): Promise<string | undefined> => {
      try {
        // 找到父节点
        const parentNode = nodes.find((node: any) => node.id === parentNodeId);

        if (!parentNode) {
          message.error('未找到父节点');
          return;
        }

        // 计算子节点的层级
        const parentLevel = parentNode.data?.level || 0;
        const childLevel = parentLevel + 1;

        // 计算供应商层级
        const parentSupplierTier = parentNode.data?.supplierTier || parentNode.data?.supplierInfo?.tier || 1;
        const childSupplierTier = parentSupplierTier + 1;

        // 生成新的子节点ID
        const childNodeId = `child_${parentNodeId}_${Date.now()}`;

        // 创建子节点的默认数据 - 确保类型正确
        const childNodeData: ProductNodeData = {
          nodeType: 'product',
          id: childNodeId,
          nodeId: childNodeId,
          workflowId,
          productId: childNodeId,
          label: `${parentNode.data?.label || '产品'} - 子级组件`,
          lifecycleStage: parentNode.data?.lifecycleStage || '原材料获取阶段',
          emissionType: parentNode.data?.emissionType || '原材料',
          activitydataSource: 'manual',
          activityScore: 0,
          carbonFootprint: '0',
          quantity: '',
          activityUnit: '',
          carbonFactor: '0',
          carbonFactorName: '',
          carbonFactorUnit: '',
          unitConversion: '1',
          carbonFactordataSource: 'manual',
          verificationStatus: 'pending',

          // 层级关系字段
          parentNodeId,
          level: childLevel,
          isComposite: false,
          compositionRatio: 0.1, // 默认占比10%
          supplierTier: childSupplierTier,

          // 供应商信息
          supplierInfo: {
            name: `${parentNode.data?.supplierInfo?.name || '供应商'} - 下级`,
            tier: childSupplierTier,
            isDirectSupplier: false,
            parentSupplierId: parentNodeId,
          },

          // 其他必要字段
          backgroundDataSourceTab: 'manual',
          hasEvidenceFiles: false,
          dataRisk: '低',

          // ProductNodeData 特有字段
          material: '',
          weight_per_unit: '',
          isRecycled: false,
          recycledContent: '',
          recycledContentPercentage: 0,
          sourcingRegion: '',
          SourceLocation: '',
          Destination: '',
          SupplierName: '',
          SupplierAddress: '',
          ProcessingPlantAddress: '',
          RefrigeratedTransport: false,
          weight: 0,
          certaintyPercentage: 0,
        };

        // 创建新的节点对象
        const newChildNode = {
          id: childNodeId,
          type: 'product',
          data: childNodeData,
          position: {
            x: (parentNode.position?.x || 0) + 200,
            y: (parentNode.position?.y || 0) + 100,
          },
        };

        // 更新父节点，标记为复合产品并添加子节点ID
        const updatedNodes = nodes.map((node: any) => {
          if (node.id === parentNodeId) {
            const updatedParentData = {
              ...node.data,
              isComposite: true,
              childNodeIds: [...(node.data?.childNodeIds || []), childNodeId],
            };
            return { ...node, data: updatedParentData };
          }

          return node;
        });

        // 添加新的子节点
        const finalNodes = [...updatedNodes, newChildNode];
        setNodes(finalNodes);

        // 保存到数据库
        const workflow = {
          workflowId,
          nodes: finalNodes,
          edges: [],
          sceneInfo,
          name: '工作流',
          status: 'draft',
          tasks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await CarbonFlowDataService.saveCompleteWorkflow(workflow);

        message.success('子级节点添加成功');

        // 设置编辑新创建的子节点
        setEditingNodeId(childNodeId);

        // 返回子节点ID，以便调用方可以进一步处理
        return childNodeId;
      } catch (error) {
        console.error('添加子级节点失败:', error);
        message.error('添加子级节点失败');
        return undefined;
      }
    },
    [workflowId, nodes, setNodes, sceneInfo],
  );

  return {
    // 状态 - 现在来自全局store
    sceneInfo,
    nodes,
    editingNodeId,
    settingsForm,
    emissionForm,

    // 操作函数
    loadData,
    handleSaveSettings,
    handleAddEmissionSource,
    handleEditEmissionSource,
    handleSaveEmissionSource,
    handleDeleteEmissionSource,
    handleCloseEmissionDrawer,
    handleAddChildNode,
  };
};
