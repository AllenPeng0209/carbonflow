import React, { useCallback, useState, useEffect } from 'react';
import type { Node } from 'reactflow';
import { Tag, Collapse, Progress, Empty, Typography, Select, Switch, Card, Statistic, Row, Col } from 'antd';
import {
  UpOutlined,
  DownOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import type { NodeData } from '~/types/nodes';
import type {
  ComplianceStandard,
  ComplianceScoreDetail,
  MultiStandardComplianceReport,
  ComplianceCheckConfiguration,
  createComplianceChecker,
} from '~/types/complianceCheck';
import './ComplianceCheck.css';

const { Option } = Select;

interface ComplianceCheckProps {
  setSelectedNode: (node: Node<NodeData> | null) => void;
}

export const ComplianceCheck = ({ setSelectedNode }: ComplianceCheckProps) => {
  const nodes = useCarbonFlowStore((state) => state.nodes);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStandards, setSelectedStandards] = useState<ComplianceStandard[]>(['ISO_14067', 'GHG_PROTOCOL']);
  const [complianceReport, setComplianceReport] = useState<MultiStandardComplianceReport | null>(null);
  const [configuration, setConfiguration] = useState<ComplianceCheckConfiguration>({
    enabledStandards: ['ISO_14067', 'GHG_PROTOCOL'],
    reportFormat: 'detailed',
    includeRecommendations: true,
    includeNodeLevel: true,
    autoRefresh: true,
    thresholds: {
      critical: 60,
      warning: 75,
      acceptable: 90,
    },
  });

  // 可用的法规标准
  const availableStandards = [
    { value: 'ISO_14067', label: 'ISO 14067 - 产品碳足迹' },
    { value: 'ISO_14040_14044', label: 'ISO 14040/14044 - LCA标准' },
    { value: 'ISO_14064', label: 'ISO 14064 - 温室气体核算' },
    { value: 'PAS_2050', label: 'PAS 2050 - 碳足迹规范' },
    { value: 'GHG_PROTOCOL', label: 'GHG Protocol - 温室气体协议' },
    { value: 'CBAM', label: 'CBAM - 欧盟碳边境调节机制' },
    { value: 'EU_TAXONOMY', label: 'EU Taxonomy - 欧盟分类法' },
    { value: 'TCFD', label: 'TCFD - 气候相关财务披露' },
    { value: 'CSRD', label: 'CSRD - 企业可持续发展报告' },
    { value: 'SBTI', label: 'SBTi - 科学碳目标倡议' },
  ];

  // 计算合规性评分
  const calculateComplianceScores = useCallback(
    (currentNodes: Node<NodeData>[]): MultiStandardComplianceReport => {
      const standards: ComplianceScoreDetail[] = selectedStandards.map((standard) => {
        const checker = createComplianceChecker(standard);
        return checker.checkCompliance(currentNodes);
      });

      // 计算综合评分
      const averageScore = standards.reduce((sum, std) => sum + std.overallScore, 0) / standards.length;
      const bestPerforming = standards.reduce((best, current) =>
        current.overallScore > best.overallScore ? current : best,
      );
      const worstPerforming = standards.reduce((worst, current) =>
        current.overallScore < worst.overallScore ? current : worst,
      );

      // 识别通用问题
      const commonIssues = identifyCommonIssues(standards);

      // 生成优先行动项
      const actionItems = generateActionItems(standards);

      return {
        workflowId: 'current-workflow',
        reportDate: new Date().toISOString(),
        standards,
        aggregateScore: {
          averageScore: Math.round(averageScore),
          bestPerformingStandard: bestPerforming.standard,
          worstPerformingStandard: worstPerforming.standard,
        },
        commonIssues,
        actionItems,
      };
    },
    [selectedStandards],
  );

  // 识别通用问题
  const identifyCommonIssues = (standards: ComplianceScoreDetail[]) => {
    // 简化实现：查找在多个标准中都出现的问题类别
    const issueMap = new Map<string, { count: number; standards: ComplianceStandard[] }>();

    standards.forEach((std) => {
      std.nodeIssues.forEach((nodeIssue) => {
        nodeIssue.issues.forEach((issue) => {
          const key = issue.description;

          if (issueMap.has(key)) {
            const existing = issueMap.get(key)!;
            existing.count++;
            existing.standards.push(std.standard);
          } else {
            issueMap.set(key, { count: 1, standards: [std.standard] });
          }
        });
      });
    });

    return Array.from(issueMap.entries())
      .filter(([_, data]) => data.count > 1)
      .map(([description, data]) => ({
        description,
        affectedStandards: data.standards,
        severity: 'major' as const,
        solution: `需要在${data.standards.length}个标准中解决此问题`,
      }));
  };

  // 生成优先行动项
  const generateActionItems = (standards: ComplianceScoreDetail[]) => {
    const actions: any[] = [];

    standards.forEach((std) => {
      std.improvements.forEach((improvement) => {
        actions.push({
          priority: actions.length + 1,
          description: improvement.action,
          affectedStandards: [std.standard],
          estimatedImpact: improvement.priority === 'high' ? 15 : improvement.priority === 'medium' ? 10 : 5,
          effort: improvement.effort,
        });
      });
    });

    return actions.sort((a, b) => b.estimatedImpact - a.estimatedImpact).slice(0, 5);
  };

  // 监听节点变化
  useEffect(() => {
    if (configuration.autoRefresh && nodes.length > 0) {
      const report = calculateComplianceScores(nodes);
      setComplianceReport(report);
    }
  }, [nodes, selectedStandards, configuration.autoRefresh, calculateComplianceScores]);

  // 获取评分颜色
  const getScoreColor = (score: number) => {
    if (score >= configuration.thresholds.acceptable) {
      return '#52c41a';
    }

    if (score >= configuration.thresholds.warning) {
      return '#1890ff';
    }

    if (score >= configuration.thresholds.critical) {
      return '#faad14';
    }

    return '#f5222d';
  };

  // 获取评分状态
  const getScoreStatus = (score: number) => {
    if (score >= configuration.thresholds.acceptable) {
      return '优秀';
    }

    if (score >= configuration.thresholds.warning) {
      return '良好';
    }

    if (score >= configuration.thresholds.critical) {
      return '合格';
    }

    return '需改进';
  };

  // 获取合规级别图标
  const getComplianceLevelIcon = (level: string) => {
    switch (level) {
      case 'full_compliance':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'substantial_compliance':
        return <CheckCircleOutlined style={{ color: '#1890ff' }} />;
      case 'partial_compliance':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
    }
  };

  // 获取合规级别文本
  const getComplianceLevelText = (level: string) => {
    switch (level) {
      case 'full_compliance':
        return '完全合规';
      case 'substantial_compliance':
        return '基本合规';
      case 'partial_compliance':
        return '部分合规';
      default:
        return '不合规';
    }
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  const handleStandardChange = (values: ComplianceStandard[]) => {
    setSelectedStandards(values);
    setConfiguration((prev) => ({ ...prev, enabledStandards: values }));
  };

  if (!nodes || nodes.length === 0) {
    return null;
  }

  return (
    <div className={`compliance-check-module ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="compliance-check-header" onClick={toggleExpand}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          法规合规性检查
        </Typography.Title>
        {isExpanded ? <UpOutlined /> : <DownOutlined />}
      </div>

      {isExpanded && (
        <div className="compliance-check-content">
          {/* 配置区域 */}
          <div className="compliance-config-section">
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={16}>
                <Typography.Text strong>选择法规标准：</Typography.Text>
                <Select
                  mode="multiple"
                  style={{ width: '100%', marginTop: 8 }}
                  placeholder="选择要检查的法规标准"
                  value={selectedStandards}
                  onChange={handleStandardChange}
                >
                  {availableStandards.map((std) => (
                    <Option key={std.value} value={std.value}>
                      {std.label}
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <Typography.Text strong>自动刷新：</Typography.Text>
                <br />
                <Switch
                  checked={configuration.autoRefresh}
                  onChange={(checked) => setConfiguration((prev) => ({ ...prev, autoRefresh: checked }))}
                  style={{ marginTop: 8 }}
                />
              </Col>
            </Row>
          </div>

          {complianceReport && (
            <>
              {/* 总体评分 */}
              <Card size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="综合合规得分"
                      value={complianceReport.aggregateScore.averageScore}
                      suffix="分"
                      valueStyle={{ color: getScoreColor(complianceReport.aggregateScore.averageScore) }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="最佳表现标准"
                      value={
                        availableStandards
                          .find((s) => s.value === complianceReport.aggregateScore.bestPerformingStandard)
                          ?.label.split(' - ')[0] || ''
                      }
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="需改进标准"
                      value={
                        availableStandards
                          .find((s) => s.value === complianceReport.aggregateScore.worstPerformingStandard)
                          ?.label.split(' - ')[0] || ''
                      }
                      valueStyle={{ color: '#f5222d' }}
                    />
                  </Col>
                </Row>
              </Card>

              {/* 各标准详细评分 */}
              <Collapse defaultActiveKey={['standards']}>
                <Collapse.Panel
                  header={
                    <div className="score-panel-header">
                      <span>各标准合规性评分</span>
                      <span className="score-value">{selectedStandards.length} 个标准</span>
                    </div>
                  }
                  key="standards"
                >
                  {complianceReport.standards.map((standardResult) => (
                    <Card key={standardResult.standard} size="small" style={{ marginBottom: 12 }}>
                      <div className="standard-score-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {getComplianceLevelIcon(standardResult.level)}
                          <Typography.Text strong>
                            {availableStandards.find((s) => s.value === standardResult.standard)?.label}
                          </Typography.Text>
                          <Tag color={getScoreColor(standardResult.overallScore)}>
                            {getComplianceLevelText(standardResult.level)}
                          </Tag>
                        </div>
                        <div className="score-value" style={{ color: getScoreColor(standardResult.overallScore) }}>
                          {standardResult.overallScore}分
                        </div>
                      </div>

                      <Progress
                        percent={standardResult.overallScore}
                        strokeColor={getScoreColor(standardResult.overallScore)}
                        size="small"
                        style={{ marginTop: 12 }}
                      />

                      <div className="standard-summary" style={{ marginTop: 12 }}>
                        <Row gutter={16}>
                          <Col span={6}>
                            <Typography.Text type="secondary">强制要求：</Typography.Text>
                            <br />
                            <Typography.Text>{standardResult.mandatoryScore}分</Typography.Text>
                          </Col>
                          <Col span={6}>
                            <Typography.Text type="secondary">推荐要求：</Typography.Text>
                            <br />
                            <Typography.Text>{standardResult.recommendedScore}分</Typography.Text>
                          </Col>
                          <Col span={6}>
                            <Typography.Text type="secondary">合规项目：</Typography.Text>
                            <br />
                            <Typography.Text>
                              {standardResult.summary.compliantRequirements}/{standardResult.summary.totalRequirements}
                            </Typography.Text>
                          </Col>
                          <Col span={6}>
                            <Typography.Text type="secondary">问题节点：</Typography.Text>
                            <br />
                            <Typography.Text>{standardResult.nodeIssues.length}</Typography.Text>
                          </Col>
                        </Row>
                      </div>

                      {/* 问题节点 */}
                      {standardResult.nodeIssues.length > 0 && (
                        <div className="node-issues" style={{ marginTop: 16 }}>
                          <Typography.Title level={5}>问题节点</Typography.Title>
                          {standardResult.nodeIssues.map((nodeIssue) => (
                            <div
                              key={nodeIssue.nodeId}
                              className="node-item"
                              onClick={() => {
                                const targetNode = nodes.find((n) => n.id === nodeIssue.nodeId);

                                if (targetNode) {
                                  setSelectedNode(targetNode);
                                }
                              }}
                              style={{ cursor: 'pointer', marginBottom: 8 }}
                            >
                              <div className="node-header">
                                <Tag color="warning">{nodeIssue.nodeLabel}</Tag>
                                <Typography.Text type="secondary">({nodeIssue.nodeType})</Typography.Text>
                              </div>
                              <div className="node-issues-list">
                                {nodeIssue.issues.map((issue, index) => (
                                  <div key={index} style={{ marginTop: 4 }}>
                                    <Tag
                                      color={
                                        issue.severity === 'critical'
                                          ? 'error'
                                          : issue.severity === 'major'
                                            ? 'warning'
                                            : 'default'
                                      }
                                      size="small"
                                    >
                                      {issue.requirementName}
                                    </Tag>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                      {issue.description}
                                    </Typography.Text>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </Collapse.Panel>

                {/* 通用问题 */}
                {complianceReport.commonIssues.length > 0 && (
                  <Collapse.Panel
                    header={
                      <div className="score-panel-header">
                        <span>通用问题</span>
                        <span className="score-value">{complianceReport.commonIssues.length} 个问题</span>
                      </div>
                    }
                    key="common-issues"
                  >
                    {complianceReport.commonIssues.map((issue, index) => (
                      <Card key={index} size="small" style={{ marginBottom: 8 }}>
                        <div>
                          <Typography.Text strong>{issue.description}</Typography.Text>
                          <Tag color="error" style={{ marginLeft: 8 }}>
                            {issue.severity}
                          </Tag>
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Typography.Text type="secondary">影响的标准：</Typography.Text>
                          {issue.affectedStandards.map((std) => (
                            <Tag key={std} size="small">
                              {availableStandards.find((s) => s.value === std)?.label.split(' - ')[0]}
                            </Tag>
                          ))}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <Typography.Text type="secondary">解决方案：</Typography.Text>
                          <br />
                          <Typography.Text>{issue.solution}</Typography.Text>
                        </div>
                      </Card>
                    ))}
                  </Collapse.Panel>
                )}

                {/* 优先行动项 */}
                {complianceReport.actionItems.length > 0 && (
                  <Collapse.Panel
                    header={
                      <div className="score-panel-header">
                        <span>优先行动项</span>
                        <span className="score-value">{complianceReport.actionItems.length} 项建议</span>
                      </div>
                    }
                    key="action-items"
                  >
                    {complianceReport.actionItems.map((action, index) => (
                      <Card key={index} size="small" style={{ marginBottom: 8 }}>
                        <Row align="middle">
                          <Col span={2}>
                            <Tag color="blue">#{action.priority}</Tag>
                          </Col>
                          <Col span={12}>
                            <Typography.Text strong>{action.description}</Typography.Text>
                          </Col>
                          <Col span={4}>
                            <Typography.Text type="secondary">预期提升：</Typography.Text>
                            <br />
                            <Typography.Text>{action.estimatedImpact}分</Typography.Text>
                          </Col>
                          <Col span={3}>
                            <Typography.Text type="secondary">工作量：</Typography.Text>
                            <br />
                            <Tag
                              color={action.effort === 'low' ? 'green' : action.effort === 'medium' ? 'orange' : 'red'}
                            >
                              {action.effort === 'low' ? '低' : action.effort === 'medium' ? '中' : '高'}
                            </Tag>
                          </Col>
                          <Col span={3}>
                            <Typography.Text type="secondary">影响标准：</Typography.Text>
                            <br />
                            <Typography.Text>{action.affectedStandards.length}</Typography.Text>
                          </Col>
                        </Row>
                      </Card>
                    ))}
                  </Collapse.Panel>
                )}
              </Collapse>
            </>
          )}

          {!complianceReport && (
            <Empty description="请选择法规标准并确保工作流中有节点数据" style={{ margin: '40px 0' }} />
          )}
        </div>
      )}
    </div>
  );
};
