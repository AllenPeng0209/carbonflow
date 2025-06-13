import { useState, useCallback } from 'react';
import { message } from 'antd';
import { supabase } from '~/lib/supabase';

/**
 * 工作流名称管理Hook
 */
export const useWorkflowName = (workflow: any) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(workflow?.name || '');
  const [workflowName, setWorkflowName] = useState(workflow?.name || '');

  const saveWorkflowName = useCallback(async () => {
    if (!editingName.trim()) {
      message.error('名称不能为空');
      return;
    }

    if (editingName === workflowName) {
      setIsEditingName(false);
      return;
    }

    const { error } = await supabase
      .from('workflows')
      .update({ name: editingName, updated_at: new Date().toISOString() })
      .eq('id', workflow.id);

    if (error) {
      message.error('修改失败: ' + error.message);
      return;
    }

    setWorkflowName(editingName);
    setIsEditingName(false);
    message.success('名称已更新');
  }, [editingName, workflowName, workflow?.id]);

  return {
    isEditingName,
    setIsEditingName,
    editingName,
    setEditingName,
    workflowName,
    setWorkflowName,
    saveWorkflowName,
  };
};
