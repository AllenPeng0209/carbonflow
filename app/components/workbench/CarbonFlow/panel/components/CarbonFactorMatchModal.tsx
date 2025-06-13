import React from 'react';
import { Modal, Button, Table, Input, Select, Space, Tabs } from 'antd';
import type { ColumnType } from 'antd/es/table';

const lifecycleStages = ['全部', '原材料获取阶段', '生产制造阶段', '分销运输阶段', '使用阶段', '寿命终止阶段'];

const emissionCategories = ['原材料', '包装材料', '能耗', '运输', '废弃物'];

interface CarbonFactorMatchModalProps {
  visible: boolean;
  onClose: () => void;
  onAIMatch: () => void;
  factorMatchModalSources: any[];
  selectedFactorMatchSources: React.Key[];
  onSelectionChange: (selectedRowKeys: React.Key[]) => void;
  matchResults: {
    success: string[];
    failed: string[];
    logs: string[];
  };
  showMatchResultsModal: boolean;
  onCloseMatchResults: () => void;
  nodes: any[];
}

// 生命周期阶段到节点类型的映射
const lifecycleStageToNodeTypeMap: Record<string, string> = {
  原材料获取阶段: 'product',
  生产制造阶段: 'manufacturing',
  分销运输阶段: 'distribution',
  使用阶段: 'usage',
  寿命终止阶段: 'disposal',
};

const nodeTypeToLifecycleStageMap: Record<string, string> = Object.fromEntries(
  Object.entries(lifecycleStageToNodeTypeMap).map(([key, value]) => [value, key]),
);

export const CarbonFactorMatchModal: React.FC<CarbonFactorMatchModalProps> = ({
  visible,
  onClose,
  onAIMatch,
  factorMatchModalSources,
  selectedFactorMatchSources,
  onSelectionChange,
  matchResults,
  showMatchResultsModal,
  onCloseMatchResults,
  nodes,
}) => {
  // 因子匹配表格列定义
  const factorMatchTableColumns: ColumnType<any>[] = [
    {
      title: '序号',
      dataIndex: 'index',
      key: 'index',
      width: 60,
      render: (_, _record, index) => index + 1,
    },
    {
      title: '生命周期阶段',
      key: 'lifecycleStage',
      width: 120,
      render: (_, record) => {
        const node = nodes.find((n) => n.id === record.id);
        const stageType = node?.type || '';

        return nodeTypeToLifecycleStageMap[stageType] || '未知';
      },
    },
    {
      title: '排放源名称',
      dataIndex: ['data', 'label'],
      key: 'label',
      width: 150,
      render: (text) => text || '-',
    },
    {
      title: '排放源类别',
      dataIndex: ['data', 'emissionType'],
      key: 'emissionType',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: '活动数据',
      key: 'activityData',
      width: 120,
      render: (_, record) => {
        const quantity = record.data?.quantity;
        const unit = record.data?.activityUnit;

        return quantity && unit ? `${quantity} ${unit}` : '-';
      },
    },
    {
      title: '碳因子状态',
      key: 'carbonFactorStatus',
      width: 100,
      render: (_, record) => {
        const hasFactor = record.data?.carbonFactor;
        const isAIGenerated = record.data?.isAIGenerated;

        if (!hasFactor) {
          return '未配置因子';
        }

        if (isAIGenerated) {
          return 'AI匹配成功';
        }

        return '已手动配置因子';
      },
    },
    {
      title: '碳因子数值',
      dataIndex: ['data', 'carbonFactor'],
      key: 'carbonFactor',
      width: 100,
      render: (text) => text || '-',
    },
    {
      title: '碳因子单位',
      dataIndex: ['data', 'carbonFactorUnit'],
      key: 'carbonFactorUnit',
      width: 100,
      render: (text) => text || '-',
    },
  ];

  return (
    <>
      {/* 因子匹配弹窗 */}
      <Modal
        title="背景数据匹配"
        open={visible}
        onCancel={onClose}
        width="80%"
        footer={[
          <Button key="aiMatch" type="primary" onClick={onAIMatch} disabled={selectedFactorMatchSources.length === 0}>
            AI匹配
          </Button>,
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Input placeholder="排放源名称" style={{ width: 200 }} className="background-data-match-input" />
            <Select
              placeholder="生命周期阶段 (全部)"
              style={{ width: 150 }}
              allowClear
              className="background-data-match-select"
            >
              {lifecycleStages.map((stage) => (
                <Select.Option key={stage} value={stage}>
                  {stage}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="排放源类别 (全部)"
              style={{ width: 200 }}
              allowClear
              className="background-data-match-select"
            >
              {emissionCategories.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="因子匹配状态 (全部)"
              style={{ width: 200 }}
              allowClear
              className="background-data-match-select"
            >
              {(['未配置因子', 'AI匹配失败', 'AI匹配成功', '已手动配置因子'] as const).map((status) => (
                <Select.Option key={status} value={status}>
                  {status}
                </Select.Option>
              ))}
            </Select>
          </Space>
        </div>

        <Table
          rowSelection={{
            type: 'checkbox',
            selectedRowKeys: selectedFactorMatchSources,
            onChange: onSelectionChange,
          }}
          columns={factorMatchTableColumns}
          dataSource={factorMatchModalSources.map((node, index) => ({
            ...node,
            key: node.id,
            index,
          }))}
          rowKey="id"
          size="small"
          scroll={{ y: 'calc(60vh - 150px)' }}
        />
      </Modal>

      {/* 匹配结果弹窗 */}
      <Modal
        title="碳因子匹配结果"
        open={showMatchResultsModal}
        onCancel={onCloseMatchResults}
        width={700}
        footer={[
          <Button key="close" onClick={onCloseMatchResults}>
            关闭
          </Button>,
        ]}
      >
        <div className="mb-4">
          <div className="font-bold text-lg mb-3 text-white">匹配结果摘要</div>
          <div className="flex space-x-4 text-white">
            <div className="border p-3 rounded flex-1 bg-green-40 text-center text-white">
              <div className="text-2xl text-white">{matchResults.success.length}</div>
              <div className="text-white">匹配成功</div>
            </div>
            <div className="border p-3 rounded flex-1 bg-red-40 text-center text-white">
              <div className="text-2xl text-white">{matchResults.failed.length}</div>
              <div className="text-white">匹配失败</div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="font-bold text-lg mb-2 text-white">API匹配日志</div>
          <div className="border rounded p-2 bg-gray-30 h-40 overflow-auto text-white">
            {matchResults.logs.length > 0 ? (
              <ul className="list-disc pl-5">
                {matchResults.logs.map((log, index) => (
                  <li key={index} className="text-sm text-white mb-1">
                    {log}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-white py-4">无匹配日志信息</div>
            )}
          </div>
        </div>

        <div>
          <div className="font-bold text-lg mb-2 text-white">详细匹配结果</div>
          <Tabs defaultActiveKey="success" className="text-white">
            <Tabs.TabPane tab="成功匹配" key="success">
              {matchResults.success.length > 0 ? (
                <ul className="list-disc pl-5">
                  {matchResults.success.map((id) => {
                    const node = nodes.find((n) => n.id === id);
                    const data = node?.data as any;

                    return (
                      <li key={id} className="mb-1 text-white">
                        <span className="font-semibold">{node?.data?.label || id}</span>:
                        {data ? ` 碳因子值=${data.carbonFactor || '未知'}` : ' 匹配成功'}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center text-white py-4">无成功匹配的排放源</div>
              )}
            </Tabs.TabPane>
            <Tabs.TabPane tab="失败匹配" key="failed">
              {matchResults.failed.length > 0 ? (
                <ul className="list-disc pl-5">
                  {matchResults.failed.map((id) => {
                    const node = nodes.find((n) => n.id === id);
                    return (
                      <li key={id} className="mb-1 text-white">
                        {node?.data?.label || id}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="text-center text-white py-4">无失败匹配的排放源</div>
              )}
            </Tabs.TabPane>
          </Tabs>
        </div>
      </Modal>
    </>
  );
};

export default CarbonFactorMatchModal;
