import React, { useEffect, useState, useCallback } from 'react';
import { Col, Row, message } from 'antd';
import { ClientOnly } from 'remix-utils/client-only';
import { useLoaderData } from '@remix-run/react';
import type { Workflow } from '~/types/workflow';
import type { CarbonFlowAction } from '~/types/actions';

// 导入组件
import {
  TaskProgressCard,
  LifecycleNavigationCard,
  AIFileParseModal,
  AIAutoFillModal,
  FileUploadModal,
  CarbonFactorMatchModal,
  SceneInfoCard,
  AiToolboxCard,
  ModelScoreCard,
  OptimizationSuggestionsCard,
  SettingsModal,
  EmissionSourceDrawer,
  EmissionSourceTable,
  SupplierDataModal,
  CompliancePanel,
} from './components';
import { CarbonFactorMatchProgressModal } from './components/CarbonFactorMatchProgressModal';

// 导入hooks
import {
  useFileOperations,
  useAIFileOperations,
  useCarbonFactorMatch,
  useModalManagement,
  useCarbonFlowData,
} from './hooks';
import { useCarbonFactorMatchProgress } from './hooks/useCarbonFactorMatchProgress';

// 导入服务和工具
import { getChineseFileStatusMessage, getLocalStorage } from '~/utils/carbonFlowUtils';
import {
  LIFECYCLE_STAGES,
  NODE_TYPE_TO_LIFECYCLE_STAGE_MAP,
  KEY_CARBON_PANEL_COLLAPSE,
} from '~/components/workbench/CarbonFlow/constants/carbonFlowConstants';

// 导入 store
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { CarbonFlowGraph } from '~/components/workbench/CarbonFlow/graph/CarbonFlowGraph';
import { calculateAiSummary } from '~/components/workbench/CarbonFlow/score/aiSummaryLogic';
import type { AISummaryReport } from '~/types/aiSummary';

// 导入样式
import './styles.css';

interface CarbonFlowPanelProps {
  workflowId: string;
  workflowName: string;
  workFlow: Workflow;
  onOpenFullPageTable?: () => void;
  isFullPageMode?: boolean;
}

/**
 * 碳流量面板组件 - 重构版本
 */
export const CarbonFlowPanel: React.FC<CarbonFlowPanelProps> = ({
  workflowId,
  workflowName: _initialWorkflowName,
  workFlow: _workFlow,
  onOpenFullPageTable,
  isFullPageMode = false,
}) => {
  // 基础状态
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<string>(LIFECYCLE_STAGES[0]);

  // 供应商数据管理状态
  const [isSupplierDataModalVisible, setIsSupplierDataModalVisible] = useState<boolean>(false);
  const [selectedEmissionSourceId, setSelectedEmissionSourceId] = useState<string>('');
  const [selectedEmissionSourceName, setSelectedEmissionSourceName] = useState<string>('');

  // 从 store 获取 aiSummary
  const aiSummary = useCarbonFlowStore((state) => state.aiSummary);
  const setAiSummary = useCarbonFlowStore((state) => state.setAiSummary);

  // 使用自定义hooks
  const fileOperations = useFileOperations(workflowId);
  const aiFileOperations = useAIFileOperations();
  const carbonFactorMatch = useCarbonFactorMatch();
  const modalManagement = useModalManagement();
  const carbonFlowData = useCarbonFlowData(workflowId);
  const matchProgress = useCarbonFactorMatchProgress();

  // 处理函数
  const handleStageSelect = (stage: string) => {
    setSelectedStage(stage);
  };

  const handleAddEmissionSource = () => {
    carbonFlowData.handleAddEmissionSource();
    modalManagement.handleOpenEmissionDrawer();
  };

  const handleEditEmissionSource = (nodeId: string) => {
    carbonFlowData.handleEditEmissionSource(nodeId);
    modalManagement.handleOpenEmissionDrawer();
  };

  const handleSaveEmissionSource = async (values: any) => {
    await carbonFlowData.handleSaveEmissionSource(values);
    modalManagement.handleCloseEmissionDrawer();
  };

  const handleCloseEmissionDrawer = () => {
    carbonFlowData.handleCloseEmissionDrawer();
    modalManagement.handleCloseEmissionDrawer();
  };

  const handleSaveSettings = async (values: any) => {
    await carbonFlowData.handleSaveSettings(values);
    modalManagement.handleCloseSettings();
  };

  // 供应商数据管理处理函数
  const handleOpenSupplierData = (nodeId: string) => {
    setSelectedEmissionSourceId(nodeId);
    setIsSupplierDataModalVisible(true);
  };

  const handleCloseSupplierData = () => {
    setIsSupplierDataModalVisible(false);
    setSelectedEmissionSourceId('');
    setSelectedEmissionSourceName('');
  };

  // 从AI工具箱打开供应商数据收集功能
  const handleOpenSupplierDataCollection = () => {
    // 如果有节点数据，打开第一个节点的供应商数据管理
    if (carbonFlowData.nodes.length > 0) {
      const firstNode = carbonFlowData.nodes[0];
      handleOpenSupplierData(firstNode.id, firstNode.data?.label || '未知排放源');
    } else {
      // 如果没有节点，提示用户先添加排放源
      message.info('请先添加排放源，然后再进行供应商数据收集');
    }
  };

  const handleUploadModalOk = async () => {
    await fileOperations.handleUploadFiles();
    modalManagement.handleCloseUploadModal();
  };

  const handleCloseUploadModal = () => {
    fileOperations.setModalFileList([]);
    fileOperations.uploadModalFormRef.current?.resetFields();
    modalManagement.handleCloseUploadModal();
  };

  const handleCloseAIFileParseModal = () => {
    fileOperations.setSelectedFileForParse(null);
    aiFileOperations.handleCloseAIFileParseModal();
  };

  const handleCloseAIAutoFillModal = () => {
    aiFileOperations.clearAiAutoFillResult();
    aiFileOperations.handleCloseAIAutoFillModal();
  };

  // 过滤节点数据
  const getFilteredNodesForTable = () => {
    if (selectedStage === '全部') {
      const allNodes = carbonFlowData.nodes.map((node, index) => ({
        ...node,
        key: node.id,
        index: index + 1,
        lifecycleStage:
          node.data?.lifecycleStage ||
          (node.type ? NODE_TYPE_TO_LIFECYCLE_STAGE_MAP[node.type] || '未知阶段' : '未知阶段'),
        label: node.data?.label || '',
        emissionType: node.data?.emissionType || '',
      }));

      return allNodes;
    }

    // 使用lifecycleStage字段进行过滤，而不是node.type
    const filteredNodes = carbonFlowData.nodes
      .filter((node) => {
        // 获取节点的生命周期阶段
        const nodeLifecycleStage =
          node.data?.lifecycleStage ||
          (node.type ? NODE_TYPE_TO_LIFECYCLE_STAGE_MAP[node.type] || '未知阶段' : '未知阶段');

        const matches = nodeLifecycleStage === selectedStage;

        return matches;
      })
      .map((node, index) => ({
        ...node,
        key: node.id,
        index: index + 1,
        lifecycleStage:
          node.data?.lifecycleStage ||
          (node.type ? NODE_TYPE_TO_LIFECYCLE_STAGE_MAP[node.type] || '未知阶段' : '未知阶段'),
        label: node.data?.label || '',
        emissionType: node.data?.emissionType || '',
      }));

    return filteredNodes;
  };

  // 事件监听器设置
  useEffect(() => {
    const cleanup = aiFileOperations.setupFileParseEventListener(
      fileOperations.selectedFileForParse,
      fileOperations.updateFileStatus,
    );
    return cleanup;
  }, [fileOperations.selectedFileForParse, fileOperations.updateFileStatus, aiFileOperations]);

  // 初始化数据
  useEffect(() => {
    if (workflowId) {
      // 🆕 检查 store 中是否已有数据，避免不必要的数据库加载
      const currentWorkflowId = useCarbonFlowStore.getState().workflowId;

      // 只有当工作流ID不匹配或者没有节点数据时才从数据库加载
      if (currentWorkflowId !== workflowId || carbonFlowData.nodes.length === 0) {
        console.log('[CarbonFlowPanel] 从数据库加载数据，当前工作流ID:', currentWorkflowId, '目标ID:', workflowId);
        carbonFlowData.loadData();
      } else {
        console.log('[CarbonFlowPanel] 使用现有store数据，跳过数据库加载');
      }

      // 总是获取文件列表（这不会影响任务状态）
      fileOperations.fetchWorkflowFiles();
    }
  }, [workflowId]);

  // 🆕 监听文件更新事件（来自BaseChat等其他组件的文件上传）
  useEffect(() => {
    const handleFilesUpdated = (event: CustomEvent) => {
      const { workflowId: eventWorkflowId } = event.detail;

      // 只处理当前工作流的文件更新
      if (eventWorkflowId === workflowId) {
        console.log('[CarbonFlowPanel] 收到文件更新事件，刷新文件列表');
        fileOperations.fetchWorkflowFiles();
      }
    };

    window.addEventListener('workflow-files-updated', handleFilesUpdated as EventListener);

    return () => {
      window.removeEventListener('workflow-files-updated', handleFilesUpdated as EventListener);
    };
  }, [workflowId, fileOperations.fetchWorkflowFiles]);

  // 监听节点变化并触发AI摘要计算
  useEffect(() => {
    if (carbonFlowData.nodes.length > 0) {
      console.log('[CarbonFlowPanel] 触发AI摘要计算');

      // 计算AI摘要
      const summaryCore = calculateAiSummary(carbonFlowData.nodes);

      if (summaryCore) {
        const fullSummary: AISummaryReport = {
          ...summaryCore,
          isExpanded: false,
          expandedSection: null,
        };
        setAiSummary(fullSummary);
        console.log('[CarbonFlowPanel] AI摘要已更新到store');
      }
    } else {
      // 如果没有节点，清空AI摘要
      setAiSummary(undefined);
    }
  }, [carbonFlowData.nodes, setAiSummary]);

  // 加载本地存储的面板状态
  useEffect(() => {
    const savedCollapsed = getLocalStorage(KEY_CARBON_PANEL_COLLAPSE, false);

    if (savedCollapsed !== collapsed) {
      setCollapsed(savedCollapsed);
    }
  }, [collapsed]);

  // 更新节点位置
  const handleNodeDragStop = (event: any, node: Node) => {
    // ...
  };

  if (isFullPageMode) {
    // In full-page mode, we only want to display the table and its related drawer for editing.
    return (
      <>
        <EmissionSourceTable
          selectedStage={selectedStage}
          nodes={carbonFlowData.nodes}
          onAddEmissionSource={handleAddEmissionSource}
          getFilteredNodesForTable={getFilteredNodesForTable}
          onEditEmissionSource={handleEditEmissionSource}
          onDeleteEmissionSource={carbonFlowData.handleDeleteEmissionSource}
          onAddChildNode={carbonFlowData.handleAddChildNode}
          onOpenFullPageTable={onOpenFullPageTable}
          isFullPageMode={isFullPageMode}
        />
        {/* The drawer needs to be available in full-screen mode to allow editing */}
        <EmissionSourceDrawer
          visible={modalManagement.isEmissionDrawerVisible}
          onClose={handleCloseEmissionDrawer}
          onSave={handleSaveEmissionSource}
          form={carbonFlowData.emissionForm}
          editingNodeId={carbonFlowData.editingNodeId}
          backgroundDataActiveTabKey={modalManagement.backgroundDataActiveTabKey}
          onBackgroundDataTabChange={modalManagement.setBackgroundDataActiveTabKey}
        />
      </>
    );
  }

  return (
    <div className="h-full w-full bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary overflow-auto">
      <div className="flex flex-row h-full w-full p-4 space-x-4">
        {/* Left Column: Task Progress */}
        <div className="w-80 flex-shrink-0 h-full">
          <TaskProgressCard className="h-full overflow-y-auto" />
        </div>

        {/* Right Column: Main Content */}
        <div className="flex-grow flex flex-col space-y-4 min-h-0">
          {/* Upper Row - 30% height */}
          <Row gutter={16} className="h-[30%] flex-shrink-0">
            {/* Scene Info and AI Toolbox */}
            <Col span={8} className="flex flex-col h-full space-y-4">
              {/* Scene Info Card */}
              <SceneInfoCard sceneInfo={carbonFlowData.sceneInfo} onOpenSettings={modalManagement.handleOpenSettings} />

              {/* AI Toolbox Card */}
              <AiToolboxCard
                onOpenAIFileParseModal={aiFileOperations.handleOpenAIFileParseModal}
                onOpenAIAutoFillModal={aiFileOperations.handleOpenAIAutoFillModal}
                onOpenSupplierDataCollection={handleOpenSupplierDataCollection}
                nodes={carbonFlowData.nodes.map((node) => node.data)}
                workflowId={workflowId}
              />
            </Col>

            {/* Compliance Panel */}
            <Col span={8} className="flex flex-col h-full">
              <CompliancePanel
                sceneInfo={carbonFlowData.sceneInfo}
                nodes={carbonFlowData.nodes}
                className="h-full overflow-y-auto"
              />
            </Col>

            {/* Model Score Column */}
            <Col span={8} className="flex flex-col h-full">
              <ModelScoreCard aiSummary={aiSummary} />
              <OptimizationSuggestionsCard aiSummary={aiSummary} />
            </Col>
          </Row>

          {/* Lower Row - Takes remaining height */}
          <Row gutter={16} className="flex-grow min-h-0">
            {/* Lifecycle Navigation */}
            <Col span={5} className="flex flex-col h-full">
              <LifecycleNavigationCard selectedStage={selectedStage} onStageSelect={handleStageSelect} />
            </Col>

            {/* Emission Source List */}
            <Col span={19} className="flex flex-col h-full">
              <Col span={24} className="flex flex-col min-h-0">
                <EmissionSourceTable
                  selectedStage={selectedStage}
                  nodes={carbonFlowData.nodes}
                  onAddEmissionSource={handleAddEmissionSource}
                  getFilteredNodesForTable={getFilteredNodesForTable}
                  onEditEmissionSource={handleEditEmissionSource}
                  onDeleteEmissionSource={carbonFlowData.handleDeleteEmissionSource}
                  onAddChildNode={carbonFlowData.handleAddChildNode}
                  onOpenFullPageTable={onOpenFullPageTable}
                  isFullPageMode={isFullPageMode}
                />
              </Col>
            </Col>
          </Row>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        visible={modalManagement.isSettingsModalVisible}
        onCancel={modalManagement.handleCloseSettings}
        onSubmit={handleSaveSettings}
        form={carbonFlowData.settingsForm}
        initialValues={carbonFlowData.sceneInfo}
      />

      {/* Emission Source Drawer */}
      <EmissionSourceDrawer
        visible={modalManagement.isEmissionDrawerVisible}
        onClose={handleCloseEmissionDrawer}
        onSave={handleSaveEmissionSource}
        form={carbonFlowData.emissionForm}
        editingNodeId={carbonFlowData.editingNodeId}
        backgroundDataActiveTabKey={modalManagement.backgroundDataActiveTabKey}
        onBackgroundDataTabChange={modalManagement.setBackgroundDataActiveTabKey}
      />

      {/* AI File Parse Modal */}
      <AIFileParseModal
        visible={aiFileOperations.isAIFileParseModalVisible}
        onClose={handleCloseAIFileParseModal}
        uploadedFiles={fileOperations.uploadedFiles}
        selectedFileForParse={fileOperations.selectedFileForParse}
        onFileSelect={fileOperations.setSelectedFileForParse}
        onParseFile={fileOperations.handleParseFile}
        onPreviewFile={fileOperations.handlePreviewFile}
        onOpenUploadModal={modalManagement.handleOpenUploadModal}
        isLoadingFiles={fileOperations.isLoadingFiles}
        nodes={carbonFlowData.nodes}
        getChineseFileStatusMessage={getChineseFileStatusMessage}
        selectedParsedSourceKeys={aiFileOperations.selectedParsedSourceKeys}
        onSelectedParsedSourceKeysChange={aiFileOperations.setSelectedParsedSourceKeys}
        onDeleteFile={fileOperations.handleDeleteFile}
      />

      {/* AI Auto Fill Modal */}
      <AIAutoFillModal
        visible={aiFileOperations.isAIAutoFillModalVisible}
        onClose={handleCloseAIAutoFillModal}
        nodes={carbonFlowData.nodes}
        onAIAutofillCarbonFactorMatch={aiFileOperations.handleAIAutofillCarbonFactorMatch}
        aiAutoFillSelectedRowKeys={aiFileOperations.aiAutoFillSelectedRowKeys}
        onAiAutoFillSelectedRowKeysChange={aiFileOperations.setAiAutoFillSelectedRowKeys}
        aiAutoFillResult={aiFileOperations.aiAutoFillResult}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        visible={modalManagement.isUploadModalVisible}
        onClose={handleCloseUploadModal}
        onOk={handleUploadModalOk}
        modalFileList={fileOperations.modalFileList}
        onUploadChange={fileOperations.handleModalUploadChange}
        onRemoveFile={fileOperations.handleRemoveFileFromModalList}
        onClearList={fileOperations.handleClearModalList}
        isUploading={fileOperations.isUploading}
        formRef={fileOperations.uploadModalFormRef}
      />

      {/* Carbon Factor Match Modal */}
      <CarbonFactorMatchModal
        visible={carbonFactorMatch.isFactorMatchModalVisible}
        onClose={carbonFactorMatch.handleCloseFactorMatchModal}
        onAIMatch={() => {
          // 执行碳因子匹配
          if (carbonFactorMatch.selectedFactorMatchSources.length === 0) {
            message.warning('请选择至少一个排放源进行匹配');
            return;
          }

          const action: CarbonFlowAction = {
            type: 'carbonflow',
            operation: 'carbon_factor_match',
            content: '碳因子匹配',
            nodeId: carbonFactorMatch.selectedFactorMatchSources.map((id) => String(id)).join(','),
          };

          window.dispatchEvent(
            new CustomEvent('carbonflow-action', {
              detail: { action },
            }),
          );

          // 关闭模态框
          carbonFactorMatch.handleCloseFactorMatchModal();
        }}
        factorMatchModalSources={carbonFactorMatch.factorMatchModalSources}
        selectedFactorMatchSources={carbonFactorMatch.selectedFactorMatchSources}
        onSelectionChange={carbonFactorMatch.setSelectedFactorMatchSources}
        matchResults={carbonFactorMatch.matchResults}
        showMatchResultsModal={carbonFactorMatch.showMatchResultsModal}
        onCloseMatchResults={carbonFactorMatch.handleCloseMatchResults}
        nodes={carbonFlowData.nodes}
      />

      {/* Supplier Data Modal */}
      <SupplierDataModal
        visible={isSupplierDataModalVisible}
        onClose={handleCloseSupplierData}
        emissionSourceId={selectedEmissionSourceId}
        emissionSourceName={selectedEmissionSourceName}
      />

      {/* Carbon Factor Match Progress Modal */}
      <CarbonFactorMatchProgressModal
        visible={matchProgress.visible}
        onClose={matchProgress.closeProgress}
        onCancel={matchProgress.cancelMatch}
        totalNodes={matchProgress.totalNodes}
        progressItems={matchProgress.progressItems}
        isCompleted={matchProgress.isCompleted}
      />
    </div>
  );
};

/**
 * 客户端组件包装器
 */
export const CarbonFlowPanelClient = () => {
  const { workflow } = useLoaderData() as any;

  return (
    <ClientOnly fallback={<div>Loading Carbon Flow Panel...</div>}>
      {() => <CarbonFlowPanel workflowId={workflow.id} workflowName={workflow.name} workFlow={workflow} />}
    </ClientOnly>
  );
};

export default CarbonFlowPanel;
