import type { CarbonFlowAction } from '~/types/actions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * 供應商任務生成：模擬將新任務加入 store.tasks
 * @param store Zustand store
 * @param action CarbonFlowAction，content 可包含任務描述
 */
export async function handleGenerateSupplierTask(
  store: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> {
  let taskDesc = '供應商任務';

  try {
    if (action.content) {
      const content = typeof action.content === 'string' ? JSON.parse(action.content) : action.content;
      taskDesc = content.description || taskDesc;
    }
  } catch (e) {}

  const now = new Date().toISOString();
  const newTask = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    description: taskDesc,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  const oldTasks = store.getState().tasks || [];
  store.getState().setTasks([...oldTasks, newTask]);
}
