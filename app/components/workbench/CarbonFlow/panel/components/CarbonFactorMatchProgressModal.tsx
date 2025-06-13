import React, { useState, useEffect } from 'react';
import { Modal, Progress, Button, List, Tag, Avatar, Typography, Spin, Card, Row, Col } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

export interface MatchProgressItem {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  result?: {
    factor: number;
    activityName: string;
    unit: string;
    dataSource: string;
  };
  error?: string;
  logs: string[];
}

interface CarbonFactorMatchProgressModalProps {
  visible: boolean;
  onClose: () => void;
  onCancel: () => void;
  totalNodes: number;
  progressItems: MatchProgressItem[];
  isCompleted: boolean;
  onViewResults?: () => void;
}

export const CarbonFactorMatchProgressModal: React.FC<CarbonFactorMatchProgressModalProps> = ({
  visible,
  onClose,
  onCancel,
  totalNodes,
  progressItems,
  isCompleted,
  onViewResults,
}) => {
  const [overallProgress, setOverallProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);

  // 计算统计数据
  useEffect(() => {
    const success = progressItems.filter(item => item.status === 'success').length;
    const failed = progressItems.filter(item => item.status === 'failed').length;
    const processing = progressItems.filter(item => item.status === 'processing').length;
    const completed = success + failed;
    
    setSuccessCount(success);
    setFailedCount(failed);
    setProcessingCount(processing);
    setOverallProgress(totalNodes > 0 ? Math.round((completed / totalNodes) * 100) : 0);
  }, [progressItems, totalNodes]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />;
      case 'processing':
        return <LoadingOutlined style={{ color: '#1890ff' }} spin />;
      default:
        return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'processing';
      default:
        return 'default';
    }
  };

  const renderProgressItem = (item: MatchProgressItem) => (
    <List.Item
      key={item.nodeId}
      style={{
        background: item.status === 'processing' ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
        borderRadius: 8,
        margin: '4px 0',
        padding: '12px 16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <List.Item.Meta
        avatar={
          <Avatar 
            size="small" 
            icon={getStatusIcon(item.status)}
            style={{ 
              backgroundColor: item.status === 'success' ? '#f6ffed' : 
                               item.status === 'failed' ? '#fff2f0' : 
                               item.status === 'processing' ? '#e6f7ff' : '#fafafa'
            }}
          />
        }
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text strong style={{ color: '#ffffff' }}>{item.nodeName}</Text>
            <Tag color={getStatusColor(item.status)} size="small">
              {item.status === 'pending' && '待处理'}
              {item.status === 'processing' && '匹配中...'}
              {item.status === 'success' && '成功'}
              {item.status === 'failed' && '失败'}
            </Tag>
          </div>
        }
        description={
          <div>
            {item.status === 'success' && item.result && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                碳因子: {item.result.factor} {item.result.unit} | {item.result.dataSource}
              </Text>
            )}
            {item.status === 'failed' && item.error && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {item.error}
              </Text>
            )}
            {item.status === 'processing' && (
              <div style={{ marginTop: 4 }}>
                <Progress 
                  percent={item.progress} 
                  size="small" 
                  showInfo={false}
                  strokeColor="#1890ff"
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {item.logs[item.logs.length - 1] || '正在处理...'}
                </Text>
              </div>
            )}
          </div>
        }
      />
    </List.Item>
  );

  return (
    <Modal
      title={
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          background: 'linear-gradient(135deg, #0f1419 0%, #1a2332 100%)',
          margin: '-24px -24px 20px',
          padding: '20px 24px',
          borderBottom: '1px solid #2980b9',
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2980b9 0%, #1f4e79 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(41, 128, 185, 0.4)',
          }}>
            <RobotOutlined style={{ color: '#fff', fontSize: '20px' }} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
              {isCompleted ? 'AI碳因子匹配完成' : 'AI碳因子匹配进行中...'}
            </Title>
            <Text style={{ fontSize: '12px', color: '#7fb3d3' }}>
              智能匹配排放源碳因子数据
            </Text>
          </div>
        </div>
      }
      open={visible}
      onCancel={isCompleted ? onClose : onCancel}
      footer={
        isCompleted ? [
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
          onViewResults && (
            <Button key="results" type="primary" onClick={onViewResults}>
              查看详细结果
            </Button>
          ),
        ] : [
          <Button key="cancel" onClick={onCancel} danger>
            取消匹配
          </Button>,
        ]
      }
      width={800}
      style={{ top: 50 }}
      closable={isCompleted}
      maskClosable={false}
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 总体进度 */}
        <Card 
          size="small" 
          style={{ 
            marginBottom: 16, 
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}
        >
          <Row gutter={16} align="middle">
            <Col span={12}>
              <div style={{ textAlign: 'center' }}>
                <Progress
                  type="circle"
                  percent={overallProgress}
                  size={80}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={() => (
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffffff' }}>
                        {overallProgress}%
                      </div>
                      <div style={{ fontSize: 10, color: '#7fb3d3' }}>
                        {successCount + failedCount}/{totalNodes}
                      </div>
                    </div>
                  )}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ color: '#ffffff' }}>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#52c41a' }}>✓ 成功: {successCount}</Text>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <Text style={{ color: '#f5222d' }}>✗ 失败: {failedCount}</Text>
                </div>
                <div>
                  <Text style={{ color: '#1890ff' }}>⟳ 处理中: {processingCount}</Text>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 详细进度列表 */}
        <Card
          title={
            <div style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <InfoCircleOutlined />
              <span>匹配详情</span>
              {!isCompleted && <Spin size="small" />}
            </div>
          }
          size="small"
          style={{ 
            background: 'rgba(30, 41, 59, 0.4)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
          }}
          headStyle={{ 
            background: 'rgba(30, 41, 59, 0.6)',
            borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
          }}
        >
          <List
            dataSource={progressItems}
            renderItem={renderProgressItem}
            style={{ maxHeight: 400, overflowY: 'auto' }}
          />
        </Card>

        {isCompleted && (
          <Card
            size="small"
            style={{
              marginTop: 16,
              background: successCount === totalNodes ? 
                'rgba(82, 196, 26, 0.1)' : 
                failedCount === totalNodes ? 
                'rgba(245, 34, 45, 0.1)' : 
                'rgba(250, 173, 20, 0.1)',
              border: `1px solid ${successCount === totalNodes ? 
                '#52c41a' : 
                failedCount === totalNodes ? 
                '#f5222d' : 
                '#faad14'}`,
            }}
          >
            <div style={{ textAlign: 'center', color: '#ffffff' }}>
              <Title level={5} style={{ 
                color: successCount === totalNodes ? '#52c41a' : 
                       failedCount === totalNodes ? '#f5222d' : '#faad14',
                margin: 0 
              }}>
                {successCount === totalNodes ? 
                  '🎉 所有节点匹配成功！' : 
                  failedCount === totalNodes ? 
                  '❌ 所有节点匹配失败' : 
                  `✅ 匹配完成: ${successCount}个成功，${failedCount}个失败`}
              </Title>
              {successCount > 0 && (
                <Text style={{ fontSize: 12, color: '#7fb3d3' }}>
                  碳因子数据已自动填充到对应节点
                </Text>
              )}
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
}; 