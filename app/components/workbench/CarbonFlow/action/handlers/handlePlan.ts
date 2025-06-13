import type { CarbonFlowAction } from '~/types/actions';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * Handles the 'plan' action to update task statuses in the CarbonFlow store.
 *
 * @param action The CarbonFlowAction for the plan operation.
 */
export const handlePlan = async (
  carbonFlowStore: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> => {
  console.log('[handlePlan] Executing. Action:', action);

  const { workflowid, content } = action;

  if (typeof content !== 'string') {
    console.error(`[handlePlan] Action content is not a string for workflow: ${workflowid}. Content:`, content);
    return;
  }

  if (!content) {
    console.error(`[handlePlan] Action content is empty for workflow: ${workflowid}`);
    return;
  }

  const planDataForUpdate: Record<string, string> = {};

  try {
    const decodedContent = content.replace(/&quot;/g, '"');
    const parsedData = JSON.parse(decodedContent);

    if (typeof parsedData === 'object' && parsedData !== null && !Array.isArray(parsedData)) {
      for (const key in parsedData) {
        if (Object.prototype.hasOwnProperty.call(parsedData, key) && typeof parsedData[key] === 'string') {
          planDataForUpdate[key] = parsedData[key];
        } else {
          console.warn(
            `[handlePlan] Plan data for key "${key}" is not a string:`,
            parsedData[key],
            `Workflow: ${workflowid}`,
          );

          /*
           * Optionally, mark as invalid or skip this entry. For now, we'll skip non-string values.
           */
        }
      }

      if (Object.keys(planDataForUpdate).length === 0) {
        console.warn(
          `[handlePlan] Parsed plan data is empty or not in the expected Record<string, string> format after filtering. Original parsedData:`,
          parsedData,
          `Workflow: ${workflowid}`,
        );
        return;
      }

      // Call the store action to update tasks based on the plan
      console.log('[handlePlan] Calling updateTasksFromPlan with:', planDataForUpdate, `Workflow: ${workflowid}`);
      useCarbonFlowStore.getState().updateTasksFromPlan(planDataForUpdate);
      console.log(`[handlePlan] Dispatched updateTasksFromPlan for workflow: ${workflowid}.`);

      /*
       * Optionally, dispatch a more generic event or let the store handle events if needed.
       * window.dispatchEvent(new CustomEvent('carbonflow-data-updated', {
       *   detail: { actionType: 'GLOBAL_PLAN_UPDATED', workflowId: workflowid },
       * }));
       */
    } else {
      console.error(
        `[handlePlan] Parsed plan data is not a Record<string, string> object:`,
        parsedData,
        `Workflow: ${workflowid}`,
      );
    }
  } catch (error) {
    console.error(
      `[handlePlan] Failed to parse plan action content or update tasks for workflow ${workflowid}:`,
      error,
      'Content string was:',
      content,
    );
  }
};
