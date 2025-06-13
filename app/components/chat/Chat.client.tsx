/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from 'ai/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts, useSnapScroll } from '~/lib/hooks';
import { description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { chatMessagesStore } from '~/lib/stores/chatMessagesStore';
import { workbenchStore } from '~/lib/stores/workbench';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { cubicBezier } from 'framer-motion';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { streamingState } from '~/lib/stores/streaming';
import { supabaseConnection } from '~/lib/stores/supabase';
import { subscribeToCarbonFlowData } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';
import { useLoaderData } from '@remix-run/react';
import { useWorkflowChat } from '~/lib/hooks/useWorkflowChat';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

const cubicEasingFn = cubicBezier(0.4, 0, 0.2, 1);

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-bolt-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-bolt-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
    workflowSaveChatHistory?: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory, workflowSaveChatHistory } =
      options;
    parseMessages(messages, isLoading);

    // 改进的保存条件：消息数量增加 OR 流式输出结束且有消息
    const shouldSave =
      messages.length > initialMessages.length ||
      (!isLoading && messages.length > 0 && messages.length >= initialMessages.length);

    if (shouldSave) {
      console.log('[processSampledMessages] 触发保存，消息数量:', messages.length, '流式状态:', isLoading);

      // 根据是否存在工作流，选择不同的保存策略
      if (workflowSaveChatHistory) {
        workflowSaveChatHistory(messages).catch((error) => {
          console.error('工作流聊天记录保存失败:', error);
        });
      } else {
        storeMessageHistory(messages).catch((error) => toast.error(error.message));
      }
    }
  },
  50,
);

interface ChatProps {
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

export const ChatImpl = memo(({ description, storeMessageHistory, importChat, exportChat }: ChatProps) => {
  useShortcuts();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [imageDataList, setImageDataList] = useState<string[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const actionAlert = useStore(workbenchStore.actionAlert);
  const supabaseAlert = useStore(workbenchStore.supabaseAlert);
  const supabaseConn = useStore(supabaseConnection);
  const selectedProject = supabaseConn.stats?.projects?.find(
    (project) => project.id === supabaseConn.selectedProjectId,
  );
  const { activeProviders, promptId, contextOptimizationEnabled } = useSettings();
  const { workflow } = useLoaderData<any>();

  const workflowChat = useWorkflowChat({
    workflowId: workflow?.id,
    enabled: !!workflow?.id,
  });

  const [model, setModel] = useState(() => {
    const savedModel = Cookies.get('selectedModel');
    return savedModel || DEFAULT_MODEL;
  });
  const [provider, setProvider] = useState(() => {
    const savedProvider = Cookies.get('selectedProvider');
    return (PROVIDER_LIST.find((p) => p.name === savedProvider) || DEFAULT_PROVIDER) as ProviderInfo;
  });

  const { showChat } = useStore(chatStore);

  const [animationScope, animate] = useAnimate();

  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  const messagesFromStore = useStore(chatMessagesStore);
  const [carbonFlowData, setCarbonFlowData] = useState<any>(null);
  const [toolMode, setToolMode] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCarbonFlowData((data) => {
      console.log('[Chat] 收到CarbonFlow数据更新:', data);
      console.log('[Chat] 数据详情 - sceneInfo:', data?.sceneInfo);
      console.log('[Chat] 数据详情 - nodes:', data?.nodes?.length);
      console.log('[Chat] 数据详情 - aiSummary:', data?.aiSummary);
      setCarbonFlowData(data);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const {
    messages,
    isLoading,
    input,
    handleInputChange,
    setInput,
    stop,
    append,
    setMessages,
    error,
    data: chatData,
    setData,
  } = useChat({
    api: '/api/chat',
    body: (() => {
      let finalCarbonFlowDataPayload = null;

      if (carbonFlowData) {
        finalCarbonFlowDataPayload = {
          workflowId: carbonFlowData?.workflowId || workflow?.id,
          workflowName: carbonFlowData?.name || workflow?.name,
          workflowStatus: carbonFlowData?.status || workflow?.status,
          sceneInfo: workflow?.sceneInfo ?? carbonFlowData?.sceneInfo ?? null,
          nodes: carbonFlowData?.nodes ?? [],
          edges: carbonFlowData?.edges ?? [],
          complianceReport: carbonFlowData?.complianceReport ?? null,
          aiSummary: carbonFlowData?.aiSummary ?? null,
          tasks: carbonFlowData?.tasks ?? [],
          tasksStats: {
            total: carbonFlowData?.tasks?.length || 0,
            completed: carbonFlowData?.tasks?.filter((task: any) => task.status === 'completed').length || 0,
            pending: carbonFlowData?.tasks?.filter((task: any) => task.status === 'pending').length || 0,
          },
          dataStats: {
            totalNodes: carbonFlowData?.nodes?.length || 0,
            nodesByType:
              carbonFlowData?.nodes?.reduce((acc: any, node: any) => {
                acc[node.type] = (acc[node.type] || 0) + 1;
                return acc;
              }, {}) || {},
            nodesWithCarbonFactor: carbonFlowData?.nodes?.filter((node: any) => node.data.carbonFactor).length || 0,
            nodesWithEmissions: carbonFlowData?.nodes?.filter((node: any) => node.data.carbonFootprint).length || 0,
          },
          lastUpdated: carbonFlowData?.updatedAt || new Date().toISOString(),
        };

        console.log('[Chat] 准备发送carbonFlowData给API:', finalCarbonFlowDataPayload);
      } else {
        console.log('[Chat] carbonFlowData为空，不发送数据');
      }

      const requestBody = {
        apiKeys,
        files: uploadedFiles,
        selectedProvider: provider.name,
        contextOptimizationEnabled,
        promptId,
        contextOptimization: contextOptimizationEnabled,
        carbonFlowData: finalCarbonFlowDataPayload,
        toolMode,
        supabase: {
          isConnected: supabaseConn.isConnected,
          hasSelectedProject: !!selectedProject,
          credentials: {
            supabaseUrl: supabaseConn?.credentials?.supabaseUrl,
            anonKey: supabaseConn?.credentials?.anonKey,
          },
        },
      };

      return requestBody;
    })(),
    sendExtraMessageFields: true,
    onError: (e) => {
      logger.error('Request failed\n\n', e, error);
      toast.error(
        'There was an error processing your request: ' + (e.message ? e.message : 'No details were returned'),
      );
    },
    onFinish: (message, options) => {
      console.log('[Chat] AI消息完成:', message);

      const usage = options.usage;
      setData(undefined);

      if (usage) {
        console.log('Token usage:', usage);
      }

      logger.debug('Finished streaming');
    },
    initialMessages: [],
    initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
  });

  // 当工作流聊天记录加载完成时，动态设置消息
  useEffect(() => {
    if (workflow?.id && workflowChat.isReady) {
      if (workflowChat.hasChatHistory && messagesFromStore.length > 0) {
        console.log('[Chat] 设置工作流聊天记录:', messagesFromStore.length, '条消息');
        setMessages(messagesFromStore);
      } else {
        console.log('[Chat] 工作流没有聊天记录，清空消息');
        setMessages([]);
      }
    }
  }, [workflow?.id, workflowChat.isReady, workflowChat.hasChatHistory, messagesFromStore, setMessages]);

  // 处理URL中的prompt参数
  useEffect(() => {
    const prompt = searchParams.get('prompt');

    if (prompt) {
      setSearchParams({});
      runAnimation();
      append({
        role: 'user',
        content: [
          {
            type: 'text',
            text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${prompt}`,
          },
        ] as any,
      });
    }
  }, [model, provider, searchParams]);

  const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
  const { parsedMessages, parseMessages } = useMessageParser();

  const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
  const TEXTAREA_MIN_HEIGHT = 48;

  // 工作流聊天记录初始化逻辑
  useEffect(() => {
    if (workflow?.id && workflowChat.isReady) {
      console.log('[Chat] 工作流聊天记录状态:', {
        hasChatHistory: workflowChat.hasChatHistory,
        messagesCount: messagesFromStore.length,
        isLoading: workflowChat.isLoading,
      });

      if (!workflowChat.hasChatHistory) {
        setChatStarted(false);
        chatStore.setKey('started', false);
        console.log('[Chat] 没有聊天记录，显示引导信息');
      } else {
        setChatStarted(true);
        chatStore.setKey('started', true);
        console.log('[Chat] 找到聊天记录，直接进入聊天状态');
      }
    } else if (!workflow?.id) {
      // 非工作流模式，使用默认行为
      setChatStarted(true);
      chatStore.setKey('started', true);
    }
  }, [workflow?.id, workflowChat.isReady, workflowChat.hasChatHistory]);

  useEffect(() => {
    const { started } = chatStore.get();

    if (started !== chatStarted) {
      setChatStarted(started);
    }
  }, [chatStarted]);

  useEffect(() => {
    processSampledMessages({
      messages,
      initialMessages: messagesFromStore,
      isLoading,
      parseMessages,
      storeMessageHistory,
      workflowSaveChatHistory: workflow?.id ? workflowChat.saveChatHistory : undefined,
    });
  }, [
    messages,
    isLoading,
    parseMessages,
    storeMessageHistory,
    messagesFromStore,
    workflow?.id,
    workflowChat.saveChatHistory,
  ]);

  // 监听AI消息完成状态，确保流式输出结束时保存
  const prevIsLoadingRef = useRef(isLoading);
  useEffect(() => {
    const prevIsLoading = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;

    // 当流式输出从 true 变为 false 时（AI消息完成），强制触发保存
    if (prevIsLoading && !isLoading && messages.length > 0 && workflow?.id) {
      console.log('[Chat] AI流式输出完成，强制触发保存');
      setTimeout(() => {
        // 使用setTimeout确保消息状态完全更新
        if (workflowChat.saveChatHistory) {
          workflowChat.saveChatHistory(messages).catch((error) => {
            console.error('[Chat] AI消息完成后强制保存失败:', error);
          });
        }
      }, 200); // 稍微增加延迟确保状态稳定
    }
  }, [isLoading, messages, workflow?.id, workflowChat.saveChatHistory]);

  const scrollTextArea = () => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.scrollTop = textarea.scrollHeight;
    }
  };

  const abort = () => {
    stop();
    chatStore.setKey('aborted', true);
    workbenchStore.abortAllActions();

    toast.error('There was an error processing your request: ' + (error ? error.message : 'No details were returned'));
  };

  useEffect(() => {
    const textarea = textareaRef.current;

    if (textarea) {
      textarea.style.height = 'auto';

      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.max(TEXTAREA_MIN_HEIGHT, Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT))}px`;
      textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
    }
  }, [input, textareaRef]);

  const runAnimation = async () => {
    try {
      const examplesElement = document.getElementById('examples');
      const introElement = document.getElementById('intro');

      if (examplesElement) {
        await animate(
          examplesElement,
          { opacity: 0 },
          {
            duration: 0.3,
            ease: cubicEasingFn,
          },
        );
        examplesElement.style.display = 'none';
      }

      if (introElement) {
        await animate(
          introElement,
          { opacity: 0 },
          {
            duration: 0.3,
            ease: cubicEasingFn,
          },
        );
        introElement.style.display = 'none';
      }

      setChatStarted(true);
    } catch (error) {
      console.error('Animation error:', error);

      setChatStarted(true);
    }
  };
  const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
    const messageContent = messageInput || input;

    if (!messageContent?.trim()) {
      return;
    }

    if (isLoading) {
      abort();
      return;
    }

    runAnimation();

    // 构造用户消息，包含文本和图片
    let userMessageContent: any;

    if (imageDataList.length > 0) {
      // 如果有图片，创建多模态内容
      const contentItems = [];

      // 添加文本内容
      contentItems.push({
        type: 'text',
        text: `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`,
      });

      // 添加图片内容
      imageDataList.forEach((imageBase64) => {
        contentItems.push({
          type: 'image',
          image: imageBase64,
        });
      });

      userMessageContent = contentItems;
    } else {
      // 只有文本内容
      userMessageContent = `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${messageContent}`;
    }

    const userMessage = {
      id: `${Date.now()}-user`,
      role: 'user' as const,
      content: userMessageContent,
    };

    append(userMessage);
    setInput('');
    setUploadedFiles([]);
    setImageDataList([]);
    resetEnhancer();
    textareaRef.current?.blur();
  };
  const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(event);
  };

  const debouncedCachePrompt = useCallback(
    debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const trimmedValue = event.target.value.trim();
      Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
    }, 1000),
    [],
  );

  const [messageRef, scrollRef] = useSnapScroll();
  const scrollRefObject = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedApiKeys = Cookies.get('apiKeys');

    if (storedApiKeys) {
      setApiKeys(JSON.parse(storedApiKeys));
    }
  }, []);

  useEffect(() => {
    if (scrollRefObject.current) {
      scrollRef(scrollRefObject.current);
    }
  }, [scrollRef]);

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    Cookies.set('selectedModel', newModel, { expires: 30 });
  };

  const handleProviderChange = (newProvider: ProviderInfo) => {
    setProvider(newProvider);
    Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
  };

  useEffect(() => {
    const handleChatHistoryUpdate = (event: CustomEvent) => {
      if (event.detail?.messages) {
        setMessages(event.detail.messages);
      }
    };

    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate as EventListener);

    return () => {
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate as EventListener);
    };
  }, []);

  return (
    <BaseChat
      ref={animationScope}
      textareaRef={textareaRef}
      input={input}
      showChat={showChat}
      chatStarted={chatStarted}
      isStreaming={isLoading}
      onStreamingChange={(streaming) => {
        streamingState.set(streaming);
      }}
      enhancingPrompt={enhancingPrompt}
      promptEnhanced={promptEnhanced}
      sendMessage={sendMessage}
      model={model}
      setModel={handleModelChange}
      provider={provider}
      setProvider={handleProviderChange}
      providerList={activeProviders}
      messageRef={messageRef}
      scrollRef={scrollRefObject}
      handleInputChange={(e) => {
        onTextareaChange(e);
        debouncedCachePrompt(e);
      }}
      handleStop={abort}
      description={description}
      importChat={importChat}
      exportChat={exportChat}
      messages={messages.map((message, i) => {
        if (message.role === 'user') {
          return message;
        }

        return {
          ...message,
          content: parsedMessages[i] || '',
        };
      })}
      enhancePrompt={() => {
        enhancePrompt(
          input,
          (input) => {
            setInput(input);
            scrollTextArea();
          },
          model,
          provider,
          apiKeys,
        );
      }}
      uploadedFiles={uploadedFiles}
      setUploadedFiles={setUploadedFiles}
      imageDataList={imageDataList}
      setImageDataList={setImageDataList}
      actionAlert={actionAlert}
      clearAlert={() => workbenchStore.clearAlert()}
      supabaseAlert={supabaseAlert}
      clearSupabaseAlert={() => workbenchStore.clearSupabaseAlert()}
      data={chatData}
      promptId={promptId}
      workflowId={workflow?.id}
      workflowName={workflow?.name}
      workflowChatReady={workflowChat.isReady}
      workflowHasChatHistory={workflowChat.hasChatHistory}
      useKnowledgeBase={toolMode}
      setUseKnowledgeBase={setToolMode}
    />
  );
});
