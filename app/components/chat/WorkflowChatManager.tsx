import React, { useState } from 'react';
import { Button, Modal, message, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { MoreOutlined, DeleteOutlined, ExportOutlined, ImportOutlined } from '@ant-design/icons';
import { useWorkflowChat } from '~/lib/hooks/useWorkflowChat';
import type { Message } from 'ai';

interface WorkflowChatManagerProps {
  workflowId: string;
  workflowName?: string;
  className?: string;
}

/**
 * 工作流聊天记录管理组件
 * 提供清空、导出聊天记录等功能
 */
export function WorkflowChatManager({ 
  workflowId, 
  workflowName = '工作流',
  className = '' 
}: WorkflowChatManagerProps) {
  const [showClearModal, setShowClearModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const workflowChat = useWorkflowChat({
    workflowId,
    enabled: true,
  });

  // 清空聊天记录
  const handleClearChatHistory = async () => {
    try {
      setIsProcessing(true);
      await workflowChat.clearChatHistory();
      message.success('聊天记录已清空');
      setShowClearModal(false);
      
      // 刷新页面以重新显示引导信息
      window.location.reload();
    } catch (error) {
      console.error('清空聊天记录失败:', error);
      message.error('清空聊天记录失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 导出聊天记录
  const handleExportChatHistory = async () => {
    try {
      setIsProcessing(true);
      const messages = await workflowChat.loadChatHistory();
      
      if (messages.length === 0) {
        message.warning('没有聊天记录可导出');
        return;
      }

      const exportData = {
        workflowId,
        workflowName,
        exportDate: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.createdAt || new Date().toISOString(),
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflowName}_聊天记录_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('聊天记录导出成功');
    } catch (error) {
      console.error('导出聊天记录失败:', error);
      message.error('导出聊天记录失败，请稍后重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 菜单项
  const menuItems: MenuProps['items'] = [
    {
      key: 'export',
      label: '导出聊天记录',
      icon: <ExportOutlined />,
      onClick: handleExportChatHistory,
      disabled: !workflowChat.hasChatHistory || isProcessing,
    },
    {
      type: 'divider',
    },
    {
      key: 'clear',
      label: '清空聊天记录',
      icon: <DeleteOutlined />,
      onClick: () => setShowClearModal(true),
      disabled: !workflowChat.hasChatHistory || isProcessing,
      danger: true,
    },
  ];

  if (workflowChat.isLoading) {
    return null;
  }

  return (
    <>
      <Dropdown 
        menu={{ items: menuItems }} 
        trigger={['click']}
        placement="bottomRight"
      >
        <Button 
          type="text" 
          icon={<MoreOutlined />} 
          className={className}
          size="small"
          title="聊天记录管理"
        />
      </Dropdown>

      <Modal
        title="确认清空聊天记录"
        open={showClearModal}
        onCancel={() => setShowClearModal(false)}
        onOk={handleClearChatHistory}
        confirmLoading={isProcessing}
        okText="确认清空"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <p>您确定要清空当前工作流的聊天记录吗？</p>
        <p className="text-gray-500 text-sm">
          此操作无法撤销，清空后将重新显示AI顾问的引导信息。
        </p>
      </Modal>
    </>
  );
} 