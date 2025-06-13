import React, { useCallback, useState, useEffect } from 'react';
import type { Node } from 'reactflow';
import { Tag, Collapse, Progress, Empty, Typography } from 'antd';
import { UpOutlined, DownOutlined } from '@ant-design/icons';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import './AISummary.css';
import type { AISummaryReport } from '~/types/aiSummary';
import { initialAiSummaryReport } from '~/types/aiSummary';
import type {
  NodeData,
  ProductNodeData,
  ManufacturingNodeData,
  DistributionNodeData,
  FinalProductNodeData,
} from '~/types/nodes';
import { calculateAiSummary } from './aiSummaryLogic';

interface CarbonFlowAISummaryProps {
  setSelectedNode: (node: Node<NodeData> | null) => void;
}

export const CarbonFlowAISummary = ({ setSelectedNode }: CarbonFlowAISummaryProps) => {
  const nodes = useCarbonFlowStore((state) => state.nodes);
  const [aiReport, setAiReport] = useState<AISummaryReport>(initialAiSummaryReport);
  const { setAiSummary: setStoreAiSummary } = useCarbonFlowStore();

  const refreshAiSummary = useCallback(
    (currentNodes: Node<NodeData>[]) => {
      const summaryCore = calculateAiSummary(currentNodes);
      setAiReport((prev: AISummaryReport) => {
        const newSummary = {
          ...summaryCore,
          isExpanded: prev.isExpanded,
          expandedSection: prev.expandedSection,
        };
        setStoreAiSummary(newSummary);
        return newSummary;
      });
    },
    [setStoreAiSummary],
  );

  // 监听强制刷新事件
  useEffect(() => {
    console.log('[AISummary] 设置事件监听器: force-refresh-ai-summary');

    const handleForceRefresh = () => {
      console.log('[AISummary] 收到强制刷新事件');
      refreshAiSummary(nodes);
    };

    window.addEventListener('force-refresh-ai-summary', handleForceRefresh);

    return () => {
      window.removeEventListener('force-refresh-ai-summary', handleForceRefresh);
    };
  }, [nodes, refreshAiSummary]);

  // 标准的节点变化监听
  useEffect(() => {
    console.log('[AISummary] 节点变化，重新计算评分');
    refreshAiSummary(nodes);
  }, [nodes, refreshAiSummary]);

  const toggleAiSummaryExpand = useCallback(() => {
    setAiReport((prev: AISummaryReport) => ({
      ...prev,
      isExpanded: !prev.isExpanded,
    }));
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 90) {
      return '#52c41a';
    }

    if (score >= 75) {
      return '#1890ff';
    }

    if (score >= 60) {
      return '#faad14';
    }

    return '#f5222d';
  };

  const getScoreStatus = (score: number) => {
    if (score >= 90) {
      return '优';
    }

    if (score >= 75) {
      return '良';
    }

    if (score >= 60) {
      return '中';
    }

    return '差';
  };

  const { credibilityScore, isExpanded, modelCompleteness, massBalance, dataTraceability, validation } = aiReport;
  const credibilityScorePercent = Math.round(credibilityScore);

  // Avoid rendering if nodes are not yet populated to prevent errors with empty summary
  if (!nodes) {
    return null;
  }

  return (
    <div className={`ai-summary-module ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="ai-summary-header" onClick={toggleAiSummaryExpand}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          AI工作流分析
        </Typography.Title>
        {isExpanded ? <UpOutlined /> : <DownOutlined />}
      </div>

      {isExpanded && (
        <div className="ai-summary-content">
          <div className="summary-score-section">
            <div className="total-score">
              <div className="score-circle" style={{ color: getScoreColor(credibilityScorePercent) }}>
                {credibilityScorePercent}
                <span className="score-unit">分</span>
              </div>
              <div className="score-label">总体可信度</div>
              <Tag color={getScoreColor(credibilityScorePercent)}>{getScoreStatus(credibilityScorePercent)}</Tag>
            </div>
          </div>

          <Collapse defaultActiveKey={['modelCompleteness']}>
            <Collapse.Panel
              header={
                <div className="score-panel-header">
                  <span>模型完整度</span>
                  <span className="score-value" style={{ color: getScoreColor(modelCompleteness.score) }}>
                    {modelCompleteness.score}分
                  </span>
                </div>
              }
              key="modelCompleteness"
            >
              <div className="score-detail-content">
                <Progress
                  percent={modelCompleteness.score}
                  strokeColor={getScoreColor(modelCompleteness.score)}
                  size="small"
                />
                <div className="score-summary">
                  <Typography.Title level={5}>评分总结</Typography.Title>
                  <div className="score-item">
                    <span>生命周期完整性:</span>
                    <span>{modelCompleteness.lifecycleCompleteness.toFixed(0)}%</span>
                  </div>
                  <div className="score-item">
                    <span>节点完整性:</span>
                    <span>{modelCompleteness.nodeCompleteness.toFixed(0)}%</span>
                  </div>
                </div>
                {modelCompleteness.incompleteNodes.length > 0 ? (
                  <div className="optimization-nodes">
                    <Typography.Title level={5}>需要优化的节点</Typography.Title>
                    {modelCompleteness.incompleteNodes.map(
                      (node: { id: string; label: string; missingFields: string[] }) => (
                        <div
                          key={node.id}
                          className="node-item"
                          onClick={() => {
                            const targetNode = nodes.find((n) => n.id === node.id);

                            if (targetNode) {
                              setSelectedNode(targetNode);
                            }
                          }}
                        >
                          <div className="node-header">
                            <Tag color="warning">{node.label}</Tag>
                          </div>
                          <div className="node-details">
                            <div>缺失字段:</div>
                            <div className="missing-fields">
                              {node.missingFields.map((field: string) => (
                                <Tag key={field} color="error">
                                  {field}
                                </Tag>
                              ))}
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <Empty description="模型完整度良好" />
                )}
              </div>
            </Collapse.Panel>

            <Collapse.Panel
              header={
                <div className="score-panel-header">
                  <span>质量平衡</span>
                  <span className="score-value" style={{ color: getScoreColor(massBalance.score) }}>
                    {massBalance.score}分
                  </span>
                </div>
              }
              key="massBalance"
            >
              <div className="score-detail-content">
                <Progress percent={massBalance.score} strokeColor={getScoreColor(massBalance.score)} size="small" />
                <div className="score-summary">
                  <Typography.Title level={5}>评分总结</Typography.Title>
                  <div className="score-item">
                    <span>平衡率 (输出/输入):</span>
                    <span>{massBalance.ratio.toFixed(2)}</span>
                  </div>
                </div>
                {massBalance.incompleteNodes.length > 0 ? (
                  <div className="optimization-nodes">
                    <Typography.Title level={5}>需要优化的节点 (缺失数量信息)</Typography.Title>
                    {massBalance.incompleteNodes.map((node: { id: string; label: string; missingFields: string[] }) => (
                      <div
                        key={node.id}
                        className="node-item"
                        onClick={() => {
                          const targetNode = nodes.find((n) => n.id === node.id);

                          if (targetNode) {
                            setSelectedNode(targetNode);
                          }
                        }}
                      >
                        <div className="node-header">
                          <Tag color="warning">{node.label}</Tag>
                        </div>
                        <div className="node-details">
                          <div>缺失字段:</div>
                          <div className="missing-fields">
                            {node.missingFields.map((field: string) => (
                              <Tag key={field} color="error">
                                {field}
                              </Tag>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="质量平衡良好或无需检查" />
                )}
              </div>
            </Collapse.Panel>

            <Collapse.Panel
              header={
                <div className="score-panel-header">
                  <span>数据可追溯性</span>
                  <span className="score-value" style={{ color: getScoreColor(dataTraceability.score) }}>
                    {dataTraceability.score}分
                  </span>
                </div>
              }
              key="dataTraceability"
            >
              <div className="score-detail-content">
                <Progress
                  percent={dataTraceability.score}
                  strokeColor={getScoreColor(dataTraceability.score)}
                  size="small"
                />
                <div className="score-summary">
                  <Typography.Title level={5}>评分总结</Typography.Title>
                  <div className="score-item">
                    <span>关键数据覆盖率:</span>
                    <span>{dataTraceability.coverage.toFixed(0)}%</span>
                  </div>
                </div>
                {dataTraceability.incompleteNodes.length > 0 ? (
                  <div className="optimization-nodes">
                    <Typography.Title level={5}>需要优化的节点 (缺少有效证据文件或非数据库来源)</Typography.Title>
                    {dataTraceability.incompleteNodes.map(
                      (node: { id: string; label: string; missingFields: string[] }) => (
                        <div
                          key={node.id}
                          className="node-item"
                          onClick={() => {
                            const targetNode = nodes.find((n) => n.id === node.id);

                            if (targetNode) {
                              setSelectedNode(targetNode);
                            }
                          }}
                        >
                          <div className="node-header">
                            <Tag color="warning">{node.label}</Tag>
                          </div>
                          <div className="node-details">
                            <div>建议操作:</div>
                            <div className="missing-fields">
                              {node.missingFields.map((field: string) => (
                                <Tag key={field} color="error">
                                  {field}
                                </Tag>
                              ))}
                              <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                                请上传活动数据证据文件，或配置数据库匹配的碳足迹因子
                              </div>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <Empty description="数据可追溯性良好" />
                )}
              </div>
            </Collapse.Panel>

            <Collapse.Panel
              header={
                <div className="score-panel-header">
                  <span>数据验证</span>
                  <span className="score-value" style={{ color: getScoreColor(validation.score) }}>
                    {validation.score}分
                  </span>
                </div>
              }
              key="validation"
            >
              <div className="score-detail-content">
                <Progress percent={validation.score} strokeColor={getScoreColor(validation.score)} size="small" />
                <div className="score-summary">
                  <Typography.Title level={5}>评分总结</Typography.Title>
                  <div className="score-item">
                    <span>已验证节点占比:</span>
                    <span>{validation.consistency.toFixed(0)}%</span>
                  </div>
                </div>
                {validation.incompleteNodes.length > 0 ? (
                  <div className="optimization-nodes">
                    <Typography.Title level={5}>需要优化的节点 (缺少已验证证据文件)</Typography.Title>
                    {validation.incompleteNodes.map((node: { id: string; label: string; missingFields: string[] }) => (
                      <div
                        key={node.id}
                        className="node-item"
                        onClick={() => {
                          const targetNode = nodes.find((n) => n.id === node.id);

                          if (targetNode) {
                            setSelectedNode(targetNode);
                          }
                        }}
                      >
                        <div className="node-header">
                          <Tag color="warning">{node.label}</Tag>
                        </div>
                        <div className="node-details">
                          <div>建议操作:</div>
                          <div className="missing-fields">
                            {node.missingFields.map((field: string) => (
                              <Tag key={field} color="error">
                                {field}
                              </Tag>
                            ))}
                            <div style={{ marginTop: '4px', fontSize: '12px', color: '#666' }}>
                              请确保上传的证据文件已经通过验证或审批流程
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="数据验证状态良好" />
                )}
              </div>
            </Collapse.Panel>
          </Collapse>
        </div>
      )}
    </div>
  );
};
