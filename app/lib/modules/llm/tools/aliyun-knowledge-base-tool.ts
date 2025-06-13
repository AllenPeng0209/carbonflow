/**
 * 知识库查询工具
 * 通用工具，可被任何支持Function Calling的provider使用
 */

import { tool } from 'ai';
import { z } from 'zod';
import { knowledgeBaseService } from '../services/knowledge-base-service';

// 全局变量存储当前的数据流回调
let currentToolCallbacks: {
  onToolStart?: (toolCall: any) => void;
  onToolComplete?: (toolCall: any, result: any, duration?: number) => void;
} = {};

// 设置工具回调函数
export function setToolCallbacks(callbacks: typeof currentToolCallbacks) {
  currentToolCallbacks = callbacks;
}

/**
 * 知识库工具配置
 */
export const knowledgeBaseToolConfig = {
  // 触发关键词列表
  triggerKeywords: [
    'iso14067', 'pas2050', 'iso14040', 'iso14044',
    '排放因子', '碳足迹', '标准', '规范', '计算方法', '计算公式',
    'lca', '生命周期', '评估', '电池法案', 'cbam', '碳边境',
    '政策', '法规', '要求', '声明', '认证',
    '区别', '差异', '对比', '比较', "知识库"
  ],
  
  // 工具消息配置
  messages: {
    start: '🔍 正在查询专业知识库...',
    complete: '✅ 专业知识库查询完成'
  },
  
  // 工具专用系统提示
  systemPrompt: `

## 🔧 智能知识库工具已启用

您现在拥有专业知识库查询工具，可以获取最新的技术文档、行业标准、法规政策等权威信息。

**必须使用工具的情况：**
1. 用户询问碳足迹相关的技术标准和规范（如ISO14067、PAS2050等）
2. 需要查找具体的排放因子数据或计算公式
3. 用户要求了解环保法规、政策解读或合规要求
4. 询问产品生命周期评估(LCA)的详细步骤和方法
5. 需要专业技术概念的解释或行业最佳实践案例

**工具使用原则：**
- 当遇到上述问题时，请立即调用知识库工具获取权威信息
- 使用工具获得结果后，基于查询结果为用户提供准确的专业指导
- 确保回答的专业性和权威性

`,

  // 检查用户查询是否应该触发此工具
  shouldTrigger: (userQuery: string): boolean => {
    const query = userQuery.toLowerCase();
    return knowledgeBaseToolConfig.triggerKeywords.some(keyword => 
      query.includes(keyword)
    );
  }
};

/**
 * 知识库查询工具
 */
export const knowledgeBaseTool = tool({
  description: '专业知识库查询工具。用于查询碳足迹相关的技术标准、法规政策、计算方法、排放因子和行业最佳实践等权威信息。',
  parameters: z.object({
    query: z.string().describe('具体的查询问题，例如："ISO14067和PAS2050的区别"、"电力排放因子"、"碳足迹计算方法"等'),
    context: z.string().optional().describe('相关背景信息，如产品类型、行业领域、评估目的等（可选）'),
  }),
  execute: async ({ query, context }) => {
    const startTime = Date.now();
    console.log('🚀 [知识库查询] 开始执行查询:', query);
    
    // 手动触发工具开始回调
    const toolCall = {
      toolName: 'knowledgeBaseTool',
      args: { query, context }
    };
    
    if (currentToolCallbacks.onToolStart) {
      console.log('📤 [工具内部] 手动触发工具开始回调');
      currentToolCallbacks.onToolStart(toolCall);
    }
    
    try {
      const response = await knowledgeBaseService.query({ query, context });
      const duration = Date.now() - startTime;
      console.log(`✅ [知识库查询] 查询成功，耗时: ${duration}ms`);
      
      const result = {
        成功: true,
        内容: response.output.text,
        查询: query,
        时间: new Date().toLocaleString('zh-CN'),
        执行时长: `${duration}ms`,
        ...(context && { 上下文: context }),
      };
      
      // 手动触发工具完成回调
      if (currentToolCallbacks.onToolComplete) {
        console.log('📤 [工具内部] 手动触发工具完成回调');
        currentToolCallbacks.onToolComplete(toolCall, result, duration);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [知识库查询] 查询失败，耗时: ${duration}ms`, error);
      
      const result = {
        成功: false,
        错误: error instanceof Error ? error.message : '查询失败',
        查询: query,
        时间: new Date().toLocaleString('zh-CN'),
        执行时长: `${duration}ms`,
        ...(context && { 上下文: context }),
      };
      
      // 手动触发工具完成回调（失败情况）
      if (currentToolCallbacks.onToolComplete) {
        console.log('📤 [工具内部] 手动触发工具完成回调（失败）');
        currentToolCallbacks.onToolComplete(toolCall, result, duration);
      }
      
      return result;
    }
  },
});

/**
 * 获取所有可用的工具列表
 */
export function getKnowledgeBaseTools(enableKnowledgeBase: boolean = false) {
  if (enableKnowledgeBase) {
    return [knowledgeBaseTool];
  }
  return [];
} 