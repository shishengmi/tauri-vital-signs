import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { LazyStore } from '@tauri-apps/plugin-store';

// AI 设置接口
export interface AISettings {
  activeProvider: 'openai' | 'ollama' | 'lmstudio' | '';
  openai: {
    apiKey: string;
    apiUrl: string;
    selectedModel: string;
    availableModels: string[];
  };
  ollama: {
    apiUrl: string;
    selectedModel: string;
    availableModels: string[];
  };
  lmstudio: {
    apiUrl: string;
    selectedModel: string;
    availableModels: string[];
  };
}

// 默认设置
const defaultSettings: AISettings = {
  activeProvider: 'openai',
  openai: {
    apiKey: '',
    apiUrl: 'https://api.openai.com/v1',
    selectedModel: 'gpt-3.5-turbo',
    availableModels: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4o', 'gpt-4o-mini'],
  },
  ollama: {
    apiUrl: 'http://localhost:11434',
    selectedModel: 'llama3',
    availableModels: ['llama3', 'mistral', 'gemma'],
  },
  lmstudio: {
    apiUrl: 'http://localhost:1234/v1',
    selectedModel: 'default',
    availableModels: ['default'],
  },
};

type ProviderType = 'openai' | 'ollama' | 'lmstudio';

// 用 LazyStore，首次访问自动加载
const store = new LazyStore('ai-settings.json');

export const useAISettings = () => {
  const [settings, setSettings] = useState<AISettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [inited, setInited] = useState(false); // 首次加载标记

  // 加载本地设置
  useEffect(() => {
    (async () => {
      const saved = await store.get<AISettings>('aiSettings');
      if (saved) {
        setSettings(saved);
      }
      setInited(true);
    })();
  }, []);

  // 保存设置到本地
  const updateSettings = async (newSettings: AISettings) => {
    setSettings(newSettings);
    await store.set('aiSettings', newSettings);
    await store.save();
  };

  // 测试连接
  const testConnection = async (provider: ProviderType) => {
    setIsLoading(true);
    try {
      let result;
      if (provider === 'openai') {
        result = await invoke<{ success: boolean; message: string }>('test_openai_connection', {
          apiKey: settings.openai.apiKey,
          apiUrl: settings.openai.apiUrl || undefined,
        });
      } else if (provider === 'ollama') {
        result = await invoke<{ success: boolean; message: string }>('test_ollama_connection', {
          apiUrl: settings.ollama.apiUrl,
        });
      } else if (provider === 'lmstudio') {
        result = await invoke<{ success: boolean; message: string }>('test_lmstudio_connection', {
          apiUrl: settings.lmstudio.apiUrl,
        });
      } else {
        throw new Error('未知的AI提供商');
      }
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新模型列表
  const refreshModels = async (provider: ProviderType) => {
    setIsLoading(true);
    try {
      let models: string[] = [];
      if (provider === 'openai') {
        models = await invoke<string[]>('get_openai_models', {
          apiKey: settings.openai.apiKey,
          apiUrl: settings.openai.apiUrl || undefined,
        });
      } else if (provider === 'ollama') {
        models = await invoke<string[]>('get_ollama_models', {
          apiUrl: settings.ollama.apiUrl,
        });
      } else if (provider === 'lmstudio') {
        models = await invoke<string[]>('get_lmstudio_models', {
          apiUrl: settings.lmstudio.apiUrl,
        });
      }
      // 更新 provider 下的模型列表
      const updatedSettings: AISettings = {
        ...settings,
        [provider]: {
          ...settings[provider],
          availableModels: models,
        },
      };
      await updateSettings(updatedSettings);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    updateSettings,
    testConnection,
    refreshModels,
    isLoading,
    inited,
  };
};

