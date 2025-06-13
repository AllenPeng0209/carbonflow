// Helper to detect OS
export const isMac =
  typeof navigator !== 'undefined' && typeof navigator.platform === 'string'
    ? navigator.platform.toLowerCase().includes('mac')
    : false;
export const isWindows =
  typeof navigator !== 'undefined' && typeof navigator.platform === 'string'
    ? navigator.platform.toLowerCase().includes('win')
    : false;
export const isLinux =
  typeof navigator !== 'undefined' && typeof navigator.platform === 'string'
    ? navigator.platform.toLowerCase().includes('linux')
    : false;
