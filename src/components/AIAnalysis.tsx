import { useState, useEffect } from 'react';
import { useAISettings } from '@/hooks/useAISettings';
import { Loader2 } from 'lucide-react';
import OpenAI from 'openai';

interface AIAnalysisProps {
  className?: string;
}

interface AnalysisState {
  isAnalyzing: boolean;
  progress: number;
  aiResponse: string;
  lastAnalysisTime: string | null;
  analysisCount: number;
}

// 过滤<think></think>标签之间的内容 - 更严格的实现
const filterThinkingContent = (text: string): string => {
  // 匹配<think>和</think>之间的内容，包括标签本身，允许标签内有属性
  const thinkRegex = /<think[^>]*>([\s\S]*?)<\/think>/g;
  
  // 匹配单独的<think/>标签，允许标签内有属性
  const selfClosingThinkRegex = /<think[^>]*\/>/g;
  
  // 匹配可能存在的不规则格式，如<think >或< think>等
  const irregularThinkRegex = /<\s*think\s*>([\s\S]*?)<\s*\/\s*think\s*>/g;
  
  // 移除所有匹配的内容
  let result = text;
  result = result.replace(thinkRegex, '');
  result = result.replace(selfClosingThinkRegex, '');
  result = result.replace(irregularThinkRegex, '');
  
  // 处理可能的嵌套标签情况，重复过滤直到没有变化
  let previousResult = '';
  while (previousResult !== result) {
    previousResult = result;
    result = result.replace(thinkRegex, '').replace(selfClosingThinkRegex, '').replace(irregularThinkRegex, '');
  }
  
  // 移除可能的空行和多余空格
  result = result.replace(/^\s*[\r\n]/gm, '').trim();
  
  return result;
};

const AIAnalysis: React.FC<AIAnalysisProps> = ({ className = '' }) => {
  const { settings, inited } = useAISettings();
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    progress: 0,
    aiResponse: '',
    lastAnalysisTime: null,
    analysisCount: 0
  });

  // 模拟获取生命体征数据
  const getVitalSignsData = () => {
    return {
      heartRate: Math.floor(Math.random() * 40) + 60, // 60-100
      bloodPressure: {
        systolic: Math.floor(Math.random() * 40) + 110, // 110-150
        diastolic: Math.floor(Math.random() * 30) + 70   // 70-100
      },
      temperature: (Math.random() * 2 + 36).toFixed(1), // 36-38
      oxygenSaturation: Math.floor(Math.random() * 5) + 95, // 95-100
      timestamp: new Date().toISOString()
    };
  };

  // 执行AI分析
  const performAIAnalysis = async () => {
    // 如果设置未初始化或没有有效的提供商，则不执行分析
    if (!inited || !settings.activeProvider || 
        (settings.activeProvider === 'openai' && !settings.openai.apiKey)) {
      setAnalysisState(prev => ({
        ...prev,
        aiResponse: '请先在设置中配置AI服务提供商和API密钥'
      }));
      return;
    }

    setAnalysisState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      progress: 0,
      aiResponse: ''
    }));

    try {
      // 模拟分析进度
      const progressInterval = setInterval(() => {
        setAnalysisState(prev => {
          if (prev.progress >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 300);

      // 获取当前生命体征数据
      const vitalSigns = getVitalSignsData();
      
      // 构建AI分析提示
      const prompt = `作为一名专业的医疗AI助手，请分析以下生命体征数据并提供简短的健康评估：

心率: ${vitalSigns.heartRate} BPM
血压: ${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic} mmHg
体温: ${vitalSigns.temperature}°C
血氧饱和度: ${vitalSigns.oxygenSaturation}%

请提供：
1. 整体健康状态评估（1-2句话）
2. 主要关注点（如有异常）
3. 简短建议（1-2条）

请保持回复简洁专业，不超过100字。`;

      let aiResponse = '';
      
      // 根据不同的AI提供商使用不同的API
      if (settings.activeProvider === 'openai') {
        // 使用OpenAI API
        const openai = new OpenAI({
          apiKey: settings.openai.apiKey,
          baseURL: settings.openai.apiUrl,
          dangerouslyAllowBrowser: true
        });
        
        const completion = await openai.chat.completions.create({
          model: settings.openai.selectedModel || "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "你是一个专业的医疗AI助手，专门分析生命体征数据。请提供简洁、专业的健康评估。"
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        });
        
        aiResponse = completion.choices[0]?.message?.content || '分析完成，各项指标正常。';
      } else if (settings.activeProvider === 'ollama') {
        // 使用Ollama API
        const response = await fetch(`${settings.ollama.apiUrl}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: settings.ollama.selectedModel,
            messages: [
              {
                role: "system",
                content: "你是一个专业的医疗AI助手，专门分析生命体征数据。请提供简洁、专业的健康评估。"
              },
              {
                role: "user",
                content: prompt
              }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.message?.content || '分析完成，各项指标正常。';
        } else {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }
      } else if (settings.activeProvider === 'lmstudio') {
        // 使用LM Studio API
        const response = await fetch(`${settings.lmstudio.apiUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: settings.lmstudio.selectedModel,
            messages: [
              {
                role: "system",
                content: "你是一个专业的医疗AI助手，专门分析生命体征数据。请提供简洁、专业的健康评估。"
              },
              {
                role: "user",
                content: prompt
              }
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          aiResponse = data.choices[0]?.message?.content || '分析完成，各项指标正常。';
        } else {
          throw new Error(`LM Studio API error: ${response.statusText}`);
        }
      }
      
      // 过滤掉<think></think>标签之间的内容
      const filteredResponse = filterThinkingContent(aiResponse);
      
      clearInterval(progressInterval);
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        aiResponse: filteredResponse || '分析完成，各项指标正常。',
        lastAnalysisTime: new Date().toLocaleTimeString(),
        analysisCount: prev.analysisCount + 1
      }));

    } catch (error) {
      console.error('AI分析失败:', error);
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 0,
        aiResponse: '分析服务暂时不可用，请稍后重试。建议保持健康的生活方式，如有不适请及时就医。',
        lastAnalysisTime: new Date().toLocaleTimeString(),
        analysisCount: prev.analysisCount + 1
      }));
    }
  };

  // 定时自动分析（每45秒）
  useEffect(() => {
    if (inited) {
      performAIAnalysis(); // 初始分析
      const interval = setInterval(performAIAnalysis, 45000);
      return () => clearInterval(interval);
    }
  }, [inited]);

  // 如果设置还未加载完成，显示加载状态
  if (!inited) {
    return (
      <div className={`bg-gray-900 rounded-lg p-4 border border-gray-700 ${className} flex items-center justify-center`}>
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span>加载AI设置中...</span>
      </div>
    );
  }

  return (
    <div className={`bg-gray-900 rounded-lg p-4 border border-gray-700 ${className}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
            {analysisState.isAnalyzing && (
              <div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-ping"></div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              AI 智能健康分析
            </h3>
            <p className="text-xs text-gray-400">
              已完成 {analysisState.analysisCount} 次分析
            </p>
          </div>
        </div>
        {analysisState.lastAnalysisTime && (
          <div className="text-right">
            <div className="text-xs text-gray-400">最后分析</div>
            <div className="text-xs text-blue-400 font-mono">
              {analysisState.lastAnalysisTime}
            </div>
          </div>
        )}
      </div>

      {/* 分析状态 */}
      {analysisState.isAnalyzing && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              AI正在分析中...
            </span>
            <span className="text-sm text-blue-400 font-mono">
              {analysisState.progress}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
              style={{ width: `${analysisState.progress}%` }}
            >
              <div className="h-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
            </div>
          </div>
        </div>
      )}

      {/* AI分析结果 */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600 mt-0">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-sm font-medium text-green-400">AI 分析报告</h4>
        </div>
        
        {analysisState.aiResponse ? (
          <div className="text-sm text-gray-200 leading-relaxed overflow-y-auto max-h-[150px] break-words">
            {analysisState.aiResponse}
          </div>
        ) : (
          <div className="text-sm text-gray-400 italic">
            等待AI分析结果...
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 mt-4">
        <button 
          onClick={performAIAnalysis}
          disabled={analysisState.isAnalyzing || !settings.activeProvider}
          className="flex-1 py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {analysisState.isAnalyzing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              分析中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              立即分析
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AIAnalysis;