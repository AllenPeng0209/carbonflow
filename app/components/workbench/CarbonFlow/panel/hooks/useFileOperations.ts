import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import type { FormInstance } from 'antd';
import type { UploadProps } from 'antd/es/upload';
import { supabase } from '~/lib/supabase';
import type { UploadedFile, ModalUploadFile, WorkflowFileRecord } from '~/types/files';
import type { CarbonFlowAction } from '~/types/actions';

export const useFileOperations = (workflowId: string) => {
  // 状态管理
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [modalFileList, setModalFileList] = useState<ModalUploadFile[]>([]);
  const [selectedFileForParse, setSelectedFileForParse] = useState<UploadedFile | null>(null);

  const uploadModalFormRef = useRef<FormInstance>(null);

  // 文件获取功能
  const fetchWorkflowFiles = useCallback(async () => {
    try {
      setIsLoadingFiles(true);

      const { data, error } = await supabase
        .from('workflow_files')
        .select(
          `
          file_id,
          files (
            id,
            name,
            path,
            type,
            size,
            mime_type,
            created_at
          )
        `,
        )
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // 转换数据格式
      const mappedFiles = (data as unknown as WorkflowFileRecord[]).map((item) => {
        const fileDetail = item.files;

        if (!fileDetail) {
          console.warn('Skipping item due to missing file details:', item);
          return null;
        }

        return {
          id: item.file_id,
          name: fileDetail.name,
          type: fileDetail.type,
          uploadTime: new Date(fileDetail.created_at).toLocaleString(),
          url: fileDetail.path,
          status: 'completed' as const,
          size: fileDetail.size,
          mimeType: fileDetail.mime_type,
          content: undefined,
        };
      });

      const filteredFiles = mappedFiles.filter(Boolean);
      setUploadedFiles(filteredFiles as UploadedFile[]);
    } catch (error) {
      console.error('Error fetching files:', error);
      message.error('获取文件列表失败');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [workflowId]);

  // 文件删除功能
  const handleDeleteFile = useCallback(async (id: string) => {
    try {
      // 获取文件信息
      const { data: workflowFile, error: fetchError } = await supabase
        .from('workflow_files')
        .select(
          `
          file_id,
          files (
            id,
            path
          )
        `,
        )
        .eq('file_id', id)
        .single<WorkflowFileRecord>();

      if (fetchError) {
        throw new Error(`Failed to fetch file info: ${fetchError.message}`);
      }

      if (!workflowFile?.files?.path || typeof workflowFile.files.path !== 'string') {
        throw new Error('File path not found or invalid');
      }

      // 从 Storage 中删除文件
      const { error: storageError } = await supabase.storage.from('files').remove([workflowFile.files.path]);

      if (storageError) {
        throw storageError;
      }

      // 删除 workflow_files 表中的记录
      const { error: workflowFileError } = await supabase.from('workflow_files').delete().eq('file_id', id);

      if (workflowFileError) {
        throw new Error(`Failed to delete workflow file record: ${workflowFileError.message}`);
      }

      // 删除 files 表中的记录
      const { error: fileError } = await supabase.from('files').delete().eq('id', id);

      if (fileError) {
        throw new Error(`Failed to delete file record: ${fileError.message}`);
      }

      // 更新本地状态
      setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
      message.success('文件删除成功');
    } catch (error) {
      console.error('Error deleting file:', error);
      message.error(`删除文件失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }, []);

  // 文件上传功能
  const handleUploadFiles = useCallback(async () => {
    try {
      if (!modalFileList.length) {
        message.error('请选择要上传的文件');
        return;
      }

      const formData = await uploadModalFormRef.current?.validateFields();

      if (!formData) {
        return;
      }

      setIsUploading(true);

      for (const file of modalFileList) {
        const fileObj = file.originFileObj;

        if (!fileObj) {
          continue;
        }

        // 读取文件内容
        const content = await fileObj.text();

        // 上传到 Storage
        const originalName = fileObj.name;
        const nameParts = originalName.split('.');
        const extension = nameParts.length > 1 ? nameParts.pop() : 'dat';

        const safeFileNameInPath = `${Date.now()}_${file.uid}.${extension}`;
        const filePath = `${workflowId}/${safeFileNameInPath}`;

        const { error: uploadError } = await supabase.storage.from('files').upload(filePath, fileObj);

        if (uploadError) {
          throw new Error(`Failed to upload file: ${uploadError.message}`);
        }

        // 创建文件记录
        const { data: fileData, error: fileError } = await supabase
          .from('files')
          .insert({
            name: fileObj.name,
            path: filePath,
            type: formData.fileType,
            size: fileObj.size,
            mime_type: fileObj.type,
          })
          .select()
          .single();

        if (fileError) {
          throw new Error(`Failed to create file record: ${fileError.message}`);
        }

        // 创建工作流文件关联
        const { error: workflowFileError } = await supabase.from('workflow_files').insert({
          workflow_id: workflowId,
          file_id: fileData.id,
        });

        if (workflowFileError) {
          throw new Error(`Failed to create workflow file association: ${workflowFileError.message}`);
        }

        // 添加到已上传文件列表
        setUploadedFiles((prev) => [
          ...prev,
          {
            id: fileData.id,
            name: fileObj.name,
            type: formData.fileType,
            uploadTime: new Date().toLocaleString(),
            url: filePath,
            status: 'pending',
            size: fileObj.size,
            mimeType: fileObj.type,
            content,
          },
        ]);
      }

      message.success('文件上传成功');
      setModalFileList([]);
      uploadModalFormRef.current?.resetFields();
    } catch (error) {
      console.error('Upload error:', error);
      message.error(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsUploading(false);
    }
  }, [modalFileList, workflowId]);

  // 文件预览功能
  const handlePreviewFile = useCallback(async (file: UploadedFile) => {
    if (!file.url) {
      message.error('文件路径不存在');
      return;
    }

    try {
      const {
        data: { publicUrl },
      } = supabase.storage.from('files').getPublicUrl(file.url);

      window.open(publicUrl, '_blank');
    } catch (error) {
      console.error('Error previewing file:', error);
      message.error('预览文件失败');
    }
  }, []);

  // 文件解析功能
  const handleParseFile = useCallback(async (file: UploadedFile) => {
    console.log('[useFileOperations] handleParseFile 开始执行', {
      file,
      fileName: file?.name,
      fileId: file?.id,
      fileUrl: file?.url,
      timestamp: new Date().toISOString(),
    });

    if (!file) {
      console.error('[useFileOperations] 文件信息缺失，无法解析');
      message.error('文件信息缺失，无法解析');

      return;
    }

    console.log('[useFileOperations] 设置文件状态为parsing');

    // 立即将文件状态设置为 'parsing'
    setUploadedFiles((prevFiles) => prevFiles.map((f) => (f.id === file.id ? { ...f, status: 'parsing' } : f)));
    message.loading({ content: `正在解析文件: ${file.name}...`, key: 'parsingFile' });

    // 设置超时处理 - 30秒后自动关闭loading并标记为失败
    const timeoutId = setTimeout(() => {
      console.warn('[useFileOperations] ⏰ 文件解析超时');
      message.destroy('parsingFile');
      message.error('文件解析超时，请重试');
      setUploadedFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === file.id ? { ...f, status: 'failed' as UploadedFile['status'] } : f)),
      );
    }, 30000); // 30秒超时

    try {
      console.log('[useFileOperations] 开始从Storage下载文件内容');

      // 从 Storage 获取文件内容
      if (!file.url) {
        throw new Error('文件URL未定义，无法下载');
      }

      const { data: fileData, error: downloadError } = await supabase.storage.from('files').download(file.url);

      console.log('[useFileOperations] Storage下载结果', {
        hasData: !!fileData,
        downloadError,
        fileSize: fileData?.size,
      });

      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }

      if (!fileData) {
        throw new Error('No file data received');
      }

      console.log('[useFileOperations] 检测文件类型并处理');

      // 检测文件类型并统一处理为文本内容
      const isExcelFile = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      let fileContent: string;

      if (isExcelFile) {
        console.log('[useFileOperations] 🔍 检测到Excel文件，转换为CSV格式');

        try {
          // 动态导入xlsx库
          const XLSX = await import('xlsx');

          // 将Blob转换为ArrayBuffer
          const arrayBuffer = await fileData.arrayBuffer();
          console.log('[useFileOperations] 📄 ArrayBuffer信息:', {
            byteLength: arrayBuffer.byteLength,
            firstBytes: Array.from(new Uint8Array(arrayBuffer.slice(0, 10)))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join(' '),
          });

          // 使用xlsx读取Excel文件
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          console.log('[useFileOperations] 📊 Excel工作簿信息:', {
            sheetNames: workbook.SheetNames,
            sheetCount: workbook.SheetNames.length,
          });

          // 处理多工作表：将所有工作表合并为一个CSV
          if (workbook.SheetNames.length === 1) {
            // 单个工作表，直接转换为CSV
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            fileContent = XLSX.utils.sheet_to_csv(worksheet, { forceQuotes: true });
            console.log('[useFileOperations] ✅ 单工作表Excel转换为CSV完成');
          } else {
            // 多个工作表，合并为一个CSV（添加工作表名称作为分隔）
            console.log('[useFileOperations] 🔄 处理多工作表Excel文件，合并为单个CSV');

            const allSheetsContent: string[] = [];

            for (const [sheetIndex, sheetName] of workbook.SheetNames.entries()) {
              console.log(
                `[useFileOperations] 🔨 处理工作表 ${sheetIndex + 1}/${workbook.SheetNames.length}: ${sheetName}`,
              );

              const worksheet = workbook.Sheets[sheetName];
              const csvContent = XLSX.utils.sheet_to_csv(worksheet, { forceQuotes: true });

              // 添加工作表标识
              if (csvContent.trim()) {
                allSheetsContent.push(`# 工作表: ${sheetName}`);
                allSheetsContent.push(csvContent);
                allSheetsContent.push(''); // 空行分隔
              }
            }

            fileContent = allSheetsContent.join('\n');
            console.log('[useFileOperations] ✅ 多工作表Excel合并为CSV完成', {
              totalSheets: workbook.SheetNames.length,
              finalContentLength: fileContent.length,
            });
          }
        } catch (excelError) {
          console.error('[useFileOperations] ❌ Excel文件处理失败:', excelError);
          throw new Error(
            `Excel文件处理失败: ${excelError instanceof Error ? excelError.message : String(excelError)}`,
          );
        }
      } else {
        // 对于非Excel文件，使用原有的text()方法
        console.log('[useFileOperations] 📄 处理非Excel文件，使用text()方法');
        fileContent = await fileData.text();
      }

      console.log('[useFileOperations] 文件内容处理完成', {
        contentLength: fileContent?.length,
        contentPreview: fileContent?.substring(0, 200) + '...',
        isExcel: isExcelFile,
      });

      if (!fileContent) {
        throw new Error('File content is empty');
      }

      console.log('[useFileOperations] 构建CarbonFlow Action');

      // 构建与 CarbonFlow.tsx 一致的 action，并通过事件分发
      const fileActionForEvent: CarbonFlowAction = {
        type: 'carbonflow',
        operation: 'file_parser',
        data: fileContent, // 统一的文本内容，Excel已转换为CSV
        content: `面板发起解析: ${file.name}`,
        description: `File parsing initiated from panel for ${file.name}`,
        fileName: file.name,
        fileId: file.id, // 添加文件ID用于事件匹配
      };

      console.log('[useFileOperations] 准备分发carbonflow-action事件', {
        actionType: fileActionForEvent.type,
        operation: fileActionForEvent.operation,
        fileName: fileActionForEvent.fileName,
        fileId: fileActionForEvent.fileId,
        dataLength: fileActionForEvent.data?.length,
        isExcelFile,
      });

      console.log('[useFileOperations] Dispatching carbonflow-action for file parsing:', fileActionForEvent);

      // 构建事件详情对象
      const eventDetail = { action: fileActionForEvent };

      const customEvent = new CustomEvent('carbonflow-action', {
        detail: eventDetail,
      });

      window.dispatchEvent(customEvent);

      console.log('[useFileOperations] carbonflow-action事件已分发');

      // 任务成功派发，清除超时处理
      clearTimeout(timeoutId);
    } catch (error: any) {
      // 清除超时处理
      clearTimeout(timeoutId);

      console.error('[useFileOperations] 在面板中准备文件解析并分发事件时出错:', error);
      console.error('[useFileOperations] 错误详情:', {
        errorMessage: error.message,
        errorStack: error.stack,
        fileName: file.name,
        fileId: file.id,
      });
      message.error({ content: `文件解析准备失败: ${error.message}`, key: 'parsingFile' });
      setUploadedFiles((prevFiles) =>
        prevFiles.map((f) => (f.id === file.id ? { ...f, status: 'failed' as UploadedFile['status'] } : f)),
      );
    }
  }, []);

  // 模态框文件处理
  const handleModalUploadChange: UploadProps['onChange'] = useCallback(
    ({ fileList: newFileListFromAntd }: { fileList: any[] }) => {
      const updatedModalFileList = newFileListFromAntd.map((fileFromAntd: any) => {
        const existingFileInOurList = modalFileList.find((mf) => mf.uid === fileFromAntd.uid);
        return {
          ...fileFromAntd,
          selectedType: existingFileInOurList?.selectedType || undefined,
        };
      });
      setModalFileList(updatedModalFileList);
    },
    [modalFileList],
  );

  const handleModalFileTypeChange = useCallback((fileUid: string, type: string) => {
    setModalFileList((prevList) =>
      prevList.map((file) => (file.uid === fileUid ? { ...file, selectedType: type } : file)),
    );
  }, []);

  const handleRemoveFileFromModalList = useCallback((fileUid: string) => {
    setModalFileList((prev) => prev.filter((file) => file.uid !== fileUid));
  }, []);

  const handleClearModalList = useCallback(() => {
    setModalFileList([]);
  }, []);

  // 更新文件状态（用于事件监听）
  const updateFileStatus = useCallback((fileId: string, status: string, content?: string) => {
    setUploadedFiles((prevFiles) =>
      prevFiles.map((f) =>
        f.id === fileId ? { ...f, status: status as UploadedFile['status'], content: content || f.content } : f,
      ),
    );
  }, []);

  return {
    // 状态
    uploadedFiles,
    isLoadingFiles,
    isUploading,
    modalFileList,
    selectedFileForParse,
    uploadModalFormRef,

    // 操作函数
    fetchWorkflowFiles,
    handleDeleteFile,
    handleUploadFiles,
    handlePreviewFile,
    handleParseFile,
    handleModalUploadChange,
    handleModalFileTypeChange,
    handleRemoveFileFromModalList,
    handleClearModalList,
    updateFileStatus,
    setSelectedFileForParse,
    setModalFileList,
  };
};
