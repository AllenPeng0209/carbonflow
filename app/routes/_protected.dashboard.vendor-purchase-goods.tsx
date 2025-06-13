import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/dashboard/ui/select';
import { Input } from '~/components/dashboard/ui/input';
import { Button } from '~/components/dashboard/ui/button';
import { Package, Search, RotateCcw, Plus, ShoppingCart } from 'lucide-react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Vendor, PurchaseGood } from '~/components/dashboard/sections/schema';
import {
  AddPurchaseGoodDialog,
  EditPurchaseGoodDialog,
  DeleteDialog,
  StatusDialog,
  ViewPurchaseGoodDialog,
  SupplierVendorsDialog,
  SelectVendorsDialog,
} from '~/components/dashboard/sections/dialogs';
import { purchaseGoodSchema } from '~/components/dashboard/sections/schema';

const initialPurchaseGoods: PurchaseGood[] = [
  {
    id: 1,
    code: '123456485678',
    name: '采购商品名称采购商品名称采购商品名称',
    status: '启用',
    updatedBy: '',
    updatedAt: '',
    remarks: '',
    vendorIds: [1],
  },
  {
    id: 2,
    code: '123456485678',
    name: '采购商品名称采购商品名称采购商品名称',
    status: '启用',
    updatedBy: '',
    updatedAt: '',
    remarks: '',
    vendorIds: [1, 2],
  },
  {
    id: 3,
    code: '123456485678',
    name: '采购商品名称采购商品名称采购商品名称',
    status: '禁用',
    updatedBy: '',
    updatedAt: '',
    remarks: '',
    vendorIds: [3],
  },
];

const initialVendors: Vendor[] = [
  {
    id: 1,
    name: '供应商1',
    contactPerson: '联系人',
    phone: '12345678901',
    email: '123456@126.com',
    address: '地址地址地址地址地址',
    status: '启用',
    updatedBy: '张三',
    updatedAt: '2023-05-20',
    remarks: '',
  },
  {
    id: 2,
    name: '供应商2',
    contactPerson: '联系人',
    phone: '12345678901',
    email: '123456@126.com',
    address: '地址地址地址地址地址',
    status: '启用',
    updatedBy: '张三',
    updatedAt: '2023-05-20',
    remarks: '',
  },
  {
    id: 3,
    name: '供应商3',
    contactPerson: '联系人',
    phone: '12345678901',
    email: '123456@126.com',
    address: '地址地址地址地址地址',
    status: '启用',
    updatedBy: '张三',
    updatedAt: '2023-05-20',
    remarks: '',
  },
];

export default function VendorPurchaseGoods() {
  const [purchaseGoods, setPurchaseGoods] = useState<PurchaseGood[]>(initialPurchaseGoods);
  const [filteredPurchaseGoods, setFilteredPurchaseGoods] = useState<PurchaseGood[]>(purchaseGoods);
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isSupplierVendorsDialogOpen, setIsSupplierVendorsDialogOpen] = useState(false);
  const [isSelectVendorsDialogOpen, setIsSelectVendorsDialogOpen] = useState(false);
  const [currentPurchaseGood, setCurrentPurchaseGood] = useState<PurchaseGood | null>(null);

  const form = useForm<z.infer<typeof purchaseGoodSchema>>({
    resolver: zodResolver(purchaseGoodSchema),
    defaultValues: {
      code: '',
      name: '',
      remarks: '',
      status: '启用',
    },
  });

  const applyFilters = () => {
    let filtered = [...purchaseGoods];

    if (codeFilter) {
      filtered = filtered.filter((p) => p.code.includes(codeFilter));
    }

    if (nameFilter) {
      filtered = filtered.filter((p) => p.name.includes(nameFilter));
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    setFilteredPurchaseGoods(filtered);
  };

  const handleFilterChange = () => {
    applyFilters();
  };

  const resetFilters = () => {
    setCodeFilter('');
    setNameFilter('');
    setStatusFilter('');
    setFilteredPurchaseGoods(purchaseGoods);
  };

  const openAddDialog = () => {
    form.reset({
      code: '',
      name: '',
      remarks: '',
      status: '启用',
    });
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (purchaseGood: PurchaseGood) => {
    setCurrentPurchaseGood(purchaseGood);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (purchaseGood: PurchaseGood) => {
    setCurrentPurchaseGood(purchaseGood);
    setIsDeleteDialogOpen(true);
  };

  const openStatusDialog = (purchaseGood: PurchaseGood) => {
    setCurrentPurchaseGood(purchaseGood);
    setIsStatusDialogOpen(true);
  };

  const openViewDialog = (purchaseGood: PurchaseGood) => {
    setCurrentPurchaseGood(purchaseGood);
    setIsViewDialogOpen(true);
  };

  const openSupplierVendorsDialog = (purchaseGood: PurchaseGood) => {
    setCurrentPurchaseGood(purchaseGood);
    setIsSupplierVendorsDialogOpen(true);
  };

  const openSelectVendorsDialog = () => {
    if (!currentPurchaseGood) {
      return;
    }

    setIsSupplierVendorsDialogOpen(false);
    setIsSelectVendorsDialogOpen(true);
  };

  const handleAddPurchaseGood = (data: z.infer<typeof purchaseGoodSchema>) => {
    const newPurchaseGood: PurchaseGood = {
      ...data,
      id: purchaseGoods.length > 0 ? Math.max(...purchaseGoods.map((p) => p.id)) + 1 : 1,
      updatedBy: '当前用户',
      updatedAt: new Date().toISOString().split('T')[0],
      vendorIds: [],
    };

    const updatedPurchaseGoods = [...purchaseGoods, newPurchaseGood];
    setPurchaseGoods(updatedPurchaseGoods);
    setFilteredPurchaseGoods(updatedPurchaseGoods);
    setIsAddDialogOpen(false);
  };

  const handleEditPurchaseGood = (data: z.infer<typeof purchaseGoodSchema>) => {
    if (!currentPurchaseGood) {
      return;
    }

    const updatedPurchaseGoods = purchaseGoods.map((p) =>
      p.id === currentPurchaseGood.id
        ? {
            ...p,
            ...data,
            updatedBy: '当前用户',
            updatedAt: new Date().toISOString().split('T')[0],
          }
        : p,
    );

    setPurchaseGoods(updatedPurchaseGoods);
    setFilteredPurchaseGoods(updatedPurchaseGoods);
    setIsEditDialogOpen(false);
  };

  const handleDeletePurchaseGood = () => {
    if (!currentPurchaseGood) {
      return;
    }

    const updatedPurchaseGoods = purchaseGoods.filter((p) => p.id !== currentPurchaseGood.id);
    setPurchaseGoods(updatedPurchaseGoods);
    setFilteredPurchaseGoods(updatedPurchaseGoods);
    setIsDeleteDialogOpen(false);
  };

  const handleToggleStatus = () => {
    if (!currentPurchaseGood) {
      return;
    }

    const newStatus = currentPurchaseGood.status === '启用' ? '禁用' : '启用';

    const updatedPurchaseGoods = purchaseGoods.map((p) =>
      p.id === currentPurchaseGood.id
        ? {
            ...p,
            status: newStatus as '启用' | '禁用',
            updatedBy: '当前用户',
            updatedAt: new Date().toISOString().split('T')[0],
          }
        : p,
    );

    setPurchaseGoods(updatedPurchaseGoods);
    setFilteredPurchaseGoods(updatedPurchaseGoods);
    setIsStatusDialogOpen(false);
  };

  const handleSelectVendors = (selectedVendorIds: number[]) => {
    if (!currentPurchaseGood) {
      return;
    }

    const updatedPurchaseGoods = purchaseGoods.map((p) =>
      p.id === currentPurchaseGood.id
        ? {
            ...p,
            vendorIds: [...new Set([...p.vendorIds, ...selectedVendorIds])],
            updatedBy: '当前用户',
            updatedAt: new Date().toISOString().split('T')[0],
          }
        : p,
    );

    setPurchaseGoods(updatedPurchaseGoods);
    setFilteredPurchaseGoods(updatedPurchaseGoods);
    setIsSelectVendorsDialogOpen(false);
  };

  const getEnabledVendors = () => {
    return vendors.filter((v) => v.status === '启用');
  };

  const getVendorsByIds = (ids: number[]) => {
    return vendors.filter((v) => ids.includes(v.id) && v.status === '启用');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">采购商品管理</h1>
            <p className="text-gray-600 mt-1">管理和维护采购商品基础信息</p>
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
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">采购商品代码:</span>
                <Input
                  className="w-48"
                  placeholder="请输入商品代码"
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">采购商品名称:</span>
                <Input
                  className="w-48"
                  placeholder="请输入商品名称"
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
              <ShoppingCart className="w-4 h-4" /> 共 {filteredPurchaseGoods.length} 个采购商品
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={openAddDialog}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="w-4 h-4" />
                新增商品
              </Button>
            </div>
          </div>
        </div>

        {/* 表格区域 */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">序号</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">采购商品代码</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">采购商品名称</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">状态</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">更新人</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">更新时间</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50 w-64">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchaseGoods.map((purchaseGood, index) => (
                  <TableRow key={purchaseGood.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell className="text-center text-gray-600">{index + 1}</TableCell>
                    <TableCell className="text-center font-medium text-gray-900">{purchaseGood.code}</TableCell>
                    <TableCell className="text-center text-gray-700 max-w-xs truncate" title={purchaseGood.name}>
                      {purchaseGood.name}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        purchaseGood.status === '启用' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {purchaseGood.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">{purchaseGood.updatedBy}</TableCell>
                    <TableCell className="text-center text-gray-700">{purchaseGood.updatedAt}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openSupplierVendorsDialog(purchaseGood)}
                          className="text-xs"
                        >
                          供货供应商
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openEditDialog(purchaseGood)}
                          className="text-xs"
                        >
                          编辑
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openStatusDialog(purchaseGood)}
                          className={`text-xs ${
                            purchaseGood.status === '启用' 
                              ? 'text-red-600 hover:text-red-700' 
                              : 'text-green-600 hover:text-green-700'
                          }`}
                        >
                          {purchaseGood.status === '启用' ? '禁用' : '启用'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openDeleteDialog(purchaseGood)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          删除
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openViewDialog(purchaseGood)}
                          className="text-xs"
                        >
                          查看
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPurchaseGoods.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="w-12 h-12 text-gray-300" />
                        <span>暂无采购商品数据</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AddPurchaseGoodDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={handleAddPurchaseGood}
        backgroundColor="bg-white"
      />

      <EditPurchaseGoodDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={handleEditPurchaseGood}
        purchaseGood={currentPurchaseGood}
        backgroundColor="bg-white"
      />

      <DeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeletePurchaseGood}
        backgroundColor="bg-white"
      />

      <StatusDialog
        open={isStatusDialogOpen}
        onOpenChange={setIsStatusDialogOpen}
        onConfirm={handleToggleStatus}
        currentStatus={currentPurchaseGood?.status}
        backgroundColor="bg-white"
      />

      <ViewPurchaseGoodDialog
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
        purchaseGood={currentPurchaseGood}
        backgroundColor="bg-white"
      />

      <SupplierVendorsDialog
        open={isSupplierVendorsDialogOpen}
        onOpenChange={setIsSupplierVendorsDialogOpen}
        onSelectVendors={openSelectVendorsDialog}
        vendors={currentPurchaseGood ? getVendorsByIds(currentPurchaseGood.vendorIds) : []}
        backgroundColor="bg-white"
      />

      <SelectVendorsDialog
        open={isSelectVendorsDialogOpen}
        onOpenChange={setIsSelectVendorsDialogOpen}
        onConfirm={handleSelectVendors}
        vendors={getEnabledVendors()}
        selectedVendorIds={currentPurchaseGood?.vendorIds || []}
        backgroundColor="bg-white"
      />
    </div>
  );
}
