import { ChatModelAdapter} from "@assistant-ui/react";
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

// 创建 LM Studio 适配器
export const createLMStudioAdapter = (
  apiUrl: string,
  model: string
): ChatModelAdapter => {
  return {
    async *run({ messages, abortSignal }) {
      /** 1. 建立 SSE 请求 */
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
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

      /** 2. 标志位与缓冲 */
      const decoder = new TextDecoder();
      let unprocessed = "";      // 保存跨 chunk 残留
      let inReasoning = false;   // ← 关键标志
      let visibleText = "";      // 累计普通文字
      let reasoningText = "";    // 累计推理文字

      /** 正则同时匹配 3 种写法：<think>  </think>  <think/> */
      const tagRe = /<\/?think\/?>/i;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          unprocessed += decoder.decode(value);

          /** 按行拆分 SSE 消息，最后一行可能是不完整 JSON——留到下次 */
          const lines = unprocessed.split("\n");
          unprocessed = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            let delta: string | undefined;
            try {
              delta = JSON.parse(data).choices?.[0]?.delta?.content;
            } catch (e) {
              console.error("解析 LM Studio 响应失败:", e);
            }
            if (!delta) continue;

            /** 3. 处理 delta：把标记和正文分开 */
            let frag = delta;
            while (frag.length) {
              const m = tagRe.exec(frag);
              if (!m) {
                /** 没有标记：整体作为正文，但要注意可能出现被截断的 "<thi" */
                const lastLt = frag.lastIndexOf("<");
                if (lastLt === -1) {
                  // 没有 "<"：安全输出
                  if (inReasoning) reasoningText += frag;
                  else visibleText += frag;
                  frag = "";
                } else {
                  // 把 "<" 前面输出，把剩余存回 unprocessed（可能是残缺标记）
                  const safe = frag.slice(0, lastLt);
                  const rest = frag.slice(lastLt);
                  if (safe) {
                    if (inReasoning) reasoningText += safe;
                    else visibleText += safe;
                  }
                  unprocessed = rest + "\n" + unprocessed; // 放回队列头
                  frag = "";
                }
              } else {
                /** m.index 前是正文 */
                if (m.index > 0) {
                  const plain = frag.slice(0, m.index);
                  if (inReasoning) reasoningText += plain;
                  else visibleText += plain;
                }

                /** 处理标记本身 */
                const tag = m[0].toLowerCase();
                if (tag === "<think>" || tag === "<think/>") {
                  inReasoning = tag === "<think>";
                } else if (tag === "</think>") {
                  inReasoning = false;
                }

                /** 剩下继续循环 */
                frag = frag.slice(m.index + tag.length);
              }
            }

            /** 4. 每处理完一个 delta 就流式输出 */
            const parts: { type: "text" | "reasoning"; text: string }[] = [
              { type: "text", text: visibleText },
            ];
            if (reasoningText) {
              parts.unshift({ type: "reasoning", text: reasoningText });
            }
            yield { content: parts };
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