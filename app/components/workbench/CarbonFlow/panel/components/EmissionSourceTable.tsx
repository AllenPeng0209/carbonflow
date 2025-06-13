import React, { useState, useMemo } from 'react';
import { Card, Button, Table, Input, Space, Tooltip, Popconfirm, message, Tag } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  CaretRightOutlined,
  CaretDownOutlined,
  ApartmentOutlined,
  UserOutlined,
  TeamOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import type { TableProps, ColumnType } from 'antd/es/table';
import type { FilterDropdownProps } from 'antd/es/table/interface';
import type { Node } from 'reactflow';
import type { NodeData } from '~/types/nodes';

// 层级节点接口
interface HierarchicalNode extends Node<NodeData> {
  level: number;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId?: string;
  children?: HierarchicalNode[];
  supplierTier?: number;
  compositionRatio?: number;
}

// 映射节点类型到生命周期阶段的中文表示
const nodeTypeToLifecycleStageMap: Record<string, string> = {
  product: '原材料获取',
  manufacturing: '生产制造',
  distribution: '分销和储存',
  usage: '产品使用',
  disposal: '废弃处置',
  finalProduct: '最终产品',
};

interface EmissionSourceTableProps {
  selectedStage: string;
  nodes: any[];
  onAddEmissionSource: () => void;
  getFilteredNodesForTable: () => any[];
  onEditEmissionSource: (nodeId: string) => void;
  onDeleteEmissionSource: (nodeId: string) => void;
  onAddChildNode?: (parentNodeId: string) => void;
  onOpenFullPageTable?: () => void;
  isFullPageMode?: boolean;
}

export const EmissionSourceTable: React.FC<EmissionSourceTableProps> = ({
  selectedStage,
  onAddEmissionSource,
  getFilteredNodesForTable,
  onEditEmissionSource,
  onDeleteEmissionSource,
  onAddChildNode,
  onOpenFullPageTable,
  isFullPageMode = false,
}) => {
  // 展开状态管理
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // 构建层级数据结构
  const hierarchicalData = useMemo(() => {
    const rawNodes = getFilteredNodesForTable();
    const nodeMap = new Map<string, HierarchicalNode>();
    const rootNodes: HierarchicalNode[] = [];

    rawNodes.forEach((node) => {
      const hierarchicalNode: HierarchicalNode = {
        ...node,
        level: node.data?.level || 0,
        hasChildren: false,
        isExpanded: expandedKeys.has(node.id),
        parentId: node.data?.parentNodeId,
        children: [],
        supplierTier: node.data?.supplierTier || (node.data as any)?.supplierInfo?.tier,
        compositionRatio: node.data?.compositionRatio,
      };
      nodeMap.set(node.id, hierarchicalNode);
    });

    nodeMap.forEach((node) => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        parent.children!.push(node);
        parent.hasChildren = true;
      } else {
        rootNodes.push(node);
      }
    });

    const buildDisplayData = (nodes: HierarchicalNode[]): HierarchicalNode[] => {
      let result: HierarchicalNode[] = [];
      nodes.forEach((node) => {
        result.push(node);
        if (node.isExpanded && node.children && node.children.length > 0) {
          result = result.concat(buildDisplayData(node.children));
        }
      });
      return result;
    };

    return buildDisplayData(rootNodes);
  }, [getFilteredNodesForTable, expandedKeys]);

  const allExpandableNodes = useMemo(() => hierarchicalData.filter((node) => node.hasChildren), [hierarchicalData]);
  const isAllExpanded = useMemo(() => allExpandableNodes.length > 0 && allExpandableNodes.every((node) => expandedKeys.has(node.id)), [allExpandableNodes, expandedKeys]);

  const toggleExpandAll = () => {
    if (isAllExpanded) {
      setExpandedKeys(new Set());
    } else {
      setExpandedKeys(new Set(allExpandableNodes.map((node) => node.id)));
    }
  };

  const toggleExpanded = (nodeId: string) => {
    const newExpandedKeys = new Set(expandedKeys);
    if (newExpandedKeys.has(nodeId)) {
      newExpandedKeys.delete(nodeId);
    } else {
      newExpandedKeys.add(nodeId);
    }
    setExpandedKeys(newExpandedKeys);
  };

  const renderHierarchyCell = (node: HierarchicalNode) => {
    const indentWidth = node.level * 40;

    return (
      <div className="hierarchy-cell-container" style={{ paddingLeft: indentWidth }}>
        {node.hasChildren ? (
          <Button
            type="text"
            size="small"
            className="hierarchy-expand-btn"
            icon={node.isExpanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
            onClick={() => toggleExpanded(node.id)}
          />
        ) : (
          <div style={{ width: 16, marginRight: 4 }} />
        )}
        {node.supplierTier && (
          <Tag
            className="supplier-tier-tag"
            color={node.supplierTier === 1 ? 'blue' : node.supplierTier === 2 ? 'green' : 'orange'}
          >
            {node.supplierTier}级
          </Tag>
        )}
        {node.data?.isComposite && <ApartmentOutlined className="hierarchy-icon composite-icon" />}
        {(node.data as any)?.supplierInfo && <UserOutlined className="hierarchy-icon supplier-icon" />}
        <span>{node.data?.label || ''}</span>
        {node.compositionRatio && (
          <Tag className="composition-ratio-tag" color="purple">
            {(node.compositionRatio * 100).toFixed(1)}%
          </Tag>
        )}
      </div>
    );
  };

  const commonActionColumn: ColumnType<HierarchicalNode> = {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right',
    render: (_, record) => (
      <Space size="small">
        <Tooltip title="编辑">
          <Button type="link" icon={<EditOutlined />} onClick={() => onEditEmissionSource(record.id)} />
        </Tooltip>
        <Tooltip title="添加子级">
          <Button
            type="link"
            icon={<PlusOutlined />}
            onClick={() => (onAddChildNode ? onAddChildNode(record.id) : message.info('功能待开发'))}
          />
        </Tooltip>
        <Tooltip title="供应商数据">
          <Button type="link" icon={<TeamOutlined />} onClick={() => message.info('功能待开发')} />
        </Tooltip>
        <Tooltip title="删除">
          <Popconfirm title="确定删除吗?" onConfirm={() => onDeleteEmissionSource(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Tooltip>
      </Space>
    ),
  };

  const simpleColumns: TableProps<HierarchicalNode>['columns'] = [
    { title: '序号', key: 'index', render: (_, __, index) => index + 1, width: 80 },
    {
      title: '排放源名称',
      dataIndex: ['data', 'label'],
      key: 'label',
      render: (text, record) => renderHierarchyCell(record),
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
          <Input
            placeholder="搜索名称"
            value={String(selectedKeys[0] ?? '')}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedKeys(value ? [value] : []);
              if (!value && clearFilters) {
                clearFilters();
              }
              confirm({ closeDropdown: false });
            }}
            onPressEnter={() => confirm({ closeDropdown: true })}
            onBlur={() => confirm({ closeDropdown: false })}
            style={{ marginBottom: 8, width: '100%' }}
            allowClear
          />
        </div>
      ),
      filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
      onFilter: (value, record) => (record.data?.label ?? '').toString().toLowerCase().includes((value as string).toLowerCase()),
    },
    {
      title: '供应商信息',
      key: 'supplierInfo',
      width: 150,
      render: (_, record) => {
        const supplierInfo = (record.data as any)?.supplierInfo;
        if (!supplierInfo) {
          return '-';
        }
        return (
          <div className="supplier-info-container">
            <div className="supplier-info-name">{supplierInfo.name}</div>
            <div className="supplier-info-details">
              {supplierInfo.tier}级供应商
              {supplierInfo.isDirectSupplier && <Tag color="green">直供</Tag>}
            </div>
          </div>
        );
      },
    },
    {
      title: '活动水平数据状态',
      key: 'activityDataStatus',
      render: (_, record) => {
        const data = record.data as any;
        const hasActivityDataValue = data?.quantity && typeof data.quantity === 'string' && data.quantity.trim() !== '' && !isNaN(parseFloat(data.quantity));
        const hasActivityUnit = data?.activityUnit && typeof data.activityUnit === 'string' && data.activityUnit.trim() !== '';
        if (hasActivityDataValue && hasActivityUnit) {
          return <span className="status-complete">完整</span>;
        }
        return <span className="status-missing">缺失</span>;
      },
    },
    {
      title: '证明材料',
      key: 'evidenceMaterialStatus',
      render: (_, record) => {
        const data = record.data as any;
        if (data?.evidenceVerificationStatus === '已验证') {
          return <span className="status-complete">完整</span>;
        }
        if (data?.evidenceFiles?.length > 0) {
          return <span className="status-pending">待解析</span>;
        }
        return <span className="status-missing">缺失</span>;
      },
    },
    {
      title: '背景数据状态',
      key: 'backgroundDataStatus',
      render: (_, record) => {
        const data = record.data as any;
        if (data?.carbonFactor && parseFloat(data.carbonFactor) !== 0) {
          return <span className="status-complete">完整</span>;
        }
        return <span className="status-missing">缺失</span>;
      },
    },
    { title: '数据风险', dataIndex: ['data', 'dataRisk'], key: 'dataRisk', render: (text) => text || '无' },
    { ...commonActionColumn, fixed: false },
  ];

  const detailedColumns: TableProps<HierarchicalNode>['columns'] = [
    { title: '序号', key: 'index', width: 60, fixed: 'left', align: 'center', render: (_, __, index) => index + 1 },
    {
      title: '基本信息',
      children: [
        {
          title: '排放源名称',
          key: 'label',
          width: 350,
          fixed: 'left',
          render: (_, record) => renderHierarchyCell(record),
          filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
              <Input
                placeholder="搜索名称"
                value={String(selectedKeys[0] ?? '')}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedKeys(value ? [value] : []);
                  if (!value && clearFilters) {
                    clearFilters();
                  }
                  confirm({ closeDropdown: false });
                }}
                onPressEnter={() => confirm({ closeDropdown: true })}
                onBlur={() => confirm({ closeDropdown: false })}
                style={{ marginBottom: 8, width: '100%' }}
                allowClear
              />
            </div>
          ),
          filterIcon: (filtered) => <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />,
          onFilter: (value, record) => (record.data?.label ?? '').toString().toLowerCase().includes((value as string).toLowerCase()),
        },
        {
          title: '生命周期阶段',
          key: 'lifecycleStage',
          dataIndex: 'type',
          width: 120,
          align: 'center',
          render: (type) => nodeTypeToLifecycleStageMap[type] || '未知',
          filters: Object.entries(nodeTypeToLifecycleStageMap).map(([value, label]) => ({ text: label, value })),
          onFilter: (value, record) => record.type === value,
        },
        { title: '节点ID', dataIndex: 'id', key: 'id', width: 180, align: 'center' },
        { title: '排放源类别', dataIndex: ['data', 'emissionType'], key: 'emissionType', width: 120, align: 'center', render: (text, record) => (record.type === 'distribution' ? '运输' : text || '未分类') },
        { title: '补充信息', dataIndex: ['data', 'supplementaryInfo'], key: 'supplementaryInfo', width: 150, align: 'center', render: (text) => text || '-' },
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
          render: (v, r) => {
            const data = r.data as any;
            if (r.type === 'manufacturing' && data.energyConsumption) {
              return data.energyConsumption;
            }
            if (r.type === 'distribution' && data.transportationDistance) {
              return data.transportationDistance;
            }
            return v ?? '-';
          },
        },
        { title: '单位', dataIndex: ['data', 'activityUnit'], key: 'activityUnit', width: 90, align: 'center', render: (v) => v || '-' },
        { title: '运输-起点', key: 'startPoint', width: 120, align: 'center', render: (_, record) => (record.type === 'distribution' ? (record.data as any).startPoint || '-' : '-') },
        { title: '运输-终点', key: 'endPoint', width: 120, align: 'center', render: (_, record) => (record.type === 'distribution' ? (record.data as any).endPoint || '-' : '-') },
        { title: '运输方式', key: 'transportationMode', width: 100, align: 'center', render: (_, record) => (record.type === 'distribution' ? (record.data as any).transportationMode || '-' : '-') },
        { title: '数据来源', dataIndex: ['data', 'activitydataSource'], key: 'activitydataSource', width: 120, align: 'center', render: (v) => v || '-' },
        { title: '质量评分', dataIndex: ['data', 'activityScorelevel'], key: 'activityScorelevel', width: 100, align: 'center', render: (v) => v || '-' },
      ],
    },
    {
      title: '背景数据 (排放因子)',
      children: [
        { title: '名称', dataIndex: ['data', 'carbonFactorName'], key: 'carbonFactorName', width: 150, align: 'center', render: (v) => v || '-' },
        { title: '数值 (kgCO2e)', dataIndex: ['data', 'carbonFactor'], key: 'carbonFactor', width: 130, align: 'center', render: (v) => v || '-' },
        { title: '单位', dataIndex: ['data', 'carbonFactorUnit'], key: 'carbonFactorUnit', width: 100, align: 'center', render: (v) => v || '-' },
        { title: '地理代表性', dataIndex: ['data', 'emissionFactorGeographicalRepresentativeness'], key: 'emissionFactorGeographicalRepresentativeness', width: 110, align: 'center', render: (v) => v || '-' },
        { title: '时间代表性', dataIndex: ['data', 'emissionFactorTemporalRepresentativeness'], key: 'emissionFactorTemporalRepresentativeness', width: 100, align: 'center', render: (v) => v || '-' },
        { title: '数据库名称', dataIndex: ['data', 'carbonFactordataSource'], key: 'carbonFactordataSource', width: 120, align: 'center', render: (v) => v || '-' },
        { title: '因子UUID', dataIndex: ['data', 'factorUUID'], key: 'factorUUID', width: 180, align: 'center', render: (v) => v || '-' },
        { title: '质量评分', dataIndex: ['data', 'emissionFactorQuality'], key: 'emissionFactorQuality', width: 100, align: 'center', render: (v) => (typeof v === 'number' ? v : '-') },
      ],
    },
    {
      title: '单位转换',
      children: [{ title: '系数', dataIndex: ['data', 'unitConversion'], key: 'unitConversion', width: 90, align: 'center', render: (v) => v ?? '-' }],
    },
    {
      title: '碳足迹结果',
      children: [
        { title: '排放量 (kgCO2e)', dataIndex: ['data', 'carbonFootprint'], key: 'carbonFootprint', width: 150, align: 'center', render: (v) => (v ? parseFloat(v).toFixed(2) : '-') },
        { title: '计算方法', dataIndex: ['data', 'calculationMethod'], key: 'calculationMethod', width: 120, align: 'center', render: (v) => v || '-' },
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
          render: (status) => {
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
        { title: '适用标准', dataIndex: ['data', 'applicableStandard'], key: 'applicableStandard', width: 120, align: 'center', render: (v) => v || '-' },
        { title: '完成状态', dataIndex: ['data', 'completionStatus'], key: 'completionStatus', width: 100, align: 'center', render: (v) => v || '-' },
        { title: '认证材料', dataIndex: ['data', 'certificationMaterials'], key: 'certificationMaterials', width: 120, align: 'center', render: (v) => v || '-' },
      ],
    },
    commonActionColumn,
  ];

  const columns = isFullPageMode ? detailedColumns : simpleColumns;
  const scrollY = isFullPageMode ? 'calc(100vh - 120px)' : 'calc(100vh - 600px)';

  const tableContent = (
    <Table
      className="emission-source-table compact-mode"
      columns={columns}
      dataSource={hierarchicalData}
      rowKey="id"
      size="small"
      bordered
      pagination={{
        pageSize: 20,
        size: 'small',
        showSizeChanger: false,
        showQuickJumper: false,
        showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`,
        position: ['bottomCenter'],
      }}
      scroll={{ x: 'max-content', y: scrollY }}
      sticky
      rowClassName={(record) => {
        const classNames = [];
        if (record.level > 0) {
          classNames.push(`hierarchy-level-${record.level}`);
        }
        if (record.data?.isComposite) {
          classNames.push('composite-product');
        }
        if ((record.data as any)?.supplierInfo) {
          classNames.push(`supplier-tier-${(record.data as any).supplierInfo.tier}`);
        }
        return classNames.join(' ');
      }}
    />
  );

  if (isFullPageMode) {
    return (
      <div className="flex-grow overflow-auto emission-source-table-scroll-container" style={{ height: '100%' }}>
        {tableContent}
      </div>
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>排放源清单{selectedStage === '全部' ? '' : ` - ${selectedStage}`}</span>
          <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
            <ApartmentOutlined style={{ marginRight: 4 }} />
          </div>
        </div>
      }
      size="small"
      className="flex-grow flex flex-col min-h-0 emission-source-table"
      extra={
        <Space>
          <Button type="default" size="small" icon={<FullscreenOutlined />} onClick={onOpenFullPageTable}>
            全屏
          </Button>

          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={onAddEmissionSource}>
            新增排放源
          </Button>
        </Space>
      }
    >
      <div className="flex-grow overflow-auto emission-source-table-scroll-container">{tableContent}</div>
    </Card>
  );
};

export default EmissionSourceTable;
