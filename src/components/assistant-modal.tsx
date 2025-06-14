"use client";

import { BotIcon, ChevronDownIcon } from "lucide-react";

import { type FC, forwardRef } from "react";
import { AssistantModalPrimitive } from "@assistant-ui/react";

import { Thread } from "@/components/thread";
import { TooltipIconButton } from "@/components/tooltip-icon-button";

export const AssistantModal: FC = () => {
  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor className="fixed bottom-20 right-6 size-14 z-[9999]">
        <AssistantModalPrimitive.Trigger asChild>
          <AssistantModalButton />
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        sideOffset={16}
        className="bg-popover text-popover-foreground z-[9999] h-[500px] w-[400px] overflow-clip rounded-xl border p-0 shadow-2xl outline-none [&>.aui-thread-root]:bg-inherit data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out data-[state=open]:zoom-in data-[state=open]:slide-in-from-bottom-1/2 data-[state=open]:slide-in-from-right-1/2 data-[state=closed]:slide-out-to-bottom-1/2 data-[state=closed]:slide-out-to-right-1/2"
      >
        <Thread />
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
};

type AssistantModalButtonProps = { "data-state"?: "open" | "closed" };

const AssistantModalButton = forwardRef<
  HTMLButtonElement,
  AssistantModalButtonProps
>(({ "data-state": state, ...rest }, ref) => {
  const tooltip = state === "open" ? "关闭AI助手" : "打开AI助手";

  return (
    <TooltipIconButton
      variant="default"
      tooltip={tooltip}
      side="left"
      {...rest}
      className="size-full rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-2 border-white/20 backdrop-blur-sm animate-pulse hover:animate-none"
      ref={ref}
    >
      <BotIcon 
        data-state={state} 
        className="absolute size-7 transition-all duration-300 text-white data-[state=closed]:rotate-0 data-[state=open]:rotate-90 data-[state=closed]:scale-100 data-[state=open]:scale-0" 
      />

      <ChevronDownIcon
        data-state={state}
        className="absolute size-7 transition-all duration-300 text-white data-[state=closed]:-rotate-90 data-[state=open]:rotate-0 data-[state=closed]:scale-0 data-[state=open]:scale-100"
      />
      <span className="sr-only">{tooltip}</span>
    </TooltipIconButton>
  );
});

AssistantModalButton.displayName = "AssistantModalButton";
