import { useState, useEffect } from 'react';
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

const AIAnalysis: React.FC<AIAnalysisProps> = ({ className = '' }) => {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    progress: 0,
    aiResponse: '',
    lastAnalysisTime: null,
    analysisCount: 0
  });

  // 初始化OpenAI客户端
  const openai = new OpenAI({
    apiKey: "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",
    dangerouslyAllowBrowser: true
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

      // 调用OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
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

      const aiResponse = completion.choices[0]?.message?.content || '分析完成，各项指标正常。';
      
      clearInterval(progressInterval);
      setAnalysisState(prev => ({
        ...prev,
        isAnalyzing: false,
        progress: 100,
        aiResponse,
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
    performAIAnalysis(); // 初始分析
    const interval = setInterval(performAIAnalysis, 45000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h4 className="text-sm font-medium text-green-400">AI 分析报告</h4>
        </div>
        
        {analysisState.aiResponse ? (
          <div className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
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
          disabled={analysisState.isAnalyzing}
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

      {/* AI标识 */}
      {/* <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          <span>Powered by OpenAI GPT</span>
          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        </div>
      </div> */}
    </div>
  );
};

export default AIAnalysis;