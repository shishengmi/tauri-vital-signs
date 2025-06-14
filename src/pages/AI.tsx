"use client";

import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { ThreadList } from "@/components/thread-list";
import { Thread } from "@/components/thread";
import OpenAI from "openai";


const openai = new OpenAI({
  apiKey: "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",
  dangerouslyAllowBrowser: true, // ⚠️ 允许前端环境中使用
});

const OpenAIAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      }
    );

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

const AIpage = () => {
  const runtime = useLocalRuntime(OpenAIAdapter);

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
