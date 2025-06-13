import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Tag,
  Row,
  Col,
  Table,
  Modal,
  message,
  Space,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReconciliationOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import type { Workflow } from '~/types/dashboard';
import { supabase } from '~/lib/supabase';

interface WorkbenchSectionProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  industryFilter: string;
  setIndustryFilter: (industry: string) => void;
  navigateToWorkflow: (id: string, route: 'workflow' | 'report') => void;
}

const PAGE_SIZE = 10;

const WorkbenchSection: React.FC<WorkbenchSectionProps> = ({
  searchQuery,
  setSearchQuery,
  industryFilter,
  setIndustryFilter,
  navigateToWorkflow,
}) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const fetchWorkflows = useCallback(async () => {
    if (!userId) {
      return;
    }

    setLoading(true);

    let query = supabase
      .from('workflows')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (searchQuery) {
      query = query.or(
        `name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
      );
    }

    if (industryFilter && industryFilter !== 'all') {
      query = query.eq('industry_type', industryFilter);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    setLoading(false);

    if (error) {
      message.error(`加载工作流失败: ${error.message}`);
    } else {
      setWorkflows(data || []);
      setTotal(count || 0);
    }
  }, [userId, page, searchQuery, industryFilter]);

  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setUserId(data.user.id);
      }
    }
    fetchUser();
  }, []);

  useEffect(() => {
    // 当筛选条件变化时，重置到第一页
    setPage(1);
  }, [searchQuery, industryFilter]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const handleDelete = (workflow: Workflow) => {
    Modal.confirm({
      title: '您确定要删除此工作流吗?',
      content: `工作流: ${workflow.name}`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const { error } = await supabase
          .from('workflows')
          .delete()
          .eq('id', workflow.id);
        if (error) {
          message.error(`删除失败: ${error.message}`);
        } else {
          message.success('工作流已删除');
          fetchWorkflows();
        }
      },
    });
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: `您确定要删除选中的 ${selectedRowKeys.length} 个工作流吗?`,
      content: '此操作不可撤销。',
      okText: '全部删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const { error } = await supabase
          .from('workflows')
          .delete()
          .in('id', selectedRowKeys as string[]);
        if (error) {
          message.error(`批量删除失败: ${error.message}`);
        } else {
          message.success(`${selectedRowKeys.length} 个工作流已删除`);
          setSelectedRowKeys([]);
          fetchWorkflows();
        }
      },
    });
  };

  const columns = [
    {
      title: '工作流名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Workflow) => (
        <div>
          <a
            onClick={() => navigateToWorkflow(record.id, 'workflow')}
            className="text-gray-900 font-medium text-base hover:text-green-600"
          >
            {name}
          </a>
          <p className="text-gray-600 text-sm mt-1">
            {record.description || '暂无描述'}
          </p>
        </div>
      ),
    },
    {
      title: '行业',
      dataIndex: 'industry_type',
      key: 'industry_type',
      render: (type: string) => (type ? <Tag color="blue">{type}</Tag> : '-'),
    },
    {
      title: '总碳足迹',
      dataIndex: 'total_carbon_footprint',
      key: 'total_carbon_footprint',
      render: (cfp: number) => (
        <span className="font-medium text-green-600">
          {cfp?.toFixed(2) || '0.00'} kgCO₂e
        </span>
      ),
    },
    {
      title: '更新于',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Workflow) => (
        <Space size="middle">
          <Button
            type="link"
            onClick={() => navigateToWorkflow(record.id, 'workflow')}
            className="p-0 text-green-600 hover:text-green-700 font-medium"
          >
            编辑
          </Button>
          <Button
            type="link"
            onClick={() => navigateToWorkflow(record.id, 'report')}
            className="p-0 text-blue-600 hover:text-blue-700 font-medium"
          >
            报告
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDelete(record)}
            className="p-0 font-medium"
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };
  const hasSelected = selectedRowKeys.length > 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 rounded-lg">
            <ReconciliationOutlined className="text-2xl text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">碳足迹工作台</h1>
            <p className="text-gray-600">管理和跟踪产品碳足迹工作流</p>
          </div>
        </div>
        {/* 统计信息 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>共 {total} 个工作流</span>
          <span>•</span>
          <span>当前第 {page} 页</span>
        </div>
      </div>

      {/* 主要内容卡片 */}
      <Card
        className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
        title={
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <ReconciliationOutlined className="text-green-600" />
            产品碳足迹工作流
          </div>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigateToWorkflow('new', 'workflow')}
            className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
          >
            创建新工作流
          </Button>
        }
      >
        {/* 搜索和筛选区域 */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Row gutter={16}>
            <Col span={16}>
              <Input
                prefix={<SearchOutlined className="text-gray-400" />}
                placeholder="搜索工作流名称或描述..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="h-10"
              />
            </Col>
            <Col span={8}>
              <Select
                style={{ width: '100%', height: '40px' }}
                placeholder="按行业筛选"
                value={industryFilter}
                onChange={(value) => setIndustryFilter(value)}
                options={[
                  { value: 'all', label: '全部行业' },
                  { value: '电子制造', label: '电子制造' },
                  { value: '纺织业', label: '纺织业' },
                  { value: '汽车制造', label: '汽车制造' },
                  { value: '食品加工', label: '食品加工' },
                  { value: '化工', label: '化工' },
                ]}
              />
            </Col>
          </Row>
        </div>

        {/* 批量操作区域 */}
        <div className="mb-4 flex items-center">
          {hasSelected && (
            <Space>
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
              <span className="text-gray-500 text-sm">
                已选择 {selectedRowKeys.length} 项
              </span>
            </Space>
          )}
        </div>

        {/* 工作流表格 */}
        <Table
          rowKey="id"
          rowSelection={rowSelection}
          columns={columns as any}
          dataSource={workflows}
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无工作流，请点击"创建新工作流"开始使用' }}
        />

        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="min-w-20"
            >
              上一页
            </Button>
            <span className="flex items-center gap-2 text-gray-600">
              <span>第</span>
              <span className="font-medium text-gray-900">{page}</span>
              <span>页，共</span>
              <span className="font-medium text-gray-900">{totalPages}</span>
              <span>页</span>
            </span>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="min-w-20"
            >
              下一页
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default WorkbenchSection;
