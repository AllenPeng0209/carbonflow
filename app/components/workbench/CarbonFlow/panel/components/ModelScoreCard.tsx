import React from 'react';
import { Card, Row, Col, Typography, Tag, Empty } from 'antd';

interface ModelScoreCardProps {
  aiSummary?: any;
  height?: string | number;
}

export const ModelScoreCard: React.FC<ModelScoreCardProps> = ({
  aiSummary,
  height: _height = 'auto',
}) => {
  // 使用 aiSummary 的数据
  const credibilityScore = aiSummary?.credibilityScore ?? 0;
  const completenessScore = aiSummary?.modelCompleteness?.score ?? 0;
  const traceabilityScore = aiSummary?.dataTraceability?.score ?? 0;
  const massBalanceScore = aiSummary?.massBalance?.score ?? 0;
  const validationScore = aiSummary?.validation?.score ?? 0;

  return (
    <Card
      title="模型评分"
      size="small"
      className="flex-shrink-0 bg-bolt-elements-background-depth-1 border border-bolt-primary/30"
      style={{ minHeight: '180px' }}
      bodyStyle={{ display: 'flex', padding: '12px' }}
    >
      <Row gutter={0} align="middle" className="w-full h-full">
        {/* Left Column: Overall Score */}
        <Col
          span={10}
          className="text-center flex flex-col justify-center items-center border-r border-bolt-elements-borderColor h-full pr-3"
        >
          <div className="text-6xl font-bold text-bolt-elements-textPrimary leading-none mb-1">
            {typeof credibilityScore === 'number' && !isNaN(credibilityScore) ? Math.round(credibilityScore) : 0}
          </div>
          <div className="text-sm text-bolt-elements-textSecondary whitespace-nowrap mt-1">当前可信总分</div>
        </Col>

        {/* Right Column: Sub Scores - Arranged in two rows */}
        <Col span={14} className="flex flex-col justify-center h-full pl-3">
          <Row gutter={[8, 4]}>
            <Col span={12} className="text-sm text-bolt-elements-textSecondary">
              模型完整度: {Math.round(completenessScore)}/100
            </Col>
            <Col span={12} className="text-sm text-bolt-elements-textSecondary">
              因子可追溯性: {Math.round(traceabilityScore)}/100
            </Col>
          </Row>
          <Row gutter={[8, 4]} className="mt-1">
            <Col span={12} className="text-sm text-bolt-elements-textSecondary">
              质量平衡: {Math.round(massBalanceScore)}/100
            </Col>
            <Col span={12} className="text-sm text-bolt-elements-textSecondary">
              数据验证性: {Math.round(validationScore)}/100
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
};

interface OptimizationSuggestionsCardProps {
  aiSummary?: any;
}

export const OptimizationSuggestionsCard: React.FC<OptimizationSuggestionsCardProps> = ({ aiSummary }) => {
  const incompleteModelNodes = aiSummary?.modelCompleteness?.incompleteNodes || [];
  const incompleteTraceabilityNodes = aiSummary?.dataTraceability?.incompleteNodes || [];

  // Combine and deduplicate nodes by ID, merging missing fields
  const allIncompleteMap = new Map<string, { label: string; missingFields: Set<string> }>();

  incompleteModelNodes.forEach((node: any) => {
    if (!allIncompleteMap.has(node.id)) {
      allIncompleteMap.set(node.id, { label: node.label, missingFields: new Set() });
    }

    node.missingFields.forEach((field: string) => allIncompleteMap.get(node.id)?.missingFields.add(field));
  });

  incompleteTraceabilityNodes.forEach((node: any) => {
    if (!allIncompleteMap.has(node.id)) {
      allIncompleteMap.set(node.id, { label: node.label, missingFields: new Set() });
    }

    node.missingFields.forEach((field: string) => allIncompleteMap.get(node.id)?.missingFields.add(field));
  });

  const combinedIncompleteNodes = Array.from(allIncompleteMap.entries()).map(([id, data]) => ({
    id,
    label: data.label,
    missingFields: Array.from(data.missingFields),
  }));

  return (
    <Card
      title="关键优化建议"
      size="small"
      className="flex-grow bg-bolt-elements-background-depth-1 border border-bolt-primary/30"
      style={{ minHeight: '120px' }}
      bodyStyle={{ padding: '12px', height: 'calc(100% - 40px)' }}
    >
      {combinedIncompleteNodes.length === 0 ? (
        <Empty description="暂无关键优化建议，各项指标良好！" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
          {combinedIncompleteNodes.map((node) => (
            <div key={node.id} className="mb-3 p-2 border border-dashed border-bolt-elements-borderColor rounded">
              <div className="flex flex-wrap items-center gap-1 mb-2">
                <Typography.Text strong className="text-bolt-elements-textPrimary text-sm">
                  节点:
                </Typography.Text>
                <Tag color="blue" className="max-w-full">
                  <span className="break-all">{node.label}</span>
                </Tag>
              </div>
              {node.missingFields.length > 0 && (
                <div className="mt-2">
                  <Typography.Text type="secondary" className="text-xs block mb-1">
                    缺失字段:
                  </Typography.Text>
                  <div className="flex flex-wrap gap-1">
                    {node.missingFields.map((field) => (
                      <Tag key={field} color="red" className="text-xs">
                        <span className="break-all">{field}</span>
                      </Tag>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
