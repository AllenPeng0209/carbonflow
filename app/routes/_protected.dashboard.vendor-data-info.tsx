import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/dashboard/ui/select';
import { Input } from '~/components/dashboard/ui/input';
import { Button } from '~/components/dashboard/ui/button';
import { Alert, AlertDescription } from '~/components/dashboard/ui/alert';
import { Loader2, Database, Search, RotateCcw, FileText, ExternalLink } from 'lucide-react';
import { Link, useLoaderData, useFetcher, useNavigation, json } from '@remix-run/react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/dashboard/ui/alert-dialog';

import type { VendorData } from '~/lib/persistence/vendor-data';
import { fetchVendorData, updateVendorDataStatus } from '~/lib/persistence/vendor-data';

// Dialog component for confirming closure
function CloseDialog({
  open,
  onOpenChange,
  onConfirm,
  backgroundColor = 'bg-white',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  backgroundColor?: string;
}) {
  if (!open) {
    return null;
  }

  return (
    <dialog open={open} className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${backgroundColor}`}>
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">确认关闭</h2>
        <p className="mb-6">确定要关闭此数据吗？关闭后供应商将无法提交数据。</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            确认
          </Button>
        </div>
      </div>
    </dialog>
  );
}

// Define types for our loader data
interface LoaderData {
  vendorData: VendorData[];
  error: string | null;
}

// Define types for our action data
interface ActionData {
  success: boolean;
  error?: string;
  vendorData?: VendorData;
}

// Server-side loader function to fetch vendor data
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data, error } = await fetchVendorData();

    if (error) {
      return json<LoaderData>({
        vendorData: [],
        error: `Error loading vendor data: ${error.message}`,
      });
    }

    return json<LoaderData>({
      vendorData: data || [],
      error: null,
    });
  } catch (error) {
    return json<LoaderData>({
      vendorData: [],
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// Server-side action function to handle mutations
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    switch (intent) {
      case 'close': {
        const id = Number(formData.get('id'));
        const { data, error } = await updateVendorDataStatus(id, '已关闭');

        if (error) {
          return json<ActionData>({
            success: false,
            error: `Failed to close vendor data: ${error.message}`,
          });
        }

        if (!data) {
          return json<ActionData>({
            success: false,
            error: 'No data returned after update',
          });
        }

        return json<ActionData>({
          success: true,
          vendorData: data,
        });
      }

      default:
        return json<ActionData>({
          success: false,
          error: `Unknown action: ${intent}`,
        });
    }
  } catch (error) {
    return json<ActionData>({
      success: false,
      error: `Action error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export default function VendorDataInfo() {
  // Use Remix hooks instead of custom hooks
  const { vendorData, error: dbError } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();

  const isLoading = navigation.state === 'loading';

  // Local state for UI
  const [filteredVendorData, setFilteredVendorData] = useState<VendorData[]>(vendorData);
  const [dataTypeFilter, setDataTypeFilter] = useState<string>('');
  const [vendorNameFilter, setVendorNameFilter] = useState<string>('');

  // Update filtered data when vendorData changes
  useEffect(() => {
    if (vendorData) {
      applyFilters();
    }
  }, [vendorData, dataTypeFilter, vendorNameFilter]);

  const applyFilters = () => {
    let filtered = [...vendorData];

    if (dataTypeFilter && dataTypeFilter !== 'all') {
      filtered = filtered.filter((v) => v.dataType === dataTypeFilter);
    }

    if (vendorNameFilter) {
      filtered = filtered.filter((v) => v.vendorName.includes(vendorNameFilter));
    }

    setFilteredVendorData(filtered);
  };

  const handleFilterChange = () => {
    applyFilters();
  };

  const resetFilters = () => {
    setDataTypeFilter('');
    setVendorNameFilter('');
    setFilteredVendorData(vendorData);
  };

  const handleCloseTask = (id: number) => {
    fetcher.submit(
      {
        intent: 'close-task',
        id: String(id),
      },
      { method: 'post' },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
            <Database className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">供应商数据信息</h1>
            <p className="text-gray-600 mt-1">管理和跟踪供应商数据收集任务</p>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {dbError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>加载供应商数据失败: {dbError}</AlertDescription>
        </Alert>
      )}

      {fetcher.data?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>操作失败: {fetcher.data.error}</AlertDescription>
        </Alert>
      )}

      {/* 主要内容卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* 搜索和筛选区域 */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex items-center gap-3">
                <Search className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">供应商数据类型:</span>
                <Select value={dataTypeFilter} onValueChange={setDataTypeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="供应商因子">供应商因子</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">供应商名称:</span>
                <Input
                  className="w-64"
                  placeholder="请输入供应商名称"
                  value={vendorNameFilter}
                  onChange={(e) => setVendorNameFilter(e.target.value)}
                />
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
            <FileText className="w-4 h-4" /> 共 {filteredVendorData.length} 个数据收集任务
          </div>
        </div>

        {/* 表格区域 */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              <span className="ml-3 text-gray-600">加载供应商数据中...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="border-b border-gray-200">
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">序号</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">供应商数据类型</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">供应商名称</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">截止时间</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">邮箱</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">排放源名称</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">数值</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">单位</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">证明材料</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">数据填报链接</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">状态</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">回复人</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">回复时间</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendorData.map((item, index) => (
                    <TableRow key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="text-center text-gray-600">{index + 1}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.dataType}</TableCell>
                      <TableCell className="text-center font-medium text-gray-900">{item.vendorName}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.deadline}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.email}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.emissionSourceName}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.value || '-'}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.unit || '-'}</TableCell>
                      <TableCell className="text-center">
                        {item.evidenceFile ? (
                          <a 
                            href={item.evidenceFile} 
                            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 justify-center"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="w-3 h-3" />
                            证明材料
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <a
                          href={item.dataSubmissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 justify-center"
                        >
                          <ExternalLink className="w-3 h-3" />
                          数据填报
                        </a>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.status === '已回复' 
                            ? 'bg-green-100 text-green-800' 
                            : item.status === '待回复'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-700">{item.respondent || '-'}</TableCell>
                      <TableCell className="text-center text-gray-700">{item.responseTime || '-'}</TableCell>
                      <TableCell className="text-center">
                        {item.status !== '已关闭' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                关闭任务
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white">
                              <AlertDialogHeader>
                                <AlertDialogTitle>确认关闭任务</AlertDialogTitle>
                                <AlertDialogDescription>
                                  确定要关闭这个数据收集任务吗？关闭后将无法再次打开。
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>取消</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleCloseTask(item.id!)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  确认关闭
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {item.status === '已关闭' && (
                          <span className="text-gray-400 text-xs">已关闭</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVendorData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <Database className="w-12 h-12 text-gray-300" />
                          <span>暂无供应商数据任务</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
