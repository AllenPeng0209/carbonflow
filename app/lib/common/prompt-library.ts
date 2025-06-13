import { getSystemPrompt as getSystemPromptDefault } from './prompts/prompts';
import { getSystemPromptCarbonChinese } from './prompts/prompts_carbon_chinese';
import { getSystemPromptCarbonChineseOpen } from './prompts/prompts_carbon_chinese_open';
import getOptimizedPrompt from './prompts/optimized';

export interface PromptOptions {
  cwd: string;
  files: string[];
  supabase?: {
    isConnected: boolean;
    hasSelectedProject: boolean;
    credentials?: {
      anonKey?: string;
      supabaseUrl?: string;
    };
  };
}

export class PromptLibrary {
  static library: Record<
    string,
    {
      label: string;
      description: string;
      get: (options: PromptOptions) => string;
    }
  > = {

    default: {
      label: '引导式碳谘询顾问小碳（默认）',
      description: '专门用于碳足迹量化评估的系统提示词',
      get: (options) => getSystemPromptCarbonChinese(options.cwd, options.supabase),
    },
    carbon: {
      label: '开放式碳谘询顾问小碳',
      description: '专门用于碳足迹量化评估的系统提示词',
      get: (options) => getSystemPromptCarbonChineseOpen(options.cwd, options.supabase),
    },


  };

  static getList() {
    return Object.entries(this.library).map(([key, value]) => {
      const { label, description } = value;
      return {
        id: key,
        label,
        description,
      };
    });
  }
  static getPropmtFromLibrary(promptId: string, options: PromptOptions) {
    const prompt = this.library[promptId];

    if (!prompt) {
      throw '未找到提示词';
    }

    return this.library[promptId]?.get(options);
  }
}

function addFileToPrompt(prompt: string, file: string) {
  return `${prompt}
  
  The user has provided this file:
  ${file}
  `;
}
