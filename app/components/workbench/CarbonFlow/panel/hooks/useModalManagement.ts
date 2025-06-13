import { useState, useCallback } from 'react';

export const useModalManagement = () => {
  // 模态框状态
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isEmissionDrawerVisible, setIsEmissionDrawerVisible] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [backgroundDataActiveTabKey, setBackgroundDataActiveTabKey] = useState<string>('database');

  // 设置模态框处理
  const handleOpenSettings = useCallback(() => {
    setIsSettingsModalVisible(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsModalVisible(false);
  }, []);

  // 排放源抽屉处理
  const handleOpenEmissionDrawer = useCallback(() => {
    setIsEmissionDrawerVisible(true);
  }, []);

  const handleCloseEmissionDrawer = useCallback(() => {
    setIsEmissionDrawerVisible(false);
  }, []);

  // 文件上传模态框处理
  const handleOpenUploadModal = useCallback(() => {
    setIsUploadModalVisible(true);
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setIsUploadModalVisible(false);
  }, []);

  return {
    // 状态
    isSettingsModalVisible,
    isEmissionDrawerVisible,
    isUploadModalVisible,
    backgroundDataActiveTabKey,

    // 操作函数
    handleOpenSettings,
    handleCloseSettings,
    handleOpenEmissionDrawer,
    handleCloseEmissionDrawer,
    handleOpenUploadModal,
    handleCloseUploadModal,
    setBackgroundDataActiveTabKey,
  };
};
