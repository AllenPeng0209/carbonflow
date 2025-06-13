import React from 'react';
import { Card, Typography, Statistic, Progress, Row, Col, Tag, Avatar, List, Tabs, Badge } from 'antd';
import {
  SafetyOutlined,
  ReconciliationOutlined,
  DatabaseOutlined,
  CloudOutlined,
  AimOutlined,
  LineChartOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { Product, WorkflowTask, VendorDataTask, CarbonReductionTask } from '~/types';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface DashboardSectionProps {
  products: Product[];
  workflowTasks: WorkflowTask[];
  vendorDataTasks: VendorDataTask[];
  carbonReductionTasks: CarbonReductionTask[];
  carbonTrendData: {
    months: string[];
    values: number[];
    industryAvg: number[];
    leadingAvg: number[];
    ourCompany: number[];
  };
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  products,
  workflowTasks,
  vendorDataTasks,
  carbonReductionTasks,
  carbonTrendData: _carbonTrendData,
}) => {
  // 计算平均碳足迹
  const avgCarbonFootprint =
    products.reduce((acc, product) => acc + (product.carbonFootprint || 0), 0) / products.length;

  // 计算碳减排潜力（模拟数据）
  const carbonReductionPotential = avgCarbonFootprint * 0.25;

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <SafetyOutlined className="text-2xl text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">仪表板</h1>
            <p className="text-gray-600">碳足迹管理系统概览</p>
          </div>
        </div>
      </div>

      {/* 公司简介卡片 */}
      <Card
        className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        style={{ marginBottom: '24px' }}
      >
        <Row gutter={16} align="middle">
          <Col span={4}>
            <Avatar
              size={80}
              style={{
                backgroundColor: '#16a34a',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)',
              }}
            >
              <SafetyOutlined style={{ fontSize: 40 }} />
            </Avatar>
          </Col>
          <Col span={20}>
            <Title level={4} style={{ color: '#15803d', marginBottom: '12px' }}>
              氣候印記科技有限公司
            </Title>
            <Paragraph style={{ marginBottom: '12px' }}>
              <Tag color="green">ISO 14064 认证</Tag>
              <Tag color="blue">碳中和路径规划</Tag>
              <Tag color="orange">ESG 披露就绪</Tag>
            </Paragraph>
            <Paragraph style={{ color: '#6b7280', marginBottom: '16px' }}>
              致力于可持续发展的高科技企业，专注于降低产品生命周期碳足迹，实现2030碳中和目标。
            </Paragraph>
            <Progress
              percent={65}
              strokeColor="#16a34a"
              trailColor="#e5e7eb"
              className="mb-2"
              style={{ marginTop: 8 }}
            />
            <div style={{ marginTop: 4, fontSize: 12, color: '#6b7280' }}>碳中和目标达成进度: 65%</div>
          </Col>
        </Row>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<span className="text-gray-600 font-medium">工作流总数</span>}
              value={workflowTasks.length}
              prefix={<ReconciliationOutlined className="text-green-600" />}
              valueStyle={{ color: '#111827', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<span className="text-gray-600 font-medium">供应商任务总数</span>}
              value={vendorDataTasks.length}
              prefix={<DatabaseOutlined className="text-blue-600" />}
              valueStyle={{ color: '#111827', fontWeight: 'bold' }}
            />
          </Card>
        </Col>

        <Col span={6}>
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<span className="text-gray-600 font-medium">平均碳足迹 (kgCO2e)</span>}
              value={avgCarbonFootprint.toFixed(2)}
              precision={2}
              prefix={<CloudOutlined className="text-purple-600" />}
              valueStyle={{ color: '#111827', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <Statistic
              title={<span className="text-gray-600 font-medium">减排潜力 (kgCO2e)</span>}
              value={carbonReductionPotential.toFixed(2)}
              precision={2}
              prefix={<AimOutlined className="text-orange-600" />}
              valueStyle={{ color: '#16a34a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card
            title={
              <span className="flex items-center gap-2 text-gray-900 font-semibold">
                <LineChartOutlined className="text-green-600" />
                碳足迹趋势分析
              </span>
            }
            className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            style={{ marginBottom: '24px' }}
          >
            <div
              className="chart-container"
              style={{ height: '240px', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}
            >
              {/* 这里会展示碳足迹趋势图表，为了简化先使用占位符 */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(to bottom, rgba(34, 197, 94, 0.05), rgba(34, 197, 94, 0.02))',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                  color: '#6b7280',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                }}
              >
                <LineChartOutlined style={{ fontSize: 36, marginBottom: 16, color: '#16a34a' }} />
                <Text style={{ color: '#374151', fontWeight: 500 }}>碳足迹趋势图表</Text>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, color: '#6b7280' }}>
                  每月碳足迹数据对比趋势
                </Text>
              </div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title={
              <span className="flex items-center gap-2 text-gray-900 font-semibold">
                <BarChartOutlined className="text-blue-600" />
                行业对标分析
              </span>
            }
            className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            style={{ marginBottom: '24px' }}
          >
            <div
              className="chart-container"
              style={{ height: '240px', position: 'relative', borderRadius: '8px', overflow: 'hidden' }}
            >
              {/* 这里会展示行业对标图表，为了简化先使用占位符 */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02))',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column',
                  color: '#6b7280',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                }}
              >
                <BarChartOutlined style={{ fontSize: 36, marginBottom: 16, color: '#2563eb' }} />
                <Text style={{ color: '#374151', fontWeight: 500 }}>行业对标图表</Text>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 8, color: '#6b7280' }}>
                  与行业平均和领先企业对比
                </Text>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 任务列表 */}
      <Card
        title={
          <span className="flex items-center gap-2 text-gray-900 font-semibold">
            <ReconciliationOutlined className="text-green-600" />
            当前任务
          </span>
        }
        className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
      >
        <Tabs defaultActiveKey="workflow">
          <TabPane tab="工作流任务" key="workflow">
            <List
              itemLayout="horizontal"
              dataSource={workflowTasks}
              renderItem={(item) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors rounded-lg px-3 py-2"
                  actions={[
                    <a key="process" className="text-green-600 hover:text-green-700 font-medium">
                      处理
                    </a>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          fontSize: '20px',
                          color: '#16a34a',
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '8px',
                          borderRadius: '50%',
                        }}
                      >
                        {item.status === '进行中' ? (
                          <ClockCircleOutlined />
                        ) : item.status === '未开始' ? (
                          <CalendarOutlined />
                        ) : (
                          <CheckCircleOutlined />
                        )}
                      </div>
                    }
                    title={
                      <span className="text-gray-900 font-medium">
                        {item.title}{' '}
                        <Badge
                          color={
                            item.priority === 'high'
                              ? '#dc2626'
                              : item.priority === 'medium'
                                ? '#f59e0b'
                                : '#16a34a'
                          }
                          text={
                            item.priority === 'high'
                              ? '高优先级'
                              : item.priority === 'medium'
                                ? '中等优先级'
                                : '低优先级'
                          }
                        />
                      </span>
                    }
                    description={
                      <>
                        <div style={{ marginBottom: 6, color: '#6b7280' }}>
                          截止日期: {item.deadline}
                          <span style={{ marginLeft: 16 }}>
                            状态:{' '}
                            <span
                              style={{
                                color:
                                  item.status === '进行中'
                                    ? '#2563eb'
                                    : item.status === '未开始'
                                      ? '#f59e0b'
                                      : '#16a34a',
                                fontWeight: 500,
                              }}
                            >
                              {item.status}
                            </span>
                          </span>
                        </div>
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>

          <TabPane tab="供应商收数任务" key="vendor">
            <List
              itemLayout="horizontal"
              dataSource={vendorDataTasks}
              renderItem={(item) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors rounded-lg px-3 py-2"
                  actions={[
                    <a key="action" className="text-green-600 hover:text-green-700 font-medium">
                      {item.status === '待提交' || item.status === '逾期' ? '催交' : '查看'}
                    </a>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{
                          backgroundColor:
                            item.status === '已提交'
                              ? '#16a34a'
                              : item.status === '逾期'
                                ? '#dc2626'
                                : '#2563eb',
                        }}
                      >
                        {item.vendor?.substring(0, 1) || '?'}
                      </Avatar>
                    }
                    title={
                      <span className="text-gray-900 font-medium">
                        {item.vendor} - {item.product}{' '}
                        <Tag color={item.status === '已提交' ? 'green' : item.status === '逾期' ? 'red' : 'blue'}>
                          {item.status}
                        </Tag>
                      </span>
                    }
                    description={
                      <>
                        <div style={{ color: '#6b7280' }}>截止日期: {item.deadline}</div>
                        {item.submittedAt && (
                          <div style={{ color: '#16a34a', marginTop: 4 }}>
                            提交时间: {item.submittedAt}
                            {item.dataQuality && <span style={{ marginLeft: 16 }}>数据质量: {item.dataQuality}</span>}
                          </div>
                        )}
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>

          <TabPane tab="减碳任务" key="reduction">
            <List
              itemLayout="horizontal"
              dataSource={carbonReductionTasks}
              renderItem={(item) => (
                <List.Item
                  className="hover:bg-gray-50 transition-colors rounded-lg px-3 py-2"
                  actions={[
                    <a key="details" className="text-green-600 hover:text-green-700 font-medium">
                      详情
                    </a>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          fontSize: '20px',
                          color: '#16a34a',
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '8px',
                          borderRadius: '50%',
                        }}
                      >
                        <AimOutlined />
                      </div>
                    }
                    title={
                      <span className="text-gray-900 font-medium">
                        {item.title}{' '}
                        <Tag color="green" style={{ fontWeight: 'normal' }}>
                          {item.target}
                        </Tag>
                      </span>
                    }
                    description={
                      <>
                        <div style={{ marginBottom: 6, color: '#6b7280' }}>
                          <span>负责部门: {item.responsible}</span>
                          <span style={{ marginLeft: 16 }}>截止日期: {item.deadline}</span>
                          <span style={{ marginLeft: 16 }}>
                            状态:{' '}
                            <span
                              style={{
                                color:
                                  item.status === '进行中'
                                    ? '#2563eb'
                                    : item.status === '未开始'
                                      ? '#f59e0b'
                                      : item.status === '规划中'
                                        ? '#8b5cf6'
                                        : '#16a34a',
                                fontWeight: 500,
                              }}
                            >
                              {item.status}
                            </span>
                          </span>
                        </div>
                        <Progress
                          percent={item.progress}
                          size="small"
                          status="active"
                          strokeColor="#16a34a"
                          trailColor="#e5e7eb"
                        />
                      </>
                    }
                  />
                </List.Item>
              )}
            />
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default DashboardSection;
