import { sendTypedMessage } from "@/types/messaging";
import { use } from "react";
import { useChatStream, type ChatMessage } from "../hooks/useChatStream";
import { useJwt } from "../hooks/useJwt";
import { SettingsContext } from "../settings/SettingsContext";
import ChatForm from "./ChatForm";

export function Chat() {
  const { settings } = use(SettingsContext);
  const jwt = useJwt(settings.currentHost);
  const { messages, isStreaming, appendUserMessage, isThinking } =
    useChatStream();

  const handleChatSubmit = async (message: string) => {
    if (!message.trim() || isStreaming) return;
    if (jwt === null && settings.token === null) return;

    appendUserMessage(message);

    await sendTypedMessage({
      type: "CHAT",
      prompt: message,
      jwt: settings.token ?? jwt!,
      apiBaseUrl: settings.apiBaseUrl,
      provider: settings.provider,
      model: settings.model,
      tools: [],
    }).catch((err) => {
      console.error("Chat message sending error:", err);
    });
  };

  return (
    <>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-placeholder">
            送信できない場合は、ログインを試した後チャットを開始してください
          </p>
        )}
        {messages.map((msg, idx) => (
          <ChatMessageItem
            key={idx}
            message={msg}
            isThinking={isThinking(msg)}
          />
        ))}
        {isStreaming && (
          <div className="chat-message thinking">
            <div className="chat-role">thinking</div>
          </div>
        )}
      </div>

      <ChatForm disabled={isStreaming || !jwt} onSubmit={handleChatSubmit} />
    </>
  );
}

function ChatMessageItem({
  message,
  isThinking,
}: {
  message: ChatMessage;
  isThinking: boolean;
}) {
  const roleStyles: Record<ChatMessage["role"], string> = {
    user: "chat-message user",
    assistant: "chat-message assistant",
    system: "",
    tool: "chat-message tool",
  };

  if (message.role === "system") {
    return <hr />;
  }

  return (
    <div className={roleStyles[message.role]}>
      <div className="chat-role">{message.role}</div>
      {message.role === "tool" ? (
        <details className="tool-details">
          <summary>{message.toolName}</summary>
          <pre>{JSON.stringify(message.toolArgs, null, 2)}</pre>
          <pre>
            {message.toolResult !== undefined &&
              JSON.stringify(message.toolResult, null, 2)}
          </pre>
        </details>
      ) : (
        <div className={`chat-content${isThinking ? " thinking" : ""}`}>
          {message.content}
        </div>
      )}
    </div>
  );
}
