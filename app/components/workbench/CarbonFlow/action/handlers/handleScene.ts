import type { CarbonFlowAction } from '~/types/actions';
import type { SceneInfoType } from '~/types/scene';
import { toast } from 'react-toastify';
import { useCarbonFlowStore } from '~/components/workbench/CarbonFlow/store/CarbonFlowStore';

/**
 * Handles the 'update_scene' action to update scene information in the CarbonFlow store.
 *
 * @param carbonFlowStore The CarbonFlow store instance.
 * @param action The CarbonFlowAction for the update scene operation.
 *               The action.content is expected to be a JSON stringifiable object
 *               that conforms to Partial<SceneInfoType> or SceneInfoType.
 */
export const handleScene = async (
  carbonFlowStore: typeof useCarbonFlowStore,
  action: CarbonFlowAction,
): Promise<void> => {
  console.log('[handleScene] Executing. Action:', action);

  const { workflowid, content } = action;

  if (typeof content !== 'string') {
    console.error(`[handleScene] Action content is not a string for workflow: ${workflowid}. Content:`, content);
    return;
  }

  if (!content) {
    console.warn(
      `[handleUpdateScene] Action content is empty for workflow: ${workflowid}. No scene update to perform.`,
    );
    return;
  }

  try {
    const sceneUpdateData = JSON.parse(content) as Partial<SceneInfoType> | SceneInfoType;

    // Basic validation: check if it's an object
    if (typeof sceneUpdateData !== 'object' || sceneUpdateData === null) {
      console.error(
        `[handleUpdateScene] Parsed content is not an object for workflow: ${workflowid}. Parsed:`,
        sceneUpdateData,
      );
      return;
    }

    // It's good practice to ensure workflowId from action matches if present in sceneUpdateData
    if (sceneUpdateData.workflowId && sceneUpdateData.workflowId !== workflowid) {
      console.warn(
        `[handleUpdateScene] Workflow ID in action.content (${sceneUpdateData.workflowId}) does not match action.workflowid (${workflowid}). Using action.workflowid.`,
      );

      /*
       * Decide if you want to enforce this or allow overriding. For now, let's assume action.workflowid is the source of truth if there's a mismatch.
       * sceneUpdateData.workflowId = workflowid; // Or handle as an error
       */
    }

    console.log(`[handleUpdateScene] Applying scene update for workflow ${workflowid}:`, sceneUpdateData);
    carbonFlowStore.getState().setSceneInfo(sceneUpdateData);
    console.log(`[handleUpdateScene] Scene info updated successfully for workflow: ${workflowid}.`);

    /*
     * Optionally, dispatch an event if other parts of the app need to react directly
     * window.dispatchEvent(new CustomEvent('carbonflow-scene-updated', {
     *   detail: { workflowId: workflowid, updatedSceneInfo: sceneUpdateData },
     * }));
     */
  } catch (error) {
    console.error(
      `[handleUpdateScene] Failed to parse scene action content or update scene for workflow ${workflowid}:`,
      error,
      'Content string was:',
      content,
    );
  }
};
