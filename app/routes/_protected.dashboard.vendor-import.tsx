import { useState, useEffect } from 'react';
import { json, redirect, unstable_parseMultipartFormData, unstable_createMemoryUploadHandler } from '@remix-run/node';
import { useLoaderData, useActionData, useNavigation, useFetcher, Link } from '@remix-run/react';
import type { LoaderFunctionArgs, ActionFunctionArgs, UploadHandler } from '@remix-run/node';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/dashboard/ui/table';
import { Button } from '~/components/dashboard/ui/button';
import { Alert, AlertDescription } from '~/components/dashboard/ui/alert';
import { Loader2, DownloadCloud, Upload, FileUp, FileSpreadsheet, ArrowLeft } from 'lucide-react';
import { ImportConfirmDialog } from '~/components/dashboard/sections/dialogs';
import { parseVendorImportExcel, processVendorImportData, generateErrorExcel } from '~/lib/services/excel-processor';
import { importVendorsAndPurchaseGoods } from '~/lib/services/vendor-import';
import {
  uploadFile,
  fetchImportResults,
  saveImportResult,
  saveUploadRecord,
  fetchFileById,
  deleteFileAndRecord,
} from '~/lib/persistence/import';
import type { VendorImportResult } from '~/components/dashboard/sections/schema';

// Define types for our loader data
interface LoaderData {
  importResults: VendorImportResult[];
  error: string | null;
}

// Define types for our action data
interface ActionData {
  success: boolean;
  error?: string;
  fileUrl?: string;
  fileName?: string;
  processedData?: {
    data: any[];
    successCount: number;
    failureCount: number;
  };
  fileId?: string;
}

// Server-side loader function to fetch import results
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { data, error } = await fetchImportResults();

    if (error) {
      return json<LoaderData>({
        importResults: [],
        error: `Error loading import results: ${error.message}`,
      });
    }

    return json<LoaderData>({
      importResults: data || [],
      error: null,
    });
  } catch (error) {
    return json<LoaderData>({
      importResults: [],
      error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

// Server-side action function to handle file uploads and imports
export async function action({ request }: ActionFunctionArgs) {
  try {
    const uploadHandler: UploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: 50_000_000, // 50MB
    });

    // TODO: shaobo(params check, and error handling)
    const formData = await unstable_parseMultipartFormData(request, uploadHandler);
    const intent = formData.get('intent') as string | null;

    if (!intent) {
      console.error('Intent is null or undefined and could not be inferred');
      return json<ActionData>({
        success: false,
        error: '操作失败: 未知的操作',
      });
    }

    switch (intent) {
      case 'upload': {
        const file = formData.get('file') as File | null;
        const existingFileId = formData.get('fileId') as string | null;

        if (!file) {
          console.error('File is null');
          return json<ActionData>({
            success: false,
            error: '文件不能为空',
          });
        }

        /*
         * existingFileId is the fileId of the previous file, means this is a re upload operation
         * Delete the existing file and its record before uploading new one
         * Continue with upload even if deletion fails
         */
        if (existingFileId) {
          const { success, error: deleteError } = await deleteFileAndRecord(existingFileId);

          if (!success) {
            console.error('Failed to delete existing file:', deleteError?.message);
          } else {
            console.log(`Successfully deleted previous file with ID: ${existingFileId}`);
          }
        }

        const timestamp = new Date().getTime();
        const path = `vendor_imports/${timestamp}.xlsx`;
        console.log('File path:', path);

        const { url, error: uploadError } = await uploadFile(file, path);

        if (uploadError) {
          console.error('Upload error:', uploadError.message);
          return json<ActionData>({
            success: false,
            error: `文件上传失败: ${uploadError.message}`,
          });
        }

        // Save the upload record to the database and get fileId
        const fileId = await saveUploadRecord({
          fileName: file.name,
          filePath: path,
        });

        return json<ActionData>({
          success: true,
          fileUrl: url || undefined,
          fileName: file.name,
          processedData: {
            data: [],
            successCount: 0,
            failureCount: 0,
          },
          fileId,
        });
      }

      case 'import': {
        const fileId = formData.get('fileId') as string;

        if (!fileId) {
          return json<ActionData>({
            success: false,
            error: '没有找到文件ID',
          });
        }

        // Fetch the file from Supabase using fileId
        const { file, error: fetchError } = await fetchFileById(fileId);

        if (fetchError || !file) {
          return json<ActionData>({
            success: false,
            error: `文件获取失败: ${fetchError?.message || '文件不存在'}`,
          });
        }

        // Parse the Excel file
        const { data, errors } = await parseVendorImportExcel(file);

        if (errors.length > 0) {
          return json<ActionData>({
            success: false,
            error: `Excel 文件包含 ${errors.length} 个错误，请检查格式是否正确`,
          });
        }

        // Process the data to check for existing records
        const processResult = await processVendorImportData(data);
        const fileName = file.name;
        const timestamp = new Date().getTime();
        const filePath = `vendor-imports/${timestamp}-${fileName}`;

        if (!fileName) {
          return json<ActionData>({
            success: false,
            error: '文件名缺失',
          });
        }

        // Import the data
        const importResult = await importVendorsAndPurchaseGoods(processResult.results);

        // Generate error file if needed
        let errorFilePath: string | undefined;

        if (importResult.failureCount > 0) {
          const errorBlob = generateErrorExcel(importResult.results.filter((r) => !r.success));
          const errorFile = new File([errorBlob], `errors-${fileName}`, {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          const timestamp = new Date().getTime();
          const path = `vendor-imports/errors/${timestamp}-errors-${fileName}`;
          const { url } = await uploadFile(errorFile, path);
          errorFilePath = url || undefined;
        }

        // Save import result
        await saveImportResult({
          fileName,
          successCount: importResult.successCount,
          failureCount: importResult.failureCount,
          status: importResult.failureCount > 0 ? '导入失败' : '导入成功',
          createdAt: new Date().toISOString(),
          sourceFilePath: filePath,
          errorFilePath,
        });

        return redirect('/dashboard/vendor-import');
      }

      default:
        return json<ActionData>({
          success: false,
          error: `Unknown action: ${intent}`,
        });
    }
  } catch (error) {
    console.error('Action error:', error);
    return json<ActionData>({
      success: false,
      error: `Action error: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

export default function VendorImport() {
  const { importResults, error: dbError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const fetcher = useFetcher();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileId, setFileId] = useState<string>('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const isUploading = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'upload';
  const isImporting = navigation.state === 'submitting' && navigation.formData?.get('intent') === 'import';

  useEffect(() => {
    if (actionData?.success && actionData.fileUrl) {
      setFileUrl(actionData.fileUrl);
      setFileName(actionData.fileName || '');
      setFileId(actionData.fileId || '');
    }
  }, [actionData]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      return;
    }

    const formData = new FormData();
    formData.append('intent', 'upload');
    formData.append('file', selectedFile);
    if (fileId) {
      formData.append('fileId', fileId);
    }

    fetcher.submit(formData, { method: 'post', encType: 'multipart/form-data' });
  };

  const handleImport = () => {
    setIsConfirmDialogOpen(true);
  };

  const confirmImport = () => {
    const formData = new FormData();
    formData.append('intent', 'import');
    formData.append('fileId', fileId);

    fetcher.submit(formData, { method: 'post' });
    setIsConfirmDialogOpen(false);
  };

  const downloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/vendor-import-template.xlsx';
    link.download = '供应商及采购商品导入模板.xlsx';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 页面头部 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Button variant="outline" asChild className="mr-4">
            <Link to="/dashboard/vendor-information" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              返回供应商管理
            </Link>
          </Button>
        </div>
        <div className="flex items-center mb-2">
          <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mr-4">
            <FileSpreadsheet className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">供应商数据导入</h1>
            <p className="text-gray-600 mt-1">批量导入供应商及采购商品信息</p>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {dbError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>加载导入记录失败: {dbError}</AlertDescription>
        </Alert>
      )}

      {actionData?.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>操作失败: {actionData.error}</AlertDescription>
        </Alert>
      )}

      {actionData?.success && actionData.processedData && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            导入完成！成功 {actionData.processedData.successCount} 条，失败 {actionData.processedData.failureCount} 条
          </AlertDescription>
        </Alert>
      )}

      {/* 导入操作卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">文件导入</h2>
          
          {/* 模板下载 */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="flex items-center gap-2"
            >
              <DownloadCloud className="w-4 h-4" />
              下载导入模板
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              请先下载模板文件，按照格式填写数据后再上传
            </p>
          </div>

          {/* 文件上传 */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择文件
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || isUploading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4" />
                      {fileUrl ? '重新上传' : '上传文件'}
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* 文件预览 */}
            {fileUrl && fileName && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{fileName}</p>
                      <p className="text-xs text-gray-500">文件已上传，可以开始导入</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                        预览文件
                      </a>
                    </Button>
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      {isImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          导入中...
                        </>
                      ) : (
                        '开始导入'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 导入历史记录卡片 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">导入历史记录</h2>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-gray-200">
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">文件名称</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">导入成功条数</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">导入失败条数</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">导入状态</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">创建时间</TableHead>
                  <TableHead className="text-center font-semibold text-gray-700 bg-gray-50">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {importResults.map((result) => (
                  <TableRow key={result.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell className="text-center font-medium text-gray-900">{result.fileName}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{result.successCount}</TableCell>
                    <TableCell className="text-center text-red-600 font-medium">{result.failureCount}</TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        result.status === '导入成功' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {result.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-gray-700">{result.createdAt}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        {result.errorFileUrl && (
                          <Button size="sm" variant="outline" asChild className="text-xs">
                            <a href={result.errorFileUrl} download>
                              异常数据
                            </a>
                          </Button>
                        )}
                        <Button size="sm" variant="outline" asChild className="text-xs">
                          <a href={result.sourceFileUrl} download>
                            源文件
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {importResults.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <FileSpreadsheet className="w-12 h-12 text-gray-300" />
                        <span>暂无导入记录</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <ImportConfirmDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={confirmImport}
        backgroundColor="bg-white"
      />
    </div>
  );
}
