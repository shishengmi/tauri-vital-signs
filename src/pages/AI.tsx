"use client";

import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { ThreadList } from "@/components/thread-list";
import { Thread } from "@/components/thread";
import { useAISettings } from "@/hooks/useAISettings";
import { createAIAdapter } from "@/lib/ai-adapters";
import { Loader2 } from "lucide-react";

const AIpage = () => {
  const { settings, inited } = useAISettings();
  

  const dummyAdapter = {} as any;

  const aiAdapter =
    settings && settings.activeProvider
      ? createAIAdapter(settings)
      : dummyAdapter;
  
  const runtime = useLocalRuntime(aiAdapter);
  
  // 如果设置还未加载完成，显示加载状态
  if (!inited) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        加载AI设置中...
      </div>
    );
  }
  
  // 如果没有选择提供商或API密钥为空，显示提示
  if (!settings.activeProvider || 
      (settings.activeProvider === 'openai' && !settings.openai.apiKey)) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-center text-muted-foreground mb-4">
          请先在设置中配置AI服务提供商和API密钥
        </p>
        <a href="/config" className="text-primary hover:underline">
          前往设置
        </a>
      </div>
    );
  }
  
  // Only render the AssistantRuntimeProvider when we have a valid runtime
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-full grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
};

export default AIpage;