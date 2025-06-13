import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/dashboard/ui/select';
import { Input } from '~/components/dashboard/ui/input';
import { Button } from '~/components/dashboard/ui/button';
import { Badge } from '~/components/ui/Badge';
import { Search, RotateCcw, Eye, Download, Star, Calendar, Shield, BookOpen } from 'lucide-react';

interface PolicyItem {
  id: number;
  title: string;
  summary: string;
  category_id: number;
  knowledge_type: string;
  created_at: string;
  updated_at: string;
  category: {
    id: number;
    name: string;
  };
  tags: Array<{
    id: number;
    name: string;
  }>;
  views?: number;
  rating?: number;
}

const PolicyKnowledgeSection: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // 模拟政策法规数据
  const policyItems: PolicyItem[] = [
    {
      id: 1,
      title: '国家碳排放权交易管理办法（试行）',
      summary: '规定了碳排放权交易的范围、配额分配、交易流程和监管要求等内容',
      category_id: 1,
      knowledge_type: '法规',
      created_at: '2023-06-10',
      updated_at: '2023-06-10',
      category: {
        id: 1,
        name: '碳交易',
      },
      tags: [
        { id: 1, name: '碳交易' },
        { id: 2, name: '国家政策' },
      ],
      views: 1256,
      rating: 4.8,
    },
    {
      id: 2,
      title: '工业企业碳排放数据核算与报告指南',
      summary: '详细规定了工业企业碳排放数据的核算方法、报告格式和要求',
      category_id: 2,
      knowledge_type: '指南',
      created_at: '2023-05-20',
      updated_at: '2023-05-25',
      category: {
        id: 2,
        name: '核算方法',
      },
      tags: [
        { id: 3, name: '数据核算' },
        { id: 4, name: '工业企业' },
        { id: 5, name: '报告指南' },
      ],
      views: 892,
      rating: 4.6,
    },
    {
      id: 3,
      title: '企业环境信息依法披露管理办法',
      summary: '规定了企业环境信息公开的范围、方式、内容和法律责任',
      category_id: 3,
      knowledge_type: '法规',
      created_at: '2023-04-15',
      updated_at: '2023-04-18',
      category: {
        id: 3,
        name: '信息披露',
      },
      tags: [
        { id: 6, name: '环境信息' },
        { id: 7, name: '信息披露' },
        { id: 8, name: '法规' },
      ],
      views: 634,
      rating: 4.4,
    },
  ];

  const [filteredItems, setFilteredItems] = useState<PolicyItem[]>(policyItems);

  const applyFilters = () => {
    let filtered = [...policyItems];

    if (searchText) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(searchText.toLowerCase()) ||
          item.summary.toLowerCase().includes(searchText.toLowerCase()),
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter((item) => item.category.name === categoryFilter);
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
    setCategoryFilter('');
    setTypeFilter('');
    setFilteredItems(policyItems);
  };

  const handleView = (id: number) => {
    console.log('查看政策:', id);
  };

  const handleDownload = (id: number) => {
    console.log('下载政策:', id);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">政策法规知识库</h1>
            <p className="text-gray-600 mt-1">查阅最新的碳排放相关政策法规和指导文件</p>
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
                  placeholder="请输入政策名称或关键词"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">政策分类:</span>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="碳交易">碳交易</SelectItem>
                    <SelectItem value="核算方法">核算方法</SelectItem>
                    <SelectItem value="信息披露">信息披露</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">文档类型:</span>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="法规">法规</SelectItem>
                    <SelectItem value="指南">指南</SelectItem>
                    <SelectItem value="通知">通知</SelectItem>
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
            <BookOpen className="w-4 h-4" /> 共 {filteredItems.length} 个政策法规文档
          </div>
        </div>

        {/* 表格区域 */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">序号</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">政策标题</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">政策摘要</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">分类</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">类型</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">标签</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">浏览量</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">评分</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">发布时间</TableHead>
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
                        {item.category.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          item.knowledge_type === '法规'
                            ? 'border-red-200 text-red-700'
                            : 'border-green-200 text-green-700'
                        }
                      >
                        {item.knowledge_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {item.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-xs">
                            {tag.name}
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
                        <Eye className="w-3 h-3" />
                        {item.views || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500" />
                        {item.rating || 0}
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
                    <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Shield className="w-12 h-12 text-gray-300" />
                        <span>暂无政策法规数据</span>
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

export default PolicyKnowledgeSection;
