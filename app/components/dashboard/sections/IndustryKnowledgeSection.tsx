import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/dashboard/ui/select';
import { Input } from '~/components/dashboard/ui/input';
import { Button } from '~/components/dashboard/ui/button';
import { Badge } from '~/components/ui/Badge';
import { Factory, Search, RotateCcw, Eye, Download, Star, Calendar, User, BookOpen } from 'lucide-react';

interface KnowledgeItem {
  id: string;
  title: string;
  summary: string;
  category_id: string;
  knowledge_type: string;
  industry: string;
  author: string;
  source: string;
  views: number;
  rating: number;
  created_at: string;
  updated_at: string;
  category: string;
  tags: string[];
}

const IndustryKnowledgeSection: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // 模拟行业知识库数据
  const knowledgeItems: KnowledgeItem[] = [
    {
      id: '1',
      title: '钢铁行业碳排放核算指南',
      summary: '本指南详细介绍了钢铁行业碳排放核算的方法、数据收集要求及报告规范，适用于钢铁企业进行碳排放核算工作。',
      category_id: '1',
      knowledge_type: 'guide',
      industry: 'steel',
      author: '行业专家',
      source: '行业协会',
      views: 1234,
      rating: 4.8,
      created_at: '2024-01-15',
      updated_at: '2024-01-15',
      category: '核算指南',
      tags: ['钢铁', '碳排放', '核算方法'],
    },
    {
      id: '2',
      title: '水泥行业减排技术分析报告',
      summary: '报告分析了水泥行业主要减排技术路线，包括能源替代、工艺优化、碳捕集等，并提供了具体实施建议。',
      category_id: '2',
      knowledge_type: 'report',
      industry: 'cement',
      author: '研究机构',
      source: '行业研究',
      views: 856,
      rating: 4.5,
      created_at: '2024-01-10',
      updated_at: '2024-01-10',
      category: '技术分析',
      tags: ['水泥', '减排技术', '碳捕集'],
    },
  ];

  const [filteredItems, setFilteredItems] = useState<KnowledgeItem[]>(knowledgeItems);

  const industries = [
    { value: 'steel', label: '钢铁行业' },
    { value: 'cement', label: '水泥行业' },
    { value: 'power', label: '电力行业' },
    { value: 'chemical', label: '化工行业' },
  ];

  const knowledgeTypes = [
    { value: 'guide', label: '核算指南' },
    { value: 'report', label: '研究报告' },
    { value: 'case', label: '案例分享' },
    { value: 'policy', label: '政策解读' },
  ];

  const applyFilters = () => {
    let filtered = [...knowledgeItems];

    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchText.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (industryFilter && industryFilter !== 'all') {
      filtered = filtered.filter((item) => item.industry === industryFilter);
    }

    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter((item) => item.knowledge_type === typeFilter);
    }

    setFilteredItems(filtered);
  };

  const handleFilterChange = () => {
    applyFilters();
  };

  const resetFilters = () => {
    setSearchText('');
    setIndustryFilter('');
    setTypeFilter('');
    setFilteredItems(knowledgeItems);
  };

  const handleView = (id: string) => {
    console.log('查看知识:', id);
  };

  const handleDownload = (id: string) => {
    console.log('下载知识:', id);
  };

  const getIndustryLabel = (value: string) => {
    return industries.find((item) => item.value === value)?.label || value;
  };

  const getTypeLabel = (value: string) => {
    return knowledgeTypes.find((item) => item.value === value)?.label || value;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
            <Factory className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">行业知识库</h1>
            <p className="text-gray-600 mt-1">各行业碳管理标准、技术和最佳实践</p>
          </div>
        </div>
      </div>

      {/* 主要内容卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* 搜索和筛选区域 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">关键词搜索:</span>
                <Input
                  className="w-64"
                  placeholder="请输入知识标题或关键词"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">行业分类:</span>
                <Select value={industryFilter} onValueChange={setIndustryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="请选择行业" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部行业</SelectItem>
                    {industries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">知识类型:</span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部</SelectItem>
                    {knowledgeTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleFilterChange} className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                查询
              </Button>
              <Button variant="outline" onClick={resetFilters} className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                重置
              </Button>
            </div>
          </div>
        </div>

        {/* 统计信息区域 */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <BookOpen className="w-4 h-4" /> 共 {filteredItems.length} 个行业知识文档
          </div>
        </div>

        {/* 表格区域 */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">序号</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">知识标题</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">知识摘要</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">分类</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">行业</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">类型</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">标签</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">作者</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">浏览量</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">评分</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">创建时间</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item, index) => (
                  <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell className="text-center text-gray-600">{index + 1}</TableCell>
                    <TableCell className="text-center font-medium text-gray-900 max-w-xs">
                      <div className="truncate" title={item.title}>
                        {item.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700 max-w-md">
                      <div className="truncate" title={item.summary}>
                        {item.summary}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="border-purple-200 text-purple-700">
                        {getIndustryLabel(item.industry)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.knowledge_type === 'guide'
                            ? 'border-green-200 text-green-700'
                            : 'border-orange-200 text-orange-700'
                        }
                      >
                        {getTypeLabel(item.knowledge_type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {item.tags.slice(0, 2).map((tag, tagIndex) => (
                          <Badge key={tagIndex} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{item.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <User className="w-3 h-3" />
                        {item.author}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" />
                        {item.views}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {item.rating}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {item.created_at}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button size="sm" variant="outline" onClick={() => handleView(item.id)} className="text-xs">
                          <Eye className="w-3 h-3 mr-1" />
                          查看
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(item.id)} className="text-xs">
                          <Download className="w-3 h-3 mr-1" />
                          下载
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Factory className="w-12 h-12 text-gray-300" />
                        <span>暂无行业知识数据</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndustryKnowledgeSection;
