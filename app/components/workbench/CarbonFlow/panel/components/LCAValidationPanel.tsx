import React, { useMemo } from 'react';
import { Alert, Badge, Card, Collapse, List, Typography, Button, Space, Tooltip } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, BulbOutlined } from '@ant-design/icons';
import type { Node, Edge } from 'reactflow';
import type { NodeData } from '~/types/nodes';
import {
  validateLCAModel,
  getLCAModelingRecommendations,
} from '~/components/workbench/CarbonFlow/graph/utils/lcaValidation';

const { Panel } = Collapse;
const { Text, Title } = Typography;

interface LCAValidationPanelProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodeFocus?: (nodeId: string) => void;
  onAutoFix?: (nodeId: string, action: string) => void;
}

export function LCAValidationPanel({ nodes, edges, onNodeFocus, onAutoFix }: LCAValidationPanelProps) {
  // 执行LCA验证
  const validationResult = useMemo(() => {
    return validateLCAModel(nodes, edges);
  }, [nodes, edges]);

  const recommendations = useMemo(() => {
    return getLCAModelingRecommendations(nodes);
  }, [nodes]);

  // 获取验证状态图标和颜色
  const getStatusDisplay = () => {
    if (validationResult.isValid) {
      return {
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
        status: 'success' as const,
        text: 'LCA模型验证通过',
        color: '#52c41a',
      };
    } else {
      return {
        icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
        status: 'error' as const,
        text: `发现 ${validationResult.errors.length} 个错误`,
        color: '#ff4d4f',
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  const handleNodeClick = (nodeId?: string) => {
    if (nodeId && onNodeFocus) {
      onNodeFocus(nodeId);
    }
  };

  const handleAutoFix = (nodeId?: string, action?: string) => {
    if (nodeId && action && onAutoFix) {
      onAutoFix(nodeId, action);
    }
  };

  return (
    <Card
      title={
        <Space>
          {statusDisplay.icon}
          <span>LCA理论验证</span>
          <Badge
            count={validationResult.errors.length + validationResult.warnings.length}
            style={{ backgroundColor: validationResult.errors.length > 0 ? '#ff4d4f' : '#faad14' }}
          />
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {/* 总体状态 */}
      <Alert
        message={statusDisplay.text}
        type={statusDisplay.status}
        showIcon
        style={{ marginBottom: 16 }}
        description={
          validationResult.isValid
            ? '您的LCA模型符合理论要求，可以进行可靠的碳足迹分析。'
            : '请解决以下问题以确保LCA分析的准确性。'
        }
      />

      <Collapse defaultActiveKey={validationResult.errors.length > 0 ? ['errors'] : []}>
        {/* 错误列表 */}
        {validationResult.errors.length > 0 && (
          <Panel
            header={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#ff4d4f' }}>
                  错误 ({validationResult.errors.length})
                </Text>
              </Space>
            }
            key="errors"
          >
            <List
              size="small"
              dataSource={validationResult.errors}
              renderItem={(error) => (
                <List.Item
                  actions={[
                    error.nodeId && (
                      <Button type="link" size="small" onClick={() => handleNodeClick(error.nodeId)}>
                        定位节点
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                    title={<Text type="danger">{error.message}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        错误类型: {error.type}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Panel>
        )}

        {/* 警告列表 */}
        {validationResult.warnings.length > 0 && (
          <Panel
            header={
              <Space>
                <InfoCircleOutlined style={{ color: '#faad14' }} />
                <Text strong style={{ color: '#faad14' }}>
                  警告 ({validationResult.warnings.length})
                </Text>
              </Space>
            }
            key="warnings"
          >
            <List
              size="small"
              dataSource={validationResult.warnings}
              renderItem={(warning) => (
                <List.Item
                  actions={[
                    warning.nodeId && (
                      <Button type="link" size="small" onClick={() => handleNodeClick(warning.nodeId)}>
                        查看节点
                      </Button>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<InfoCircleOutlined style={{ color: '#faad14' }} />}
                    title={<Text style={{ color: '#faad14' }}>{warning.message}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        警告类型: {warning.type}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </Panel>
        )}

        {/* 建议列表 */}
        {(validationResult.recommendations.length > 0 || recommendations.length > 0) && (
          <Panel
            header={
              <Space>
                <BulbOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ color: '#1890ff' }}>
                  改进建议 ({validationResult.recommendations.length + recommendations.length})
                </Text>
              </Space>
            }
            key="recommendations"
          >
            <List
              size="small"
              dataSource={[...validationResult.recommendations, ...recommendations]}
              renderItem={(rec) => (
                <List.Item
                  actions={[
                    rec.nodeId && (
                      <Button type="link" size="small" onClick={() => handleNodeClick(rec.nodeId)}>
                        查看节点
                      </Button>
                    ),
                    rec.action && rec.nodeId && (
                      <Tooltip title={rec.action}>
                        <Button type="primary" size="small" onClick={() => handleAutoFix(rec.nodeId, rec.action)}>
                          自动修复
                        </Button>
                      </Tooltip>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={<BulbOutlined style={{ color: '#1890ff' }} />}
                    title={<Text style={{ color: '#1890ff' }}>{rec.message}</Text>}
                    description={
                      rec.action && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          建议操作: {rec.action}
                        </Text>
                      )
                    }
                  />
                </List.Item>
              )}
            />
          </Panel>
        )}
      </Collapse>

      {/* LCA理论说明 */}
      <Card size="small" title="LCA理论要点" style={{ marginTop: 16, backgroundColor: '#fafafa' }}>
        <List
          size="small"
          dataSource={[
            '主要产品：每个LCA系统只能有一个主要产品用于核算',
            '功能单位：如"1台电脑"、"1kWh"，用于量化产品功能',
            '基准流：方便数据收集和计算的最小排放单元',
            '生命周期阶段：从原材料获取到废物处置的完整流程',
            '系统边界：明确包含和排除的过程范围',
          ]}
          renderItem={(item) => (
            <List.Item>
              <Text style={{ fontSize: '12px' }}>• {item}</Text>
            </List.Item>
          )}
        />
      </Card>
    </Card>
  );
}
