import React, { useState, useEffect } from 'react';
import { Modal, Table, Input, Button, Form, Spin, message, Tag, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { CarbonFactor } from '~/types/carbonfactor';

interface ApiCarbonFactor {
  kg_co2eq: number;
  activity_name: string;
  reference_product_unit: string;
  geography: string;
  activity_uuid_product_uuid: string;
  data_source: string;
  import_date: string;
  score?: number;
}

// 扩展 CarbonFactor 类型，添加我们需要的字段
interface ExtendedCarbonFactor extends CarbonFactor {
  activity_name?: string;
  score?: number;
}

interface FactorSelectModalProps {
  visible: boolean;
  onOk: (factor: ExtendedCarbonFactor | null) => void;
  onCancel: () => void;
}

const FactorSelectModal: React.FC<FactorSelectModalProps> = ({ visible, onOk, onCancel }) => {
  const [form] = Form.useForm();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [factors, setFactors] = useState<ExtendedCarbonFactor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // 从 API 获取碳因子数据
  const fetchCarbonFactors = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);

    try {
      const requestBody = {
        labels: [searchQuery],
        top_k: 20, // 返回最多20个结果
        min_score: 0.1, // 降低最小分数以获得更多结果
        embedding_model: 'dashscope_v3',
        search_method: 'script_score',
      };

      const response = await fetch('https://api.climateseals.com/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API返回错误状态: ${response.status}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        results: Array<{
          query_label: string;
          matches: ApiCarbonFactor[];
          error: string | null;
        }>;
      };

      if (data.results && data.results.length > 0 && data.results[0].matches) {
        const matches = data.results[0].matches;
        const convertedFactors: ExtendedCarbonFactor[] = matches.map((match, index) => ({
          emission_factor_id: `${match.activity_uuid_product_uuid || index}`,
          name: match.data_source || '未知数据源',
          uuid: match.activity_uuid_product_uuid || `uuid-${index}`,
          value: match.kg_co2eq,
          geo_representative: match.geography || '未知',
          time_representative: match.import_date?.split('-')[0] || '未知',
          numerator_unit: 'kgCO2e',
          denominator_unit: match.reference_product_unit || 'unit',
          activity_name: match.activity_name,
          score: match.score,
        }));

        // 客户端过滤
        const values = form.getFieldsValue();
        const filteredFactors = convertedFactors.filter((factor) => {
          return (
            (!values.name || factor.name.toLowerCase().includes(values.name.toLowerCase())) &&
            (!values.uuid || (factor.uuid && factor.uuid.toLowerCase().includes(values.uuid.toLowerCase()))) &&
            (!values.activity_name ||
              (factor.activity_name &&
                factor.activity_name.toLowerCase().includes(values.activity_name.toLowerCase()))) &&
            (!values.product_name ||
              (factor.activity_name &&
                factor.activity_name.toLowerCase().includes(values.product_name.toLowerCase()))) &&
            (!values.geo_representative ||
              (factor.geo_representative &&
                factor.geo_representative.toLowerCase().includes(values.geo_representative.toLowerCase()))) &&
            (!values.time_representative ||
              (factor.time_representative && factor.time_representative.includes(values.time_representative)))
          );
        });

        setFactors(filteredFactors);
        setSearchPerformed(true);
        message.success(`找到 ${filteredFactors.length} 个匹配的排放因子`);
      } else {
        setFactors([]);
        setSearchPerformed(true);
        message.info('未找到匹配的排放因子，请尝试其他关键词');
      }
    } catch (error) {
      console.error('获取碳因子数据失败:', error);
      message.error('获取数据失败，请稍后重试');
      setFactors([]);
    } finally {
      setLoading(false);
    }
  };

  // 搜索处理
  const handleSearch = () => {
    const values = form.getFieldsValue();

    // 优先使用因子活动名称，然后是数据库名称
    const searchQuery = values.activity_name || values.name || '';

    if (!searchQuery.trim()) {
      message.warning('请至少输入因子活动名称或数据库名称进行搜索');
      return;
    }

    fetchCarbonFactors(searchQuery);
  };

  // 重置
  const handleReset = () => {
    form.resetFields();
    setFactors([]);
    setSelectedId(null);
    setSearchPerformed(false);
  };

  // 模态框关闭时重置状态
  useEffect(() => {
    if (!visible) {
      handleReset();
    }
  }, [visible]);

  const columns = [
    {
      title: '序号',
      dataIndex: 'index',
      width: 60,
      render: (_: any, _record: any, idx: number) => (
        <span style={{ fontWeight: 500, color: '#e2e8f0' }}>{idx + 1}</span>
      ),
    },
    {
      title: '数据库名称',
      dataIndex: 'name',
      width: 140,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Tag
            color="blue"
            style={{
              backgroundColor: '#1e40af',
              borderColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '12px',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            {text}
          </Tag>
        </Tooltip>
      ),
    },
    {
      title: 'UUID',
      dataIndex: 'uuid',
      width: 120,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              fontFamily: 'monospace',
              letterSpacing: '0.5px',
            }}
          >
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '因子活动名称',
      dataIndex: 'activity_name',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span
            style={{
              fontSize: '13px',
              color: '#f1f5f9',
              lineHeight: '1.4',
            }}
          >
            {text}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '因子产品名称',
      dataIndex: 'activity_name',
      width: 180,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text ? `${text} 产品` : '未知产品'}>
          <span
            style={{
              fontSize: '13px',
              fontStyle: 'italic',
              color: '#cbd5e1',
              lineHeight: '1.4',
            }}
          >
            {text ? `${text} 产品` : '未知产品'}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '排放因子值',
      dataIndex: 'value',
      width: 120,
      render: (value: number) => (
        <span
          style={{
            fontWeight: 600,
            color: '#60a5fa',
            fontSize: '13px',
            fontFamily: 'monospace',
          }}
        >
          {value.toFixed(4)}
        </span>
      ),
    },
    {
      title: '单位',
      dataIndex: 'denominator_unit',
      width: 80,
      render: (text: string) => (
        <Tag
          color="green"
          style={{
            backgroundColor: '#16a34a',
            borderColor: '#22c55e',
            color: '#ffffff',
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: 4,
          }}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: '地理代表性',
      dataIndex: 'geo_representative',
      width: 100,
      render: (text: string) => (
        <Tag
          color="orange"
          style={{
            backgroundColor: '#ea580c',
            borderColor: '#f97316',
            color: '#ffffff',
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: 4,
          }}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'time_representative',
      width: 80,
      render: (text: string) => (
        <Tag
          color="purple"
          style={{
            backgroundColor: '#9333ea',
            borderColor: '#a855f7',
            color: '#ffffff',
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: 4,
          }}
        >
          {text}
        </Tag>
      ),
    },
    {
      title: '匹配度',
      dataIndex: 'score',
      width: 80,
      render: (score?: number) =>
        score ? (
          <Tag
            color={score > 0.8 ? 'green' : score > 0.6 ? 'orange' : 'red'}
            style={{
              backgroundColor: score > 0.8 ? '#16a34a' : score > 0.6 ? '#ea580c' : '#dc2626',
              borderColor: score > 0.8 ? '#22c55e' : score > 0.6 ? '#f97316' : '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              padding: '1px 6px',
              borderRadius: 4,
              fontWeight: 600,
            }}
          >
            {(score * 100).toFixed(0)}%
          </Tag>
        ) : null,
    },
  ];

  return (
    <Modal
      title={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            color: '#ffffff',
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SearchOutlined style={{ color: '#fff', fontSize: 16 }} />
          </div>
          <span>选择排放因子</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1400}
      footer={[
        <Button
          key="cancel"
          onClick={onCancel}
          style={{
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(71, 85, 105, 0.6)',
            color: '#e2e8f0',
            backdropFilter: 'blur(10px)',
          }}
        >
          取消
        </Button>,
        <Button
          key="ok"
          type="primary"
          onClick={() => onOk(factors.find((f) => f.emission_factor_id === selectedId) || null)}
          disabled={!selectedId}
          style={{
            background: selectedId ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : 'rgba(30, 41, 59, 0.6)',
            border: 'none',
            color: '#ffffff',
            fontWeight: 600,
          }}
        >
          确定
        </Button>,
      ]}
      destroyOnClose
      style={{
        top: 20,
      }}
      styles={{
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
        content: {
          background: '#0f172a',
          borderRadius: 16,
          padding: 0,
          overflow: 'hidden',
          border: '1px solid rgba(30, 41, 59, 0.6)',
        },
        header: {
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderBottom: '1px solid rgba(30, 41, 59, 0.6)',
          borderRadius: '16px 16px 0 0',
          padding: '20px 24px',
        },
        body: {
          padding: '24px',
          background: 'transparent',
        },
        footer: {
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid rgba(30, 41, 59, 0.6)',
          padding: '16px 24px',
        },
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.4)',
            backdropFilter: 'blur(20px)',
            borderRadius: 12,
            padding: '20px',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Form form={form} layout="inline" style={{ gap: 16 }}>
            <Form.Item
              name="name"
              label={<span style={{ color: '#f1f5f9', fontWeight: 500 }}>数据库名称</span>}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="数据库名称"
                allowClear
                style={{
                  width: 140,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                }}
              />
            </Form.Item>
            <Form.Item
              name="uuid"
              label={<span style={{ color: '#f1f5f9', fontWeight: 500 }}>UUID</span>}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="UUID"
                allowClear
                style={{
                  width: 120,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                }}
              />
            </Form.Item>
            <Form.Item
              name="activity_name"
              label={<span style={{ color: '#f1f5f9', fontWeight: 500 }}>因子活动名称</span>}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="因子活动名称"
                allowClear
                style={{
                  width: 180,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                }}
                onPressEnter={handleSearch}
              />
            </Form.Item>
            <Form.Item
              name="product_name"
              label={<span style={{ color: '#f1f5f9', fontWeight: 500 }}>因子产品名称</span>}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="因子产品名称"
                allowClear
                style={{
                  width: 180,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                }}
              />
            </Form.Item>
            <Form.Item
              name="geo_representative"
              label={<span style={{ color: '#f1f5f9', fontWeight: 500 }}>地理代表性</span>}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="地理代表性"
                allowClear
                style={{
                  width: 100,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                }}
              />
            </Form.Item>
            <Form.Item
              name="time_representative"
              label={<span style={{ color: '#f1f5f9', fontWeight: 500 }}>发布时间</span>}
              style={{ marginBottom: 16 }}
            >
              <Input
                placeholder="发布时间"
                allowClear
                style={{
                  width: 80,
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  borderRadius: 8,
                  color: '#e2e8f0',
                }}
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 32,
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
                }}
              >
                查询
              </Button>
            </Form.Item>
            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
                style={{
                  background: 'rgba(30, 41, 59, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.6)',
                  color: '#e2e8f0',
                  borderRadius: 8,
                  height: 32,
                }}
              >
                重置
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>

      <Spin spinning={loading} tip="正在搜索排放因子...">
        {!searchPerformed ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#f1f5f9',
              background: 'rgba(30, 41, 59, 0.4)',
              borderRadius: 16,
              border: '1px solid rgba(71, 85, 105, 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(71, 85, 105, 0.4)',
              }}
            >
              <SearchOutlined style={{ fontSize: 32, color: 'rgba(241, 245, 249, 0.6)' }} />
            </div>
            <div style={{ fontSize: 18, marginBottom: 12, fontWeight: 600, lineHeight: '1.5' }}>
              请输入搜索条件开始查询
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, lineHeight: '1.5' }}>
              建议使用因子活动名称搜索，支持中文和英文关键词
            </div>
          </div>
        ) : factors.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              color: '#f1f5f9',
              background: 'rgba(30, 41, 59, 0.4)',
              borderRadius: 16,
              border: '1px solid rgba(71, 85, 105, 0.3)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              style={{
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: '50%',
                width: 80,
                height: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(71, 85, 105, 0.4)',
              }}
            >
              <SearchOutlined style={{ fontSize: 32, color: 'rgba(241, 245, 249, 0.4)' }} />
            </div>
            <div style={{ fontSize: 18, marginBottom: 12, fontWeight: 600, lineHeight: '1.5' }}>
              未找到匹配的排放因子
            </div>
            <div style={{ fontSize: 14, opacity: 0.8, lineHeight: '1.5' }}>请尝试使用其他关键词或简化搜索条件</div>
          </div>
        ) : (
          <>
            <div
              style={{
                marginBottom: 16,
                color: '#f1f5f9',
                fontSize: 14,
                background: 'rgba(30, 41, 59, 0.4)',
                padding: '12px 16px',
                borderRadius: 8,
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(71, 85, 105, 0.3)',
                lineHeight: '1.5',
              }}
            >
              共找到 <strong style={{ color: '#60a5fa', fontSize: 16 }}>{factors.length}</strong>{' '}
              个排放因子，按匹配度排序
            </div>
            <Table
              rowKey="emission_factor_id"
              columns={columns}
              dataSource={factors}
              pagination={{
                pageSize: 10,
                showSizeChanger: false,
                showQuickJumper: true,
                showTotal: (total, range) => (
                  <span style={{ color: '#e2e8f0', fontSize: '13px' }}>
                    第 {range[0]}-{range[1]} 条，共 {total} 条
                  </span>
                ),
                style: {
                  background: 'rgba(30, 41, 59, 0.6)',
                  borderRadius: 8,
                  padding: '8px 16px',
                  marginTop: 16,
                },
              }}
              rowSelection={{
                type: 'radio',
                selectedRowKeys: selectedId ? [selectedId] : [],
                onChange: (selectedRowKeys) => setSelectedId(selectedRowKeys[0] as string),
              }}
              scroll={{ x: 1200, y: 400 }}
              bordered
              size="small"
              style={{
                background: 'rgba(30, 41, 59, 0.4)',
                borderRadius: 12,
                overflow: 'hidden',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(71, 85, 105, 0.4)',
              }}
              components={{
                header: {
                  cell: (props: any) => (
                    <th
                      {...props}
                      style={{
                        ...props.style,
                        background: 'rgba(15, 23, 42, 0.8)',
                        color: '#f1f5f9',
                        fontWeight: 600,
                        borderBottom: '1px solid rgba(71, 85, 105, 0.4)',
                        fontSize: '13px',
                        padding: '12px 8px',
                      }}
                    />
                  ),
                },
                body: {
                  row: (props: any) => (
                    <tr
                      {...props}
                      style={{
                        ...props.style,
                        background: props.className?.includes('ant-table-row-selected')
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'rgba(30, 41, 59, 0.3)',
                        color: '#f1f5f9',
                      }}
                    />
                  ),
                  cell: (props: any) => (
                    <td
                      {...props}
                      style={{
                        ...props.style,
                        borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
                        color: '#f1f5f9',
                        padding: '10px 8px',
                      }}
                    />
                  ),
                },
              }}
            />
          </>
        )}
      </Spin>
    </Modal>
  );
};

export default FactorSelectModal;
