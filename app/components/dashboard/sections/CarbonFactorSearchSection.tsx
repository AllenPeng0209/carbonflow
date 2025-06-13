import React from 'react';
import {
  Typography,
  Input,
  Select,
  Table,
  Tag,
  Button,
  Space,
  Modal,
  Form,
  message,
  Progress,
  Empty,
  Tooltip,
  Descriptions,
} from 'antd';
import { InfoCircleOutlined, StarOutlined, StarFilled, CopyOutlined, ReloadOutlined } from '@ant-design/icons';
import { Search, Database } from 'lucide-react';
import './CarbonFactorSearchSection.css';
import copy from 'copy-to-clipboard';
import type { CarbonFactor } from '~/types/carbonfactor';

const { Title, Text } = Typography;

// API返回的碳因子数据结构
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

// 扩展的碳因子接口，用于显示
interface ExtendedCarbonFactor extends CarbonFactor {
  activity_name?: string;
  score?: number;
  industry?: string;
  locationScope?: string;
  updateDate: string;
  reliability: number;
  sourceType: 'database' | 'online';
  region: string;
  year: string;
  description: string;
}

const CarbonFactorSearchSection: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedFactor, setSelectedFactor] = React.useState<ExtendedCarbonFactor | null>(null);
  const [searchText, setSearchText] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [regionFilter, setRegionFilter] = React.useState<string>('all');
  const [searchMode] = React.useState<'offline' | 'online' | 'hybrid'>('online');
  const [loading, setLoading] = React.useState(false);
  const [onlineSearchProgress, setOnlineSearchProgress] = React.useState(0);
  const [onlineSearchMessages, setOnlineSearchMessages] = React.useState<string[]>([]);
  const [yearFilter, setYearFilter] = React.useState<string>('all');
  const [dbFilter, setDbFilter] = React.useState<string>('all');
  const [industryFilter, setIndustryFilter] = React.useState<string>('all');
  const [favorites, setFavorites] = React.useState<string[]>(() =>
    JSON.parse(localStorage.getItem('carbonFactorFavorites') || '[]'),
  );
  const [tablePage, setTablePage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // API数据状态
  const [apiData, setApiData] = React.useState<ExtendedCarbonFactor[]>([]);
  const [searchPerformed, setSearchPerformed] = React.useState(false);

  // 从API获取碳因子数据
  const fetchCarbonFactors = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    try {
      const requestBody = {
        labels: [searchQuery],
        top_k: 200,
        min_score: 0.05,
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
        const convertedFactors: ExtendedCarbonFactor[] = matches.map((match, index) => {
          // 从数据源推断行业类别
          const inferIndustry = (dataSource: string, activityName: string) => {
            const source = dataSource.toLowerCase();
            const activity = activityName.toLowerCase();

            if (source.includes('electricity') || activity.includes('electricity') || activity.includes('power')) {
              return '电力';
            }

            if (source.includes('transport') || activity.includes('transport') || activity.includes('vehicle')) {
              return '运输';
            }

            if (source.includes('chemical') || activity.includes('chemical')) {
              return '化工';
            }

            if (source.includes('construction') || activity.includes('building') || activity.includes('concrete')) {
              return '建筑';
            }

            if (source.includes('energy') || activity.includes('energy') || activity.includes('fuel')) {
              return '能源';
            }

            return '其他';
          };

          // 从地理位置推断区域
          const inferRegion = (geography: string) => {
            const geo = geography.toLowerCase();

            if (geo.includes('cn') || geo.includes('china') || geo.includes('中国')) {
              return '中国';
            }

            if (geo.includes('us') || geo.includes('usa') || geo.includes('america')) {
              return '美国';
            }

            if (geo.includes('eu') || geo.includes('europe')) {
              return '欧盟';
            }

            if (geo.includes('glo') || geo.includes('global') || geo.includes('world')) {
              return '全球';
            }

            return geography || '未知';
          };

          // 从导入日期推断年份
          const inferYear = (importDate: string) => {
            if (importDate) {
              const year = importDate.split('-')[0];

              return year || '未知';
            }

            return '未知';
          };

          return {
            emission_factor_id: match.activity_uuid_product_uuid || `factor-${index}`,
            name: match.activity_name || '未知活动',
            uuid: match.activity_uuid_product_uuid || `uuid-${index}`,
            value: match.kg_co2eq,
            geo_representative: match.geography || '未知',
            time_representative: inferYear(match.import_date),
            numerator_unit: 'kgCO2e',
            denominator_unit: match.reference_product_unit || 'unit',
            source: match.data_source || '未知数据源',
            category: inferIndustry(match.data_source || '', match.activity_name || ''),
            activity_name: match.activity_name,
            score: match.score,
            industry: inferIndustry(match.data_source || '', match.activity_name || ''),
            locationScope: '全球',
            updateDate: match.import_date || '2024-01-01',
            reliability: match.score ? Math.min(5, match.score * 5) : 3,
            sourceType: 'database' as const,
            region: inferRegion(match.geography || ''),
            year: inferYear(match.import_date),
            description: `${match.activity_name || '排放因子'} - 来源: ${match.data_source || '未知'}, 地理范围: ${match.geography || '未知'}`,
          };
        });

        setApiData(convertedFactors);
        setSearchPerformed(true);
        setOnlineSearchProgress(100);
        setOnlineSearchMessages((prev) => [...prev, `搜索完成，找到 ${convertedFactors.length} 个结果`]);
        message.success(`找到 ${convertedFactors.length} 个匹配的排放因子`);
      } else {
        setApiData([]);
        setSearchPerformed(true);
        setOnlineSearchProgress(100);
        setOnlineSearchMessages((prev) => [...prev, '未找到匹配结果']);
        message.info('未找到匹配的排放因子，请尝试其他关键词');
      }
    } catch (error) {
      console.error('获取碳因子数据失败:', error);
      message.error('获取数据失败，请稍后重试');
      setApiData([]);
      setOnlineSearchProgress(0);
      setOnlineSearchMessages((prev) => [...prev, '搜索失败，请重试']);
    } finally {
      setLoading(false);

      // 3秒后清除进度信息
      setTimeout(() => {
        setOnlineSearchProgress(0);
        setOnlineSearchMessages([]);
      }, 3000);
    }
  };

  const columns = [
    {
      title: '活动名称',
      dataIndex: 'name',
      key: 'name',
      width: 250,
      fixed: 'left' as const,
      render: (text: string, record: ExtendedCarbonFactor) => (
        <div style={{ fontWeight: 500 }}>
          {text}
          {record.score && (
            <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
              匹配度: {(record.score * 100).toFixed(1)}%
            </div>
          )}
        </div>
      ),
    },
    {
      title: '数值',
      dataIndex: 'value',
      key: 'value',
      width: 120,
      align: 'right' as const,
      sorter: (a: ExtendedCarbonFactor, b: ExtendedCarbonFactor) => a.value - b.value,
      render: (value: number) => <Text strong>{value.toFixed(4)}</Text>,
    },
    {
      title: '单位',
      dataIndex: 'denominator_unit',
      key: 'unit',
      width: 100,
      render: (unit: string) => `kgCO2e/${unit}`,
    },
    {
      title: '数据来源',
      dataIndex: 'source',
      key: 'source',
      width: 150,
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: '行业',
      dataIndex: 'industry',
      key: 'industry',
      width: 120,
    },
    {
      title: '地理位置',
      dataIndex: 'region',
      key: 'region',
      width: 120,
    },
    {
      title: '年份',
      dataIndex: 'year',
      key: 'year',
      width: 100,
      align: 'center' as const,
      sorter: (a: ExtendedCarbonFactor, b: ExtendedCarbonFactor) => parseInt(a.year) - parseInt(b.year),
    },
    {
      title: '查看描述',
      key: 'viewDesc',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: ExtendedCarbonFactor) => (
        <Tooltip
          title={record.description}
          color="#1a365d"
          placement="top"
          overlayStyle={{ maxWidth: 350 }}
          overlayInnerStyle={{ padding: '12px 16px', fontSize: '14px', lineHeight: '1.6' }}
        >
          <InfoCircleOutlined
            style={{ color: '#1890ff', fontSize: '16px', cursor: 'pointer' }}
            className="description-icon"
            onClick={() => {
              setSelectedFactor(record);
              setIsModalVisible(true);
            }}
          />
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: ExtendedCarbonFactor) => (
        <Space size="small">
          <Tooltip title="复制信息">
            <Button className="copy-btn" size="small" icon={<CopyOutlined />} onClick={() => handleCopy(record)} />
          </Tooltip>
          <Tooltip title={isFavorited(record) ? '取消收藏' : '收藏'}>
            <Button
              size="small"
              type="text"
              icon={isFavorited(record) ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
              onClick={() => toggleFavorite(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleCopy = (factor: ExtendedCarbonFactor) => {
    const text = `名称: ${factor.name}\n数值: ${factor.value} kgCO2e/${factor.denominator_unit}\n地理位置: ${factor.region}\n行业: ${factor.industry}\n数据来源: ${factor.source}\n年份: ${factor.year}`;
    copy(text);

    message.success({
      content: (
        <span className="carbon-copy-success">
          <span style={{ marginRight: 8 }}>✓</span>
          已复制 <b>{factor.name}</b> 的信息到剪贴板
        </span>
      ),
      duration: 3,
    });
  };

  const isFavorited = (factor: ExtendedCarbonFactor) => favorites.includes(factor.emission_factor_id);

  const toggleFavorite = (factor: ExtendedCarbonFactor) => {
    let newFavs;

    if (isFavorited(factor)) {
      newFavs = favorites.filter((id) => id !== factor.emission_factor_id);
    } else {
      newFavs = [...favorites, factor.emission_factor_id];
    }

    setFavorites(newFavs);
    localStorage.setItem('carbonFactorFavorites', JSON.stringify(newFavs));
  };

  const handleReset = () => {
    setSearchText('');
    setCategoryFilter('all');
    setRegionFilter('all');
    setYearFilter('all');
    setDbFilter('all');
    setIndustryFilter('all');
    setTablePage(1);
    setApiData([]);
    setSearchPerformed(false);
  };

  const filteredData = apiData.filter((factor) => {
    const matchesCategory = categoryFilter === 'all' || factor.category === categoryFilter;

    // 支持多选的地理位置筛选
    const matchesRegion = regionFilter === 'all' || regionFilter.split(',').includes(factor.region);

    // 支持多选的年份筛选
    const matchesYear = yearFilter === 'all' || yearFilter.split(',').includes(factor.year);

    // 支持多选的数据库筛选
    const matchesDb = dbFilter === 'all' || dbFilter.split(',').includes(factor.source || '');

    // 支持多选的行业筛选
    const matchesIndustry = industryFilter === 'all' || industryFilter.split(',').includes(factor.industry || '');

    return matchesCategory && matchesRegion && matchesYear && matchesDb && matchesIndustry;
  });

  const handleHeroSearch = () => {
    if (!searchText.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);

    if (searchMode === 'online' || searchMode === 'hybrid') {
      fetchCarbonFactors(searchText);
    } else {
      setSearchPerformed(true);
      setLoading(false);
    }
  };

  const handleSearch = () => {
    handleHeroSearch();
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="text-2xl text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">碳排放因子智能搜索</h1>
              <p className="text-gray-600">搜索和查找碳排放因子数据</p>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>共 {filteredData.length} 个结果</span>
          <span>•</span>
          <span>当前第 {tablePage} 页</span>
          {searchText && (
            <>
              <span>•</span>
              <span>搜索关键词: "{searchText}"</span>
            </>
          )}
        </div>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                size="large"
                placeholder="请输入因子名称、关键词或描述"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                className="pl-10 h-12 border-gray-300 focus:border-green-500 focus:ring-green-500"
              />
            </div>
            <Button
              type="primary"
              size="large"
              onClick={handleSearch}
              loading={loading}
              className="h-12 px-8 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
            >
              搜索
            </Button>
          </div>

          {/* 在线搜索进度 */}
          {loading && (searchMode === 'online' || searchMode === 'hybrid') && (
            <div
              style={{
                marginTop: '16px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                padding: '12px',
                borderRadius: '8px',
              }}
            >
              <Progress
                percent={onlineSearchProgress}
                status="active"
                strokeColor="#52c41a"
                style={{ marginBottom: '8px' }}
              />
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                {onlineSearchMessages[onlineSearchMessages.length - 1] || '搜索中...'}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm">热门搜索：</span>
            {['电力', '能源', '交通', '建筑', 'IPCC', 'ecoinvent'].map((tag) => (
              <Tag
                key={tag}
                className="cursor-pointer hover:bg-green-50 hover:border-green-300"
                onClick={() => {
                  setSearchText(tag);
                  handleSearch();
                }}
              >
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      </div>

      {/* 筛选和结果区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 筛选侧边栏 */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">筛选条件</h3>
              <Button type="text" icon={<ReloadOutlined />} onClick={handleReset} size="small">
                重置
              </Button>
            </div>

            <Form layout="vertical" className="space-y-4">
              <Form.Item label="数据来源">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请选择数据来源"
                  value={dbFilter === 'all' ? [] : dbFilter.split(',')}
                  onChange={(vals) => setDbFilter(vals.length === 0 ? 'all' : vals.join(','))}
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={[
                    { label: 'IPCC', value: 'IPCC 2019' },
                    { label: 'ecoinvent', value: 'ecoinvent' },
                    { label: '生态环境部', value: '生态环境部' },
                    { label: '行业数据库', value: '行业数据库' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="行业分类">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请选择行业"
                  value={industryFilter === 'all' ? [] : industryFilter.split(',')}
                  onChange={(vals) => setIndustryFilter(vals.length === 0 ? 'all' : vals.join(','))}
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={[
                    { label: '电力', value: '电力' },
                    { label: '能源', value: '能源' },
                    { label: '化工', value: '化工' },
                    { label: '建筑', value: '建筑' },
                    { label: '运输', value: '运输' },
                    { label: '其他', value: '其他' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="地理位置">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请选择地区"
                  value={regionFilter === 'all' ? [] : regionFilter.split(',')}
                  onChange={(vals) => setRegionFilter(vals.length === 0 ? 'all' : vals.join(','))}
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={[
                    { label: '中国', value: '中国' },
                    { label: '美国', value: '美国' },
                    { label: '欧盟', value: '欧盟' },
                    { label: '全球', value: '全球' },
                  ]}
                />
              </Form.Item>

              <Form.Item label="年份">
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="请选择年份"
                  value={yearFilter === 'all' ? [] : yearFilter.split(',')}
                  onChange={(vals) => setYearFilter(vals.length === 0 ? 'all' : vals.join(','))}
                  optionFilterProp="label"
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                  options={[
                    { label: '2024', value: '2024' },
                    { label: '2023', value: '2023' },
                    { label: '2022', value: '2022' },
                    { label: '2021', value: '2021' },
                    { label: '2020', value: '2020' },
                  ]}
                />
              </Form.Item>
            </Form>
          </div>
        </div>

        {/* 结果表格 */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-gray-900">
                  {searchText
                    ? `"${searchText}" - 匹配到 ${filteredData.length} 条结果`
                    : `匹配到 ${filteredData.length} 条结果`}
                  {searchMode !== 'offline' && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({searchMode === 'online' ? '在线数据' : '混合数据'})
                    </span>
                  )}
                </div>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重置筛选
                </Button>
              </div>
            </div>

            <div className="overflow-hidden">
              <Table
                columns={columns}
                dataSource={filteredData}
                rowKey="emission_factor_id"
                scroll={{ x: 1200 }}
                loading={loading}
                pagination={{
                  total: filteredData.length,
                  pageSize,
                  current: tablePage,
                  showTotal: (total, range) => `${range[0]}-${range[1]} 共 ${total} 条`,
                  onChange: (page, size) => {
                    setTablePage(page);

                    if (size) {
                      setPageSize(size);
                    }
                  },
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  style: {
                    padding: '16px 24px',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                    margin: 0,
                  },
                  itemRender: (page, type, originalElement) => {
                    if (type === 'prev') {
                      return <span style={{ color: '#374151' }}>上一页</span>;
                    }

                    if (type === 'next') {
                      return <span style={{ color: '#374151' }}>下一页</span>;
                    }

                    return originalElement;
                  },
                }}
                locale={{
                  emptyText:
                    searchPerformed && searchMode !== 'offline' ? (
                      <Empty description="未找到符合条件的碳排放因子，请调整搜索条件或尝试其他关键词" />
                    ) : (
                      <Empty description="请输入搜索关键词开始搜索" />
                    ),
                }}
                size="middle"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 详情弹窗 */}
      <Modal title="因子详情" open={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null} width={600}>
        {selectedFactor && (
          <div>
            <div
              style={{
                background: '#f5f5f5',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '24px',
              }}
            >
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                {selectedFactor.value.toFixed(4)}
                <Text type="secondary" style={{ fontSize: '14px', marginLeft: '8px' }}>
                  kgCO2e/{selectedFactor.denominator_unit}
                </Text>
              </Title>
              <Text type="secondary">碳排放因子值</Text>
              {selectedFactor.score && (
                <div style={{ marginTop: '8px' }}>
                  <Tag color="green">匹配度: {(selectedFactor.score * 100).toFixed(1)}%</Tag>
                </div>
              )}
            </div>
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="排放因子">{selectedFactor.name}</Descriptions.Item>
              <Descriptions.Item label="活动名称">
                {selectedFactor.activity_name || selectedFactor.name}
              </Descriptions.Item>
              <Descriptions.Item label="描述">{selectedFactor.description}</Descriptions.Item>
              <Descriptions.Item label="数据来源">{selectedFactor.source}</Descriptions.Item>
              <Descriptions.Item label="行业">{selectedFactor.industry}</Descriptions.Item>
              <Descriptions.Item label="地理代表性">{selectedFactor.geo_representative}</Descriptions.Item>
              <Descriptions.Item label="时间代表性">{selectedFactor.time_representative}</Descriptions.Item>
              <Descriptions.Item label="UUID">{selectedFactor.uuid}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CarbonFactorSearchSection;
