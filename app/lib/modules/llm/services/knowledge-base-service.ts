/**
 * 独立的知识库服务
 * 提供对阿里云Agent知识库的访问，但不依赖任何特定的LLM provider
 */

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

export class KnowledgeBaseService {
  private readonly apiKey = 'sk-fa57208fc8184dd89310666789d16faa';
  private readonly appId = '8de6e733005d4d2686a0ac52ee950362';
  private readonly pipelineIds = ['plktwxm16g'];

  /**
   * 查询知识库
   */
  async query(options: {
    query: string;
    context?: string;
  }): Promise<AliyunAgentResponse> {
    const { query, context } = options;
    
    const url = `https://dashscope.aliyuncs.com/api/v1/apps/${this.appId}/completion`;

    // 构建查询prompt
    const prompt = context ? `上下文：${context}\n\n问题：${query}` : query;

    // 完全按照官方示例构建请求数据
    const data = {
      input: {
        prompt,
      },
      parameters: {
        rag_options: {
          pipeline_ids: this.pipelineIds,
        },
      },
      debug: {},
    };

    console.log('🌐 [KB Service] 调用阿里云Agent API:', {
      url,
      appId: this.appId,
      pipelineIds: this.pipelineIds,
      prompt,
    });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.status === 200) {
        const result = (await response.json()) as AliyunAgentResponse;
        console.log('✅ [KB Service] Agent API调用成功:', result);
        return result;
      } else {
        const errorData = await response.text();
        console.error('❌ [KB Service] Agent API错误响应:', {
          status: response.status,
          statusText: response.statusText,
          requestId: response.headers.get('request_id'),
          errorData,
        });

        if (response.status === 404) {
          throw new Error(`Agent应用未找到 (404): 应用ID '${this.appId}' 可能不存在或无权访问`);
        }

        throw new Error(`Agent API调用失败: ${response.status} - ${errorData}`);
      }
    } catch (error) {
      console.error('💥 [KB Service] Agent模式调用出错:', {
        error: error instanceof Error ? error.message : String(error),
        url,
        appId: this.appId,
        pipelineIds: this.pipelineIds,
      });
      throw error;
    }
  }
}

// 导出单例实例
export const knowledgeBaseService = new KnowledgeBaseService(); 