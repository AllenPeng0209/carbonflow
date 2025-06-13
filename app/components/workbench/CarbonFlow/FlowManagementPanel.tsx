/**
 * Flow管理面板
 * 提供Flow层面的特征化因子匹配和管理功能
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Tag, Modal, Form, Input, Select, Progress, Tooltip, Space, Alert } from 'antd';
import {
  SearchOutlined,
  MatchingOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import type { NodeData } from '~/types/nodes';
import type { Workflow } from '~/types/workflow';
import { FlowMatchingService } from './services/FlowMatchingService';

const { Option } = Select;

interface FlowManagementPanelProps {
  workflow: Workflow;
  selectedNode?: NodeData;
  onFlowUpdate?: (nodeId: string, flows: any) => void;
}

interface FlowMatchDisplay {
  id: string;
  flowName: string;
  flowType: string;
  quantity: number;
  unit: string;
  matchStatus: 'perfect_match' | 'partial_match' | 'no_match' | 'manual_override';
  confidence: number;
  matchedSubstance?: string;
  factors?: Record<string, number>;
  alternatives?: any[];
  recommendations?: string[];
}

export const FlowManagementPanel: React.FC<FlowManagementPanelProps> = ({ workflow, selectedNode, onFlowUpdate }) => {
  const [flowMatchingService] = useState(() => new FlowMatchingService());
  const [flows, setFlows] = useState<FlowMatchDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<FlowMatchDisplay | null>(null);
  const [manualMappingForm] = Form.useForm();

  // 当选中节点变化时，重新加载Flow数据
  useEffect(() => {
    if (selectedNode) {
      loadNodeFlows(selectedNode);
    } else {
      loadWorkflowFlows();
    }
  }, [selectedNode, workflow]);

  /**
   * 加载单个节点的Flow数据
   */
  const loadNodeFlows = async (node: NodeData) => {
    setLoading(true);

    try {
      const matchResult = await flowMatchingService.batchMatchNodeFlows(node);
      const flowDisplays = matchResult.results.map((result) => ({
        id: result.flowId,
        flowName: result.flowId.split('_').pop() || '未知流',
        flowType: result.flowId.includes('material')
          ? '物质流'
          : result.flowId.includes('energy')
            ? '能量流'
            : '排放流',
        quantity: 1, // 需要从实际Flow数据获取
        unit: 'kg', // 需要从实际Flow数据获取
        matchStatus: result.matchStatus,
        confidence: result.confidence,
        matchedSubstance: Object.keys(result.matchedFactors)[0],
        factors: result.matchedFactors,
        alternatives: result.alternativeMatches,
        recommendations: result.recommendations,
      }));
      setFlows(flowDisplays);
    } catch (error) {
      console.error('加载Flow数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载整个工作流的Flow数据
   */
  const loadWorkflowFlows = async () => {
    setLoading(true);

    try {
      const allFlows: FlowMatchDisplay[] = [];

      for (const node of workflow.nodes) {
        const matchResult = await flowMatchingService.batchMatchNodeFlows(node.data);
        const nodeFlows = matchResult.results.map((result) => ({
          id: `${node.id}_${result.flowId}`,
          flowName: `${node.data.label || '节点'} - ${result.flowId.split('_').pop()}`,
          flowType: result.flowId.includes('material')
            ? '物质流'
            : result.flowId.includes('energy')
              ? '能量流'
              : '排放流',
          quantity: 1,
          unit: 'kg',
          matchStatus: result.matchStatus,
          confidence: result.confidence,
          matchedSubstance: Object.keys(result.matchedFactors)[0],
          factors: result.matchedFactors,
          alternatives: result.alternativeMatches,
          recommendations: result.recommendations,
          nodeId: node.id,
        }));
        allFlows.push(...nodeFlows);
      }

      setFlows(allFlows);
    } catch (error) {
      console.error('加载工作流Flow数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取匹配状态的显示组件
   */
  const getMatchStatusTag = (status: string, confidence: number) => {
    switch (status) {
      case 'perfect_match':
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            完美匹配
          </Tag>
        );
      case 'partial_match':
        const color = confidence > 0.8 ? 'orange' : confidence > 0.6 ? 'gold' : 'red';
        return (
          <Tooltip title={`置信度: ${(confidence * 100).toFixed(1)}%`}>
            <Tag color={color} icon={<QuestionCircleOutlined />}>
              部分匹配 ({(confidence * 100).toFixed(0)}%)
            </Tag>
          </Tooltip>
        );
      case 'manual_override':
        return (
          <Tag color="blue" icon={<SettingOutlined />}>
            手动设置
          </Tag>
        );
      default:
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            无匹配
          </Tag>
        );
    }
  };

  /**
   * 表格列定义
   */
  const columns = [
    {
      title: 'Flow名称',
      dataIndex: 'flowName',
      key: 'flowName',
      width: 200,
    },
    {
      title: '类型',
      dataIndex: 'flowType',
      key: 'flowType',
      width: 100,
      render: (type: string) => (
        <Tag color={type === '物质流' ? 'blue' : type === '能量流' ? 'orange' : 'green'}>{type}</Tag>
      ),
    },
    {
      title: '数量',
      key: 'quantity',
      width: 120,
      render: (_, record: FlowMatchDisplay) => (
        <span>
          {record.quantity} {record.unit}
        </span>
      ),
    },
    {
      title: '匹配状态',
      key: 'matchStatus',
      width: 150,
      render: (_, record: FlowMatchDisplay) => getMatchStatusTag(record.matchStatus, record.confidence),
    },
    {
      title: '匹配物质',
      dataIndex: 'matchedSubstance',
      key: 'matchedSubstance',
      width: 150,
      render: (substance: string) => substance || '-',
    },
    {
      title: 'GWP因子',
      key: 'gwpFactor',
      width: 100,
      render: (_, record: FlowMatchDisplay) => {
        const gwp = record.factors?.globalWarmingPotential;
        return gwp !== undefined ? gwp.toFixed(3) : '-';
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: FlowMatchDisplay) => (
        <Space>
          <Button size="small" type="link" icon={<SearchOutlined />} onClick={() => openFlowDetails(record)}>
            详情
          </Button>
          <Button size="small" type="link" icon={<SettingOutlined />} onClick={() => openManualMapping(record)}>
            手动设置
          </Button>
        </Space>
      ),
    },
  ];

  /**
   * 打开Flow详情
   */
  const openFlowDetails = (flow: FlowMatchDisplay) => {
    setSelectedFlow(flow);
    setModalVisible(true);
  };

  /**
   * 打开手动映射对话框
   */
  const openManualMapping = (flow: FlowMatchDisplay) => {
    setSelectedFlow(flow);
    manualMappingForm.setFieldsValue({
      originalName: flow.flowName,
      mappedSubstance: flow.matchedSubstance || '',
    });
    setModalVisible(true);
  };

  /**
   * 保存手动映射
   */
  const saveManualMapping = async () => {
    try {
      const values = await manualMappingForm.validateFields();

      if (selectedFlow) {
        // 保存映射到服务
        flowMatchingService.saveUserMapping(selectedFlow.flowName, values.mappedSubstance);

        // 重新匹配
        await loadNodeFlows(selectedNode!);

        setModalVisible(false);
        setSelectedFlow(null);
      }
    } catch (error) {
      console.error('保存手动映射失败:', error);
    }
  };

  /**
   * 获取统计信息
   */
  const getStatistics = () => {
    const total = flows.length;
    const matched = flows.filter((f) => f.matchStatus !== 'no_match').length;
    const perfect = flows.filter((f) => f.matchStatus === 'perfect_match').length;
    const partial = flows.filter((f) => f.matchStatus === 'partial_match').length;

    return { total, matched, perfect, partial, matchRate: total > 0 ? (matched / total) * 100 : 0 };
  };

  const stats = getStatistics();

  return (
    <div className="flow-management-panel">
      {/* 统计信息 */}
      <Card size="small" className="mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold mb-2">Flow匹配统计</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-500">总Flow数</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.perfect}</div>
                <div className="text-sm text-gray-500">完美匹配</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-500">{stats.partial}</div>
                <div className="text-sm text-gray-500">部分匹配</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{stats.total - stats.matched}</div>
                <div className="text-sm text-gray-500">无匹配</div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <Progress
              type="circle"
              percent={Math.round(stats.matchRate)}
              size={80}
              strokeColor={stats.matchRate > 80 ? '#52c41a' : stats.matchRate > 60 ? '#faad14' : '#ff4d4f'}
            />
            <div className="text-sm text-gray-500 mt-2">匹配率</div>
          </div>
        </div>
      </Card>

      {/* 操作按钮 */}
      <Card size="small" className="mb-4">
        <Space>
          <Button
            type="primary"
            icon={<MatchingOutlined />}
            loading={loading}
            onClick={() => (selectedNode ? loadNodeFlows(selectedNode) : loadWorkflowFlows())}
          >
            重新匹配
          </Button>
          <Button icon={<SettingOutlined />}>因子数据库管理</Button>
          <Button icon={<SearchOutlined />}>导出匹配报告</Button>
        </Space>
      </Card>

      {/* 数据质量警告 */}
      {stats.matchRate < 70 && (
        <Alert
          message="数据质量警告"
          description={`当前Flow匹配率为 ${stats.matchRate.toFixed(1)}%，建议完善特征化因子数据库或手动设置未匹配的Flow。`}
          type="warning"
          showIcon
          className="mb-4"
        />
      )}

      {/* Flow列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={flows}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条Flow`,
          }}
        />
      </Card>

      {/* Flow详情/手动映射对话框 */}
      <Modal
        title={selectedFlow ? `Flow详情: ${selectedFlow.flowName}` : 'Flow详情'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedFlow(null);
        }}
        onOk={selectedFlow?.matchStatus === 'manual_override' ? saveManualMapping : undefined}
        okText="保存映射"
        cancelText="关闭"
        width={800}
      >
        {selectedFlow && (
          <div>
            {/* 基本信息 */}
            <div className="mb-4">
              <h4>基本信息</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>Flow名称: {selectedFlow.flowName}</div>
                <div>类型: {selectedFlow.flowType}</div>
                <div>
                  数量: {selectedFlow.quantity} {selectedFlow.unit}
                </div>
                <div>匹配状态: {getMatchStatusTag(selectedFlow.matchStatus, selectedFlow.confidence)}</div>
              </div>
            </div>

            {/* 匹配的特征化因子 */}
            {selectedFlow.factors && Object.keys(selectedFlow.factors).length > 0 && (
              <div className="mb-4">
                <h4>特征化因子</h4>
                <Table
                  size="small"
                  columns={[
                    { title: '影响类别', dataIndex: 'category', key: 'category' },
                    { title: '因子值', dataIndex: 'value', key: 'value' },
                    { title: '单位', dataIndex: 'unit', key: 'unit' },
                  ]}
                  dataSource={Object.entries(selectedFlow.factors).map(([key, value]) => ({
                    key,
                    category: key,
                    value: typeof value === 'number' ? value.toFixed(6) : value,
                    unit: '待定',
                  }))}
                  pagination={false}
                />
              </div>
            )}

            {/* 备选匹配 */}
            {selectedFlow.alternatives && selectedFlow.alternatives.length > 0 && (
              <div className="mb-4">
                <h4>备选匹配</h4>
                <Table
                  size="small"
                  columns={[
                    { title: '物质', dataIndex: 'substance', key: 'substance' },
                    {
                      title: '置信度',
                      dataIndex: 'confidence',
                      key: 'confidence',
                      render: (conf: number) => `${(conf * 100).toFixed(1)}%`,
                    },
                    {
                      title: '操作',
                      key: 'action',
                      render: (_, record: any) => (
                        <Button size="small" type="link">
                          选择
                        </Button>
                      ),
                    },
                  ]}
                  dataSource={selectedFlow.alternatives}
                  pagination={false}
                />
              </div>
            )}

            {/* 手动映射表单 */}
            {selectedFlow.matchStatus !== 'perfect_match' && (
              <div className="mb-4">
                <h4>手动映射</h4>
                <Form form={manualMappingForm} layout="vertical">
                  <Form.Item name="originalName" label="原始名称">
                    <Input disabled />
                  </Form.Item>
                  <Form.Item
                    name="mappedSubstance"
                    label="映射到物质"
                    rules={[{ required: true, message: '请选择要映射的物质' }]}
                  >
                    <Select showSearch placeholder="搜索并选择物质" optionFilterProp="children">
                      <Option value="CO2">CO2 - 二氧化碳</Option>
                      <Option value="CH4">CH4 - 甲烷</Option>
                      <Option value="N2O">N2O - 氧化亚氮</Option>
                      <Option value="steel_primary">steel_primary - 原生钢材</Option>
                      <Option value="electricity_coal">electricity_coal - 煤电</Option>
                      {/* 这里应该从特征化因子数据库动态加载 */}
                    </Select>
                  </Form.Item>
                </Form>
              </div>
            )}

            {/* 建议 */}
            {selectedFlow.recommendations && selectedFlow.recommendations.length > 0 && (
              <div>
                <h4>建议</h4>
                <ul>
                  {selectedFlow.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
