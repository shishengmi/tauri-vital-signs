import { ChatModelAdapter } from "@assistant-ui/react";
import OpenAI from "openai";
import { AISettings } from "@/hooks/useAISettings";

// 创建OpenAI适配器
export const createOpenAIAdapter = (apiKey: string, apiUrl?: string, model?: string): ChatModelAdapter => {
  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: apiUrl,
    dangerouslyAllowBrowser: true, // ⚠️ 允许前端环境中使用
  });

  return {
    async *run({ messages, abortSignal }) {
      const stream = await openai.chat.completions.create({
        model: model || "gpt-3.5-turbo",
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n"),
        })),
        stream: true,
      },
      {
        signal: abortSignal,
      });

      let text = "";
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          text += delta;
          yield {
            content: [{ type: "text", text }],
          };
        }
      }
    },
  };
};

// 创建Ollama适配器
export const createOllamaAdapter = (apiUrl: string, model: string): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal }) {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
              .filter((c) => c.type === "text")
              .map((c) => c.text)
              .join("\n"),
          })),
          stream: true,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      let text = "";
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.message?.content) {
                text += data.message.content;
                yield {
                  content: [{ type: "text", text }],
                };
              }
            } catch (e) {
              console.error("解析Ollama响应失败:", e);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
};

// 创建LM Studio适配器
export const createLMStudioAdapter = (apiUrl: string, model: string): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal }) {
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content
              .filter((c) => c.type === "text")
              .map((c) => c.text)
              .join("\n"),
          })),
          stream: true,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      let text = "";
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.substring(6);
              if (data === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content;
                if (content) {
                  text += content;
                  yield {
                    content: [{ type: "text", text }],
                  };
                }
              } catch (e) {
                console.error("解析LM Studio响应失败:", e);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
};

// 创建适配器工厂
export const createAIAdapter = (settings: AISettings): ChatModelAdapter => {
  const { activeProvider } = settings;
  
  switch (activeProvider) {
    case 'openai':
      return createOpenAIAdapter(
        settings.openai.apiKey, 
        settings.openai.apiUrl, 
        settings.openai.selectedModel
      );
    case 'ollama':
      return createOllamaAdapter(
        settings.ollama.apiUrl, 
        settings.ollama.selectedModel
      );
    case 'lmstudio':
      return createLMStudioAdapter(
        settings.lmstudio.apiUrl, 
        settings.lmstudio.selectedModel
      );
    default:
      // 默认使用OpenAI
      return createOpenAIAdapter(
        settings.openai.apiKey, 
        settings.openai.apiUrl, 
        settings.openai.selectedModel
      );
  }
};