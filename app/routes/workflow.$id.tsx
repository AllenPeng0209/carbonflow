import { json, type LoaderFunction, type ActionFunction } from '@remix-run/cloudflare';
import { useLoaderData, useNavigate, useLocation, useFetcher, useParams } from '@remix-run/react';
import { useEffect, useRef } from 'react';
import { message } from 'antd';
import { Chat } from '~/components/chat/Chat.client';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { supabase } from '~/lib/supabase';
import { CarbonFlowDataService } from '~/components/workbench/CarbonFlow/store/carbonFlowDataService';
import type { SceneInfoType } from '~/types/scene';

interface LoaderData {
  error?: string;
  workflow?: {
    id: string;
    name: string;
    description: string;
    created_at: string;
    industry_type?: string;
    editor_state?: any;
    scene_info?: any;
    sceneInfo?: SceneInfoType;
    model_score?: any;
    is_public: boolean;
    status?: string;
    user_id?: string;
  };
}

interface ProductInfo {
  productId: string;
  productName: string;
  productSpecification?: string;
  productDescription?: string;
  productImageUrl?: string;
}

// 验证工作流ID格式
const isValidWorkflowId = (id: string): boolean => {
  // UUID格式验证
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const action: ActionFunction = async ({ request }) => {
  console.log('Action: Starting workflow creation process');

  const formData = await request.formData();
  const intent = formData.get('intent');
  console.log('Action: Received intent:', intent);

  if (intent === 'create') {
    try {
      // 尝试从多个来源获取认证信息
      let jwt = '';

      // 1. 尝试从Authorization头获取
      const authHeader = request.headers.get('authorization');

      if (authHeader) {
        jwt = authHeader.replace(/Bearer\s+/i, '').trim();
      }

      // 2. 如果没有Authorization头，尝试从cookie获取
      if (!jwt) {
        const cookieHeader = request.headers.get('cookie');

        if (cookieHeader) {
          const cookies = cookieHeader.split(';').reduce(
            (acc, cookie) => {
              const [key, value] = cookie.trim().split('=');
              acc[key] = value;

              return acc;
            },
            {} as Record<string, string>,
          );

          // 尝试常见的认证cookie名称
          jwt = cookies['sb-access-token'] || cookies['supabase-auth-token'] || cookies['auth-token'] || '';
        }
      }

      let user = null;

      if (jwt) {
        const {
          data: { user: authUser },
          error: userErr,
        } = await supabase.auth.getUser(jwt);

        if (!userErr && authUser) {
          user = authUser;
        }
      }

      // 如果没有认证用户，使用一个默认的用户ID或创建匿名用户
      let userId = user?.id;

      if (!userId) {
        // 使用现有的用户ID作为默认用户
        userId = 'f66d5a84-0ff0-4938-a7b3-1a2d53a42dec'; // 默认用户ID
        console.log('Action: Using default user ID for anonymous workflow creation');
      }

      console.log('Action: User ID:', userId);

      // 获取产品信息（如果有的话）
      const productId = formData.get('productId') as string;
      const productName = formData.get('productName') as string;
      const productSpecification = formData.get('productSpecification') as string;
      const productDescription = formData.get('productDescription') as string;
      const productImageUrl = formData.get('productImageUrl') as string;

      // 构建初始的 scene_info，包含产品信息
      const initialSceneInfo = {
        productInfo: productId
          ? {
              id: productId,
              name: productName,
              specification: productSpecification,
              description: productDescription,
              imageUrl: productImageUrl,
            }
          : null,

        // 其他默认的 scene_info 字段
        industry: '',
        scope: '',
        functionalUnit: '',
        systemBoundary: '',
        dataQuality: '',
        assumptions: [],
      };

      // 工作流名称，如果有产品信息则使用产品名称
      const workflowName = productName ? `${productName} - 碳足迹工作流` : '新工作流';
      const workflowDescription = productDescription
        ? `基于产品"${productName}"的碳足迹分析工作流。${productDescription}`
        : '这是一个新的碳足迹工作流';

      // Use the imported supabase client for the insert
      const { data: workflow, error } = await supabase
        .from('workflows')
        .insert({
          name: workflowName,
          description: workflowDescription,
          user_id: userId, // 确保user_id有值
          editor_state: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          scene_info: initialSceneInfo,
          model_score: {},
          is_public: false,
          product_id: productId || null,
          status: 'draft',
          conversation_history: [], // 初始化空的聊天记录
        })
        .select()
        .single();

      if (error) {
        console.error('Action: Failed to create workflow:', error);
        return json({ error: `创建工作流失败: ${error.message}` }, { status: 500 });
      }

      console.log('Action: Workflow created successfully:', workflow.id);

      // 直接返回工作流数据，而不是重定向
      return json({
        workflow: {
          ...workflow,
          editor_state: workflow.editor_state || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
          sceneInfo: workflow.scene_info || {}, // 保持与LoaderData一致
          scene_info: workflow.scene_info || {}, // 重复，但保持现有结构以防万一，后续可清理
          model_score: workflow.model_score || {},
        },
      });
    } catch (error) {
      console.error('Action: Error in workflow creation:', error);
      return json(
        { error: `创建工作流失败: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 },
      );
    }
  }

  return null;
};

export const loader: LoaderFunction = async ({ params }) => {
  const { id } = params;

  // 处理新建工作流的情况
  if (id === 'new') {
    console.log('Loader: New workflow requested');
    return json({ workflow: null });
  }

  // 验证工作流ID格式
  if (!id || !isValidWorkflowId(id)) {
    return json({ error: '无效的工作流ID格式' }, { status: 400 });
  }

  try {
    // 使用CarbonFlowDataService加载完整的工作流数据
    const completeWorkflow = await CarbonFlowDataService.loadCompleteWorkflow(id);

    if (!completeWorkflow) {
      return json({ error: '工作流不存在' }, { status: 404 });
    }

    console.log('Loaded complete workflow from DB:', completeWorkflow);

    // 转换为路由期望的格式
    const workflow = {
      id: completeWorkflow.workflowId,
      name: completeWorkflow.name,
      description: completeWorkflow.description,
      created_at: completeWorkflow.createdAt,
      updated_at: completeWorkflow.updatedAt,
      status: completeWorkflow.status,
      editor_state: {
        nodes: completeWorkflow.nodes || [],
        edges: completeWorkflow.edges || [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      scene_info: completeWorkflow.sceneInfo || {},
      sceneInfo: completeWorkflow.sceneInfo || {},
      is_public: completeWorkflow.isPublic || false,

      // 添加完整工作流的其他字段
      tasks: completeWorkflow.tasks || [],
      collaborators: completeWorkflow.collaborators,
      knowledgeUnits: completeWorkflow.knowledgeUnits,
      uploadedFiles: completeWorkflow.uploadedFiles,
      productCarbonFootprintReport: completeWorkflow.productCarbonFootprintReport,
      editorState: completeWorkflow.editorState,
      comments: completeWorkflow.comments,
      actionLogs: completeWorkflow.actionLogs,
      conversationHistory: completeWorkflow.conversationHistory,
      aiRiskAssessmentResults: completeWorkflow.aiRiskAssessmentResults,
      lastModifiedBy: completeWorkflow.lastModifiedBy,
      nodes: completeWorkflow.nodes || [],
      edges: completeWorkflow.edges || [],
    };

    return json({ workflow });
  } catch (error) {
    console.error('Error fetching complete workflow:', error);
    return json({ error: '获取工作流数据失败' }, { status: 500 });
  }
};

export default function WorkflowPage() {
  const { error, workflow } = useLoaderData<LoaderData>();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher();
  const params = useParams(); // 获取路由参数，包括 id

  console.log('WorkflowPage render:', {
    error,
    workflow,
    params,
    fetcherState: fetcher.state,
  });

  useEffect(() => {
    if (error) {
      console.error('Component: Error detected:', error);
      message.error(error);
      setTimeout(() => {
        console.log('Component: Navigating to home page due to error');
        navigate('/dashboard');
      }, 1500);
    }
  }, [error, navigate]);

  // 处理fetcher响应 (工作流创建成功后导航)
  useEffect(() => {
    // 仅当 fetcher 空闲且有数据时执行
    if (fetcher.state === 'idle' && fetcher.data) {
      const result = fetcher.data as { error?: string; workflow?: any };

      if (result.error) {
        console.error('Workflow creation failed:', result.error);
        message.error(result.error);

        /*
         * 考虑是否需要导航，或者让用户停留在/workflow/new并显示错误
         * navigate('/dashboard/product-management');
         */
      } else if (result.workflow && result.workflow.id) {
        // 仅当仍在 'new' 页面时才导航，防止导航后重复执行
        if (params.id === 'new') {
          console.log('Workflow created successfully:', result.workflow.id);
          message.success('工作流创建成功！');

          // 导航到新创建的工作流页面
          navigate(`/workflow/${result.workflow.id}`, { replace: true });
        }
      }
    }
  }, [fetcher.state, fetcher.data, navigate, params.id]);

  const hasSubmitted = useRef(false);

  // Effect to automatically create a workflow when visiting /workflow/new
  useEffect(() => {
    // Only on /new, and only if we haven't submitted for this component instance yet.
    if (params.id === 'new' && !hasSubmitted.current) {
      hasSubmitted.current = true; // Mark as submitted immediately

      const productInfo = location.state as ProductInfo | null;
      console.log('Initiating workflow creation. Product info present:', !!productInfo);

      const formData = new FormData();
      formData.append('intent', 'create');

      if (productInfo) {
        formData.append('productId', productInfo.productId);
        formData.append('productName', productInfo.productName);

        if (productInfo.productSpecification) {
          formData.append('productSpecification', productInfo.productSpecification);
        }

        if (productInfo.productDescription) {
          formData.append('productDescription', productInfo.productDescription);
        }

        if (productInfo.productImageUrl) {
          formData.append('productImageUrl', productInfo.productImageUrl);
        }
      }

      // Post to the action function of this very route.
      fetcher.submit(formData, { method: 'post', action: `/workflow/new` });
    }
  }, [params.id, location.state, fetcher]);

  if (error) {
    console.log('Rendering error state');
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>错误</h2>
        <p>{error}</p>
        <p>正在返回首页...</p>
      </div>
    );
  }

  /*
   * Simplified loading logic
   * If the URL is for a new workflow, we should always show the creation message.
   * The useEffect hooks will handle the actual creation and navigation.
   * After navigation, params.id will change, and this condition will be false.
   */
  if (params.id === 'new') {
    console.log('Rendering loading state: Creating new workflow...', {
      fetcherState: fetcher.state,
      hasFetcherData: !!fetcher.data,
    });
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span>正在创建工作流...</span>
      </div>
    );
  }

  // If the URL is for a specific workflow but the data hasn't loaded yet.
  if (!workflow) {
    console.log('Rendering loading state: Loading existing workflow...');
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <span>正在加载工作流...</span>
      </div>
    );
  }

  console.log('Rendering workflow page with workflow:', workflow);

  return (
    <div className="flex flex-col h-full w-full bg-bolt-elements-background-depth-1">
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
