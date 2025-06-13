import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import './CarbonFlow.css';
import './CarbonFlow/styles.css';
import { Button as MyButton } from '~/components/ui/Button';
import { Input, Button as AntButton, ConfigProvider, theme, Tooltip, message } from 'antd';
import { EditOutlined, CheckOutlined, LogoutOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '~/lib/supabase';
import { CarbonFlowPanel } from './CarbonFlow/panel/CarbonFlowPanel';
import { DataCheckPanel } from './CarbonFlow/checkboard/DataCheckPanel';
import ReportGenerator from './CarbonFlow/report/ReportGenerator';
import { VisualizationAnalysis } from './CarbonFlow/visualization/VisualizationAnalysis';
import { CarbonFlowGraph } from './CarbonFlow/graph/CarbonFlowGraph';
import { CarbonFlowActionHandler } from './CarbonFlow/action/CarbonFlowActions';
import { useEventHandlers } from './CarbonFlow/events/useEventHandlers';
import { useCarbonFlowStore, emitCarbonFlowData } from './CarbonFlow/store/CarbonFlowStore';

const { darkAlgorithm } = theme;

// Portal helper component to render children into document.body
const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  return mounted ? createPortal(children, document.body) : null;
};

interface CarbonFlowProps {
  // No props needed now
}

const CarbonFlowWrapper: React.FC<CarbonFlowProps> = () => {
  const { workflow } = useLoaderData() as any;
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'panel' | 'flow' | 'analysis' | 'report'>('panel');
  const [isFullPageTableVisible, setFullPageTableVisible] = useState(false);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(workflow?.name || '');
  const [workflowName, setWorkflowName] = useState(workflow?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const [actionHandler, setActionHandler] = useState<CarbonFlowActionHandler | null>(null);
  const { saveCurrentWorkflow, loadWorkflow, setNodes, setEdges } = useCarbonFlowStore();

  // 初始化工作流数据到store
  React.useEffect(() => {
    if (workflow && workflow.id) {
      console.log('[CarbonFlow] 初始化工作流数据到store:', workflow);

      // 将路由数据转换为store期望的格式
      const workflowData = {
        workflowId: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status || 'draft',
        sceneInfo: workflow.sceneInfo || workflow.scene_info || {},
        aiSummary: workflow.aiSummary,
        tasks: workflow.tasks || [],
        nodes: workflow.nodes || workflow.editor_state?.nodes || [],
        edges: workflow.edges || workflow.editor_state?.edges || [],
        createdAt: workflow.created_at,
        updatedAt: workflow.updated_at,
        isPublic: workflow.is_public || false,
        user: workflow.user,
        collaborators: workflow.collaborators,
        productId: workflow.productId,
        knowledgeUnits: workflow.knowledgeUnits,
        uploadedFiles: workflow.uploadedFiles,
        productCarbonFootprintReport: workflow.productCarbonFootprintReport,
        editorState: workflow.editorState,
        comments: workflow.comments,
        actionLogs: workflow.actionLogs,
        conversationHistory: workflow.conversationHistory,
        aiRiskAssessmentResults: workflow.aiRiskAssessmentResults,
        lastModifiedBy: workflow.lastModifiedBy,
      };

      loadWorkflow(workflowData);

      // 单独设置节点和边，确保React Flow能够正确渲染
      if (workflowData.nodes && workflowData.nodes.length > 0) {
        setNodes(workflowData.nodes);
      }

      if (workflowData.edges && workflowData.edges.length > 0) {
        setEdges(workflowData.edges);
      }

      // 重要：数据加载完成后发射carbonFlowData事件
      console.log('[CarbonFlow] 发射carbonFlowData事件');
      emitCarbonFlowData();
    }
  }, [workflow, loadWorkflow, setNodes, setEdges]);

  React.useEffect(() => {
    console.log('[CarbonFlow] 初始化CarbonFlowActionHandler');

    const handler = new CarbonFlowActionHandler(useCarbonFlowStore);
    setActionHandler(handler);
    console.log('[CarbonFlow] CarbonFlowActionHandler初始化完成');
  }, []);

  useEventHandlers(actionHandler || undefined);

  const saveWorkflowName = async () => {
    if (!editingName.trim()) {
      return;
    }

    if (editingName === workflowName) {
      setIsEditingName(false);
      return;
    }

    const { error } = await supabase
      .from('workflows')
      .update({ name: editingName, updated_at: new Date().toISOString() })
      .eq('id', workflow.id);

    if (error) {
      setIsEditingName(false);
      return;
    }

    setWorkflowName(editingName);
    setIsEditingName(false);
  };

  const handleSaveWorkflow = async () => {
    setIsSaving(true);

    try {
      console.log('[CarbonFlow] 开始保存工作流...');
      await saveCurrentWorkflow();
      console.log('[CarbonFlow] 工作流保存成功');
      message.success('工作流保存成功！');
    } catch (error) {
      console.error('[CarbonFlow] 保存工作流失败:', error);

      // 显示更详细的错误信息
      let errorMessage = '保存工作流失败，请重试';

      if (error instanceof Error) {
        errorMessage = `保存失败: ${error.message}`;
        console.error('[CarbonFlow] 错误详情:', error.stack);
      }

      message.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        className="carbonflow-inner-wrapper"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
        }}
      >
        <div
          className="view-toggle-container"
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            padding: '12px 32px',
            background: 'rgba(16,32,61,0.8)',
            borderBottom: '1px solid #222',
            boxSizing: 'border-box',
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditingName ? (
              <Input
                value={editingName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
                onPressEnter={saveWorkflowName}
                style={{ width: 220 }}
                size="small"
                autoFocus
                maxLength={50}
              />
            ) : (
              <span style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>{workflowName}</span>
            )}
            {isEditingName ? (
              <AntButton icon={<CheckOutlined />} size="small" type="primary" onClick={saveWorkflowName} />
            ) : (
              <AntButton
                icon={<EditOutlined />}
                size="small"
                onClick={() => {
                  setEditingName(workflowName);
                  setIsEditingName(true);
                }}
              />
            )}
          </div>
          <div style={{ flexGrow: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MyButton
                onClick={() => setViewMode('panel')}
                className="view-toggle-button view-toggle-button-hover"
                style={{
                  backgroundColor: viewMode === 'panel' ? '#1890ff' : '#333',
                  color: '#fff',
                  borderColor: '#555',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                数据操作台面板
              </MyButton>
              <MyButton
                onClick={() => setViewMode('flow')}
                className="view-toggle-button view-toggle-button-hover"
                style={{
                  backgroundColor: viewMode === 'flow' ? '#1890ff' : '#333',
                  color: '#fff',
                  borderColor: '#555',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                流程图面板
              </MyButton>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MyButton
                onClick={() => setViewMode('analysis')}
                className="view-toggle-button view-toggle-button-hover"
                style={{
                  backgroundColor: viewMode === 'analysis' ? '#1890ff' : '#333',
                  color: '#fff',
                  borderColor: '#555',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                可视化分析
              </MyButton>
              <MyButton
                onClick={() => setViewMode('report')}
                className="view-toggle-button view-toggle-button-hover"
                style={{
                  backgroundColor: viewMode === 'report' ? '#1890ff' : '#333',
                  color: '#fff',
                  borderColor: '#555',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                生成报告
              </MyButton>
              <Tooltip title="保存工作流">
                <AntButton
                  icon={<SaveOutlined />}
                  onClick={handleSaveWorkflow}
                  loading={isSaving}
                  style={{
                    color: '#fff',
                    borderColor: '#555',
                    backgroundColor: '#333',
                  }}
                  className="view-toggle-button-hover"
                />
              </Tooltip>
              <Tooltip title="退出工作台">
                <AntButton
                  icon={<LogoutOutlined />}
                  onClick={() => navigate('/dashboard/workbench')}
                  style={{
                    color: '#fff',
                    borderColor: '#555',
                    backgroundColor: '#333',
                  }}
                  className="view-toggle-button-hover"
                />
              </Tooltip>
            </div>
          </div>
        </div>

        <div style={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {viewMode === 'panel' && (
            <div className="carbon-panel-container" style={{ height: '100%', width: '100%' }}>
              <CarbonFlowPanel
                workflowId={workflow.id}
                workflowName={workflowName}
                workFlow={workflow}
                onOpenFullPageTable={() => setFullPageTableVisible(true)}
              />
            </div>
          )}
          {viewMode === 'flow' && (
            <div className="carbon-flow-container" style={{ height: '100%', width: '100%' }}>
              <CarbonFlowGraph workflowId={workflow.id} />
            </div>
          )}
          {viewMode === 'analysis' && <VisualizationAnalysis onBack={() => setViewMode('flow')} />}
          {viewMode === 'report' && <ReportGenerator />}
        </div>
      </div>
      {isFullPageTableVisible && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'flex-end', paddingBottom: '12px' }}>
              <AntButton icon={<LogoutOutlined />} onClick={() => setFullPageTableVisible(false)}>
                退出全屏
              </AntButton>
            </div>
            <div style={{ flex: '1 1 auto', overflow: 'hidden', height: '100%' }}>
              <CarbonFlowPanel
                workflowId={workflow.id}
                workflowName={workflowName}
                workFlow={workflow}
                isFullPageMode={true}
              />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
};

export const CarbonFlow: React.FC<CarbonFlowProps> = () => {
  return (
    <ConfigProvider
      theme={{
        algorithm: darkAlgorithm,
        token: {
          colorBgElevated: '#1f1f1f',
          colorText: '#e0e0e0',
        },
        components: {
          Message: {
            contentBg: '#1f1f1f',
            colorText: '#e0e0e0',
          },
          Modal: {
            contentBg: '#1f1f1f',
            headerBg: '#1f1f1f',
            colorTextHeading: '#e0e0e0',
            colorIcon: '#e0e0e0',
            colorIconHover: '#ffffff',
          },
        },
      }}
    >
      <style>{`
        .ant-message-notice-content {
          background-color: #1f1f1f !important;
          color: #e0e0e0 !important;
          border: 1px solid #333 !important;
        }
        .ant-message-custom-content {
          color: #e0e0e0 !important;
        }
        .ant-modal-close-x {
            color: #aaa !important;
        }
        .ant-modal-close-x:hover {
            color: #fff !important;
        }
        .view-toggle-button-hover:hover {
          background-color: #333;
        }
      `}</style>
      <ReactFlowProvider>
        <CarbonFlowWrapper />
      </ReactFlowProvider>
    </ConfigProvider>
  );
};

// 添加默认导出以确保兼容性
export default CarbonFlow;
