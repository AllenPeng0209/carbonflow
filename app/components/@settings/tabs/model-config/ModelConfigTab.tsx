import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { classNames } from '~/utils/classNames';
import { useStore } from '@nanostores/react';
import { promptStore, updatePromptId } from '~/lib/stores/settings';
import type { ProviderInfo } from '~/types/model';
import { PROVIDER_LIST } from '~/utils/constants';
import { Switch } from '~/components/ui/Switch';

interface ModelConfig {
  model: string;
  provider: ProviderInfo;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  useKnowledgeBase?: boolean;
  mcpServers?: MCPServerConfig[];
}

interface MCPServerConfig {
  name: string;
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
}

const DEFAULT_MCP_SERVERS: MCPServerConfig[] = [

];

const promptOptions = [
  { id: 'default', label: '引导式碳谘询顾问小碳（默认）' },
  { id: 'carbon', label: '开放式碳谘询顾问小碳' },

  { id: 'custom', label: '自定义' },
];

export const ModelConfigTab: React.FC = () => {
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => {
    if (typeof window === 'undefined') {
      return {
        model: '',
        provider: PROVIDER_LIST[0],
        temperature: 0.7,
        maxTokens: 4096,
        systemPrompt: '',
        useKnowledgeBase: false,
        mcpServers: DEFAULT_MCP_SERVERS,
      };
    }
    try {
      const savedConfig = localStorage.getItem('bolt_model_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        // 确保 mcpServers 始终是一个数组
        if (!parsed.mcpServers) {
          parsed.mcpServers = [];
        }
        return parsed;
      }
    } catch (error) {
      console.error('Failed to parse model config from localStorage', error);
    }
    return {
      model: '',
      provider: PROVIDER_LIST[0],
      temperature: 0.7,
      maxTokens: 4096,
      systemPrompt: '',
      useKnowledgeBase: false,
      mcpServers: DEFAULT_MCP_SERVERS,
    };
  });

  const [customPrompt, setCustomPrompt] = useState(() => {
    const saved = localStorage.getItem('bolt_custom_prompt');
    return saved || '';
  });

  const selectedPromptId = useStore(promptStore);

  // 保存模型配置
  useEffect(() => {
    try {
      localStorage.setItem('bolt_model_config', JSON.stringify(modelConfig));
      toast.success('模型配置已保存');
    } catch (error) {
      console.error('保存模型配置失败:', error);
      toast.error('保存模型配置失败');
    }
  }, [modelConfig]);

  // 保存自定义prompt
  const handleSaveCustomPrompt = () => {
    try {
      localStorage.setItem('bolt_custom_prompt', customPrompt);
      toast.success('自定义Prompt已保存');
    } catch (error) {
      console.error('保存自定义Prompt失败:', error);
      toast.error('保存自定义Prompt失败');
    }
  };

  const handleMCPServerToggle = (index: number, enabled: boolean) => {
    const updatedServers = [...(modelConfig.mcpServers || [])];
    updatedServers[index] = { ...updatedServers[index], enabled };
    setModelConfig((prev) => ({ ...prev, mcpServers: updatedServers }));
  };

  const handleMCPServerConfig = (index: number, field: 'endpoint' | 'apiKey', value: string) => {
    const updatedServers = [...(modelConfig.mcpServers || [])];
    updatedServers[index] = { ...updatedServers[index], [field]: value };
    setModelConfig((prev) => ({ ...prev, mcpServers: updatedServers }));
  };

  return (
    <div className="space-y-4">
      {/* 模型选择配置 */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:robot-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">模型配置</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-2">默认模型</label>
            <div className="text-xs text-bolt-elements-textTertiary mb-2">
              这里设置的模型将作为新对话的默认模型，您仍可以在对话中随时切换
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-bolt-elements-textSecondary mb-2">温度 (Temperature)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={modelConfig.temperature}
                  onChange={(e) => setModelConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="flex-1"
                />
                <span className="text-sm text-bolt-elements-textPrimary w-12">{modelConfig.temperature}</span>
              </div>
              <div className="text-xs text-bolt-elements-textTertiary mt-1">
                控制输出的随机性，0表示更确定性，2表示更创造性
              </div>
            </div>

            <div>
              <label className="block text-sm text-bolt-elements-textSecondary mb-2">最大令牌数 (Max Tokens)</label>
              <input
                type="number"
                min="1"
                max="32768"
                value={modelConfig.maxTokens}
                onChange={(e) => setModelConfig((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                className={classNames(
                  'w-full px-3 py-2 rounded-lg text-sm',
                  'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                  'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                  'text-bolt-elements-textPrimary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'transition-all duration-200',
                )}
              />
              <div className="text-xs text-bolt-elements-textTertiary mt-1">
                控制生成内容的最大长度
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-bolt-elements-textSecondary">启用知识库</label>
                <Switch
                  checked={modelConfig.useKnowledgeBase}
                  onCheckedChange={(checked) => setModelConfig((prev) => ({ ...prev, useKnowledgeBase: checked }))}
                />
              </div>
              <div className="text-xs text-bolt-elements-textTertiary">
                启用后AI可以访问专业知识库来提供更准确的技术信息
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Prompt配置 */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:text-align-left-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">Prompt配置</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-bolt-elements-textSecondary mb-2">选择Prompt模板</label>
            <select
              value={selectedPromptId}
              onChange={(e) => updatePromptId(e.target.value)}
              className={classNames(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                'text-bolt-elements-textPrimary',
                'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                'transition-all duration-200',
              )}
            >
              {promptOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {selectedPromptId === 'custom' && (
            <div>
              <label className="block text-sm text-bolt-elements-textSecondary mb-2">自定义系统Prompt</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={10}
                className={classNames(
                  'w-full px-3 py-2 rounded-lg text-sm',
                  'bg-[#FAFAFA] dark:bg-[#0A0A0A]',
                  'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                  'text-bolt-elements-textPrimary',
                  'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                  'transition-all duration-200',
                  'font-mono',
                )}
                placeholder="输入您的自定义系统提示词..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleSaveCustomPrompt}
                  className={classNames(
                    'px-4 py-2 rounded-lg text-sm font-medium',
                    'bg-purple-500 text-white',
                    'hover:bg-purple-600',
                    'focus:outline-none focus:ring-2 focus:ring-purple-500/30',
                    'transition-all duration-200',
                  )}
                >
                  保存自定义Prompt
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* MCP配置 */}
      <motion.div
        className="bg-white dark:bg-[#0A0A0A] rounded-lg shadow-sm dark:shadow-none p-4 space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="i-ph:plug-fill w-4 h-4 text-purple-500" />
          <span className="text-sm font-medium text-bolt-elements-textPrimary">MCP (Model Context Protocol) 配置</span>
        </div>

        <div className="text-xs text-bolt-elements-textTertiary mb-4">
          MCP允许AI访问外部工具和服务，扩展其能力
        </div>

        <div className="space-y-3">
          {(modelConfig.mcpServers || []).map((server, index) => (
            <div
              key={server.name}
              className={classNames(
                'p-3 rounded-lg border',
                'border-[#E5E5E5] dark:border-[#1A1A1A]',
                'bg-[#FAFAFA] dark:bg-[#050505]',
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-bolt-elements-textPrimary">{server.name}</span>
                <Switch
                  checked={server.enabled}
                  onCheckedChange={(checked) => handleMCPServerToggle(index, checked)}
                />
              </div>

              {server.enabled && (
                <div className="space-y-2 mt-3">
                  {server.name !== 'Hot News MCP' && (
                    <>
                      <input
                        type="text"
                        placeholder="端点URL (可选)"
                        value={server.endpoint || ''}
                        onChange={(e) => handleMCPServerConfig(index, 'endpoint', e.target.value)}
                        className={classNames(
                          'w-full px-3 py-1.5 rounded text-xs',
                          'bg-white dark:bg-[#0A0A0A]',
                          'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                          'text-bolt-elements-textPrimary',
                          'focus:outline-none focus:ring-1 focus:ring-purple-500/30',
                        )}
                      />
                      <input
                        type="password"
                        placeholder="API密钥 (可选)"
                        value={server.apiKey || ''}
                        onChange={(e) => handleMCPServerConfig(index, 'apiKey', e.target.value)}
                        className={classNames(
                          'w-full px-3 py-1.5 rounded text-xs',
                          'bg-white dark:bg-[#0A0A0A]',
                          'border border-[#E5E5E5] dark:border-[#1A1A1A]',
                          'text-bolt-elements-textPrimary',
                          'focus:outline-none focus:ring-1 focus:ring-purple-500/30',
                        )}
                      />
                    </>
                  )}
                  <div className="text-xs text-bolt-elements-textTertiary">
                    {server.name === 'Playwright MCP' && '用于浏览器自动化和网页操作'}
                    {server.name === 'Supabase MCP' && '用于数据库操作和实时功能'}
                    {server.name === 'Hot News MCP' && '获取各平台热门新闻和趋势'}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}; 