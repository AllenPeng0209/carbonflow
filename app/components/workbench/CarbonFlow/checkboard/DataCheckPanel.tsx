import React, { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, Button, Space, message } from 'antd';
import type { TableProps } from 'antd';
import type { Node } from 'reactflow';
import type { NodeData, ManufacturingNodeData, DistributionNodeData } from '~/types/nodes';
import { useCarbonFlowStore, emitCarbonFlowData } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { SearchOutlined, UndoOutlined, SyncOutlined } from '@ant-design/icons';

const { Option } = Select;

// 映射节点类型到生命周期阶段的中文表示
const nodeTypeToLifecycleStageMap: Record<string, string> = {
  product: '原材料获取',
  manufacturing: '生产制造',
  distribution: '分销和储存',
  usage: '产品使用',
  disposal: '废弃处置',
  finalProduct: '最终产品',
};

interface DataCheckPanelProps {}

export const DataCheckPanel: React.FC<DataCheckPanelProps> = () => {
  const { nodes } = useCarbonFlowStore();
  const [filteredNodes, setFilteredNodes] = useState<Node<NodeData>[]>(nodes);
  const [searchText, setSearchText] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<string | undefined>(undefined);

  useEffect(() => {
    setFilteredNodes(nodes);
  }, [nodes]);

  useEffect(() => {
    let currentNodes = nodes;

    if (searchText) {
      currentNodes = currentNodes.filter(
        (node) =>
          node.data.label?.toLowerCase().includes(searchText.toLowerCase()) ||
          node.data.nodeId?.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (lifecycleFilter) {
      currentNodes = currentNodes.filter((node) => node.type === lifecycleFilter);
    }

    setFilteredNodes(currentNodes);
  }, [searchText, lifecycleFilter, nodes]);

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleLifecycleFilterChange = (value: string | undefined) => {
    setLifecycleFilter(value);
  };

  const resetFilters = () => {
    setSearchText('');
    setLifecycleFilter(undefined);
  };

  // 手动同步数据到对话
  const handleSyncToChat = () => {
    try {
      // 触发数据同步
      emitCarbonFlowData();
      
      message.success('数据已同步！AI将在下一轮对话中感知到最新数据');
    } catch (error) {
      console.error('同步数据失败:', error);
      message.error('同步数据失败，请重试');
    }
  };

  const columns: TableProps<Node<NodeData>>['columns'] = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      fixed: 'left',
      align: 'center',
      render: (_: any, record: Node<NodeData>, index: number) => index + 1,
    },
    {
      title: '基本信息',
      children: [
        {
          title: '生命周期阶段',
          key: 'lifecycleStage',
          dataIndex: 'type',
          width: 120,
          align: 'center',
          render: (type: string) => nodeTypeToLifecycleStageMap[type] || '未知',
          filters: Object.entries(nodeTypeToLifecycleStageMap).map(([value, label]) => ({ text: label, value })),
          onFilter: (value, record) => record.type === value,
        },
        { title: '排放源名称', dataIndex: ['data', 'label'], key: 'label', width: 150, align: 'center' },
        { title: '节点ID', dataIndex: 'id', key: 'id', width: 180, align: 'center' },
        {
          title: '排放源类别',
          dataIndex: ['data', 'emissionType'],
          key: 'emissionType',
          width: 120,
          align: 'center',
          render: (text: any, record: Node<NodeData>) => (record.type === 'distribution' ? '运输' : text || '未分类'),
        },
        {
          title: '补充信息',
          dataIndex: ['data', 'supplementaryInfo'],
          key: 'supplementaryInfo',
          width: 150,
          align: 'center',
          render: (text: any) => text || '-',
        },
      ],
    },
    {
      title: '活动水平数据',
      children: [
        {
          title: '数值',
          dataIndex: ['data', 'quantity'],
          key: 'quantity',
          width: 100,
          align: 'center',
          render: (v: any, r: Node<NodeData>) => {
            let displayValue = v;

            if (r.type === 'manufacturing' && (r.data as ManufacturingNodeData).energyConsumption) {
              displayValue = (r.data as ManufacturingNodeData).energyConsumption;
            } else if (r.type === 'distribution' && (r.data as DistributionNodeData).transportationDistance) {
              displayValue = (r.data as DistributionNodeData).transportationDistance;
            }

            return displayValue ?? '-';
          },
        },
        {
          title: '单位',
          dataIndex: ['data', 'activityUnit'],
          key: 'activityUnit',
          width: 90,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '运输-起点',
          dataIndex: ['data', 'startPoint'],
          key: 'startPoint',
          width: 120,
          align: 'center',
          render: (text: any, record: Node<NodeData>) =>
            record.type === 'distribution' ? (record.data as DistributionNodeData).startPoint || '-' : '-',
        },
        {
          title: '运输-终点',
          dataIndex: ['data', 'endPoint'],
          key: 'endPoint',
          width: 120,
          align: 'center',
          render: (text: any, record: Node<NodeData>) =>
            record.type === 'distribution' ? (record.data as DistributionNodeData).endPoint || '-' : '-',
        },
        {
          title: '运输方式',
          dataIndex: ['data', 'transportationMode'],
          key: 'transportationMode',
          width: 100,
          align: 'center',
          render: (text: any, record: Node<NodeData>) =>
            record.type === 'distribution' ? (record.data as DistributionNodeData).transportationMode || '-' : '-',
        },
        {
          title: '数据来源',
          dataIndex: ['data', 'activitydataSource'],
          key: 'activitydataSource',
          width: 120,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '质量评分',
          dataIndex: ['data', 'activityScorelevel'],
          key: 'activityScorelevel',
          width: 100,
          align: 'center',
          render: (v: any) => v || '-',
        },
      ],
    },
    {
      title: '背景数据 (排放因子)',
      children: [
        {
          title: '名称',
          dataIndex: ['data', 'carbonFactorName'],
          key: 'carbonFactorName',
          width: 150,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '数值 (kgCO2e)',
          dataIndex: ['data', 'carbonFactor'],
          key: 'carbonFactor',
          width: 130,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '单位',
          dataIndex: ['data', 'carbonFactorUnit'],
          key: 'carbonFactorUnit',
          width: 100,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '地理代表性',
          dataIndex: ['data', 'emissionFactorGeographicalRepresentativeness'],
          key: 'emissionFactorGeographicalRepresentativeness',
          width: 110,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '时间代表性',
          dataIndex: ['data', 'emissionFactorTemporalRepresentativeness'],
          key: 'emissionFactorTemporalRepresentativeness',
          width: 100,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '数据库名称',
          dataIndex: ['data', 'carbonFactordataSource'],
          key: 'carbonFactordataSource',
          width: 120,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '因子UUID',
          dataIndex: ['data', 'factorUUID'],
          key: 'factorUUID',
          width: 180,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '质量评分',
          dataIndex: ['data', 'emissionFactorQuality'],
          key: 'emissionFactorQuality',
          width: 100,
          align: 'center',
          render: (v: any) => (typeof v === 'number' ? v : '-'),
        },
      ],
    },
    {
      title: '单位转换',
      children: [
        {
          title: '系数',
          dataIndex: ['data', 'unitConversion'],
          key: 'unitConversion',
          width: 90,
          align: 'center',
          render: (v: any) => v ?? '-',
        },
      ],
    },
    {
      title: '碳足迹结果',
      children: [
        {
          title: '排放量 (kgCO2e)',
          dataIndex: ['data', 'carbonFootprint'],
          key: 'carbonFootprint',
          width: 150,
          align: 'center',
          render: (v: any) => (v ? parseFloat(v).toFixed(2) : '-'),
        },
        {
          title: '计算方法',
          dataIndex: ['data', 'calculationMethod'],
          key: 'calculationMethod',
          width: 120,
          align: 'center',
          render: (v: any) => v || '-',
        },
      ],
    },
    {
      title: '数据质量与验证',
      children: [
        {
          title: '验证状态',
          dataIndex: ['data', 'verificationStatus'],
          key: 'verificationStatus',
          width: 100,
          align: 'center',
          render: (status: string) => {
            let color = 'default';

            if (status === '已验证' || status === '内部验证') {
              color = 'success';
            }

            if (status === '未验证') {
              color = 'error';
            }

            if (status === '待验证') {
              color = 'processing';
            }

            return <Tag color={color}>{status || '-'}</Tag>;
          },
        },
        {
          title: '适用标准',
          dataIndex: ['data', 'applicableStandard'],
          key: 'applicableStandard',
          width: 120,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '完成状态',
          dataIndex: ['data', 'completionStatus'],
          key: 'completionStatus',
          width: 100,
          align: 'center',
          render: (v: any) => v || '-',
        },
        {
          title: '认证材料',
          dataIndex: ['data', 'certificationMaterials'],
          key: 'certificationMaterials',
          width: 120,
          align: 'center',
          render: (v: any) => v || '-',
        },
      ],
    },
  ];

  return (
    <div style={{ padding: '16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索排放源名称或节点名称"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ width: 240 }}
            className="data-check-input"
          />
          <Select
            value={lifecycleFilter}
            onChange={handleLifecycleFilterChange}
            placeholder="按生命周期阶段筛选"
            allowClear
            className="data-check-select"
          >
            {Object.entries(nodeTypeToLifecycleStageMap).map(([value, label]) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
          <Button
            icon={<UndoOutlined />}
            onClick={resetFilters}
            title="重置筛选"
          >
            重置
          </Button>
        </Space>
        
        <Space>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>
            显示 {filteredNodes.length} / {nodes.length} 个排放源
          </span>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={handleSyncToChat}
            title="同步数据到对话，让AI基于当前数据提供分析"
          >
            同步到对话
          </Button>
        </Space>
      </Space>
      <div style={{ flexGrow: 1, overflow: 'auto' }}>
        <Table
          columns={columns}
          dataSource={filteredNodes}
          rowKey="id"
          bordered
          size="small"
          scroll={{ x: 'max-content', y: 'calc(100vh - 200px)' }}
          sticky
        />
      </div>
      <style>{`
        .ant-table {
          background-color: #1e293b !important;
          color: #e2e8f0 !important;
        }
        .ant-table-thead > tr > th {
          background-color: #334155 !important;
          color: #f1f5f9 !important;
          border-bottom: 1px solid #475569 !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid #334155 !important;
          color: #cbd5e1 !important;
        }
        .ant-table-tbody > tr:hover > td {
          background-color: #273246 !important;
        }
        .ant-table-title, .ant-table-footer {
          background-color: #1e293b !important;
        }
        .ant-table-pagination.ant-pagination {
          margin-top: 16px;
          color: #e2e8f0 !important;
        }
        .ant-pagination-item a {
          color: #e2e8f0 !important;
        }
        .ant-pagination-item-active a {
          color: #1890ff !important;
        }
        .ant-pagination-item-active {
          border-color: #1890ff !important;
        }
        .ant-select-selector, .ant-input, .ant-btn {
          background-color: #334155 !important;
          color: #e2e8f0 !important;
          border-color: #475569 !important;
        }
        .ant-select-arrow, .ant-input-prefix > .anticon, .ant-btn > .anticon {
          color: #94a3b8 !important;
        }
        .ant-select-dropdown {
          background-color: #1e293b !important;
        }
        .ant-select-item-option-content {
          color: #e2e8f0 !important;
        }
        .ant-select-item-option-selected:not(.ant-select-item-option-disabled) {
          background-color: #334155 !important;
        }
        .ant-empty-description {
            color: #94a3b8 !important;
        }
        .ant-tag {
          border: none;
        }
        .data-check-input {
          width: 240px;
          height: 46px !important;
          top: 3px !important;
          background-color: #334155 !important;
          color: #e2e8f0 !important;
          border-color: #475569 !important;
        }
        .data-check-select {
          margin-left: 30px;
          margin-top: 5px;
          width: 80px;
          height: 32px !important;
          background-color: #334155 !important;
          color: #e2e8f0 !important;
          border-color: #475569 !important;
          border-radius: 4px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          
          background: rgba(10, 25, 47, 0.8) !important;
          border: 0px solid rgba(100, 255, 218, 0.3) !important;
          border-radius: 0px !important;
          align-items: center !important;
          width: 100% !important;
          /* 宽度为120% */
    

        }
      `}</style>
    </div>
  );
};
