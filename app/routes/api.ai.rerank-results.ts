import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { rerankCarbonFactorResultsWithLlmAgent } from '~/lib/agents/carbon-factor-result-reranker-agent';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { input } = await request.json();

    if (!input || !input.nodeLabel || !input.nodeType || !input.candidates) {
      return json({ error: '缺少必要的输入参数' }, { status: 400 });
    }

    const result = await rerankCarbonFactorResultsWithLlmAgent({ input });

    return json(result);
  } catch (error) {
    console.error('AI结果重排序API错误:', error);
    
    return json(
      { 
        error: '结果重排序失败',
        details: error instanceof Error ? error.message : '未知错误'
      }, 
      { status: 500 }
    );
  }
} 