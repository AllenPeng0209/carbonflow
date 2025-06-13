import React, { useState, useEffect } from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Progress,
  Alert,
  Tabs,
  Table,
  Tag,
  Button,
  Space,
  Statistic,
  Timeline,
  Tooltip,
  Badge,
  Divider,
  Typography,
  List,
  Rate,
} from 'antd';
import {
  SecurityScanOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  
  DatabaseOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { NodeData } from '~/types/nodes';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// 风险评估结果接口
interface RiskAssessmentResult {
  overallRiskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dimensions: {
    dataQuality: RiskDimension;
    compliance: RiskDimension;
    supplyChain: RiskDimension;
    methodology: RiskDimension;
    temporal: RiskDimension;
    geographic: RiskDimension;
  };
  criticalIssues: RiskIssue[];
  recommendations: Recommendation[];
  nodeRisks: NodeRiskAssessment[];
}

interface RiskDimension {
  score: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  issues: string[];
  recommendations: string[];
}

interface RiskIssue {
  id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  description: string;
  affectedNodes: string[];
  impact: string;
  recommendation: string;
}

interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  action: string;
  expectedImpact: string;
  timeframe: string;
}

interface NodeRiskAssessment {
  nodeId: string;
  overallRisk: number;
  riskFactors: {
    dataCompleteness: number;
    factorReliability: number;
    temporalRelevance: number;
    geographicRelevance: number;
    supplierCredibility: number;
  };
  criticalFlags: string[];
}

interface AIRiskAssessmentModalProps {
  visible: boolean;
  onClose: () => void;
  nodes: NodeData[];
  workflowId: string;
}

export const AIRiskAssessmentModal: React.FC<AIRiskAssessmentModalProps> = ({
  visible,
  onClose,
  nodes,
  workflowId,
}) => {
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<RiskAssessmentResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // 执行风险评估
  const performRiskAssessment = async () => {
    setLoading(true);

    try {
      // 模拟AI风险评估计算
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const result = calculateRiskAssessment(nodes);
      setAssessmentResult(result);
    } catch (error) {
      console.error('风险评估失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && nodes.length > 0) {
      performRiskAssessment();
    }
  }, [visible, nodes]);

  // 风险评估计算逻辑
  const calculateRiskAssessment = (nodes: NodeData[]): RiskAssessmentResult => {
    const nodeRisks = nodes.map(calculateNodeRisk);
    const overallRiskScore = nodeRisks.reduce((sum, node) => sum + node.overallRisk, 0) / nodeRisks.length;

    return {
      overallRiskScore,
      riskLevel: getRiskLevel(overallRiskScore),
      dimensions: calculateDimensionRisks(nodes),
      criticalIssues: identifyCriticalIssues(nodes, nodeRisks),
      recommendations: generateRecommendations(nodes, nodeRisks),
      nodeRisks,
    };
  };

  const calculateNodeRisk = (node: NodeData): NodeRiskAssessment => {
    const dataCompleteness = calculateDataCompleteness(node);
    const factorReliability = calculateFactorReliability(node);
    const temporalRelevance = calculateTemporalRelevance(node);
    const geographicRelevance = calculateGeographicRelevance(node);
    const supplierCredibility = calculateSupplierCredibility(node);

    const overallRisk =
      dataCompleteness * 0.25 +
      factorReliability * 0.25 +
      temporalRelevance * 0.2 +
      geographicRelevance * 0.15 +
      supplierCredibility * 0.15;

    const criticalFlags = [];
    if (dataCompleteness < 60) {criticalFlags.push('数据不完整');}
    if (factorReliability < 50) {criticalFlags.push('排放因子可靠性低');}
    if (temporalRelevance < 40) {criticalFlags.push('时间相关性差');}
    if (!node.supplierInfo?.isDirectSupplier && node.supplierInfo?.tier && node.supplierInfo.tier > 2) {
      criticalFlags.push('深层供应商风险');
    }

    return {
      nodeId: node.label,
      overallRisk,
      riskFactors: {
        dataCompleteness,
        factorReliability,
        temporalRelevance,
        geographicRelevance,
        supplierCredibility,
      },
      criticalFlags,
    };
  };

  const calculateDataCompleteness = (node: NodeData): number => {
    let score = 100;
    if (!node.carbonFactor || node.carbonFactor === '0') {score -= 30;}
    if (!node.quantity || node.quantity === '0') {score -= 20;}
    if (!node.activityUnit) {score -= 15;}
    if (!node.carbonFactorName) {score -= 15;}
    if (!node.emissionFactorGeographicalRepresentativeness) {score -= 10;}
    if (!node.emissionFactorTemporalRepresentativeness) {score -= 10;}
    return Math.max(0, score);
  };

  const calculateFactorReliability = (node: NodeData): number => {
    let score = 50; // 基础分

    // 数据源可靠性
    if (node.carbonFactordataSource?.includes('官方') || node.carbonFactordataSource?.includes('政府')) {score += 30;}
    else if (node.carbonFactordataSource?.includes('行业协会')) {score += 20;}
    else if (node.carbonFactordataSource?.includes('第三方')) {score += 10;}

    // 活动数据来源
    if (node.activitydataSource === '手动填写') {score += 10;}
    else if (node.activitydataSource === '文件解析') {score += 5;}

    // 验证状态
    if (node.verificationStatus === '已验证') {score += 10;}

    return Math.min(100, score);
  };

  const calculateTemporalRelevance = (node: NodeData): number => {
    const temporal = node.emissionFactorTemporalRepresentativeness;
    if (!temporal) {return 30;}

    if (temporal.includes('2024') || temporal.includes('2023')) {return 90;}
    if (temporal.includes('2022') || temporal.includes('2021')) {return 75;}
    if (temporal.includes('2020') || temporal.includes('2019')) {return 60;}
    return 40;
  };

  const calculateGeographicRelevance = (node: NodeData): number => {
    const geographic = node.emissionFactorGeographicalRepresentativeness;
    if (!geographic) {return 40;}

    if (geographic.includes('中国') || geographic.includes('CN')) {return 90;}
    if (geographic.includes('亚洲') || geographic.includes('Asia')) {return 70;}
    if (geographic.includes('全球') || geographic.includes('Global')) {return 60;}
    return 50;
  };

  const calculateSupplierCredibility = (node: NodeData): number => {
    if (!node.supplierInfo) {return 60;}

    let score = 70;
    if (node.supplierInfo.isDirectSupplier) {score += 20;}
    if (node.supplierInfo.tier === 1) {score += 10;}
    else if (node.supplierInfo.tier === 2) {score += 5;}
    else if (node.supplierInfo.tier && node.supplierInfo.tier > 3) {score -= 20;}

    return Math.min(100, score);
  };

  const calculateDimensionRisks = (nodes: NodeData[]) => {
    // 计算各维度风险
    const dataQualityScores = nodes.map(calculateDataCompleteness);
    const complianceScores = nodes.map((node) => (node.verificationStatus === '已验证' ? 90 : 30));
    const supplyChainScores = nodes.map(calculateSupplierCredibility);
    const methodologyScores = nodes.map(calculateFactorReliability);
    const temporalScores = nodes.map(calculateTemporalRelevance);
    const geographicScores = nodes.map(calculateGeographicRelevance);

    return {
      dataQuality: {
        score: average(dataQualityScores),
        level: getRiskLevel(average(dataQualityScores)),
        issues: dataQualityScores.filter((s) => s < 70).length > 0 ? ['部分节点数据不完整'] : [],
        recommendations: ['完善缺失的活动数据', '补充排放因子信息'],
      },
      compliance: {
        score: average(complianceScores),
        level: getRiskLevel(average(complianceScores)),
        issues: complianceScores.filter((s) => s < 70).length > 0 ? ['存在合规风险'] : [],
        recommendations: ['更新为合规排放因子', '建立合规性检查流程'],
      },
      supplyChain: {
        score: average(supplyChainScores),
        level: getRiskLevel(average(supplyChainScores)),
        issues: supplyChainScores.filter((s) => s < 60).length > 0 ? ['深层供应商数据可信度低'] : [],
        recommendations: ['加强供应商数据验证', '建立供应商评级体系'],
      },
      methodology: {
        score: average(methodologyScores),
        level: getRiskLevel(average(methodologyScores)),
        issues: methodologyScores.filter((s) => s < 60).length > 0 ? ['排放因子来源可靠性待提升'] : [],
        recommendations: ['选择权威数据源', '建立因子质量评估标准'],
      },
      temporal: {
        score: average(temporalScores),
        level: getRiskLevel(average(temporalScores)),
        issues: temporalScores.filter((s) => s < 60).length > 0 ? ['部分排放因子时效性不足'] : [],
        recommendations: ['更新为最新年份数据', '建立定期更新机制'],
      },
      geographic: {
        score: average(geographicScores),
        level: getRiskLevel(average(geographicScores)),
        issues: geographicScores.filter((s) => s < 60).length > 0 ? ['地理代表性不足'] : [],
        recommendations: ['使用本地化排放因子', '提升地理匹配度'],
      },
    };
  };

  const identifyCriticalIssues = (nodes: NodeData[], nodeRisks: NodeRiskAssessment[]): RiskIssue[] => {
    const issues: RiskIssue[] = [];

    // 识别高风险节点
    const highRiskNodes = nodeRisks.filter((node) => node.overallRisk < 60);

    if (highRiskNodes.length > 0) {
      issues.push({
        id: 'high-risk-nodes',
        severity: 'HIGH',
        category: '数据质量',
        description: `发现${highRiskNodes.length}个高风险节点`,
        affectedNodes: highRiskNodes.map((n) => n.nodeId),
        impact: '可能导致碳足迹计算结果不准确',
        recommendation: '优先处理这些节点的数据质量问题',
      });
    }

    // 识别未验证节点
    const unverifiedNodes = nodes.filter((node) => node.verificationStatus !== '已验证');

    if (unverifiedNodes.length > 0) {
      issues.push({
        id: 'unverified-nodes',
        severity: 'MEDIUM',
        category: '合规性',
        description: `${unverifiedNodes.length}个节点未经验证`,
        affectedNodes: unverifiedNodes.map((n) => n.label),
        impact: '可能不符合合规要求',
        recommendation: '进行第三方验证',
      });
    }

    return issues;
  };

  const generateRecommendations = (nodes: NodeData[], nodeRisks: NodeRiskAssessment[]): Recommendation[] => {
    const recommendations: Recommendation[] = [];

    const avgRisk = nodeRisks.reduce((sum, node) => sum + node.overallRisk, 0) / nodeRisks.length;

    if (avgRisk < 70) {
      recommendations.push({
        priority: 'HIGH',
        category: '数据质量提升',
        action: '实施全面的数据质量改进计划',
        expectedImpact: '提升整体风险评分至80分以上',
        timeframe: '1-2个月',
      });
    }

    recommendations.push({
      priority: 'MEDIUM',
      category: '自动化监控',
      action: '建立AI驱动的持续风险监控机制',
      expectedImpact: '实时识别和预警风险变化',
      timeframe: '2-3个月',
    });

    return recommendations;
  };

  const getRiskLevel = (score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' => {
    if (score >= 80) {return 'LOW';}
    if (score >= 60) {return 'MEDIUM';}
    if (score >= 40) {return 'HIGH';}
    return 'CRITICAL';
  };

  const average = (numbers: number[]): number => {
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return '#52c41a';
      case 'MEDIUM':
        return '#faad14';
      case 'HIGH':
        return '#ff7a45';
      case 'CRITICAL':
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'MEDIUM':
        return <InfoCircleOutlined style={{ color: '#faad14' }} />;
      case 'HIGH':
        return <WarningOutlined style={{ color: '#ff7a45' }} />;
      case 'CRITICAL':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // 节点风险表格列定义
  const nodeRiskColumns: ColumnsType<NodeRiskAssessment> = [
    {
      title: '节点名称',
      dataIndex: 'nodeId',
      key: 'nodeId',
      width: 200,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          {record.criticalFlags.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {record.criticalFlags.map((flag, index) => (
                <Tag key={index} color="red">
                  {flag}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '综合风险',
      dataIndex: 'overallRisk',
      key: 'overallRisk',
      width: 120,
      render: (score) => (
        <div>
          <Progress
            percent={score}
            size="small"
            strokeColor={getRiskColor(getRiskLevel(score))}
            format={(percent) => `${percent?.toFixed(0)}分`}
          />
        </div>
      ),
      sorter: (a, b) => a.overallRisk - b.overallRisk,
    },
    {
      title: '风险等级',
      key: 'riskLevel',
      width: 100,
      render: (_, record) => {
        const level = getRiskLevel(record.overallRisk);
        return (
          <Tag color={getRiskColor(level)}>
            {level === 'LOW' ? '低风险' : level === 'MEDIUM' ? '中风险' : level === 'HIGH' ? '高风险' : '极高风险'}
          </Tag>
        );
      },
    },
    {
      title: '关键风险因子',
      key: 'riskFactors',
      render: (_, record) => {
        const factors = Object.entries(record.riskFactors)
          .filter(([, score]) => score < 60)
          .map(([factor]) => {
            const labels: Record<string, string> = {
              dataCompleteness: '数据完整性',
              factorReliability: '因子可靠性',
              temporalRelevance: '时间相关性',
              geographicRelevance: '地理相关性',
              supplierCredibility: '供应商可信度',
            };
            return labels[factor] || factor;
          });

        return (
          <div>
            {factors.map((factor, index) => (
              <Tag key={index} color="orange">
                {factor}
              </Tag>
            ))}
          </div>
        );
      },
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SecurityScanOutlined />
          <span>AI风险评测报告</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1200}
      footer={[
        <Button key="export" type="default">
          导出报告
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
      style={{ top: 20 }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <SecurityScanOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
          <div>AI正在分析风险...</div>
          <div style={{ color: '#666', marginTop: 8 }}>
            正在评估数据质量、合规性、供应链风险等维度
          </div>
        </div>
      ) : assessmentResult ? (
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="风险概览" key="overview">
            <Row gutter={16}>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="综合风险评分"
                    value={assessmentResult.overallRiskScore}
                    precision={1}
                    suffix="/ 100"
                    valueStyle={{
                      color: getRiskColor(assessmentResult.riskLevel),
                      fontSize: 28,
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Tag color={getRiskColor(assessmentResult.riskLevel)} style={{ fontSize: 14 }}>
                      {getRiskIcon(assessmentResult.riskLevel)}
                      <span style={{ marginLeft: 4 }}>
                        {assessmentResult.riskLevel === 'LOW'
                          ? '低风险'
                          : assessmentResult.riskLevel === 'MEDIUM'
                            ? '中风险'
                            : assessmentResult.riskLevel === 'HIGH'
                              ? '高风险'
                              : '极高风险'}
                      </span>
                    </Tag>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="评估节点数"
                    value={assessmentResult.nodeRisks.length}
                    suffix="个"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      高风险节点: {assessmentResult.nodeRisks.filter((n) => n.overallRisk < 60).length}个
                    </Text>
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic
                    title="关键问题"
                    value={assessmentResult.criticalIssues.length}
                    suffix="项"
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      需要立即处理的风险问题
                    </Text>
                  </div>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Row gutter={16}>
              <Col span={12}>
                <Card title="风险维度分析" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {Object.entries(assessmentResult.dimensions).map(([key, dimension]) => {
                      const labels: Record<string, string> = {
                        dataQuality: '数据质量',
                        compliance: '合规性',
                        supplyChain: '供应链',
                        methodology: '方法学',
                        temporal: '时间相关性',
                        geographic: '地理相关性',
                      };

                      return (
                        <div key={key} style={{ marginBottom: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span>{labels[key]}</span>
                            <Tag color={getRiskColor(dimension.level)}>
                              {dimension.score.toFixed(0)}分
                            </Tag>
                          </div>
                          <Progress
                            percent={dimension.score}
                            size="small"
                            strokeColor={getRiskColor(dimension.level)}
                            showInfo={false}
                          />
                        </div>
                      );
                    })}
                  </Space>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="关键风险问题" size="small">
                  <List
                    size="small"
                    dataSource={assessmentResult.criticalIssues}
                    renderItem={(issue) => (
                      <List.Item>
                        <div style={{ width: '100%' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            {getRiskIcon(issue.severity)}
                            <Text strong>{issue.description}</Text>
                            <Tag color={getRiskColor(issue.severity)}>
                              {issue.category}
                            </Tag>
                          </div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            影响: {issue.impact}
                          </Text>
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="节点风险详情" key="nodes">
            <Table
              columns={nodeRiskColumns}
              dataSource={assessmentResult.nodeRisks}
              rowKey="nodeId"
              size="small"
              pagination={{ pageSize: 10 }}
              scroll={{ y: 400 }}
            />
          </TabPane>

          <TabPane tab="改进建议" key="recommendations">
            <Timeline>
              {assessmentResult.recommendations.map((rec, index) => (
                <Timeline.Item
                  key={index}
                  color={rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'orange' : 'blue'}
                  dot={
                    rec.priority === 'HIGH' ? (
                      <ExclamationCircleOutlined />
                    ) : rec.priority === 'MEDIUM' ? (
                      <WarningOutlined />
                    ) : (
                      <InfoCircleOutlined />
                    )
                  }
                >
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Title level={5} style={{ margin: 0 }}>
                        {rec.action}
                      </Title>
                      <Tag color={rec.priority === 'HIGH' ? 'red' : rec.priority === 'MEDIUM' ? 'orange' : 'blue'}>
                        {rec.priority === 'HIGH' ? '高优先级' : rec.priority === 'MEDIUM' ? '中优先级' : '低优先级'}
                      </Tag>
                    </div>
                    <Paragraph style={{ margin: 0, marginBottom: 8 }}>
                      <Text strong>预期效果:</Text> {rec.expectedImpact}
                    </Paragraph>
                    <Paragraph style={{ margin: 0 }}>
                      <Text strong>建议时间:</Text> {rec.timeframe}
                    </Paragraph>
                  </Card>
                </Timeline.Item>
              ))}
            </Timeline>
          </TabPane>
        </Tabs>
      ) : (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Text type="secondary">暂无风险评估数据</Text>
        </div>
      )}
    </Modal>
  );
};
