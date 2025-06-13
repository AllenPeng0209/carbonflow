/**
 * 通用工具管理器
 * 支持工具的独立配置和动态加载
 */

import type { ProviderInfo } from '~/types/model';
import { getKnowledgeBaseTools, knowledgeBaseToolConfig } from './aliyun-knowledge-base-tool';

/**
 * 工具配置接口
 */
interface ToolConfig {
  triggerKeywords: string[];
  messages: {
    start: string;
    complete: string;
  };
  systemPrompt: string;
  shouldTrigger: (userQuery: string) => boolean;
}

/**
 * 已注册的工具配置
 */
const registeredTools: Record<string, ToolConfig> = {
  knowledgeBase: knowledgeBaseToolConfig,
  // 未来可以添加更多工具：
  // calculator: calculatorToolConfig,
  // webSearch: webSearchToolConfig,
};

/**
 * 工具名称到工具实例名称的映射
 */
const toolNameMapping: Record<string, string> = {
  knowledgeBaseTool: 'knowledgeBase',
  // 未来添加更多映射
};

/**
 * 根据工具名称和动作类型获取消息
 */
export function getToolMessage(toolName: string, action: 'start' | 'complete'): string {
  // 尝试直接匹配工具名称
  let config = registeredTools[toolName];
  
  // 如果直接匹配失败，尝试通过映射查找
  if (!config && toolNameMapping[toolName]) {
    config = registeredTools[toolNameMapping[toolName]];
  }
  
  // 如果找到配置，返回相应的消息
  if (config && config.messages) {
    return config.messages[action];
  }
  
  // 默认消息
  return action === 'start' 
    ? `🔧 正在执行 ${toolName}...` 
    : `✅ ${toolName} 执行完成`;
}

/**
 * 检查用户查询应该触发哪些工具
 */
export function getTriggeredTools(userQuery: string): string[] {
  const triggeredTools: string[] = [];
  
  for (const [toolName, config] of Object.entries(registeredTools)) {
    if (config.shouldTrigger(userQuery)) {
      triggeredTools.push(toolName);
    }
  }
  
  return triggeredTools;
}

/**
 * 获取所有启用工具的系统提示
 */
export function getToolsSystemPrompt(enabledTools: string[]): string {
  let systemPrompt = '';
  
  for (const toolName of enabledTools) {
    const config = registeredTools[toolName];
    if (config) {
      systemPrompt += config.systemPrompt;
    }
  }
  
  return systemPrompt;
}

/**
 * 确定工具选择策略
 */
export function getToolChoiceStrategy(
  userQuery: string, 
  enabledTools: string[]
): 'auto' | 'required' {
  // 如果没有启用的工具，使用auto
  if (enabledTools.length === 0) {
    return 'auto';
  }
  
  // 检查是否有工具应该被触发
  const triggeredTools = getTriggeredTools(userQuery);
  
  // 如果有工具被触发，强制使用工具
  return triggeredTools.length > 0 ? 'required' : 'auto';
}

/**
 * 获取所有可用的工具
 */
export function getAllTools(options: {
  provider?: string;
  knowledgeBaseMode?: boolean;
} = {}) {
  const { provider, knowledgeBaseMode = false } = options;
  
  // 知识库工具是通用的，任何支持Function Calling的provider都可以使用
  return getKnowledgeBaseTools(knowledgeBaseMode);
}

/**
 * 检查是否有可用的工具
 */
export function hasAvailableTools(options: {
  provider?: string;
  knowledgeBaseMode?: boolean;
} = {}) {
  return getAllTools(options).length > 0;
}

// 导出具体的工具
export { knowledgeBaseTool, getKnowledgeBaseTools, setToolCallbacks, knowledgeBaseToolConfig } from './aliyun-knowledge-base-tool'; 