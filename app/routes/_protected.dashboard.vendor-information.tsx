import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/dashboard/ui/select';
import { Input } from '~/components/dashboard/ui/input';
import { Button } from '~/components/dashboard/ui/button';
import { Alert, AlertDescription } from '~/components/dashboard/ui/alert';
import { Loader2, Users, Search, RotateCcw, Plus, Upload, Building2 } from 'lucide-react';
import { Link, useLoaderData, useFetcher, useNavigation, json } from '@remix-run/react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Vendor } from '~/components/dashboard/sections/schema';
import { vendorSchema } from '~/components/dashboard/sections/schema';
import { AddVendorDialog } from '~/components/dashboard/sections/dialogs/AddVendorDialog';
import { EditVendorDialog } from '~/components/dashboard/sections/dialogs/EditVendorDialog';
import { DeleteDialog } from '~/components/dashboard/sections/dialogs/DeleteVendorDialog';
import { StatusDialog } from '~/components/dashboard/sections/dialogs/StatusDialog';
import { ViewVendorDialog } from '~/components/dashboard/sections/dialogs/ViewVendorDialog';
import {
  fetchVendors,
  addVendor as addVendorToDb,
  updateVendor as updateVendorInDb,
  deleteVendor as deleteVendorFromDb,
  updateVendorStatus as updateVendorStatusInDb,
} from '~/lib/persistence/vendor';

// Define types for our loader data
interface LoaderData {
  vendors: Vendor[];
  error: string | null;
}

// Define types for our action data
interface ActionData {
  success: boolean;
  error?: string;
  vendor?: Vendor;
}

// Server-side loader function to fetch vendors
export async function loader({}: LoaderFunctionArgs) {
  try {
    const { data, error } = await fetchVendors();

    if (error) {
      return json<LoaderData>({
        vendors: [],
        error: `Error loading vendors: ${error.message}`,
      });
    }

    return json<LoaderData>({
      vendors: data || [],
      error: null,
    });
  } catch (error) {
    return json<LoaderData>({
      vendors: [],
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// Server-side action function to handle mutations
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    // Handle different actions based on the intent
    switch (intent) {
      case 'add': {
        const vendorData = JSON.parse(formData.get('vendorData') as string);
        const { data, error } = await addVendorToDb(vendorData);

        if (error) {
          return json<ActionData>({
            success: false,
            error: `Failed to add vendor: ${error.message}`,
          });
        }

        return json<ActionData>({
          success: true,
          vendor: data || undefined,
        });
      }

      case 'update': {
        const id = Number(formData.get('id'));
        const vendorData = JSON.parse(formData.get('vendorData') as string);
        const { data, error } = await updateVendorInDb(id, vendorData);

        if (error) {
          return json<ActionData>({
            success: false,
            error: `Failed to update vendor: ${error.message}`,
          });
        }

        return json<ActionData>({
          success: true,
          vendor: data || undefined,
        });
      }

      case 'delete': {
        const id = Number(formData.get('id'));
        const { success, error } = await deleteVendorFromDb(id);

        if (error) {
          return json<ActionData>({
            success: false,
            error: `Failed to delete vendor: ${error.message}`,
          });
        }

        return json<ActionData>({ success });
      }

      case 'toggle-status': {
        const id = Number(formData.get('id'));
        const status = formData.get('status') as '启用' | '禁用';
        const { data, error } = await updateVendorStatusInDb(id, status);

        if (error) {
          return json<ActionData>({
            success: false,
            error: `Failed to update vendor status: ${error.message}`,
          });
        }

        return json<ActionData>({
          success: true,
          vendor: data || undefined,
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

export default function VendorManagement() {
  // Use Remix hooks instead of custom hooks
  const { vendors, error: dbError } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();

  const isLoading = navigation.state === 'loading';

  // Local state for UI
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>(vendors);
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);

  const form = useForm<z.infer<typeof vendorSchema>>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      remarks: '',
      status: '启用',
    },
  });

  // Update filtered vendors when vendors change
  useEffect(() => {
    if (vendors) {
      applyFilters();
    }
  }, [vendors, nameFilter, statusFilter]);

  const applyFilters = () => {
    let filtered = [...vendors];

    if (nameFilter) {
      filtered = filtered.filter((v) => v.name.includes(nameFilter));
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((v) => v.status === statusFilter);
    }

    setFilteredVendors(filtered);
  };

  const handleFilterChange = () => {
    applyFilters();
  };

  const resetFilters = () => {
    setNameFilter('');
    setStatusFilter('');
    setFilteredVendors(vendors);
  };

  const openAddDialog = () => {
    form.reset({
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      remarks: '',
      status: '启用',
    });
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (vendor: Vendor) => {
    setCurrentVendor(vendor);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (vendor: Vendor) => {
    setCurrentVendor(vendor);
    setIsDeleteDialogOpen(true);
  };

  const openStatusDialog = (vendor: Vendor) => {
    setCurrentVendor(vendor);
    setIsStatusDialogOpen(true);
  };

  const openViewDialog = (vendor: Vendor) => {
    setCurrentVendor(vendor);
    setIsViewDialogOpen(true);
  };

  const handleAddVendor = async (data: z.infer<typeof vendorSchema>) => {
    fetcher.submit(
      {
        intent: 'add',
        vendorData: JSON.stringify(data),
      },
      { method: 'post' },
    );

    if (fetcher.data?.success) {
      setIsAddDialogOpen(false);
    }
  };

  const handleEditVendor = async (data: z.infer<typeof vendorSchema>) => {
    if (!currentVendor) {
      return;
    }

    fetcher.submit(
      {
        intent: 'update',
        id: String(currentVendor.id),
        vendorData: JSON.stringify(data),
      },
      { method: 'post' },
    );

    if (fetcher.data?.success) {
      setIsEditDialogOpen(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!currentVendor) {
      return;
    }

    fetcher.submit(
      {
        intent: 'delete',
        id: String(currentVendor.id),
      },
      { method: 'post' },
    );

    if (fetcher.data?.success) {
      setIsDeleteDialogOpen(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!currentVendor) {
      return;
    }

    const newStatus = currentVendor.status === '启用' ? '禁用' : '启用';

    fetcher.submit(
      {
        intent: 'toggle-status',
        id: String(currentVendor.id),
        status: newStatus,
      },
      { method: 'post' },
    );

    if (fetcher.data?.success) {
      setIsStatusDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">供应商信息管理</h1>
            <p className="text-gray-600 mt-1">管理和维护供应商基础信息</p>
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
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">供应商名称:</span>
                <Input
                  className="w-64"
                  placeholder="请输入供应商名称"
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">状态:</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="启用">启用</SelectItem>
                    <SelectItem value="禁用">禁用</SelectItem>
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

        {/* 操作按钮区域 */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" /> 共 {filteredVendors.length} 个供应商
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild className="flex items-center gap-2">
                <Link to="/dashboard/vendor-import" prefetch="intent">
                  <Upload className="w-4 h-4" />
                  导入
                </Link>
              </Button>
              <Button
                onClick={openAddDialog}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4" />
                新增供应商
              </Button>
            </div>
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
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">供应商名称</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">联系人</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">联系电话</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">邮箱</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">地址</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">状态</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">更新人</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">更新时间</TableHead>
                    <TableHead className="text-center font-semibold text-gray-700 bg-gray-50 w-64">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVendors.map((vendor, index) => (
                    <TableRow key={vendor.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <TableCell className="text-center text-gray-600">{index + 1}</TableCell>
                      <TableCell className="text-center font-medium text-gray-900">{vendor.name}</TableCell>
                      <TableCell className="text-center text-gray-700">{vendor.contactPerson}</TableCell>
                      <TableCell className="text-center text-gray-700">{vendor.phone}</TableCell>
                      <TableCell className="text-center text-gray-700">{vendor.email}</TableCell>
                      <TableCell className="text-center text-gray-700 max-w-xs truncate" title={vendor.address}>
                        {vendor.address}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            vendor.status === '启用' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {vendor.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-gray-700">{vendor.updatedBy}</TableCell>
                      <TableCell className="text-center text-gray-700">{vendor.updatedAt}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center">
                          <Button size="sm" variant="outline" asChild className="text-xs">
                            <Link to={`/dashboard/vendor-purchase-goods?vendorId=${vendor.id}`} prefetch="intent">
                              采购产品
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(vendor)}
                            className="text-xs"
                          >
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openStatusDialog(vendor)}
                            className={`text-xs ${
                              vendor.status === '启用'
                                ? 'text-red-600 hover:text-red-700'
                                : 'text-green-600 hover:text-green-700'
                            }`}
                          >
                            {vendor.status === '启用' ? '禁用' : '启用'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openDeleteDialog(vendor)}
                            className="text-xs text-red-600 hover:text-red-700"
                          >
                            删除
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openViewDialog(vendor)}
                            className="text-xs"
                          >
                            查看
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredVendors.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-12 h-12 text-gray-300" />
                          <span>暂无供应商数据</span>
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

      <AddVendorDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddVendor}
        backgroundColor="bg-white"
      />

      <EditVendorDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditVendor}
        vendor={currentVendor}
        backgroundColor="bg-white"
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteVendor}
        backgroundColor="bg-white"
      />

      <StatusDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        onConfirm={handleToggleStatus}
        currentStatus={currentVendor?.status}
        backgroundColor="bg-white"
      />

      <ViewVendorDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        vendor={currentVendor}
        backgroundColor="bg-white"
      />
    </div>
  );
}
