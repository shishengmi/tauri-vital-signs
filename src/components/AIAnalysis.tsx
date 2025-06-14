// VitalSignsAIAnalysis.tsx
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import OpenAI from 'openai';
import { useAISettings } from '@/hooks/useAISettings';   // 你的全局设置
import { useVitalSigns } from '@/hooks/useVitalSigns';    // 上面那段 hook

interface AnalysisState {
  running: boolean;
  progress: number;
  result: string;
  lastTime: string | null;
}

const VitalSignsAIAnalysis: React.FC = () => {
  const { data, isLoading, error } = useVitalSigns(1000);
  const { settings, inited } = useAISettings();

  const [state, setState] = useState<AnalysisState>({
    running: false,
    progress: 0,
    result: '',
    lastTime: null,
  });

  // —— 核心：分析函数（无会话记忆） ——
  const analyzeOnce = async () => {
    if (!inited || !data) return;

    // 前置校验 API Key / Provider
    if (
      (settings.activeProvider === 'openai' && !settings.openai.apiKey) ||
      (settings.activeProvider === 'ollama' && !settings.ollama.apiUrl) ||
      (settings.activeProvider === 'lmstudio' && !settings.lmstudio.apiUrl)
    ) {
      setState((s) => ({ ...s, result: '⚠️ 请先在设置里配置 AI 服务。' }));
      return;
    }

    // 进度条伪动画
    setState({ running: true, progress: 0, result: '', lastTime: null });
    const timer = setInterval(() =>
      setState((s) =>
        s.progress >= 90 ? s : { ...s, progress: s.progress + 10 }
      ), 250);

    // 构造一次性 Prompt
    const prompt = `请作为专业医疗 AI，只基于以下一次性生命体征数据，给出 ≤80 字中文健康评估：总体状态、主要问题、建议。直接输出，不保留上下文。
时间: ${data.timestamp}
体温: ${data.body_temperature} ℃
心率: ${data.heart_rate} BPM
RR间期: ${data.rr_interval} ms
血氧: ${data.blood_oxygen} %
血压: ${data.systolic ?? '-'} / ${data.diastolic ?? '-'} mmHg`;

    try {
      let aiText = '分析失败';

      if (settings.activeProvider === 'openai') {
        const openai = new OpenAI({
          apiKey: settings.openai.apiKey,
          baseURL: settings.openai.apiUrl,
          dangerouslyAllowBrowser: true,
        });

        const res = await openai.chat.completions.create({
          model: settings.openai.selectedModel || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '你是一名谨慎且专业的医疗 AI，回答需可靠，简明。' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 120,
          temperature: 0.3,
        });
        aiText = res.choices[0]?.message?.content?.trim() || aiText;
      } else if (settings.activeProvider === 'ollama') {
        const r = await fetch(`${settings.ollama.apiUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings.ollama.selectedModel,
            messages: [
              { role: 'system', content: '你是一名谨慎且专业的医疗 AI，回答需可靠，简明。' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        aiText = r.ok ? (await r.json()).message?.content?.trim() : '分析失败';
      } else if (settings.activeProvider === 'lmstudio') {
        const r = await fetch(`${settings.lmstudio.apiUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: settings.lmstudio.selectedModel,
            messages: [
              { role: 'system', content: '你是一名谨慎且专业的医疗 AI，回答需可靠，简明。' },
              { role: 'user', content: prompt },
            ],
          }),
        });
        aiText =
          r.ok ? (await r.json()).choices?.[0]?.message?.content?.trim() : '分析失败';
      }

      clearInterval(timer);
      setState({
        running: false,
        progress: 100,
        result: aiText || '暂无结论',
        lastTime: new Date().toLocaleTimeString(),
      });
    } catch (err) {
      clearInterval(timer);
      console.error(err);
      setState({
        running: false,
        progress: 0,
        result: '⚠️ AI 分析出错，请稍后重试。',
        lastTime: null,
      });
    }
  };

  // 当“新数据”到达且不是加载状态时触发分析
  useEffect(() => {
    if (data && !isLoading && !error) analyzeOnce();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]); // 仅依赖最新数据

  // UI —— 简洁骨架
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 bg-zinc-900 rounded-lg">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="text-sm text-gray-300">加载生命体征...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
        获取数据失败：{error}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      {/* 顶部状态行 */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-blue-400">
          AI 健康分析
        </h3>
        {state.lastTime && (
          <span className="text-xs text-gray-400">上次 {state.lastTime}</span>
        )}
      </div>

      {/* 进度条 */}
      {state.running && (
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> 分析进行中
            </span>
            <span>{state.progress}%</span>
          </div>
          <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${state.progress}%` }}
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
            />
          </div>
        </div>
      )}

      {/* 分析结果 */}
      {!state.running && (
        <div className="text-sm text-gray-200 whitespace-pre-wrap">
          {state.result || '等待新数据分析...'}
        </div>
      )}
    </div>
  );
};

export default VitalSignsAIAnalysis;
