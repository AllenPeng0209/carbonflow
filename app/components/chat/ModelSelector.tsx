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

  // 支持的提供商：OpenRouter和Ollama（本地）
  const supportedProviders = providerList.filter((p) => p.name === 'OpenRouter' || p.name === 'Ollama');
  
  // 支持的模型：OpenRouter的Gemma3/Gemini + Ollama的本地Gemma模型
  const allowedModels = modelList.filter((m) => {
    if (m.provider === 'OpenRouter') {
      return (
        (m.name.toLowerCase().includes('gemma') && m.name.toLowerCase().includes('27b')) ||
        m.name.toLowerCase().includes('gemini')
      );
    } else if (m.provider === 'Ollama') {
      // 支持所有本地Ollama的Gemma模型
      return m.name.toLowerCase().includes('gemma');
    }
    return false;
  });

  // 当前选中的模型和提供商
  const [selectedModel, setSelectedModel] = useState(() => allowedModels[0]?.name || '');
  const [selectedProvider, setSelectedProvider] = useState(() => {
    const model = allowedModels[0];
    return supportedProviders.find(p => p.name === model?.provider) || supportedProviders[0];
  });

  // 强制设置Provider和Model
  React.useEffect(() => {
    if (selectedProvider && setProvider) {
      setProvider(selectedProvider);
    }

    if (selectedModel && setModel) {
      setModel(selectedModel);
    }
  }, [selectedProvider, selectedModel, setProvider, setModel]);

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
    if (supportedProviders.length === 0) {
      return;
    }

    if (selectedProvider && !supportedProviders.map((p) => p.name).includes(selectedProvider.name)) {
      const firstEnabledProvider = supportedProviders[0];
      setSelectedProvider(firstEnabledProvider);

      // Also update the model to the first available one for the new provider
      const firstModel = modelList.find((m) => m.provider === firstEnabledProvider.name && allowedModels.some(am => am.name === m.name));

      if (firstModel) {
        setSelectedModel(firstModel.name);
      }
    }
  }, [supportedProviders, selectedProvider, modelList]);

  // 处理模型变更
  const handleModelChange = (newModelName: string) => {
    const newModel = allowedModels.find(m => m.name === newModelName);
    if (newModel) {
      setSelectedModel(newModelName);
      const newProvider = supportedProviders.find(p => p.name === newModel.provider);
      if (newProvider && newProvider.name !== selectedProvider?.name) {
        setSelectedProvider(newProvider);
      }
    }
  };

  if (supportedProviders.length === 0 || allowedModels.length === 0) {
    return (
      <div className="text-red-500">
        未找到支持的模型提供商或模型。请检查：
        <ul className="mt-2 ml-4 list-disc">
          <li>OpenRouter API Key是否配置</li>
          <li>Ollama是否已安装并运行</li>
          <li>是否已安装Gemma模型（ollama pull gemma:7b）</li>
        </ul>
      </div>
    );
  }

  // 按提供商分组模型
  const modelsByProvider = allowedModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, ModelInfo[]>);

  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-gradient-to-r from-purple-800 to-purple-600 shadow border border-purple-400 mb-4">
      <div className="font-bold text-white text-base mb-2">
        AI模型选择器 - Google Developer大赛
      </div>
      
      <div className="text-white text-sm mb-1">
        当前提供商: <span className="font-semibold">{selectedProvider?.name || '未选择'}</span>
        {selectedProvider?.name === 'Ollama' && (
          <span className="ml-2 px-2 py-1 bg-green-600 rounded-md text-xs">本地运行</span>
        )}
      </div>
      
      <label className="text-white text-sm mb-1">选择模型:</label>
      <select
        className="rounded-lg px-3 py-2 bg-purple-700 text-white font-bold focus:outline-none focus:ring-2 focus:ring-purple-300"
        value={selectedModel}
        onChange={(e) => handleModelChange(e.target.value)}
      >
        {Object.entries(modelsByProvider).map(([providerName, models]) => (
          <optgroup key={providerName} label={`${providerName} ${providerName === 'Ollama' ? '(本地)' : '(云端)'}`}>
            {models.map((m) => (
              <option key={m.name} value={m.name}>
                {m.label || m.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      
      {selectedProvider?.name === 'Ollama' && (
        <div className="mt-2 p-2 bg-purple-900/50 rounded-lg">
          <div className="text-xs text-white/80">
            💡 提示: 使用本地Ollama模型，数据不会发送到云端，保护隐私安全
          </div>
        </div>
      )}
      
      {allowedModels.length === 0 && (
        <div className="mt-2 p-2 bg-yellow-600/50 rounded-lg">
          <div className="text-xs text-white">
            ⚠️ 未找到Gemma模型，请安装: <code className="bg-black/30 px-1 rounded">ollama pull gemma:7b</code>
          </div>
        </div>
      )}
    </div>
  );
};
