import { useState, useEffect } from 'react';
import { LazyStore } from '@tauri-apps/plugin-store';

// AI 设置接口
export interface AISettings {
  enableReasoning: boolean;
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
  enableReasoning: false, 
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
      const saved = await store.get<AISettings>("aiSettings");
      if (saved) setSettings({ ...defaultSettings, ...saved }); // 合并防止新字段缺失
      setInited(true);
    })();
  }, []);

  /* ——— 更新并持久化配置 ——— */
  const updateSettings = async (next: AISettings) => {
    setSettings(next);
    await store.set("aiSettings", next);
    await store.save();
  };

  // 测试连接 - 前端实现
  const testConnection = async (provider: ProviderType) => {
    setIsLoading(true);
    try {
      let result = { success: false, message: '' };
      
      if (provider === 'openai') {
        // 测试OpenAI连接
        try {
          const response = await fetch(`${settings.openai.apiUrl}/models`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${settings.openai.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            result = { success: true, message: '连接成功' };
          } else {
            const error = await response.json();
            result = { success: false, message: error.error?.message || '连接失败' };
          }
        } catch (error: any) {
          result = { success: false, message: error.message || '网络错误' };
        }
      } else if (provider === 'ollama') {
        // 测试Ollama连接
        try {
          const response = await fetch(`${settings.ollama.apiUrl}/api/tags`, {
            method: 'GET'
          });
          
          if (response.ok) {
            result = { success: true, message: '连接成功' };
          } else {
            result = { success: false, message: '连接失败' };
          }
        } catch (error: any) {
          result = { success: false, message: error.message || '网络错误' };
        }
      } else if (provider === 'lmstudio') {
        // 测试LM Studio连接
        try {
          const response = await fetch(`${settings.lmstudio.apiUrl}/models`, {
            method: 'GET'
          });
          
          if (response.ok) {
            result = { success: true, message: '连接成功' };
          } else {
            result = { success: false, message: '连接失败' };
          }
        } catch (error: any) {
          result = { success: false, message: error.message || '网络错误' };
        }
      } else {
        throw new Error('未知的AI提供商');
      }
      
      return result;
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新模型列表 - 前端实现
  const refreshModels = async (provider: ProviderType) => {
    setIsLoading(true);
    try {
      let models: string[] = [];
  
      if (provider === 'openai') {
        try {
          const response = await fetch(`${settings.openai.apiUrl}/models`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${settings.openai.apiKey}`,
              'Content-Type': 'application/json'
            }
          });
  
          if (response.ok) {
            const data = await response.json();
            models = data.data
              .filter((model: any) => 
                model.id.includes('gpt') && 
                !model.id.includes('instruct') && 
                !model.id.includes('-vision-')
              )
              .map((model: any) => model.id);
          }
        } catch (error) {
          console.error('获取OpenAI模型失败:', error);
        }
      } else if (provider === 'ollama') {
        try {
          const response = await fetch(`${settings.ollama.apiUrl}/api/tags`, {
            method: 'GET'
          });
  
          if (response.ok) {
            const data = await response.json();
            models = data.models?.map((model: any) => model.name) || [];
          }
        } catch (error) {
          console.error('获取Ollama模型失败:', error);
        }
      } else if (provider === 'lmstudio') {
        try {
          // lmstudio 接口为 /v1/models，兼容配置结尾无斜杠
          const apiUrl = settings.lmstudio.apiUrl.replace(/\/$/, '');
          const response = await fetch(`${apiUrl}/models`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          });
  
          if (response.ok) {
            const data = await response.json();
            models = Array.isArray(data.data)
              ? data.data.map((model: any) => model.id)
              : [];
          }
        } catch (error) {
          console.error('获取LM Studio模型失败:', error);
        }
      }
  
      if (models.length === 0) {
        models = defaultSettings[provider].availableModels;
      }
  
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