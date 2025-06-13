import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { createDataStream, generateId } from 'ai';
import { MAX_RESPONSE_SEGMENTS, MAX_TOKENS, type FileMap } from '~/lib/.server/llm/constants';
import { CONTINUE_PROMPT } from '~/lib/common/prompts/prompts';
import { streamText, type Messages, type StreamingOptions } from '~/lib/.server/llm/stream-text';
import SwitchableStream from '~/lib/.server/llm/switchable-stream';
import type { IProviderSetting } from '~/types/model';
import { createScopedLogger } from '~/utils/logger';
import { getFilePaths, selectContext } from '~/lib/.server/llm/select-context';
import type { ContextAnnotation, ProgressAnnotation } from '~/types/context';
import { WORK_DIR } from '~/utils/constants';
import { createSummary } from '~/lib/.server/llm/create-summary';
import { extractPropertiesFromMessage } from '~/lib/.server/llm/utils';
import type { CarbonFlowData } from '~/lib/.server/llm/stream-text';
import { type LoaderFunctionArgs } from '@remix-run/node';
import { processFile } from '~/lib/.server/services/file-processor';
import { json } from '@remix-run/node';
import { setToolCallbacks } from '~/lib/modules/llm/tools/aliyun-knowledge-base-tool';
import { getToolMessage } from '~/lib/modules/llm/tools';

export async function action(args: ActionFunctionArgs) {
  // 检查是否是文件处理请求
  const contentType = args.request.headers.get('content-type');

  if (contentType?.includes('multipart/form-data')) {
    const formData = await args.request.formData();
    const file = formData.get('file') as File;
    const workflowId = formData.get('workflowId') as string;

    if (!file || !workflowId) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
      // 处理文件
      const result = await processFile(file, workflowId);
      return json(result);
    } catch (error) {
      console.error('Error processing file:', error);
      return json({ error: 'Failed to process file' }, { status: 500 });
    }
  }

  return chatAction(args);
}

// Re-export loader so that GET requests are handled the same way as POST.
export const loader = async (args: LoaderFunctionArgs) => {
  console.log('API Chat GET request received', {
    url: args.request.url,
    headers: Object.fromEntries(args.request.headers.entries()),
  });
  return new Response('Method Not Allowed', { status: 405 });
};

const logger = createScopedLogger('api.chat');

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  const items = cookieHeader.split(';').map((cookie) => cookie.trim());

  items.forEach((item) => {
    const [name, ...rest] = item.split('=');

    if (name && rest) {
      const decodedName = decodeURIComponent(name.trim());
      const decodedValue = decodeURIComponent(rest.join('=').trim());
      cookies[decodedName] = decodedValue;
    }
  });

  return cookies;
}

async function chatAction({ context, request }: ActionFunctionArgs) {
  const { messages, files, promptId, contextOptimization, carbonFlowData, supabase, toolMode } =
    await request.json<{
      messages: Messages;
      files: FileMap;
      promptId?: string;
      contextOptimization: boolean;
      carbonFlowData?: CarbonFlowData;
      supabase?: {
        isConnected: boolean;
        hasSelectedProject: boolean;
        credentials?: {
          anonKey?: string;
          supabaseUrl?: string;
        };
      };
      toolMode?: boolean;
    }>();

  // 直接使用前端发送的消息，不需要重复处理图片
  const processedMessages = [...messages];

  // 处理文件（不是图片，是代码文件等）
  const processedFiles = await Promise.all(
    Object.entries(files).map(async ([key, file]) => {
      if (!file || file.type !== 'file') {
        return null;
      }

      try {
        const processingResult = await processFile(new File([file.content], key), promptId || '');
        return {
          key,
          content: processingResult.userPrompt,
          isBinary: file.isBinary,
        };
      } catch (error) {
        logger.error(`Error processing file ${key}:`, error);
        return null;
      }
    }),
  );

  // 过滤掉处理失败的文件
  const validFiles = processedFiles
    .filter((file): file is { key: string; content: string; isBinary: boolean } => file !== null)
    .reduce((acc, file) => {
      acc[file.key] = {
        type: 'file' as const,
        content: file.content,
        isBinary: file.isBinary,
      };
      return acc;
    }, {} as FileMap);

  const cookieHeader = request.headers.get('Cookie');
  const apiKeys = JSON.parse(parseCookies(cookieHeader || '').apiKeys || '{}');
  const providerSettings: Record<string, IProviderSetting> = JSON.parse(
    parseCookies(cookieHeader || '').providers || '{}',
  );

  const stream = new SwitchableStream();

  const cumulativeUsage = {
    completionTokens: 0,
    promptTokens: 0,
    totalTokens: 0,
  };
  const encoder: TextEncoder = new TextEncoder();
  let progressCounter: number = 1;

  try {


    let lastChunk: string | undefined = undefined;

    const dataStream = createDataStream({
      async execute(dataStream) {
        // 设置工具回调函数，让工具能够直接发送数据到前端
        setToolCallbacks({
          onToolStart: (toolCall: any) => {
            console.log('📨 [手动回调] 接收到工具开始回调:', JSON.stringify(toolCall, null, 2));
            
            dataStream.writeMessageAnnotation({
              type: 'tool-execution',
              toolName: toolCall.toolName,
              status: 'started',
              query: toolCall.args?.query,
              timestamp: new Date().toISOString(),
            } as ContextAnnotation);
            
            dataStream.writeData({
              type: 'progress',
              label: 'tool-execution',
              status: 'in-progress',
              order: progressCounter++,
              message: getToolMessage(toolCall.toolName, 'start'),
            } satisfies ProgressAnnotation);
            
            console.log('📤 [手动回调] 工具开始数据已发送到前端');
          },
          onToolComplete: (toolCall: any, result: any, duration?: number) => {
            console.log('📨 [手动回调] 接收到工具完成回调:');
            console.log('  - toolCall:', JSON.stringify(toolCall, null, 2));
            console.log('  - result:', JSON.stringify(result, null, 2));
            console.log('  - duration:', duration);
            
            dataStream.writeMessageAnnotation({
              type: 'knowledge-query',
              query: toolCall?.args?.query || '未知查询',
              result: result,
              duration: duration,
              timestamp: new Date().toISOString(),
            } as ContextAnnotation);
            
            dataStream.writeData({
              type: 'progress',
              label: 'tool-execution',
              status: 'complete',
              order: progressCounter++,
              message: getToolMessage(toolCall.toolName, 'complete'),
            } satisfies ProgressAnnotation);
            
            console.log('📤 [手动回调] 工具完成数据已发送到前端');
          },
        });
        
        const filePaths = getFilePaths(validFiles || {});
        let filteredFiles: FileMap | undefined = undefined;
        let summary: string | undefined = undefined;
        let messageSliceId = 0;

        if (processedMessages.length > 3) {
          messageSliceId = processedMessages.length - 3;
        }

        if (filePaths.length > 0 && contextOptimization) {
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Analysing Request',
          } satisfies ProgressAnnotation);

          // Create a summary of the chat
          console.log(`Messages count: ${processedMessages.length}`);

          summary = await createSummary({
            messages: [...processedMessages],
            env: context.cloudflare?.env,
            apiKeys,
            providerSettings,
            promptId,
            contextOptimization,
            onFinish(resp) {
              if (resp.usage) {
                logger.debug('createSummary token usage', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });
          dataStream.writeData({
            type: 'progress',
            label: 'summary',
            status: 'complete',
            order: progressCounter++,
            message: 'Analysis Complete',
          } satisfies ProgressAnnotation);

          dataStream.writeMessageAnnotation({
            type: 'chatSummary',
            summary,
            chatId: processedMessages.slice(-1)?.[0]?.id,
          } as ContextAnnotation);

          // Update context buffer
          logger.debug('Updating Context Buffer');
          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'in-progress',
            order: progressCounter++,
            message: 'Determining Files to Read',
          } satisfies ProgressAnnotation);

          // Select context files
          console.log(`Messages count: ${processedMessages.length}`);
          filteredFiles = await selectContext({
            messages: [...processedMessages],
            env: context.cloudflare?.env,
            apiKeys,
            files: validFiles,
            providerSettings,
            promptId,
            contextOptimization,
            summary,
            onFinish(resp) {
              if (resp.usage) {
                logger.debug('selectContext token usage', JSON.stringify(resp.usage));
                cumulativeUsage.completionTokens += resp.usage.completionTokens || 0;
                cumulativeUsage.promptTokens += resp.usage.promptTokens || 0;
                cumulativeUsage.totalTokens += resp.usage.totalTokens || 0;
              }
            },
          });

          if (filteredFiles) {
            logger.debug(`files in context : ${JSON.stringify(Object.keys(filteredFiles))}`);
          }

          dataStream.writeMessageAnnotation({
            type: 'codeContext',
            files: Object.keys(filteredFiles).map((key) => {
              let path = key;

              if (path.startsWith(WORK_DIR)) {
                path = path.replace(WORK_DIR, '');
              }

              return path;
            }),
          } as ContextAnnotation);

          dataStream.writeData({
            type: 'progress',
            label: 'context',
            status: 'complete',
            order: progressCounter++,
            message: 'Code Files Selected',
          } satisfies ProgressAnnotation);

          // logger.debug('Code Files Selected');
        }

        const options: StreamingOptions = {
          supabaseConnection: supabase,
          carbonFlowData,
          onFinish: async ({ text: content, finishReason, usage }) => {
            if (usage) {
              cumulativeUsage.completionTokens += usage.completionTokens || 0;
              cumulativeUsage.promptTokens += usage.promptTokens || 0;
              cumulativeUsage.totalTokens += usage.totalTokens || 0;
            }

            if (finishReason !== 'length') {
              dataStream.writeMessageAnnotation({
                type: 'usage',
                value: {
                  completionTokens: cumulativeUsage.completionTokens,
                  promptTokens: cumulativeUsage.promptTokens,
                  totalTokens: cumulativeUsage.totalTokens,
                },
              });
              dataStream.writeData({
                type: 'progress',
                label: 'response',
                status: 'complete',
                order: progressCounter++,
                message: 'Response Generated',
              } satisfies ProgressAnnotation);
              await new Promise((resolve) => setTimeout(resolve, 0));

              // stream.close();
              return;
            }

            if (stream.switches >= MAX_RESPONSE_SEGMENTS) {
              throw Error('Cannot continue message: Maximum segments reached');
            }

            const switchesLeft = MAX_RESPONSE_SEGMENTS - stream.switches;

            logger.info(`Reached max token limit (${MAX_TOKENS}): Continuing message (${switchesLeft} switches left)`);

            const lastUserMessage = processedMessages.filter((x) => x.role == 'user').slice(-1)[0];
            const { model, provider } = extractPropertiesFromMessage(lastUserMessage);
            processedMessages.push({ id: generateId(), role: 'assistant', content });
            processedMessages.push({
              id: generateId(),
              role: 'user',
              content: `[Model: ${model}]\n\n[Provider: ${provider}]\n\n${CONTINUE_PROMPT}`,
            });

            const result = await streamText({
              messages: processedMessages,
              env: context.cloudflare?.env,
              options,
              apiKeys,
              files: validFiles,
              providerSettings,
              promptId,
              contextOptimization,
              contextFiles: filteredFiles,
              summary,
              messageSliceId,
              carbonFlowData,
              toolMode,
            });

            result.mergeIntoDataStream(dataStream);

            (async () => {
              for await (const part of result.fullStream) {
                if (part.type === 'error') {
                  const error: any = part.error;
                  logger.error(`${error}`);

                  return;
                }
              }
            })();

            return;
          },
        };

        const result = await streamText({
          messages: processedMessages,
          env: context.cloudflare?.env,
          options,
          apiKeys,
          files: validFiles,
          providerSettings,
          promptId,
          contextOptimization,
          contextFiles: filteredFiles,
          summary,
          messageSliceId,
          carbonFlowData,
          toolMode,
        });

        result.mergeIntoDataStream(dataStream);
      },
      onError: (error: any) => {
        logger.error('Data stream error', error);
        return `Custom error: ${error.message}`;
      },
    }).pipeThrough(
      new TransformStream({
        transform: (chunk, controller) => {
          if (!lastChunk) {
            lastChunk = ' ';
          }

          if (typeof chunk === 'string') {
            if (chunk.startsWith('g') && !lastChunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "<div class=\\"__boltThought__\\">"\n`));
            }

            if (lastChunk.startsWith('g') && !chunk.startsWith('g')) {
              controller.enqueue(encoder.encode(`0: "</div>\\n"\n`));
            }
          }

          lastChunk = chunk;

          let transformedChunk = chunk;

          if (typeof chunk === 'string' && chunk.startsWith('g')) {
            let content = chunk.split(':').slice(1).join(':');

            if (content.endsWith('\n')) {
              content = content.slice(0, content.length - 1);
            }

            transformedChunk = `0:${content}\n`;
          }

          // Convert the string stream to a byte stream
          const str = typeof transformedChunk === 'string' ? transformedChunk : JSON.stringify(transformedChunk);
          controller.enqueue(encoder.encode(str));
        },
      }),
    );

    return new Response(dataStream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Text-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    if (error.message?.includes('API key')) {
      throw new Response('Invalid or missing API key', {
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
