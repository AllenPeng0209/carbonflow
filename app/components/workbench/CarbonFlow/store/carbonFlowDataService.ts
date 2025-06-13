import { supabase } from '~/lib/supabase';
import type { SceneInfoType } from '~/types/scene';
import type { Workflow } from '~/types/workflow';

/**
 * 碳流量数据服务 - 处理所有与Supabase数据库的交互
 */
export class CarbonFlowDataService {
  /**
   * 保存完整的工作流数据
   */
  static async saveCompleteWorkflow(workflow: Workflow): Promise<void> {
    try {
      console.log('开始保存工作流:', workflow.workflowId);

      // 从工作流数据中获取用户ID，或者从现有工作流记录中获取
      let userId = workflow.user?.id;

      if (!userId) {
        // 如果工作流数据中没有用户ID，尝试从数据库中获取现有记录的用户ID
        const { data: existingWorkflow, error: fetchError } = await supabase
          .from('workflows')
          .select('user_id')
          .eq('id', workflow.workflowId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('获取现有工作流用户ID失败:', fetchError);
          throw fetchError;
        }

        userId = existingWorkflow?.user_id;
      }

      // 如果仍然没有用户ID，尝试从认证状态获取
      if (!userId) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error('无法确定用户身份，请重新登录后再试');
        }

        userId = user.id;
      }

      // 保存工作流基本信息到workflows表
      const { error: workflowError } = await supabase.from('workflows').upsert({
        id: workflow.workflowId,
        name: workflow.name ?? '未命名工作流',
        description: workflow.description || '',
        status: workflow.status || 'draft',
        scene_info: workflow.sceneInfo || {},
        user_id: userId,
        user_data: {
          tasks: workflow.tasks || [],
        },
        collaborators: workflow.collaborators,
        knowledge_units: workflow.knowledgeUnits,
        uploaded_files: workflow.uploadedFiles,
        product_carbon_footprint_report: workflow.productCarbonFootprintReport,
        editor_state: workflow.editorState,
        workflow_comments: workflow.comments,
        action_logs: workflow.actionLogs,
        ai_risk_assessment_results: workflow.aiRiskAssessmentResults,
        last_modified_by: workflow.lastModifiedBy,
        updated_at: new Date().toISOString(),
        created_at: workflow.createdAt || new Date().toISOString(),
      });

      if (workflowError) {
        console.error('保存工作流基本信息失败:', workflowError);
        throw workflowError;
      }

      // 保存节点数据
      if (workflow.nodes && workflow.nodes.length > 0) {
        // 先删除现有节点
        const { error: deleteNodesError } = await supabase
          .from('workflow_nodes')
          .delete()
          .eq('workflow_id', workflow.workflowId);

        if (deleteNodesError) {
          console.error('删除现有节点失败:', deleteNodesError);
          throw deleteNodesError;
        }

        // 插入新节点
        const nodeData = workflow.nodes.map((node) => ({
          workflow_id: workflow.workflowId,
          node_id: node.id,
          node_type: node.type || 'default',
          label: node.data?.label || null,
          position_x: node.position?.x || 0,
          position_y: node.position?.y || 0,
          node_name: node.data?.nodeId || null,
          activity_score: node.data?.activityScore || null,
          verification_status: node.data?.verificationStatus || null,
          supplementary_info: node.data?.supplementaryInfo || null,
          has_evidence_files: node.data?.hasEvidenceFiles || false,
          evidence_verification_status: node.data?.evidenceVerificationStatus || null,
          data_risk: node.data?.dataRisk || null,
          background_data_source_tab: node.data?.backgroundDataSourceTab || null,
          carbon_footprint: node.data?.carbonFootprint || null,
          quantity: node.data?.quantity || null,
          activity_unit: node.data?.activityUnit || null,
          carbon_factor: node.data?.carbonFactor || null,
          carbon_factor_name: node.data?.carbonFactorName || null,
          carbon_factor_unit: node.data?.carbonFactorUnit || null,
          unit_conversion: node.data?.unitConversion || null,
          lifecycle_stage: node.data?.lifecycleStage || null,
          emission_type: node.data?.emissionType || null,
          activity_data_source: node.data?.activitydataSource || null,

          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error: nodesError } = await supabase.from('workflow_nodes').insert(nodeData);

        if (nodesError) {
          console.error('保存节点数据失败:', nodesError);
          throw nodesError;
        }
      }

      // 保存边数据
      if (workflow.edges && workflow.edges.length > 0) {
        // 先删除现有边
        const { error: deleteEdgesError } = await supabase
          .from('workflow_edges')
          .delete()
          .eq('workflow_id', workflow.workflowId);

        if (deleteEdgesError) {
          console.error('删除现有边失败:', deleteEdgesError);
          throw deleteEdgesError;
        }

        // 获取节点ID映射
        const { data: nodeIds, error: nodeIdsError } = await supabase
          .from('workflow_nodes')
          .select('id, node_id')
          .eq('workflow_id', workflow.workflowId);

        if (nodeIdsError) {
          console.error('获取节点ID映射失败:', nodeIdsError);
          throw nodeIdsError;
        }

        const nodeIdMap = new Map(nodeIds?.map((n) => [n.node_id, n.id]) || []);

        // 插入新边
        const edgeData = workflow.edges
          .map((edge) => ({
            workflow_id: workflow.workflowId,
            source_node_id: nodeIdMap.get(edge.source),
            target_node_id: nodeIdMap.get(edge.target),
            edge_data: {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              type: edge.type,
              data: edge.data,
              style: edge.style,
              animated: edge.animated,
              label: edge.label,
              labelStyle: edge.labelStyle,
              labelShowBg: edge.labelShowBg,
              labelBgStyle: edge.labelBgStyle,
              labelBgPadding: edge.labelBgPadding,
              labelBgBorderRadius: edge.labelBgBorderRadius,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }))
          .filter((edge) => edge.source_node_id && edge.target_node_id);

        if (edgeData.length > 0) {
          const { error: edgesError } = await supabase.from('workflow_edges').insert(edgeData);

          if (edgesError) {
            console.error('保存边数据失败:', edgesError);
            throw edgesError;
          }
        }
      }

      console.log('工作流保存成功:', workflow.workflowId);
    } catch (error) {
      console.error('保存完整工作流失败:', error);
      throw error;
    }
  }

  /**
   * 加载完整的工作流数据
   */
  static async loadCompleteWorkflow(workflowId: string): Promise<Workflow | null> {
    try {
      // 加载工作流基本信息
      const { data: workflowData, error: workflowError } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (workflowError) {
        console.error('加载工作流基本信息失败:', workflowError);
        throw workflowError;
      }

      if (!workflowData) {
        console.log('工作流不存在:', workflowId);
        return null;
      }

      // 加载节点数据
      const { data: nodesData, error: nodesError } = await supabase
        .from('workflow_nodes')
        .select('*')
        .eq('workflow_id', workflowId);

      if (nodesError) {
        console.error('加载节点数据失败:', nodesError);
        throw nodesError;
      }

      // 加载边数据
      const { data: edgesData, error: edgesError } = await supabase
        .from('workflow_edges')
        .select('*')
        .eq('workflow_id', workflowId);

      if (edgesError) {
        console.error('加载边数据失败:', edgesError);
        throw edgesError;
      }

      // 转换节点数据
      const nodes =
        nodesData?.map((node) => ({
          id: node.node_id,
          type: node.node_type,
          position: {
            x: node.position_x || 0,
            y: node.position_y || 0,
          },
          data: {
            label: node.label,
            nodeId: node.node_name,
            activityScore: node.activity_score,
            verificationStatus: node.verification_status,
            supplementaryInfo: node.supplementary_info,
            hasEvidenceFiles: node.has_evidence_files,
            evidenceVerificationStatus: node.evidence_verification_status,
            dataRisk: node.data_risk,
            backgroundDataSourceTab: node.background_data_source_tab,
            carbonFootprint: node.carbon_footprint,
            quantity: node.quantity,
            activityUnit: node.activity_unit,
            carbonFactor: node.carbon_factor,
            carbonFactorName: node.carbon_factor_name,
            carbonFactorUnit: node.carbon_factor_unit,
            unitConversion: node.unit_conversion,
            lifecycleStage: node.lifecycle_stage,
            emissionType: node.emission_type,
            activity_data_source: node.activity_data_source,
          },
        })) || [];

      // 转换边数据
      const edges =
        edgesData?.map((edge) => {
          const edgeData = edge.edge_data || {};
          return {
            id: edgeData.id || edge.id,
            source: edgeData.source,
            target: edgeData.target,
            type: edgeData.type,
            data: edgeData.data,
            style: edgeData.style,
            animated: edgeData.animated,
            label: edgeData.label,
            labelStyle: edgeData.labelStyle,
            labelShowBg: edgeData.labelShowBg,
            labelBgStyle: edgeData.labelBgStyle,
            labelBgPadding: edgeData.labelBgPadding,
            labelBgBorderRadius: edgeData.labelBgBorderRadius,
          };
        }) || [];

      // 构建完整的工作流对象
      const workflow: Workflow = {
        workflowId: workflowData.id,
        name: workflowData.name,
        description: workflowData.description,
        status: workflowData.status,
        sceneInfo: workflowData.scene_info,
        tasks: workflowData.user_data?.tasks || [],
        collaborators: workflowData.collaborators,
        knowledgeUnits: workflowData.knowledge_units,
        uploadedFiles: workflowData.uploaded_files,
        productCarbonFootprintReport: workflowData.product_carbon_footprint_report,
        editorState: workflowData.editor_state,
        comments: workflowData.workflow_comments,
        actionLogs: workflowData.action_logs,
        conversationHistory: workflowData.conversation_history,
        aiRiskAssessmentResults: workflowData.ai_risk_assessment_results,
        lastModifiedBy: workflowData.last_modified_by,
        createdAt: workflowData.created_at,
        updatedAt: workflowData.updated_at,
        nodes: nodes as any,
        edges,
      };

      return workflow;
    } catch (error) {
      console.error('加载完整工作流失败:', error);
      throw error;
    }
  }

  /**
   * 保存工作流场景信息
   */
  static async saveWorkflowSceneInfo(workflowId: string, sceneInfo: SceneInfoType): Promise<void> {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({
          scene_info: sceneInfo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workflowId);

      if (error) {
        console.error('保存场景信息失败:', error);
        throw error;
      }

      console.log('场景信息保存成功');
    } catch (error) {
      console.error('保存场景信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户的所有工作流列表
   */
  static async getUserWorkflows(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      status: string;
      created_at: string;
      updated_at: string;
    }>
  > {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, status, created_at, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('获取工作流列表失败:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('获取工作流列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除工作流
   */
  static async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      // 删除边
      const { error: edgesError } = await supabase.from('workflow_edges').delete().eq('workflow_id', workflowId);

      if (edgesError) {
        console.error('删除工作流边失败:', edgesError);
        throw edgesError;
      }

      // 删除节点
      const { error: nodesError } = await supabase.from('workflow_nodes').delete().eq('workflow_id', workflowId);

      if (nodesError) {
        console.error('删除工作流节点失败:', nodesError);
        throw nodesError;
      }

      // 删除工作流
      const { error: workflowError } = await supabase.from('workflows').delete().eq('id', workflowId);

      if (workflowError) {
        console.error('删除工作流失败:', workflowError);
        throw workflowError;
      }

      console.log('工作流删除成功:', workflowId);
    } catch (error) {
      console.error('删除工作流失败:', error);
      throw error;
    }
  }
}
