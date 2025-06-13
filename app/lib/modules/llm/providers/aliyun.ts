import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';


// Agent模式配置接口
interface AliyunAgentConfig {
  enabled: boolean;
  appId: string;
  pipelineIds?: string[]; // 知识库ID数组，例如: ['plktwxm16g']
}

// Agent模式API响应接口
interface AliyunAgentResponse {
  output: {
    text: string;
  };
  usage?: {
    models: Array<{
      model_id: string;
      input_tokens: number;
      output_tokens: number;
    }>;
  };
  request_id: string;
}

export default class AliyunProvider extends BaseProvider {
  name = 'Aliyun';
  getApiKeyLink = 'https://ram.console.aliyun.com/manage/ak';
  labelForGetApiKey = '获取通义千问 API Key';

  config = {
    baseUrlKey: 'ALIYUN_API_BASE_URL',
    apiTokenKey: 'ALIYUN_API_KEY',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    agentBaseUrl: 'https://dashscope.aliyuncs.com/api/v1',
  };

  staticModels: ModelInfo[] = [
    {
      name: 'qwen-turbo',
      label: '通义千问 Turbo',
      provider: 'Aliyun',
      maxTokenAllowed: 6000,
    },
    {
      name: 'qwen-plus',
      label: '通义千问 Plus (RAG推荐)',
      provider: 'Aliyun',
      maxTokenAllowed: 6000,
    },
    {
      name: 'qwen-max',
      label: '通义千问 Max',
      provider: 'Aliyun',
      maxTokenAllowed: 6000,
    },
    {
      name: 'qwen-max-longcontext',
      label: '通义千问 Max 长文本版',
      provider: 'Aliyun',
      maxTokenAllowed: 28000,
    },
    {
      name: 'qwen-plus-latest',
      label: '通义千问 Plus Latest',
      provider: 'Aliyun',
      maxTokenAllowed: 6000,
    },
  ];

  async callAgentMode(options: {
    apiKey: string;
    appId: string;
    prompt: string;
    pipelineIds?: string[]; // 知识库ID数组，例如: ['plktwxm16g']
    model?: string;
  }): Promise<AliyunAgentResponse> {
    const { apiKey, appId, prompt, pipelineIds, model } = options;

    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${appId}/completion`;

    // 完全按照官方示例构建请求数据
    const data = {
      input: {
        prompt,
      },
      parameters: {
        ...(pipelineIds &&
          pipelineIds.length > 0 && {
            rag_options: {
              pipeline_ids: pipelineIds,
            },
          }),
        ...(model && { model }),
      },
      debug: {},
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 200) {
        const result = (await response.json()) as AliyunAgentResponse;

        return result;
      } else {
        const errorData = await response.text();
        console.error('❌ Agent API错误响应:', {
          status: response.status,
          statusText: response.statusText,
          requestId: response.headers.get('request_id'),
          errorData,
        });

        if (response.status === 404) {
          throw new Error(`Agent应用未找到 (404): 应用ID '${appId}' 可能不存在或无权访问`);
        }

        throw new Error(`Agent API调用失败: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('💥 Agent模式调用出错:', {
        error: error instanceof Error ? error.message : String(error),
        url,
        appId,
        pipelineIds,
      });
      throw error;
    }
  }

  getAgentConfig(providerSettings?: IProviderSetting): AliyunAgentConfig | null {
    if (!providerSettings?.agentMode) {
      return null;
    }

    const agentConfig = providerSettings.agentMode;

    if (!agentConfig.enabled || !agentConfig.appId) {
      return null;
    }

    return {
      enabled: agentConfig.enabled,
      appId: agentConfig.appId,
      pipelineIds: agentConfig.pipelineIds || [], // 默认空数组，配置示例: ['plktwxm16g']
    };
  }

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const hardcodedApiKey = 'sk-fa57208fc8184dd89310666789d16faa';

    // 工具模式：使用阿里云专用的Function Calling API端点
    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'ALIYUN_API_BASE_URL',
      defaultApiTokenKey: 'ALIYUN_API_KEY',
    });

    if (!apiKey && !hardcodedApiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    // 使用阿里云专用的Function Calling端点
    const aliyunApiKey = hardcodedApiKey;
    const aliyunBaseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

    // return getOpenAILikeModel(aliyunBaseUrl, aliyunApiKey, model);
    const openai = createOpenAI({
      baseURL: aliyunBaseUrl,
      apiKey: aliyunApiKey,
    });
    return openai(model);
  }
}
