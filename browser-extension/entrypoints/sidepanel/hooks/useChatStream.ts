import type { ChatStreamEvent } from "@/types/messaging";
import { useCallback, useEffect, useState } from "react";

export type ChatMessage =
  | {
      role: "system";
      type: "start";
    }
  | {
      role: "system";
      type: "finish";
    }
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
    }
  | {
      role: "tool";
      toolName: string;
      toolArgs: string;
      toolResult?: unknown;
    };

export interface UseChatStreamResult {
  messages: ChatMessage[];
  isStreaming: boolean;
  appendUserMessage: (content: string) => void;
  isThinking: (message: ChatMessage) => boolean;
}

interface ChatStreamEventMessage {
  type: "CHAT_STREAM_EVENT";
  data: ChatStreamEvent;
}

export function useChatStream(): UseChatStreamResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const handleMessage = (message: unknown) => {
      const event = message as ChatStreamEventMessage;
      if (event?.type !== "CHAT_STREAM_EVENT") return;

      const data = event.data;

      switch (data.type) {
        case "thinking":
          setIsStreaming(true);
          setMessages((prev) => [...prev, { role: "system", type: "start" }]);
          break;

        case "tool_call":
          setMessages((prev) => [
            ...prev,
            {
              role: "tool",
              toolName: data.toolName,
              toolArgs: data.toolArgs,
            },
          ]);
          break;

        case "tool_result":
          setMessages((prev) => {
            const newMessages = [...prev];
            // 末尾から探索すれば最新ってことにならんかな…
            for (let i = newMessages.length - 1; i >= 0; i--) {
              const msg = newMessages[i];
              if (msg.role !== "tool") continue;
              if (msg.toolName === data.toolName) {
                newMessages[i] = {
                  ...msg,
                  toolResult: data.result,
                };
                break;
              }
            }
            return newMessages;
          });
          break;

        case "token":
          setMessages((prev) => {
            const lastMessage = prev.at(-1);
            if (lastMessage?.role === "assistant") {
              const updatedLastMessage: ChatMessage = {
                ...lastMessage,
                content: lastMessage.content + data.token,
              };
              return [...prev.slice(0, -1), updatedLastMessage];
            } else {
              return [...prev, { role: "assistant", content: data.token }];
            }
          });
          break;

        case "final":
          setMessages((prev) => [...prev, { role: "system", type: "finish" }]);
          setIsStreaming(false);
          break;

        case "error":
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Error: ${data.error}` },
          ]);
          setIsStreaming(false);
          break;
      }
    };

    browser.runtime.onMessage.addListener(handleMessage);

    return () => {
      browser.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const appendUserMessage = useCallback((content: string) => {
    setMessages((prev) => [...prev, { role: "user", content }]);
  }, []);

  const isThinking = useCallback(
    (message: ChatMessage) => {
      return messages.at(-1) === message && message.role === "assistant";
    },
    [messages]
  );

  return {
    messages,
    isStreaming,
    isThinking,
    appendUserMessage,
  };
}
