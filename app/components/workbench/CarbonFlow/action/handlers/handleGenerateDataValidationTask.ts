import type { CarbonFlowAction } from '~/types/actions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 數據驗證任務生成：模擬將新驗證任務加入 store.tasks
 * @param store Zustand store
 * @param action CarbonFlowAction，content 可包含驗證描述
 */
export async function handleGenerateDataValidationTask(
  store: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> {
  let taskDesc = '數據驗證任務';

  try {
    if (action.content) {
      const content = typeof action.content === 'string' ? JSON.parse(action.content) : action.content;
      taskDesc = content.description || taskDesc;
    }
  } catch {
    // Ignore parsing errors
  }

  const now = new Date().toISOString();
  const newTask = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    description: taskDesc,
    status: 'pending' as const,
    createdAt: now,
    updatedAt: now,
  };
  const oldTasks = store.getState().tasks || [];
  store.getState().setTasks([...oldTasks, newTask]);
}
