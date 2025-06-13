import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Input } from '~/components/dashboard/ui/input';
import { Button } from '~/components/dashboard/ui/button';
import { Alert, AlertDescription } from '~/components/dashboard/ui/alert';
import {
  Loader2,
  Plus,
  Search,
  Settings,
  Trash2,
  Eye,
  Package,
  Calendar,
  User,
  Filter,
  Upload,
  FileText,
  Image,
  Workflow,
} from 'lucide-react';
import { useLoaderData, useFetcher, useNavigation, useNavigate, json } from '@remix-run/react';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { ProductService } from '~/lib/services/productService';
import type { Product } from '~/types/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/dashboard/ui/dialog';
import { Label } from '~/components/dashboard/ui/label';
import { Textarea } from '~/components/dashboard/ui/textarea';

// Loader数据类型
interface LoaderData {
  products: Product[];
  stats: { total: number; recent: number };
  error: string | null;
}

// Action数据类型
interface ActionData {
  success: boolean;
  error?: string;
  product?: Product;
}

// 服务端 loader 函数获取产品列表
export async function loader({ request: _request }: LoaderFunctionArgs) {
  try {
    const [products, stats] = await Promise.all([ProductService.getAllProducts(), ProductService.getProductStats()]);

    return json<LoaderData>({
      products,
      stats,
      error: null,
    });
  } catch (error) {
    console.error('Error loading products:', error);
    return json<LoaderData>({
      products: [],
      stats: { total: 0, recent: 0 },
      error: `加载产品数据出错: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// 服务端 action 函数处理操作
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    switch (intent) {
      case 'add': {
        const name = formData.get('name') as string;
        const specification = formData.get('specification') as string;
        const description = formData.get('description') as string;
        const imageUrl = formData.get('image_url') as string;

        if (!name) {
          return json<ActionData>({
            success: false,
            error: '产品名称不能为空',
          });
        }

        const product = await ProductService.createProduct({
          name,
          specification: specification || undefined,
          description: description || undefined,
          image_url: imageUrl || undefined,
        });

        return json<ActionData>({
          success: true,
          product,
        });
      }
      case 'delete': {
        const id = formData.get('id') as string;

        if (!id) {
          return json<ActionData>({
            success: false,
            error: '产品ID不能为空',
          });
        }

        await ProductService.deleteProduct(id);

        return json<ActionData>({ success: true });
      }
      case 'update': {
        const id = formData.get('id') as string;
        const name = formData.get('name') as string;
        const specification = formData.get('specification') as string;
        const description = formData.get('description') as string;
        const imageUrl = formData.get('image_url') as string;

        if (!id || !name) {
          return json<ActionData>({
            success: false,
            error: '产品ID和名称不能为空',
          });
        }

        const product = await ProductService.updateProduct(id, {
          name,
          specification: specification || undefined,
          description: description || undefined,
          image_url: imageUrl || undefined,
        });

        return json<ActionData>({
          success: true,
          product,
        });
      }
      default:
        return json<ActionData>({
          success: false,
          error: `未知操作: ${intent}`,
        });
    }
  } catch (error) {
    console.error('Action error:', error);
    return json<ActionData>({
      success: false,
      error: `操作失败: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export default function ProductManagement() {
  const { products, stats, error: dbError } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const isLoading = navigation.state === 'loading' || fetcher.state !== 'idle';

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    specification: '',
    description: '',
    image_url: '',
  });

  // 添加文件上传状态
  const [_uploadedFiles, setUploadedFiles] = useState<{
    images: File[];
    documents: File[];
  }>({
    images: [],
    documents: [],
  });

  const [filePreview, setFilePreview] = useState<{
    images: string[];
    documents: { name: string; size: number }[];
  }>({
    images: [],
    documents: [],
  });

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.specification && product.specification.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  // 添加事件处理函数
  const handleAddProduct = () => {
    setFormData({
      name: '',
      specification: '',
      description: '',
      image_url: '',
    });
    setUploadedFiles({ images: [], documents: [] });
    setFilePreview({ images: [], documents: [] });
    setIsAddDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      specification: product.specification || '',
      description: product.description || '',
      image_url: product.image_url || '',
    });
    setUploadedFiles({ images: [], documents: [] });
    setFilePreview({ images: [], documents: [] });
    setIsEditDialogOpen(true);
  };

  const handleViewProduct = (product: Product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      specification: product.specification || '',
      description: product.description || '',
      image_url: product.image_url || '',
    });
    setIsViewDialogOpen(true);
  };

  // 文件处理函数
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith('image/'));

    setUploadedFiles((prev) => ({
      ...prev,
      images: [...prev.images, ...imageFiles],
    }));

    // 创建预览
    imageFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        setFilePreview((prev) => ({
          ...prev,
          images: [...prev.images, e.target?.result as string],
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const docFiles = files.filter(
      (file) => file.type === 'application/pdf' || file.type.includes('document') || file.type.includes('text'),
    );

    setUploadedFiles((prev) => ({
      ...prev,
      documents: [...prev.documents, ...docFiles],
    }));

    setFilePreview((prev) => ({
      ...prev,
      documents: [
        ...prev.documents,
        ...docFiles.map((file) => ({
          name: file.name,
          size: file.size,
        })),
      ],
    }));
  };

  const removeImage = (index: number) => {
    setUploadedFiles((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
    setFilePreview((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const removeDocument = (index: number) => {
    setUploadedFiles((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
    setFilePreview((prev) => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index),
    }));
  };

  const handleSubmitProduct = () => {
    if (currentProduct) {
      // 编辑产品
      fetcher.submit(
        {
          intent: 'update',
          id: currentProduct.id,
          name: formData.name,
          specification: formData.specification,
          description: formData.description,
          image_url: formData.image_url,
        },
        { method: 'post' },
      );
    } else {
      // 新增产品
      fetcher.submit(
        {
          intent: 'add',
          name: formData.name,
          specification: formData.specification,
          description: formData.description,
          image_url: formData.image_url,
        },
        { method: 'post' },
      );
    }

    setIsAddDialogOpen(false);
    setIsEditDialogOpen(false);
    setCurrentProduct(null);
  };

  const handleDelete = (id: string) => {
    if (deleteConfirm === id) {
      fetcher.submit({ intent: 'delete', id }, { method: 'post' });
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(id);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return '未知';
    }

    try {
      return new Date(dateString).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '无效日期';
    }
  };

  const handleCreateWorkflow = (product: Product) => {
    navigate('/workflow/new', {
      state: {
        productId: product.id,
        productName: product.name,
        productSpecification: product.specification,
        productDescription: product.description,
        productImageUrl: product.image_url,
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="text-2xl text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">产品管理</h1>
              <p className="text-gray-600">管理您的产品信息及配置</p>
            </div>
          </div>
          <Button
            onClick={handleAddProduct}
            className="bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700 text-white px-6 py-2 rounded-lg shadow-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            新增产品
          </Button>
        </div>

        {/* 统计信息 */}
        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          <span>共 {stats.total} 个产品</span>
          <span>•</span>
          <span>搜索结果 {filteredProducts.length} 个</span>
          <span>•</span>
          <span>最近7天新增 {stats.recent} 个</span>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索产品名称、描述或规格信息..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 border-gray-300 focus:border-green-500 focus:ring-green-500"
            />
          </div>
          <Button variant="outline" className="h-10 px-4 border-gray-300 hover:bg-gray-50">
            <Filter className="h-4 w-4 mr-2" />
            筛选
          </Button>
        </div>
      </div>

      {/* 错误和成功提示 */}
      {dbError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{dbError}</AlertDescription>
        </Alert>
      )}

      {fetcher.data?.error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">{fetcher.data.error}</AlertDescription>
        </Alert>
      )}

      {fetcher.data?.success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">操作成功完成！</AlertDescription>
        </Alert>
      )}

      {/* 产品表格 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {isLoading && (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-3 text-gray-600">加载中...</span>
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              {searchTerm ? '未找到匹配的产品' : '暂无产品数据'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? '请尝试其他搜索关键词' : '开始添加您的第一个产品'}
            </p>
            {!searchTerm && (
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                onClick={handleAddProduct}
              >
                <Plus className="h-4 w-4 mr-2" />
                新增产品
              </Button>
            )}
          </div>
        )}

        {!isLoading && filteredProducts.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-700 w-16 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Package className="h-4 w-4" />
                        序号
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-48">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        产品名称
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-32">规格</TableHead>
                    <TableHead className="font-semibold text-gray-700 min-w-64">描述</TableHead>
                    <TableHead className="font-semibold text-gray-700 w-40 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Calendar className="h-4 w-4" />
                        创建时间
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 w-40 text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <User className="h-4 w-4" />
                        更新时间
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-center w-40">
                      <div className="flex items-center gap-2 justify-center">
                        <Settings className="h-4 w-4" />
                        操作
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product, index) => (
                    <TableRow
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
                    >
                      <TableCell className="text-center font-medium text-gray-900">{index + 1}</TableCell>
                      <TableCell className="font-medium text-gray-900">{product.name}</TableCell>
                      <TableCell className="text-gray-600">{product.specification || '-'}</TableCell>
                      <TableCell className="text-gray-600 max-w-xs">
                        <div className="truncate" title={product.description || ''}>
                          {product.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600 text-center">{formatDate(product.created_at)}</TableCell>
                      <TableCell className="text-gray-600 text-center">{formatDate(product.updated_at)}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* 查看按钮 */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
                            onClick={() => handleViewProduct(product)}
                            title="查看产品详情"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </Button>

                          {/* 编辑按钮 */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-amber-200 hover:bg-amber-50 hover:border-amber-300"
                            onClick={() => handleEditProduct(product)}
                            title="编辑产品信息"
                          >
                            <Settings className="h-4 w-4 text-amber-600" />
                          </Button>

                          {/* 创建工作流按钮 */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 border-green-200 hover:bg-green-50 hover:border-green-300"
                            onClick={() => handleCreateWorkflow(product)}
                            title="基于此产品创建碳足迹工作流"
                          >
                            <Workflow className="h-4 w-4 text-green-600" />
                          </Button>

                          {/* 删除按钮 */}
                          <Button
                            variant="outline"
                            size="sm"
                            className={`h-8 w-8 p-0 transition-all duration-200 ${
                              deleteConfirm === product.id
                                ? 'border-red-500 bg-red-50'
                                : 'border-red-200 hover:bg-red-50 hover:border-red-300'
                            }`}
                            onClick={() => handleDelete(product.id)}
                            title={deleteConfirm === product.id ? '再次点击确认删除' : '删除产品'}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        {deleteConfirm === product.id && (
                          <div className="text-xs text-red-600 text-center mt-1">再次点击确认删除</div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 分页信息 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div>显示 {filteredProducts.length} 个产品，共 {stats.total} 个</div>
                <div className="text-gray-500">最后更新：{new Date().toLocaleString('zh-CN')}</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 新增/编辑产品对话框 */}
      <Dialog
        open={isAddDialogOpen || isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            setCurrentProduct(null);
            setUploadedFiles({ images: [], documents: [] });
            setFilePreview({ images: [], documents: [] });
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              {currentProduct ? '编辑产品' : '新增产品'}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {currentProduct ? '修改产品信息和文件' : '填写产品基本信息并上传相关文件'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 基本信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-green-600" />
                基本信息
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    产品名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入产品名称"
                    className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div>
                  <Label htmlFor="specification" className="text-sm font-medium text-gray-700">
                    产品规格
                  </Label>
                  <Input
                    id="specification"
                    value={formData.specification}
                    onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                    placeholder="请输入产品规格"
                    className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                    产品描述
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入产品描述"
                    className="mt-1 border-gray-300 focus:border-green-500 focus:ring-green-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 图片上传 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Image className="h-5 w-5 text-green-600" />
                产品图片
              </h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">点击上传图片</span>
                      <span className="mt-1 block text-xs text-gray-500">支持 PNG, JPG, GIF 格式，最大 10MB</span>
                    </label>
                    <input
                      id="image-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 图片预览 */}
              {filePreview.images.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  {filePreview.images.map((src, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={src}
                        alt={`预览 ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 文档上传 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                相关文档
              </h3>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-gray-400 transition-colors">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="document-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">点击上传文档</span>
                      <span className="mt-1 block text-xs text-gray-500">支持 PDF, DOC, DOCX 格式，最大 50MB</span>
                    </label>
                    <input
                      id="document-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* 文档列表 */}
              {filePreview.documents.length > 0 && (
                <div className="space-y-2">
                  {filePreview.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{(doc.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(index)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                setIsEditDialogOpen(false);
                setCurrentProduct(null);
                setUploadedFiles({ images: [], documents: [] });
                setFilePreview({ images: [], documents: [] });
              }}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmitProduct}
              disabled={!formData.name.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {currentProduct ? '更新产品' : '创建产品'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 查看产品对话框 */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader className="border-b border-gray-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-gray-900">产品详情</DialogTitle>
                <DialogDescription className="text-gray-600 mt-1">查看完整的产品信息和文件</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-8 py-6">
            {/* 产品基本信息卡片 */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                基本信息
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">产品名称</Label>
                  <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                    <p className="text-lg font-medium text-gray-900">{formData.name || '未设置'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">产品规格</Label>
                  <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                    <p className="text-gray-800">{formData.specification || '未设置'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">产品描述</Label>
                <div className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                  <p className="text-gray-800 leading-relaxed">{formData.description || '暂无描述'}</p>
                </div>
              </div>
            </div>

            {/* 产品图片展示 */}
            {filePreview.images.length > 0 && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Image className="h-5 w-5 text-white" />
                  </div>
                  产品图片
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filePreview.images.map((src, index) => (
                    <div key={index} className="group relative">
                      <div className="aspect-square rounded-xl overflow-hidden bg-white border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
                        <img
                          src={src}
                          alt={`产品图片 ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all duration-300 flex items-center justify-center">
                        <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 相关文档展示 */}
            {filePreview.documents.length > 0 && (
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="p-2 bg-purple-500 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  相关文档
                </h3>

                <div className="space-y-3">
                  {filePreview.documents.map((doc, index) => (
                    <div
                      key={index}
                      className="bg-white rounded-xl p-4 border border-purple-200 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 rounded-lg">
                          <FileText className="h-6 w-6 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-lg">{doc.name}</h4>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">大小: {(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                              {doc.name.split('.').pop()?.toUpperCase() || 'FILE'}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-purple-200 text-purple-600 hover:bg-purple-50"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          预览
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 如果没有图片和文档 */}
            {filePreview.images.length === 0 && filePreview.documents.length === 0 && (
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200 text-center">
                <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">暂无附件</h3>
                <p className="text-gray-600">该产品暂未上传图片或文档</p>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-gray-100 pt-6">
            <Button
              onClick={() => setIsViewDialogOpen(false)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
