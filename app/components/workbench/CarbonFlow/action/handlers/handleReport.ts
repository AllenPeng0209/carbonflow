import type { CarbonFlowAction } from '~/types/actions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 報告生成：模擬將報告摘要寫入 store.aiSummary
 * @param store Zustand store
 * @param action CarbonFlowAction，content 可包含報告資料
 */
export async function handleReport(store: typeof useCarbonFlowStore, action: CarbonFlowAction): Promise<void> {
  let aiSummary: any = { summary: '這是自動生成的報告摘要', generatedAt: new Date().toISOString() };

  try {
    if (action.content) {
      const content = typeof action.content === 'string' ? JSON.parse(action.content) : action.content;
      aiSummary = { ...aiSummary, ...content };
    }
  } catch (e) {}
  store.getState().setAiSummary(aiSummary);
}
