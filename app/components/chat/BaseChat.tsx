/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { JSONValue, Message } from 'ai';
import React, { type RefCallback, useEffect, useState, useCallback, type RefObject } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { PROVIDER_LIST } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { APIKeyManager, getApiKeysFromCookies } from './APIKeyManager';
import Cookies from 'js-cookie';
import * as Tooltip from '@radix-ui/react-tooltip';
import { supabase } from '~/lib/supabase';
import * as XLSX from 'xlsx';
import { useFileOperations } from '~/components/workbench/CarbonFlow/panel/hooks/useFileOperations';
import type { CarbonFlowAction } from '~/types/actions';
import { ControlPanel } from '~/components/@settings';
import { useSettingsStore } from '~/lib/stores/settings';

import styles from './BaseChat.module.scss';
import { ExportChatButton } from '~/components/chat/chatExportAndImport/ExportChatButton';
import { ImportButtons } from '~/components/chat/chatExportAndImport/ImportButtons';
import { ExamplePrompts } from '~/components/chat/ExamplePrompts';
import GitCloneButton from './GitCloneButton';

import FilePreview from './FilePreview';
import { ModelSelector } from '~/components/chat/ModelSelector';
import { SpeechRecognitionButton } from '~/components/chat/SpeechRecognition';
import type { ProviderInfo } from '~/types/model';
import { ScreenshotStateManager } from './ScreenshotStateManager';
import { toast } from 'react-toastify';
import StarterTemplates from './StarterTemplates';
import type { ActionAlert, SupabaseAlert } from '~/types/actions';
import ChatAlert from './ChatAlert';
import type { ModelInfo } from '~/lib/modules/llm/types';
import ProgressCompilation from './ProgressCompilation';
import type { ProgressAnnotation } from '~/types/context';
import type { ActionRunner } from '~/lib/runtime/action-runner';
import { LOCAL_PROVIDERS } from '~/lib/stores/settings';
import { SupabaseChatAlert } from '~/components/chat/SupabaseAlert';
import { SupabaseConnection } from './SupabaseConnection';
import { WorkflowChatManager } from './WorkflowChatManager';

const TEXTAREA_MIN_HEIGHT = 76;

interface SheetInfo {
  name: string;
  headers: string[];
  data: Record<string, string>[];
  rowCount: number;
}

interface ParsedFileData {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  sheets: SheetInfo[];
  parseStatus: 'idle' | 'parsing' | 'success' | 'error';
  errorMessage?: string;
  fileSaved?: boolean;
}

const MessageDataTable = ({ fileData }: { fileData: ParsedFileData }) => {
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  if (!fileData || fileData.parseStatus !== 'success' || fileData.sheets.length === 0) {
    return null;
  }

  const activeSheet = fileData.sheets[activeSheetIndex];

  return (
    <div className="mt-2 p-2 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor text-sm">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h4 className="text-xs font-medium text-bolt-elements-textPrimary">{fileData.fileName}</h4>
          <div className="flex gap-2 text-xs text-bolt-elements-textSecondary mt-1">
            <span>{activeSheet.rowCount} 行</span>
            <span>{activeSheet.headers.length} 列</span>
          </div>
        </div>
      </div>

      {fileData.fileType === 'xlsx' && fileData.sheets.length > 1 && (
        <div className="flex border-b border-bolt-elements-borderColor mb-2">
          {fileData.sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              onClick={() => setActiveSheetIndex(index)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                activeSheetIndex === index
                  ? 'border-b-2 border-purple-500 text-bolt-elements-textPrimary'
                  : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-auto border border-bolt-elements-borderColor rounded max-h-[300px]">
        <table className="min-w-full text-xs">
          <thead className="bg-bolt-elements-background-depth-1 sticky top-0">
            <tr>
              {activeSheet.headers.map((header, index) => (
                <th
                  key={index}
                  className="px-2 py-1 text-left font-medium text-bolt-elements-textPrimary border-r border-b border-bolt-elements-borderColor last:border-r-0"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSheet.data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-bolt-elements-background-depth-2' : 'bg-transparent'}
              >
                {activeSheet.headers.map((header, colIndex) => (
                  <td
                    key={colIndex}
                    className="px-2 py-1 border-r border-b border-bolt-elements-borderColor last:border-r-0 text-bolt-elements-textPrimary whitespace-nowrap"
                  >
                    {row[header] || <span className="text-bolt-elements-textTertiary italic">空值</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface BaseChatProps {
  textareaRef?: RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefObject<HTMLDivElement> | RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  onStreamingChange?: (streaming: boolean) => void;
  messages?: Message[];
  description?: string;
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  providerList?: ProviderInfo[];
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
  importChat?: (description: string, messages: Message[]) => Promise<void>;
  exportChat?: () => void;
  uploadedFiles?: File[];
  setUploadedFiles?: (files: File[]) => void;
  imageDataList?: string[];
  setImageDataList?: (dataList: string[]) => void;
  actionAlert?: ActionAlert;
  clearAlert?: () => void;
  supabaseAlert?: SupabaseAlert;
  clearSupabaseAlert?: () => void;
  data?: JSONValue[] | undefined;
  actionRunner?: ActionRunner;
  promptId?: string;
  _carbonFlowData?: any;
  setInput?: (input: string) => void;
  workflowId?: string;
  workflowName?: string;
  workflowChatReady?: boolean;
  workflowHasChatHistory?: boolean;
  useKnowledgeBase?: boolean;
  setUseKnowledgeBase?: (use: boolean) => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      onStreamingChange,
      model,
      setModel,
      provider,
      setProvider,
      providerList,
      input = '',
      enhancingPrompt,
      handleInputChange,

      // promptEnhanced,
      enhancePrompt,
      sendMessage,
      handleStop,
      importChat,
      exportChat,
      uploadedFiles = [],
      setUploadedFiles,
      imageDataList = [],
      setImageDataList,
      messages,
      actionAlert,
      clearAlert,
      supabaseAlert,
      clearSupabaseAlert,
      data,
      actionRunner,
      promptId,
      _carbonFlowData,
      setInput,
      workflowId,
      workflowName,
      workflowChatReady,
      workflowHasChatHistory,
      useKnowledgeBase,
      setUseKnowledgeBase,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>(getApiKeysFromCookies());
    const [modelList, setModelList] = useState<ModelInfo[]>([]);
    const [isModelSettingsCollapsed, setIsModelSettingsCollapsed] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
    const [transcript, setTranscript] = useState('');
    const [isModelLoading, setIsModelLoading] = useState<string | undefined>('all');
    const [progressAnnotations, setProgressAnnotations] = useState<ProgressAnnotation[]>([]);
    const [parsedFileData, setParsedFileData] = useState<ParsedFileData | null>(null);
    const [showFilePreview, setShowFilePreview] = useState(false);
    const [activeSheetIndex, setActiveSheetIndex] = useState(0);
    const [includeFileContentInMessage, setIncludeFileContentInMessage] = useState(false);

    // 使用共享的文件操作hook
    const fileOperations = workflowId ? useFileOperations(workflowId) : null;

    // 添加设置面板状态管理
    const { isOpen: isSettingsOpen, openSettings, closeSettings } = useSettingsStore();

    // 简单可靠的强制滚动函数
    const forceScrollToBottom = useCallback(() => {
      try {
        // 尝试所有可能的滚动容器
        if (scrollRef) {
          if (typeof scrollRef === 'function') {
            /*
             * If it's a callback ref, we can't directly access .current or assign to scrollTop.
             * The callback itself should handle the node.
             * For forcing scroll, this specific path might need reconsideration on how to trigger scroll
             * or the component using this BaseChat needs to manage the scroll differently when passing a callback ref.
             */
          } else if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          }
        }

        // 直接查找消息容器
        const messagesContainer = document.querySelector('.flex-1.overflow-y-auto');

        if (messagesContainer && messagesContainer instanceof HTMLElement) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      } catch (error) {
        console.error('滚动失败:', error);
      }
    }, [scrollRef]);

    // 监听消息变化
    useEffect(() => {
      if (messages && messages.length > 0) {
        // 多次延时滚动
        forceScrollToBottom();
        setTimeout(forceScrollToBottom, 100);
        setTimeout(forceScrollToBottom, 300);
        setTimeout(forceScrollToBottom, 800);
      }
    }, [messages, forceScrollToBottom]);

    // 流式输出期间滚动
    useEffect(() => {
      if (!isStreaming) {
        return;
      }

      const scrollInterval = setInterval(() => {
        if (isStreaming) {
          forceScrollToBottom();
        }
      }, 200);

      // eslint-disable-next-line consistent-return
      return () => clearInterval(scrollInterval);
    }, [isStreaming, forceScrollToBottom]);

    useEffect(() => {
      if (workflowId) {
        if (!workflowChatReady) {
          console.log('[BaseChat] 工作流模式，等待聊天记录状态确认');
          return;
        }

        // 工作流模式下，只有确认没有聊天记录时才自动初始化
        if (!workflowHasChatHistory && (!messages || messages.length === 0)) {
          console.log('[BaseChat] 工作流模式，没有聊天记录，发送初始化消息');

          const timer = setTimeout(() => {
            if (typeof window !== 'undefined' && sendMessage) {
              const fakeEvent = {} as React.UIEvent;
              sendMessage(fakeEvent, '正在初始化您的专属碳顾问');
            }
          }, 0);

          return () => {
            clearTimeout(timer);
          };
        }

        console.log('[BaseChat] 工作流模式，已有聊天记录或消息，跳过自动初始化');

        return;
      }

      // 非工作流模式的自动初始化
      if (!messages || messages.length === 0) {
        const timer = setTimeout(() => {
          if (typeof window !== 'undefined' && sendMessage) {
            const fakeEvent = {} as React.UIEvent;
            sendMessage(fakeEvent, '正在初始化您的专属碳顾问');
          }
        }, 0);

        return () => {
          clearTimeout(timer);
        };
      }
    }, [messages, sendMessage, workflowId, workflowChatReady, workflowHasChatHistory]);

    useEffect(() => {
      if (data) {
        const progressList = data.filter(
          (x) => typeof x === 'object' && (x as any).type === 'progress',
        ) as ProgressAnnotation[];
        setProgressAnnotations(progressList);
      }
    }, [data]);

    useEffect(() => {
      console.log(transcript);
    }, [transcript]);

    useEffect(() => {
      onStreamingChange?.(isStreaming);
    }, [isStreaming, onStreamingChange]);

    useEffect(() => {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map((result) => result[0])
            .map((result) => result.transcript)
            .join('');

          setTranscript(transcript);

          if (handleInputChange) {
            const syntheticEvent = {
              target: { value: transcript },
            } as React.ChangeEvent<HTMLTextAreaElement>;
            handleInputChange(syntheticEvent);
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        setRecognition(recognition);
      }
    }, []);

    useEffect(() => {
      if (typeof window !== 'undefined') {
        let parsedApiKeys: Record<string, string> | undefined = {};

        try {
          parsedApiKeys = getApiKeysFromCookies();
          setApiKeys(parsedApiKeys);
        } catch (error) {
          console.error('Error loading API keys from cookies:', error);
          Cookies.remove('apiKeys');
        }

        setIsModelLoading('all');
        fetch('/api/models')
          .then((response) => response.json())
          .then((data) => {
            const typedData = data as { modelList: ModelInfo[] };
            setModelList(typedData.modelList);
          })
          .catch((error) => {
            console.error('Error fetching model list:', error);
          })
          .finally(() => {
            setIsModelLoading(undefined);
          });
      }
    }, [providerList, provider]);

    const onApiKeysChange = async (providerName: string, apiKey: string) => {
      const newApiKeys = { ...apiKeys, [providerName]: apiKey };
      setApiKeys(newApiKeys);
      Cookies.set('apiKeys', JSON.stringify(newApiKeys));

      setIsModelLoading(providerName);

      let providerModels: ModelInfo[] = [];

      try {
        const response = await fetch(`/api/models/${encodeURIComponent(providerName)}`);
        const data = await response.json();
        providerModels = (data as { modelList: ModelInfo[] }).modelList;
      } catch (error) {
        console.error('Error loading dynamic models for:', providerName, error);
      }

      // Only update models for the specific provider
      setModelList((prevModels) => {
        const otherModels = prevModels.filter((model) => model.provider !== providerName);
        return [...otherModels, ...providerModels];
      });
      setIsModelLoading(undefined);
    };

    const startListening = () => {
      if (recognition) {
        recognition.start();
        setIsListening(true);
      }
    };

    const stopListening = () => {
      if (recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    // 简化的文件上传处理函数
    const handleFileUpload = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.csv,.xlsx,.xls';

      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];

        if (!file) {
          return;
        }

        // 检查用户是否已登录
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast.error('请先登录后再上传文件');
          return;
        }

        if (file.type.startsWith('image/')) {
          // 图片处理保持原逻辑
          const reader = new FileReader();

          reader.onload = (e) => {
            const base64Image = e.target?.result as string;

            if (setUploadedFiles && setImageDataList) {
              setUploadedFiles([...uploadedFiles, file]);
              setImageDataList([...imageDataList, base64Image]);
            }
          };
          reader.readAsDataURL(file);
        } else if (
          file.type === 'text/csv' ||
          file.name.endsWith('.csv') ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel' ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.xls')
        ) {
          // CSV/Excel文件处理
          handleDataFileUpload(file);
        }
      };

      input.click();
    };

    // 新的数据文件处理函数，使用统一的文件操作接口
    const handleDataFileUpload = async (file: File) => {
      const isExcel =
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.type.includes('spreadsheetml') ||
        file.type.includes('ms-excel');

      setParsedFileData({
        fileName: file.name,
        sheets: [],
        parseStatus: 'parsing',
        fileType: isExcel ? 'xlsx' : 'csv',
      });
      setActiveSheetIndex(0);

      try {
        // 如果有workflowId且有文件操作hook，使用统一接口上传
        if (workflowId && fileOperations) {
          console.log('使用统一文件操作接口上传文件到工作流');

          // 创建符合RcFile要求的文件对象
          const rcFile = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          }) as any;

          // 添加RcFile需要的额外属性
          rcFile.uid = `upload-${Date.now()}`;

          // 创建模拟的ModalUploadFile格式
          const modalFile = {
            uid: `upload-${Date.now()}`,
            name: file.name,
            status: 'done' as const,
            originFileObj: rcFile,
            selectedType: 'BOM', // 默认类型，可以根据需要调整
          };

          // 添加到模态文件列表并上传
          fileOperations.setModalFileList([modalFile]);
          await fileOperations.handleUploadFiles();

          // 上传成功后，为CarbonFlow准备内容并进行本地预览
          const contentForAction = await readFileContent(file, isExcel);

          // 触发CarbonFlow文件解析
          try {
            const fileActionForEvent: CarbonFlowAction = {
              type: 'carbonflow',
              operation: 'file_parser',
              data: contentForAction,
              content: `BaseChat上传并解析: ${file.name}`,
              description: `File parsing initiated from BaseChat for ${file.name}`,
              fileName: file.name,
              fileId: file.name,
            };
            window.dispatchEvent(new CustomEvent('carbonflow-action', { detail: fileActionForEvent }));
            window.dispatchEvent(
              new CustomEvent('workflow-files-updated', { detail: { workflowId, fileName: file.name } }),
            );
          } catch (actionError) {
            console.error('[BaseChat] ❌ 派发CarbonFlow Action失败:', actionError);
          }

          // 为UI进行文件解析
          await parseFileForPreview(file, isExcel, true);

          toast.success(`文件 "${file.name}" 已成功保存到工作流`);
        } else {
          // 没有workflowId时，只做本地处理
          console.log('仅进行本地文件处理，不保存到工作流');
          await parseFileForPreview(file, isExcel, false);
          toast.success(`文件 "${file.name}" 解析成功（仅用于此次分析）`);
        }

        // 添加到本地文件列表用于UI显示
        if (setUploadedFiles) {
          setUploadedFiles([...uploadedFiles, file]);
        }

        setShowFilePreview(true);
      } catch (error) {
        console.error('文件处理失败:', error);
        setParsedFileData({
          fileName: file.name,
          sheets: [],
          parseStatus: 'error',
          fileType: isExcel ? 'xlsx' : 'csv',
          errorMessage: error instanceof Error ? error.message : '文件处理失败',
        });
        toast.error(`文件处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
      }
    };

    const parseFileForPreview = async (file: File, isExcel: boolean, fileSaved: boolean) => {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheets: SheetInfo[] = workbook.SheetNames.map((name) => {
          const worksheet = workbook.Sheets[name];
          const { headers, data } = parseWorksheet(worksheet);

          return { name, headers, data, rowCount: data.length };
        });
        setParsedFileData({
          fileName: file.name,
          fileType: 'xlsx',
          sheets,
          parseStatus: 'success',
          fileSaved,
        });
      } else {
        const content = await file.text();
        const { headers, data } = parseCSV(content);
        setParsedFileData({
          fileName: file.name,
          fileType: 'csv',
          sheets: [{ name: file.name, headers, data, rowCount: data.length }],
          parseStatus: 'success',
          fileSaved,
        });
      }
    };

    // 读取文件内容的辅助函数
    const readFileContent = async (file: File, isExcel: boolean): Promise<string> => {
      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        if (workbook.SheetNames.length === 1) {
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          return XLSX.utils.sheet_to_csv(worksheet, { forceQuotes: true });
        }

        // 多工作表合并
        const allSheetsContent: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const csvContent = XLSX.utils.sheet_to_csv(worksheet, { forceQuotes: true });
          if (csvContent.trim()) {
            allSheetsContent.push(`# 工作表: ${sheetName}`);
            allSheetsContent.push(csvContent);
            allSheetsContent.push('');
          }
        }
        return allSheetsContent.join('\n');
      }
      return file.text();
    };

    // 解析文件内容的辅助函数
    const parseWorksheet = (worksheet: XLSX.WorkSheet): { headers: string[]; data: Record<string, string>[] } => {
      // 将工作表转换为JSON格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // 使用数组格式，第一行作为表头
        defval: '', // 空单元格的默认值
        blankrows: false, // 跳过空行
      }) as (string | number | boolean | Date | null | undefined)[][];

      if (jsonData.length === 0) {
        return { headers: [], data: [] };
      }

      // 获取表头
      const rawHeaders = jsonData[0] || [];

      if (rawHeaders.length === 0) {
        return { headers: [], data: [] };
      }

      // 处理表头（与CSV处理逻辑相同）- 改进的命名逻辑
      const headerCounts: Record<string, number> = {};
      const emptyColumnIndices: number[] = [];
      const commonColumnNames = ['名称', '数量', '价格', '日期', '类型', '状态', '备注']; // 常见的中文列名

      const headers = rawHeaders.map((header, index) => {
        const trimmedHeader = String(header || '').trim();

        if (!trimmedHeader) {
          emptyColumnIndices.push(index);
          // 生成更智能的默认列名
          if (index < commonColumnNames.length) {
            return `${commonColumnNames[index]}(列${index + 1})`;
          }

          return `Column_${index + 1}`;
        }

        if (headerCounts[trimmedHeader]) {
          headerCounts[trimmedHeader]++;
          return `${trimmedHeader}_${headerCounts[trimmedHeader]}`;
        }
        headerCounts[trimmedHeader] = 1;

        return trimmedHeader;
      });

      // 处理数据行
      const data = jsonData.slice(1).map((row) => {
        const rowData: Record<string, string> = {};

        headers.forEach((header, colIndex) => {
          const cellValue = row[colIndex];

          // 处理各种数据类型，转换为字符串
          if (cellValue === null || cellValue === undefined) {
            rowData[header] = '';
          } else if (typeof cellValue === 'number') {
            rowData[header] = cellValue.toString();
          } else if (typeof cellValue === 'boolean') {
            rowData[header] = cellValue ? 'TRUE' : 'FALSE';
          } else if (cellValue instanceof Date) {
            rowData[header] = cellValue.toISOString().split('T')[0]; // 格式化日期
          } else {
            rowData[header] = String(cellValue).trim();
          }
        });

        return rowData;
      });

      // 显示处理信息 - 改进的提示信息
      if (emptyColumnIndices.length > 0) {
        toast.warning(`工作表中发现${emptyColumnIndices.length}个空列名，已自动生成建议名称。`);
      }

      const duplicateHeaders = Object.entries(headerCounts)
        .filter(([, count]) => count > 1)
        .map(([header]) => header);

      if (duplicateHeaders.length > 0) {
        toast.warning(`工作表中发现重复列名: ${duplicateHeaders.join(', ')}，已自动添加序号后缀区分`);
      }

      return { headers, data };
    };

    // 修改CSV解析工具函数
    const parseCSV = (csvContent: string): { headers: string[]; data: Record<string, string>[] } => {
      // 移除BOM标记
      const cleanContent = csvContent.replace(/^\uFEFF/, '');

      // 分割行，处理Windows和Unix换行符
      const rows = cleanContent.split(/\r?\n/).filter((row) => row.trim());

      if (rows.length === 0) {
        throw new Error('CSV文件为空');
      }

      // 解析表头
      const rawHeaders = parseCSVRow(rows[0]);

      if (rawHeaders.length === 0) {
        throw new Error('CSV文件必须包含表头');
      }

      // 处理空列名和重复列名 - 改进的命名逻辑
      const headerCounts: Record<string, number> = {};
      const emptyColumnIndices: number[] = [];
      const commonColumnNames = ['名称', '数量', '价格', '日期', '类型', '状态', '备注']; // 常见的中文列名

      const headers = rawHeaders.map((header, index) => {
        const trimmedHeader = header.trim();

        if (!trimmedHeader) {
          // 记录空列名的索引
          emptyColumnIndices.push(index);

          // 生成更智能的默认列名
          if (index < commonColumnNames.length) {
            return `${commonColumnNames[index]}(列${index + 1})`;
          } else {
            return `Column_${index + 1}`;
          }
        }

        if (headerCounts[trimmedHeader]) {
          headerCounts[trimmedHeader]++;
          return `${trimmedHeader}_${headerCounts[trimmedHeader]}`;
        } else {
          headerCounts[trimmedHeader] = 1;
          return trimmedHeader;
        }
      });

      // 改进的提示信息
      if (emptyColumnIndices.length > 0) {
        toast.warning(
          `发现${emptyColumnIndices.length}个空列名，已自动生成建议名称。建议手动修改列名以提高数据准确性。`,
        );
      }

      // 如果有重复列名，显示警告
      const duplicateHeaders = Object.entries(headerCounts)
        .filter(([_, count]) => count > 1)
        .map(([header]) => header);

      if (duplicateHeaders.length > 0) {
        toast.warning(`发现重复列名: ${duplicateHeaders.join(', ')}，已自动添加序号后缀区分`);
      }

      // 解析数据行
      const data = rows.slice(1).map((row, index) => {
        const values = parseCSVRow(row);
        const rowData: Record<string, string> = {};

        // 智能处理列数不匹配的情况
        if (values.length < headers.length) {
          // 如果数据行的列数少于表头，用空字符串填充
          const paddedValues = [...values, ...Array(headers.length - values.length).fill('')];
          headers.forEach((header, i) => {
            rowData[header] = paddedValues[i].trim();
          });
          if (index < 3) {
            // 只对前3行显示警告，避免过多提示
            toast.warning(`第${index + 2}行的列数少于表头，已自动填充空值`);
          }
        } else if (values.length > headers.length) {
          // 如果数据行的列数多于表头，截断多余的值
          headers.forEach((header, i) => {
            rowData[header] = values[i].trim();
          });
          if (index < 3) {
            // 只对前3行显示警告，避免过多提示
            toast.warning(`第${index + 2}行的列数多于表头，已自动截断多余的值`);
          }
        } else {
          // 列数匹配，正常处理
          headers.forEach((header, i) => {
            rowData[header] = values[i].trim();
          });
        }

        return rowData;
      });

      return { headers, data };
    };

    // 解析单行CSV数据
    const parseCSVRow = (row: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          if (inQuotes && row[i + 1] === '"') {
            // 处理双引号转义
            current += '"';
            i++;
          } else {
            // 切换引号状态
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // 字段分隔符
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }

      // 添加最后一个字段
      result.push(current);

      return result;
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;

      if (!items) {
        return;
      }

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();

          const file = item.getAsFile();

          if (file) {
            const reader = new FileReader();

            reader.onload = (e) => {
              const base64Image = e.target?.result as string;
              setUploadedFiles?.([...uploadedFiles, file]);
              setImageDataList?.([...imageDataList, base64Image]);
            };
            reader.readAsDataURL(file);
          }

          break;
        }
      }
    };

    // 添加事件监听器来处理隐藏消息
    useEffect(() => {
      const handleHiddenMessage = (event: CustomEvent) => {
        const hiddenMessage = event.detail;

        /*
         * 这里可以处理隐藏消息，例如将其添加到消息列表中但不显示
         * 或者通过其他方式传递给AI
         */
        console.log('Hidden message received:', hiddenMessage);

        /*
         * 如果需要，可以将隐藏消息添加到消息列表中
         * 但标记为不显示
         */
        if (messages && typeof messages === 'object') {
          /*
           * 这里需要根据您的消息处理逻辑来实现
           * 例如，可以添加一个特殊的标记，表示这条消息不应该显示
           */
        }
      };

      // 添加事件监听器
      window.addEventListener('sendHiddenMessage', handleHiddenMessage as EventListener);

      // 清理函数
      return () => {
        window.removeEventListener('sendHiddenMessage', handleHiddenMessage as EventListener);
      };
    }, [messages]);

    // 修改发送消息处理函数
    const handleSendMessage = useCallback(
      async (event: React.UIEvent<Element>, messageInput?: string) => {
        let messageContent = messageInput || input;

        if (!messageContent?.trim()) {
          return;
        }

        if (isStreaming) {
          handleStop?.();
          return;
        }

        if (isModelLoading) {
          return;
        }

        // 确保 promptId 是字符串
        if (typeof promptId !== 'string') {
          toast.error('缺少必要的 promptId');
          return;
        }

        // 处理文件数据的逻辑
        if (parsedFileData && parsedFileData.parseStatus === 'success' && parsedFileData.sheets.length > 0) {
          const fileStatusText = parsedFileData.fileSaved ? '(已保存到工作流)' : '(仅用于此次分析)';

          // 为发送给LLM的内容创建一个文本摘要
          const activeSheet = parsedFileData.sheets[activeSheetIndex];
          let fileNameText = parsedFileData.fileName;
          if (parsedFileData.fileType === 'xlsx' && parsedFileData.sheets.length > 1) {
            fileNameText += ` (工作表: ${activeSheet.name})`;
          }
          const summaryForLlm = `\n\n📎 **附件**: ${fileNameText} ${fileStatusText}\n📊 **数据概览**: ${activeSheet.rowCount}行 × ${activeSheet.headers.length}列\n💡 *用户上传了此文件，其内容已在对话中以内联表格形式展示。请根据用户提问和你的理解来分析此文件。*`;

          // 为用户界面创建一个特殊的标记，其中包含完整的表格数据
          const tableMarker = `\n[DATA_TABLE_RENDER]${JSON.stringify(parsedFileData)}`;
          messageContent = (messageInput || input) + summaryForLlm + tableMarker;
        }

        try {
          if (sendMessage) {
            await sendMessage(event, messageContent);

            if (setInput) {
              setInput('');
            }

            if (setUploadedFiles) {
              setUploadedFiles([]);
            }

            if (setImageDataList) {
              setImageDataList([]);
            }

            if (setParsedFileData) {
              setParsedFileData(null);
            }

            setTimeout(forceScrollToBottom, 100);
            setTimeout(forceScrollToBottom, 500);
          } else {
            throw new Error('sendMessage function is not provided');
          }
        } catch (error) {
          console.error('Error sending message:', error);
          toast.error('发送消息失败');
        }
      },
      [
        sendMessage,
        isStreaming,
        handleStop,
        isModelLoading,
        input,
        forceScrollToBottom,
        promptId,
        setInput,
        setUploadedFiles,
        setImageDataList,
        setParsedFileData,
        parsedFileData,
        activeSheetIndex,
        uploadedFiles,
        workflowId,
        useKnowledgeBase,
        includeFileContentInMessage,
      ],
    );

    const processedMessages =
      messages?.map((msg) => {
        if (msg.role === 'user' && msg.content.includes('[DATA_TABLE_RENDER]')) {
          const parts = msg.content.split('\n[DATA_TABLE_RENDER]');
          const textContent = parts[0];
          const jsonData = parts[1];
          if (jsonData) {
            try {
              const tableData = JSON.parse(jsonData) as ParsedFileData;
              return {
                ...msg,
                content: textContent,
                ui: <MessageDataTable fileData={tableData} />,
              };
            } catch (e) {
              console.error('Failed to parse table data from message', e);
              return msg; // Fallback to showing original message
            }
          }
        }
        return msg;
      }) || [];

    const baseChat = (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'flex flex-col h-screen fixed bottom-0 left-0 z-50 w-[25%] overflow-hidden bg-black/90 border border-bolt-elements-borderColor rounded-tl-lg shadow-lg',
        )}
        data-chat-visible={showChat}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div ref={scrollRef as any} className="flex flex-col flex-1 overflow-hidden w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col h-full w-full')}>
            {/* 工作流聊天记录管理 */}
            {workflowId && chatStarted && (
              <div className="flex justify-end p-2 border-b border-bolt-elements-borderColor/50">
                <WorkflowChatManager
                  workflowId={workflowId}
                  workflowName={workflowName || '工作流'}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                />
              </div>
            )}
            <div
              className={classNames('flex flex-col h-full justify-center', {
                'pt-12 px-3 lg:px-4': chatStarted, // 减少内边距，向左移动
              })}
            >
              <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-smooth pb-80">
                <ClientOnly>
                  {() => {
                    return chatStarted ? (
                      <Messages
                        ref={messageRef}
                        className="flex flex-col w-full flex-1 max-w-[90%] pb-6 mx-auto z-50 animate-fade-in text-sm"
                        messages={processedMessages}
                        isStreaming={isStreaming}
                      />
                    ) : null;
                  }}
                </ClientOnly>
              </div>

              {/* 输入区域 - 固定在底部 */}
              <div className="flex-shrink-0 pb-6">
                {supabaseAlert && (
                  <SupabaseChatAlert
                    alert={supabaseAlert}
                    clearAlert={() => clearSupabaseAlert?.()}
                    postMessage={(message) => {
                      sendMessage?.({} as any, message);
                      clearSupabaseAlert?.();
                    }}
                  />
                )}
                <div
                  className={classNames('flex flex-col gap-4 w-[90%] mx-auto z-40', {
                    'sticky bottom-0 bg-gradient-to-b from-transparent via-black/30 to-black/50 backdrop-blur-sm':
                      chatStarted,
                  })}
                >
                  <div className="bg-bolt-elements-background-depth-2/50 backdrop-blur-sm rounded-lg border border-bolt-elements-borderColor/50">
                    {actionAlert && (
                      <ChatAlert
                        alert={actionAlert}
                        clearAlert={clearAlert || (() => {})}
                        postMessage={(message) => {
                          sendMessage?.({} as any, message);
                          clearAlert?.();
                        }}
                      />
                    )}
                  </div>
                  {progressAnnotations && <ProgressCompilation data={progressAnnotations} />}
                  <div className="flex flex-col gap-4 w-full max-w-full mx-auto">
                    <div
                      className={classNames(
                        'bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full',
                      )}
                    >
                      <svg className={classNames(styles.PromptEffectContainer)}>
                        <defs>
                          <linearGradient
                            id="line-gradient"
                            x1="20%"
                            y1="0%"
                            x2="-14%"
                            y2="10%"
                            gradientUnits="userSpaceOnUse"
                            gradientTransform="rotate(-45)"
                          >
                            <stop offset="0%" stopColor="#b44aff" stopOpacity="0%"></stop>
                            <stop offset="40%" stopColor="#b44aff" stopOpacity="80%"></stop>
                            <stop offset="50%" stopColor="#b44aff" stopOpacity="80%"></stop>
                            <stop offset="100%" stopColor="#b44aff" stopOpacity="0%"></stop>
                          </linearGradient>
                          <linearGradient id="shine-gradient">
                            <stop offset="0%" stopColor="white" stopOpacity="0%"></stop>
                            <stop offset="40%" stopColor="#ffffff" stopOpacity="80%"></stop>
                            <stop offset="50%" stopColor="#ffffff" stopOpacity="80%"></stop>
                            <stop offset="100%" stopColor="white" stopOpacity="0%"></stop>
                          </linearGradient>
                        </defs>
                        <rect
                          className={classNames(styles.PromptEffectLine)}
                          pathLength="100"
                          strokeLinecap="round"
                        ></rect>
                        <rect className={classNames(styles.PromptShine)} x="48" y="24" width="70" height="1"></rect>
                      </svg>
                      <div>
                        <ClientOnly>
                          {() => (
                            <div className={isModelSettingsCollapsed ? 'hidden' : ''}>
                              <ModelSelector
                                key={provider?.name + ':' + modelList.length}
                                model={model}
                                setModel={setModel}
                                modelList={modelList}
                                provider={provider}
                                setProvider={setProvider}
                                providerList={providerList || (PROVIDER_LIST as ProviderInfo[])}
                                apiKeys={apiKeys}
                                modelLoading={isModelLoading}
                              />

                              {/* 全局工具模式切换器 - 支持Function Calling的provider都可以使用 */}
                              {provider &&
                                ['Aliyun', 'OpenAI', 'Anthropic', 'Google', 'OpenRouter'].includes(provider.name) && (
                                  <div className="mt-3 p-3 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-background-depth-2">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <label className="text-sm font-medium text-bolt-elements-textPrimary">
                                          智能工具模式
                                        </label>
                                        <p className="text-xs text-bolt-elements-textSecondary mt-0.5">
                                          开启后AI可使用专业知识库等工具来回答问题，提供更准确的技术信息
                                        </p>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                          type="checkbox"
                                          className="sr-only peer"
                                          checked={useKnowledgeBase}
                                          onChange={(e) => {
                                            setUseKnowledgeBase?.(e.target.checked);
                                            console.log('智能工具模式切换:', e.target.checked);
                                          }}
                                        />
                                        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                      </label>
                                    </div>
                                  </div>
                                )}

                              {(providerList || []).length > 0 &&
                                provider &&
                                (!LOCAL_PROVIDERS.includes(provider.name) || 'OpenAILike') && (
                                  <APIKeyManager
                                    provider={provider}
                                    apiKey={apiKeys[provider.name] || ''}
                                    setApiKey={(key) => {
                                      onApiKeysChange(provider.name, key);
                                    }}
                                  />
                                )}
                            </div>
                          )}
                        </ClientOnly>
                      </div>
                      <FilePreview
                        files={uploadedFiles}
                        imageDataList={imageDataList}
                        onRemove={(index) => {
                          // 检查是否删除了CSV/Excel文件
                          const fileToRemove = uploadedFiles[index];

                          if (
                            fileToRemove &&
                            (fileToRemove.type === 'text/csv' ||
                              fileToRemove.name.endsWith('.csv') ||
                              fileToRemove.name.endsWith('.xlsx') ||
                              fileToRemove.name.endsWith('.xls') ||
                              fileToRemove.type.includes('spreadsheetml') ||
                              fileToRemove.type.includes('ms-excel'))
                          ) {
                            setParsedFileData(null);
                          }

                          setUploadedFiles?.(uploadedFiles.filter((_, i) => i !== index));
                          setImageDataList?.(imageDataList.filter((_, i) => i !== index));
                        }}
                      />
                      {parsedFileData && showFilePreview && (
                        <div className="mt-4 p-4 bg-bolt-elements-background-depth-2 rounded-lg border border-bolt-elements-borderColor">
                          <div className="flex justify-between items-center mb-3">
                            <div>
                              <h3 className="text-sm font-medium text-bolt-elements-textPrimary">
                                {parsedFileData.fileType === 'xlsx' ? 'Excel' : 'CSV'} 文件预览:{' '}
                                {parsedFileData.fileName}
                              </h3>
                              <div className="flex gap-4 text-xs text-bolt-elements-textSecondary mt-1">
                                {(() => {
                                  const sheet = parsedFileData.sheets[activeSheetIndex];
                                  if (!sheet) {
                                    return null;
                                  }
                                  return (
                                    <>
                                      <span>共 {sheet.rowCount} 行数据</span>
                                      <span>{sheet.headers.length} 列</span>
                                    </>
                                  );
                                })()}
                                {parsedFileData.fileType === 'xlsx' && parsedFileData.sheets.length > 1 && (
                                  <span>
                                    工作表: {parsedFileData.sheets[activeSheetIndex].name} (共
                                    {parsedFileData.sheets.length}
                                    个)
                                  </span>
                                )}
                                <span
                                  className={`flex items-center gap-1 ${
                                    parsedFileData.fileSaved ? 'text-green-600' : 'text-yellow-600'
                                  }`}
                                >
                                  <div
                                    className={`i-ph:${
                                      parsedFileData.fileSaved ? 'check-circle' : 'warning-circle'
                                    } text-xs`}
                                  ></div>
                                  {parsedFileData.fileSaved ? '已保存到工作流' : '仅用于本地分析'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => setShowFilePreview(false)}
                              className="text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-colors"
                              title="关闭预览"
                            >
                              <div className="i-ph:x text-lg"></div>
                            </button>
                          </div>

                          {/* 工作表切换 Tabs */}
                          {parsedFileData.fileType === 'xlsx' && parsedFileData.sheets.length > 1 && (
                            <div className="flex border-b border-bolt-elements-borderColor mb-3">
                              {parsedFileData.sheets.map((sheet, index) => (
                                <button
                                  key={sheet.name}
                                  onClick={() => setActiveSheetIndex(index)}
                                  className={`px-4 py-2 text-xs font-medium transition-colors ${
                                    activeSheetIndex === index
                                      ? 'border-b-2 border-purple-500 text-bolt-elements-textPrimary'
                                      : 'text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary'
                                  }`}
                                >
                                  {sheet.name}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* 新增：文件内容包含控制开关 */}
                          <div className="my-3 p-2 bg-bolt-elements-background-depth-1 rounded text-xs border border-bolt-elements-borderColor">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={includeFileContentInMessage}
                                onChange={(e) => setIncludeFileContentInMessage(e.target.checked)}
                                className="w-3 h-3"
                              />
                              <span className="text-bolt-elements-textPrimary">发送消息时包含完整文件内容</span>
                              <span className="text-bolt-elements-textTertiary ml-auto">
                                (关闭则只发送文件概览信息)
                              </span>
                            </label>
                          </div>

                          {parsedFileData.parseStatus === 'parsing' && (
                            <div className="flex items-center gap-2 text-sm text-bolt-elements-textTertiary py-8 justify-center">
                              <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                              正在解析{parsedFileData.fileType === 'xlsx' ? 'Excel' : 'CSV'}文件...
                            </div>
                          )}

                          {parsedFileData.parseStatus === 'success' && parsedFileData.sheets[activeSheetIndex] && (
                            <div>
                              <div className="overflow-auto border border-bolt-elements-borderColor rounded max-h-[400px]">
                                <table className="min-w-full text-sm">
                                  <thead className="bg-bolt-elements-background-depth-1 sticky top-0">
                                    <tr>
                                      {parsedFileData.sheets[activeSheetIndex].headers.map((header, index) => (
                                        <th
                                          key={index}
                                          className="px-3 py-2 text-left text-xs font-medium text-bolt-elements-textPrimary border-r border-b border-bolt-elements-borderColor last:border-r-0"
                                          title={
                                            header.startsWith('Column_') ? `自动生成的列名 (原列${index + 1})` : header
                                          }
                                        >
                                          <div className="flex items-center gap-1">
                                            {header.startsWith('Column_') && (
                                              <div
                                                className="i-ph:warning text-yellow-500 text-xs"
                                                title="此列名为自动生成"
                                              ></div>
                                            )}
                                            <span className={header.startsWith('Column_') ? 'text-yellow-600' : ''}>
                                              {header}
                                            </span>
                                          </div>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {parsedFileData.sheets[activeSheetIndex].data.map((row, rowIndex) => (
                                      <tr
                                        key={rowIndex}
                                        className={
                                          rowIndex % 2 === 0
                                            ? 'bg-bolt-elements-background-depth-2'
                                            : 'bg-transparent'
                                        }
                                      >
                                        {parsedFileData.sheets[activeSheetIndex].headers.map((header, colIndex) => (
                                          <td
                                            key={colIndex}
                                            className="px-3 py-2 border-r border-b border-bolt-elements-borderColor last:border-r-0 text-bolt-elements-textPrimary whitespace-nowrap"
                                            title={row[header]}
                                          >
                                            {row[header] || (
                                              <span className="text-bolt-elements-textTertiary italic">空值</span>
                                            )}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {parsedFileData.parseStatus === 'error' && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded">
                              <div className="flex items-center gap-2 text-red-700">
                                <div className="i-ph:warning-circle text-lg"></div>
                                <span className="font-medium">解析失败</span>
                              </div>
                              <div className="text-sm text-red-600 mt-1">{parsedFileData.errorMessage}</div>
                            </div>
                          )}
                        </div>
                      )}
                      <ClientOnly>
                        {() => (
                          <ScreenshotStateManager
                            setUploadedFiles={setUploadedFiles}
                            setImageDataList={setImageDataList}
                            uploadedFiles={uploadedFiles}
                            imageDataList={imageDataList}
                          />
                        )}
                      </ClientOnly>
                      <div
                        className={classNames(
                          'relative shadow-xs border border-bolt-elements-borderColor backdrop-blur rounded-lg',
                        )}
                      >
                        <textarea
                          ref={textareaRef}
                          className={classNames(
                            'w-full pl-4 pt-4 pr-16 outline-none resize-none text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent text-sm',
                            'transition-all duration-200',
                            'hover:border-bolt-elements-focus',
                          )}
                          onDragEnter={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.border = '2px solid #1488fc';
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.border = '2px solid #1488fc';
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.border = '1px solid var(--bolt-elements-borderColor)';

                            const files = Array.from(e.dataTransfer.files);
                            files.forEach((file) => {
                              if (file.type.startsWith('image/')) {
                                const reader = new FileReader();

                                reader.onload = (e) => {
                                  const base64Image = e.target?.result as string;
                                  setUploadedFiles?.([...uploadedFiles, file]);
                                  setImageDataList?.([...imageDataList, base64Image]);
                                };
                                reader.readAsDataURL(file);
                              }
                            });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              if (event.shiftKey) {
                                return;
                              }

                              event.preventDefault();

                              if (isStreaming) {
                                handleStop?.();
                                return;
                              }

                              // ignore if using input method engine
                              if (event.nativeEvent.isComposing) {
                                return;
                              }

                              handleSendMessage?.(event);
                            }
                          }}
                          value={input}
                          onChange={(event) => {
                            handleInputChange?.(event);
                          }}
                          onPaste={handlePaste}
                          style={{
                            minHeight: TEXTAREA_MIN_HEIGHT,
                            maxHeight: TEXTAREA_MAX_HEIGHT,
                          }}
                          placeholder="您好, 我能帮你完成你的碳排放报告, 请你说出你的需求?"
                          translate="no"
                        />
                        <ClientOnly>
                          {() => (
                            <SendButton
                              show={input.length > 0 || isStreaming || uploadedFiles.length > 0}
                              isStreaming={isStreaming}
                              disabled={!providerList || providerList.length === 0}
                              onClick={(event) => {
                                if (isStreaming) {
                                  handleStop?.();
                                  return;
                                }

                                if (input.length > 0 || uploadedFiles.length > 0) {
                                  handleSendMessage?.(event);
                                }
                              }}
                            />
                          )}
                        </ClientOnly>
                        <div className="flex justify-between items-center text-sm p-4 pt-2">
                          <div className="flex gap-1 items-center">
                            <IconButton
                              title="Upload file"
                              className="transition-all"
                              onClick={() => handleFileUpload()}
                            >
                              <div className="i-ph:paperclip text-xl"></div>
                            </IconButton>
                            <IconButton
                              title="Enhance prompt"
                              disabled={input.length === 0 || enhancingPrompt}
                              className={classNames('transition-all', enhancingPrompt ? 'opacity-100' : '')}
                              onClick={() => {
                                enhancePrompt?.();
                                toast.success('Prompt enhanced!');
                              }}
                            >
                              {enhancingPrompt ? (
                                <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                              ) : (
                                <div className="i-bolt:stars text-xl"></div>
                              )}
                            </IconButton>

                            <SpeechRecognitionButton
                              isListening={isListening}
                              onStart={startListening}
                              onStop={stopListening}
                              disabled={isStreaming}
                            />
                            {chatStarted && (
                              <ClientOnly>{() => <ExportChatButton exportChat={exportChat} />}</ClientOnly>
                            )}
                            <IconButton
                              title="Model Settings"
                              className={classNames('transition-all flex items-center gap-1', {
                                'bg-bolt-elements-item-backgroundAccent text-bolt-elements-item-contentAccent':
                                  isModelSettingsCollapsed,
                                'bg-bolt-elements-item-backgroundDefault text-bolt-elements-item-contentDefault':
                                  !isModelSettingsCollapsed,
                              })}
                              onClick={() => setIsModelSettingsCollapsed(!isModelSettingsCollapsed)}
                              disabled={!providerList || providerList.length === 0}
                            >
                              <div className={`i-ph:caret-${isModelSettingsCollapsed ? 'right' : 'down'} text-lg`} />
                              {isModelSettingsCollapsed ? <span className="text-xs">{model}</span> : <span />}
                            </IconButton>
                            <IconButton
                              title="Settings"
                              className="transition-all"
                              onClick={() => openSettings()}
                            >
                              <div className="i-ph:gear text-xl"></div>
                            </IconButton>
                          </div>
                          {input.length > 3 ? (
                            <div className="text-xs text-bolt-elements-textTertiary">
                              Use{' '}
                              <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">
                                Shift
                              </kbd>{' '}
                              +{' '}
                              <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">
                                Return
                              </kbd>{' '}
                              a new line
                            </div>
                          ) : null}
                          <SupabaseConnection />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Workbench区域 - 右侧 */}
          <ClientOnly>
            {() => (
              <Workbench
                actionRunner={actionRunner ?? ({} as ActionRunner)}
                chatStarted={chatStarted}
                isStreaming={isStreaming}
              />
            )}
          </ClientOnly>
        </div>
      </div>
    );

    return (
      <>
        <Tooltip.Provider delayDuration={200}>{baseChat}</Tooltip.Provider>
        <ControlPanel open={isSettingsOpen} onClose={closeSettings} />
      </>
    );
  },
);
