import { useState, useCallback } from 'react';

export const useCarbonFactorMatch = () => {
  // 碳因子匹配状态
  const [isFactorMatchModalVisible, setIsFactorMatchModalVisible] = useState(false);
  const [selectedFactorMatchSources, setSelectedFactorMatchSources] = useState<React.Key[]>([]);
  const [factorMatchModalSources] = useState<any[]>([]);
  const [matchResults] = useState<{
    success: string[];
    failed: string[];
    logs: string[];
  }>({
    success: [],
    failed: [],
    logs: [],
  });
  const [showMatchResultsModal, setShowMatchResultsModal] = useState(false);

  // 碳因子匹配模态框处理
  const handleOpenFactorMatchModal = useCallback(() => {
    setIsFactorMatchModalVisible(true);
  }, []);

  const handleCloseFactorMatchModal = useCallback(() => {
    setIsFactorMatchModalVisible(false);
    setSelectedFactorMatchSources([]);
  }, []);

  // 关闭匹配结果模态框
  const handleCloseMatchResults = useCallback(() => {
    setShowMatchResultsModal(false);
  }, []);

  return {
    // 状态
    isFactorMatchModalVisible,
    selectedFactorMatchSources,
    factorMatchModalSources,
    matchResults,
    showMatchResultsModal,

    // 操作函数
    handleOpenFactorMatchModal,
    handleCloseFactorMatchModal,
    handleCloseMatchResults,
    setSelectedFactorMatchSources,
    setShowMatchResultsModal,
  };
};
