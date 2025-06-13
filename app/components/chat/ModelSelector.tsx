import type { ProviderInfo } from '~/types/model';
import { useEffect, useState, useRef } from 'react';
import * as React from 'react';
import type { ModelInfo } from '~/lib/modules/llm/types';

interface ModelSelectorProps {
  setModel?: (model: string) => void;
  setProvider?: (provider: ProviderInfo) => void;
  modelList: ModelInfo[];
  providerList: ProviderInfo[];
}

export const ModelSelector = ({ setModel, setProvider, modelList, providerList }: ModelSelectorProps) => {
  const [modelSearchQuery, setModelSearchQuery] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<(HTMLDivElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 只保留OpenRouter Provider
  const openRouterProvider = providerList.find((p) => p.name === 'OpenRouter');

  // 只允许Gemma3 27B和Gemini 0605两个模型
  const allowedModels = modelList.filter((m) => {
    return (
      m.provider === 'OpenRouter' &&
      (
        (m.name.toLowerCase().includes('gemma') && m.name.toLowerCase().includes('27b')) ||
        (m.name.toLowerCase().includes('gemini'))
      )
    );
  });

  // 当前选中的模型
  const [selectedModel, setSelectedModel] = useState(() => allowedModels[0]?.name || '');

  // 强制设置Provider和Model
  React.useEffect(() => {
    if (openRouterProvider && setProvider) {
      setProvider(openRouterProvider);
    }
    if (selectedModel && setModel) {
      setModel(selectedModel);
    }
  }, [openRouterProvider, selectedModel, setProvider, setModel]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
        setModelSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when search query changes or dropdown opens/closes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [modelSearchQuery, isModelDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isModelDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isModelDropdownOpen]);

  // Focus the selected option
  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current[focusedIndex]) {
      optionsRef.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIndex]);

  // Update enabled providers when cookies change
  useEffect(() => {
    // If current provider is disabled, switch to first enabled provider
    if (providerList.length === 0) {
      return;
    }

    if (openRouterProvider && !providerList.map((p) => p.name).includes(openRouterProvider.name)) {
      const firstEnabledProvider = providerList[0];
      setProvider?.(firstEnabledProvider);

      // Also update the model to the first available one for the new provider
      const firstModel = modelList.find((m) => m.provider === firstEnabledProvider.name);

      if (firstModel) {
        setModel?.(firstModel.name);
      }
    }
  }, [providerList, openRouterProvider, setProvider, modelList, setModel]);

  if (!openRouterProvider || allowedModels.length === 0) {
    return <div className="text-red-500">未找到 OpenRouter 的 Gemma3 27B 或 Gemini 0605 模型，请检查API Key和网络</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-gradient-to-r from-purple-800 to-purple-600 shadow border border-purple-400 mb-4">
      <div className="font-bold text-white text-base mb-2">模型提供商：Google developer大赛</div>
      <label className="text-white text-sm mb-1">选择模型：</label>
      <select
        className="rounded-lg px-3 py-2 bg-purple-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-300"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        {allowedModels.map((m) => (
          <option key={m.name} value={m.name}>
            {m.label || m.name}
          </option>
        ))}
      </select>
    </div>
  );
};
