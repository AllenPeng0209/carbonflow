/**
 * 碳流量工具函数
 */

/**
 * 渲染分数数据
 */
export const renderScore = (scoreData?: any): number => {
  if (!scoreData || typeof scoreData !== 'object') {
    return 0;
  }

  if (typeof scoreData === 'number') {
    return Math.round(scoreData);
  }

  if (scoreData.score !== undefined) {
    return Math.round(scoreData.score);
  }

  return 0;
};

/**
 * 获取中文文件状态消息
 */
export const getChineseFileStatusMessage = (status: string): string => {
  const statusMap: Record<string, string> = {
    // 英文状态映射
    pending: '未解析',
    parsing: '解析中',
    completed: '解析完成',
    failed: '解析失败',

    // 上传相关状态
    uploading: '上传中',
    done: '上传完成',
    error: '上传失败',
    removed: '已删除',

    // 兼容中文状态（防止混用）
    未开始: '未解析',
    解析中: '解析中',
    解析成功: '解析完成',
    解析失败: '解析失败',
  };
  return statusMap[status] || '未知状态';
};

/**
 * 安全获取本地存储数据
 */
export const getLocalStorage = function <T>(key: string, defaultValue: T): T {
  try {
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    const item = window.localStorage.getItem(key);

    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);

    return defaultValue;
  }
};

/**
 * 设置本地存储数据
 */
export const setLocalStorage = function <T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing localStorage key "${key}":`, error);
  }
};
