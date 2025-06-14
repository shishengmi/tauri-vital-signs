"use client";
import { useState } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import type { ReasoningContentPartComponent } from "@assistant-ui/react";

export const ReasoningPreview: ReasoningContentPartComponent = ({
  text,
  // status,
}) => {
  const [collapsed, set] = useState(true);

  const label = <span>思考过程</span>;
    // status.type === "running"
    //   ? "Thinking..."
    //   : status.type === "complete"
    //   ? "Thinking completed"
    //   : "Thinking";

  return (
    <div className="my-3 border-l-2">
      {/* 头部 */}
      <div
        className="flex items-center justify-between px-3 py-1 text-sm text-muted-foreground cursor-pointer hover:bg-muted/40"
        onClick={() => set(!collapsed)}
      >
        <span>{label}</span>
        {collapsed ? (
          <ChevronDownIcon className="h-4 w-4" />
        ) : (
          <ChevronUpIcon className="h-4 w-4" />
        )}
      </div>

      {/* 正文 */}
      {!collapsed && (
        <pre className="px-3 pb-2 pt-1 text-sm whitespace-pre-wrap">
          {text}
        </pre>
      )}
    </div>
  );
};
