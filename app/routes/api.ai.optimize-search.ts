import { json } from '@remix-run/node';
import type { ActionFunctionArgs } from '@remix-run/node';
import { optimizeCarbonFactorSearchWithLlmAgent } from '~/lib/agents/carbon-factor-search-optimizer-agent';

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { input } = await request.json();

    if (!input || !input.nodeLabel || !input.nodeType) {
      return json({ error: '缺少必要的输入参数' }, { status: 400 });
    }

    const result = await optimizeCarbonFactorSearchWithLlmAgent({ input });

    return json(result);
  } catch (error) {
    console.error('AI搜索词优化API错误:', error);
    
    return json(
      { 
        error: '搜索词优化失败',
        details: error instanceof Error ? error.message : '未知错误'
      }, 
      { status: 500 }
    );
  }
} 