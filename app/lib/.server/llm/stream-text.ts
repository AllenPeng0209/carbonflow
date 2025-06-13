import { convertToCoreMessages, streamText as _streamText, type Message } from 'ai';
import { MAX_TOKENS, type FileMap } from './constants';
import { getSystemPrompt } from '~/lib/common/prompts/prompts';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, MODIFICATIONS_TAG_NAME, PROVIDER_LIST, WORK_DIR } from '~/utils/constants';
import type { IProviderSetting } from '~/types/model';
import { PromptLibrary } from '~/lib/common/prompt-library';
import { allowedHTMLElements } from '~/utils/markdown';
import { LLMManager } from '~/lib/modules/llm/manager';
import { createScopedLogger } from '~/utils/logger';
import { createFilesContext, extractPropertiesFromMessage } from './utils';
import { getFilePaths } from './select-context';
import { getAllTools, getToolsSystemPrompt, getToolChoiceStrategy } from '~/lib/modules/llm/tools';

export type Messages = Message[];

// 新增: CarbonFlowData接口定义
export interface CarbonFlowData {
  // 基本工作流信息
  workflowId?: string;
  workflowName?: string;
  workflowStatus?: string;

  // 场景信息
  sceneInfo?: any;

  // 节点和边数据
  nodes?: any[];
  edges?: any[];

  // AI分析结果
  aiSummary?: any;

  // 合规报告信息
  complianceReport?: any;

  // 任务进度信息
  tasks?: any[];
  tasksStats?: {
    total: number;
    completed: number;
    pending: number;
  };

  // 数据统计
  dataStats?: {
    totalNodes: number;
    nodesByType: Record<string, number>;
    nodesWithCarbonFactor: number;
    nodesWithEmissions: number;
  };

  // 时间戳
  lastUpdated?: string;

  // 保留旧的字段以兼容
  Score?: any;
  State?: any;
}

export interface StreamingOptions extends Omit<Parameters<typeof _streamText>[0], 'model'> {
  supabaseConnection?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: {
      anonKey?: string;
      supabaseUrl?: string;
    };
  };
  carbonFlowData?: CarbonFlowData; // 添加carbonFlowData属性
  onToolStart?: (toolCall: any) => void; // 工具开始执行回调
  onToolComplete?: (toolCall: any, result: any, duration?: number) => void; // 工具完成回调
}

const logger = createScopedLogger('stream-text');

export async function streamText(props: {
  messages: Omit<Message, 'id'>[];
  env?: Env;
  options?: StreamingOptions;
  apiKeys?: Record<string, string>;
  files?: FileMap;
  providerSettings?: Record<string, IProviderSetting>;
  promptId?: string;
  contextOptimization?: boolean;
  contextFiles?: FileMap;
  summary?: string;
  messageSliceId?: number;
  carbonFlowData?: CarbonFlowData; // 新增: 碳足迹数据参数
  toolMode?: boolean; // 简化: 直接控制是否启用工具模式
}) {
  const {
    messages,
    env: serverEnv,
    options,
    apiKeys,
    files,
    providerSettings,
    promptId,
    contextOptimization,
    contextFiles,
    summary,
    carbonFlowData, // 新增: 碳足迹数据
    toolMode = true, // 简化: 直接使用工具模式标志
  } = props;
  let currentModel = DEFAULT_MODEL;
  let currentProvider = DEFAULT_PROVIDER.name;
  let processedMessages = messages.map((message) => {
    if (message.role === 'user') {
      const { model, provider, content } = extractPropertiesFromMessage(message);
      currentModel = model;
      currentProvider = provider;

      return { ...message, content };
    } else if (message.role == 'assistant') {
      let content = message.content;
      content = content.replace(/<div class=\\"__boltThought__\\">.*?<\/div>/s, '');
      content = content.replace(/<think>.*?<\/think>/s, '');

      return { ...message, content };
    }

    return message;
  });

  const provider = PROVIDER_LIST.find((p) => p.name === currentProvider) || DEFAULT_PROVIDER;
  const staticModels = LLMManager.getInstance().getStaticModelListFromProvider(provider);
  let modelDetails = staticModels.find((m) => m.name === currentModel);

  if (!modelDetails) {
    const modelsList = [
      ...(provider.staticModels || []),
      ...(await LLMManager.getInstance().getModelListFromProvider(provider, {
        apiKeys,
        providerSettings,
        serverEnv: serverEnv as any,
      })),
    ];

    if (!modelsList.length) {
      throw new Error(`No models found for provider ${provider.name}`);
    }

    modelDetails = modelsList.find((m) => m.name === currentModel);

    if (!modelDetails) {
      // Fallback to first model
      logger.warn(
        `MODEL [${currentModel}] not found in provider [${provider.name}]. Falling back to first model. ${modelsList[0].name}`,
      );
      modelDetails = modelsList[0];
    }
  }

  const dynamicMaxTokens = modelDetails && modelDetails.maxTokenAllowed ? modelDetails.maxTokenAllowed : MAX_TOKENS;

  let systemPrompt =
    PromptLibrary.getPropmtFromLibrary(promptId || 'default', {
      cwd: WORK_DIR,
      allowedHtmlElements: allowedHTMLElements,
      modificationTagName: MODIFICATIONS_TAG_NAME,
      supabase: {
        isConnected: options?.supabaseConnection?.isConnected || false,
        hasSelectedProject: options?.supabaseConnection?.hasSelectedProject || false,
        credentials: options?.supabaseConnection?.credentials || undefined,
      },
    }) ?? getSystemPrompt();

  // 添加碳足迹数据到系统提示
  if (carbonFlowData) {
    let carbonFlowContext = '\n\n=== 内部上下文数据 ===\n';
    carbonFlowContext +=
      '重要说明：以下信息仅供您内部参考使用，请勿直接输出给用户。请基于这些上下文信息理解当前工作流状态并提供相关分析。\n\n';
    carbonFlowContext += '碳足迹工作流数据：\n';

    // 基本工作流信息
    if (carbonFlowData.workflowId) {
      carbonFlowContext += `工作流信息：\n`;
      carbonFlowContext += `- 工作流ID：${carbonFlowData.workflowId}\n`;
      carbonFlowContext += `- 工作流名称：${carbonFlowData.workflowName || '未命名'}\n`;
      carbonFlowContext += `- 当前状态：${carbonFlowData.workflowStatus || '进行中'}\n`;
      carbonFlowContext += `- 最后更新：${carbonFlowData.lastUpdated || '未知'}\n\n`;
    }

    // 任务进度信息
    if (carbonFlowData.tasksStats) {
      const { total, completed, pending } = carbonFlowData.tasksStats;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      carbonFlowContext += `任务进度：\n`;
      carbonFlowContext += `- 总任务数：${total}\n`;
      carbonFlowContext += `- 已完成：${completed}\n`;
      carbonFlowContext += `- 待处理：${pending}\n`;
      carbonFlowContext += `- 完成率：${completionRate}%\n\n`;

      if (carbonFlowData.tasks && carbonFlowData.tasks.length > 0) {
        carbonFlowContext += `任务清单：\n`;
        carbonFlowData.tasks.forEach((task, index) => {
          const status = task.status === 'completed' ? '已完成' : '待处理';
          carbonFlowContext += `${index + 1}. [${status}] ${task.description}\n`;
        });
        carbonFlowContext += '\n';
      }
    }

    // 场景信息
    if (carbonFlowData.sceneInfo || carbonFlowData.State) {
      const sceneInfo = carbonFlowData.sceneInfo || carbonFlowData.State;
      carbonFlowContext += `项目场景信息：\n${JSON.stringify(sceneInfo, null, 2)}\n\n`;
    }

    // 数据统计信息
    if (carbonFlowData.dataStats) {
      const { totalNodes, nodesByType, nodesWithCarbonFactor, nodesWithEmissions } = carbonFlowData.dataStats;

      carbonFlowContext += `数据统计：\n`;
      carbonFlowContext += `- 总节点数：${totalNodes}\n`;
      carbonFlowContext += `- 已配置排放因子：${nodesWithCarbonFactor}\n`;
      carbonFlowContext += `- 已计算排放量：${nodesWithEmissions}\n`;
      carbonFlowContext += `- 数据完整率：${totalNodes > 0 ? Math.round((nodesWithEmissions / totalNodes) * 100) : 0}%\n\n`;

      if (Object.keys(nodesByType).length > 0) {
        carbonFlowContext += `生命周期阶段分布：\n`;
        Object.entries(nodesByType).forEach(([type, count]) => {
          const stageNames: Record<string, string> = {
            product: '原材料获取',
            manufacturing: '生产制造',
            distribution: '分销运输',
            usage: '使用阶段',
            disposal: '废弃处置',
            finalProduct: '最终产品',
          };
          carbonFlowContext += `- ${type}（${stageNames[type] || type}）：${count} 个节点\n`;
        });
        carbonFlowContext += '\n';
      }
    }

    // AI评估结果
    if (carbonFlowData.complianceReport) {
      const complianceReport = carbonFlowData.complianceReport;
      carbonFlowContext += `合规检查结果：\n${JSON.stringify(complianceReport, null, 2)}\n\n`;
    }

    // AI评估结果
    if (carbonFlowData.aiSummary || carbonFlowData.Score) {
      const summary = carbonFlowData.aiSummary || carbonFlowData.Score;
      carbonFlowContext += `AI评估结果：\n${JSON.stringify(summary, null, 2)}\n\n`;
    }

    // 详细节点信息（如果存在）
    if (carbonFlowData.nodes && carbonFlowData.nodes.length > 0) {
      // 提取关键节点信息用于概览
      const keyNodes = carbonFlowData.nodes
        .filter(
          (node) =>
            node.type === 'finalProduct' || (node.data?.carbonFootprint && parseFloat(node.data.carbonFootprint) > 0),
        )
        .slice(0, 5);

      if (keyNodes.length > 0) {
        carbonFlowContext += `关键节点概览：\n`;
        keyNodes.forEach((node) => {
          const emissions = node.data?.carbonFootprint ? parseFloat(node.data.carbonFootprint).toFixed(2) : '未计算';
          carbonFlowContext += `- ${node.data?.label || node.id}：${emissions} kgCO₂e\n`;
        });
        carbonFlowContext += '\n';
      }
    }

    // AI分析指导
    carbonFlowContext += `分析指导原则：\n`;
    carbonFlowContext += `基于上述工作流上下文数据，您应该提供：\n`;
    carbonFlowContext += `1. 当前进度分析 - 评估完成状态和工作质量\n`;
    carbonFlowContext += `2. 数据质量评估 - 识别缺失或不完整的数据项\n`;
    carbonFlowContext += `3. 下一步建议 - 提供具体可行的行动指导\n`;
    carbonFlowContext += `4. 专业洞察 - 分析碳足迹减排机会和优化建议\n\n`;
    carbonFlowContext += `请始终基于具体的上下文数据提供针对性的专业指导，而非泛泛而谈的通用建议。\n`;
    carbonFlowContext += '=== 内部上下文数据结束 ===\n\n';

    // 将碳足迹上下文添加到系统提示
    systemPrompt = `${systemPrompt}${carbonFlowContext}`;
  }

  if (files && contextFiles && contextOptimization) {
    const codeContext = createFilesContext(contextFiles, true);
    const filePaths = getFilePaths(files);

    systemPrompt = `${systemPrompt}
Below are all the files present in the project:
---
${filePaths.join('\n')}
---

Below is the artifact containing the context loaded into context buffer for you to have knowledge of and might need changes to fullfill current user request.
CONTEXT BUFFER:
---
${codeContext}
---
`;

    if (summary) {
      systemPrompt = `${systemPrompt}
      below is the chat history till now
CHAT SUMMARY:
---
${props.summary}
---
`;

      if (props.messageSliceId) {
        processedMessages = processedMessages.slice(props.messageSliceId);
      } else {
        const lastMessage = processedMessages.pop();

        if (lastMessage) {
          processedMessages = [lastMessage];
        }
      }
    }
  }

  logger.info(`Sending llm call to ${provider.name} with model ${modelDetails.name}`);

  // 获取工具列表（现在是provider无关的）
  const tools = getAllTools({
    knowledgeBaseMode: toolMode || false,
  });

  const useTools = tools.length > 0;

  // 使用新的工具管理系统
  let toolChoiceStrategy: 'auto' | 'required' = 'auto';
  let enabledToolNames: string[] = [];

  if (useTools) {
    // 检查最后一条用户消息
    const lastUserMessage = processedMessages.filter((msg) => msg.role === 'user').pop();

    const userQuery = typeof lastUserMessage?.content === 'string' ? lastUserMessage.content : '';

    // 如果启用了工具模式，知识库工具就是启用的
    if (toolMode) {
      enabledToolNames = ['knowledgeBase'];
    }

    // 使用工具管理器确定策略
    toolChoiceStrategy = getToolChoiceStrategy(userQuery, enabledToolNames);
  }

  // 将工具数组转换为AI SDK期望的格式（Record<string, Tool>）
  const toolSet: Record<string, any> = {};
  if (useTools) {
    tools.forEach((tool, index) => {
      const toolKey = `knowledge_base_tool_${index}`;
      toolSet[toolKey] = tool;
    });
  }

  if (useTools) {
    // 使用工具管理器生成系统提示
    const toolsSystemPrompt = getToolsSystemPrompt(enabledToolNames);
    systemPrompt += toolsSystemPrompt;

    logger.info(`✨ 智能工具模式已启用: ${tools.length} 个工具可用`, {
      provider: provider.name,
      toolMode,
      toolsCount: tools.length,
      toolChoice: toolChoiceStrategy,
      enabledTools: enabledToolNames,
    });
  } else {
    logger.info(`📝 标准模式: 无工具可用`, {
      provider: provider.name,
      toolMode,
    });
  }

  // Store original messages for reference
  const originalMessages = [...messages];

  // 检查是否有多模态内容
  const hasMultimodalContent = processedMessages.some((msg) => Array.isArray(msg.content));

  try {
    if (hasMultimodalContent) {
      /*
       * For multimodal content, we need to preserve the original array structure
       * but make sure the roles are valid and content items are properly formatted
       * 重要：使用processedMessages确保provider和model信息被正确解析
       */
      const multimodalMessages = processedMessages.map((msg) => ({
        role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: Array.isArray(msg.content)
          ? msg.content.map((item) => {
              // Ensure each content item has the correct format
              if (typeof item === 'string') {
                return { type: 'text', text: item };
              }

              if (item && typeof item === 'object') {
                if (item.type === 'image' && item.image) {
                  return { type: 'image', image: item.image };
                }

                if (item.type === 'text') {
                  return { type: 'text', text: item.text || '' };
                }
              }

              // Default fallback for unknown formats
              return { type: 'text', text: String(item || '') };
            })
          : [{ type: 'text', text: typeof msg.content === 'string' ? msg.content : String(msg.content || '') }],
      }));

      return await _streamText({
        model: provider.getModelInstance({
          model: modelDetails.name,
          serverEnv,
          apiKeys,
          providerSettings,
        }),
        system: systemPrompt,
        maxTokens: dynamicMaxTokens,
        messages: multimodalMessages as any,
        ...(useTools && { tools: toolSet }),
        ...(useTools && { maxSteps: 5 }),
        ...(useTools && { toolChoice: toolChoiceStrategy }),
        ...(useTools && {
          onToolCall: (tool: any) => {
            console.log('🔧 [工具调用]', tool.toolName, '参数:', tool.args);
            console.log('🔧 [工具调用] 完整数据:', JSON.stringify(tool, null, 2));
            logger.info('Tool call initiated:', tool);

            // 调用自定义工具开始回调
            if (options?.onToolStart) {
              console.log('📤 [数据流] 发送工具开始回调到前端');
              options.onToolStart(tool);
            } else {
              console.log('⚠️ [数据流] onToolStart 回调未定义');
            }
          },
          onToolResult: (result: any) => {
            console.log('📊 [工具结果]', result.toolName, '完成');
            console.log('📊 [工具结果] 完整数据:', JSON.stringify(result, null, 2));
            logger.info('Tool call result:', result);

            // 调用自定义工具完成回调
            if (options?.onToolComplete) {
              console.log('📤 [数据流] 发送工具完成回调到前端');
              options.onToolComplete(result.toolCall, result.result);
            } else {
              console.log('⚠️ [数据流] onToolComplete 回调未定义');
            }
          },
        }),
        ...options,
      });
    } else {
      // For non-multimodal content, we use the standard approach
      const normalizedTextMessages = processedMessages.map((msg) => ({
        role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
        content: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
      }));

      return await _streamText({
        model: provider.getModelInstance({
          model: modelDetails.name,
          serverEnv,
          apiKeys,
          providerSettings,
        }),
        system: systemPrompt,
        maxTokens: dynamicMaxTokens,
        messages: convertToCoreMessages(normalizedTextMessages),
        ...(useTools && { tools: toolSet }),
        ...(useTools && { maxSteps: 5 }),
        ...(useTools && { toolChoice: toolChoiceStrategy }),
        ...(useTools && {
          onToolCall: (tool: any) => {
            console.log('🔧 [工具调用]', tool.toolName, '参数:', tool.args);
            console.log('🔧 [工具调用] 完整数据:', JSON.stringify(tool, null, 2));
            logger.info('Tool call initiated:', tool);

            // 调用自定义工具开始回调
            if (options?.onToolStart) {
              console.log('📤 [数据流] 发送工具开始回调到前端');
              options.onToolStart(tool);
            } else {
              console.log('⚠️ [数据流] onToolStart 回调未定义');
            }
          },
          onToolResult: (result: any) => {
            console.log('📊 [工具结果]', result.toolName, '完成');
            console.log('📊 [工具结果] 完整数据:', JSON.stringify(result, null, 2));
            logger.info('Tool call result:', result);

            // 调用自定义工具完成回调
            if (options?.onToolComplete) {
              console.log('📤 [数据流] 发送工具完成回调到前端');
              options.onToolComplete(result.toolCall, result.result);
            } else {
              console.log('⚠️ [数据流] onToolComplete 回调未定义');
            }
          },
        }),
        ...options,
      });
    }
  } catch (error: any) {
    // Special handling for format errors
    if (error.message && error.message.includes('messages must be an array of CoreMessage or UIMessage')) {
      logger.warn('Message format error detected, attempting recovery with explicit formatting...');

      // Create properly formatted messages for all cases as a last resort
      const fallbackMessages = processedMessages.map((msg) => {
        // Determine text content with careful type handling
        let textContent = '';

        if (typeof msg.content === 'string') {
          textContent = msg.content;
        } else if (Array.isArray(msg.content)) {
          // Handle array content safely
          const contentArray = msg.content as any[];
          textContent = contentArray
            .map((contentItem) =>
              typeof contentItem === 'string'
                ? contentItem
                : contentItem?.text || contentItem?.image || String(contentItem || ''),
            )
            .join(' ');
        } else {
          textContent = String(msg.content || '');
        }

        return {
          role: msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant' ? msg.role : 'user',
          content: [
            {
              type: 'text',
              text: textContent,
            },
          ],
        };
      });

      // Try one more time with the fallback format
      return await _streamText({
        model: provider.getModelInstance({
          model: modelDetails.name,
          serverEnv,
          apiKeys,
          providerSettings,
        }),
        system: systemPrompt,
        maxTokens: dynamicMaxTokens,
        messages: fallbackMessages as any,
        ...(useTools && { tools: toolSet }),
        ...options,
      });
    }

    // If it's not a format error, re-throw the original error
    throw error;
  }
}
