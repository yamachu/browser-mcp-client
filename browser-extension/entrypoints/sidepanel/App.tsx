import { JWT_SNIFFER_HOSTS } from "@/src/Contract";
import { sendTypedMessage } from "@/types/messaging";
import { useActionState } from "react";
import "./App.css";
import { useChatStream, type ChatMessage } from "./hooks/useChatStream";
import { useJwt } from "./hooks/useJwt";

type State = {
  result: string;
  error: string | null;
};

async function reverseAction(
  _prevState: State,
  formData: FormData
): Promise<State> {
  const text = formData.get("text") as string;

  if (!text?.trim()) {
    return { result: "", error: "テキストを入力してください" };
  }

  try {
    const response = await sendTypedMessage({
      type: "REVERSE_STRING",
      text,
    });

    if (response.success) {
      return { result: response.reversed, error: null };
    } else {
      return { result: "", error: response.error };
    }
  } catch (err) {
    return {
      result: "",
      error: err instanceof Error ? err.message : "Failed to send message",
    };
  }
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

function App() {
  const [state, formAction, isPending] = useActionState(reverseAction, {
    result: "",
    error: null,
  });
  const [currentHost, setCurrentHost] = useState(JWT_SNIFFER_HOSTS.at(0) || "");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [provider, setProvider] = useState<"openai" | "anthropic">("openai");
  const [model, setModel] = useState("");
  const [chatInput, setChatInput] = useState("");
  const jwt = useJwt(currentHost);
  const { messages, isStreaming, appendUserMessage, isThinking } =
    useChatStream();

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !jwt || isStreaming) return;

    appendUserMessage(chatInput);
    const prompt = chatInput;
    setChatInput("");

    try {
      await sendTypedMessage({
        type: "CHAT",
        prompt,
        jwt,
        apiBaseUrl,
        provider,
        model: model,
      });
    } catch (err) {
      console.error("Chat error:", err);
    }
  };

  return (
    <div className="app">
      <h1>Browser MCP Client</h1>

      {/* JWT & Provider Settings */}
      <section className="section">
        <h2>Settings</h2>
        <details>
          <div className="settings-grid">
            <label>
              Host:
              <select
                value={currentHost}
                onChange={(e) => setCurrentHost(e.target.value)}
                className="host-select"
              >
                {JWT_SNIFFER_HOSTS.map((host) => (
                  <option key={host} value={host}>
                    {host}
                  </option>
                ))}
              </select>
            </label>
            <p className="jwt-display">
              JWT: {jwt ? `${jwt.substring(0, 20)}...` : "<none>"}
            </p>
            <label>
              API Base URL:
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://your-proxy.example.com/v1"
                className="input"
              />
            </label>
            <label>
              Provider:
              <select
                value={provider}
                onChange={(e) =>
                  setProvider(e.target.value as "openai" | "anthropic")
                }
              >
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>
            <label>
              Model:
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gpt-4o / claude-3-5-sonnet-20241022"
                className="input"
              />
            </label>
          </div>
        </details>
      </section>

      {/* Chat Section */}
      <section className="section chat-section">
        <h2>Chat</h2>
        <div className="chat-messages">
          {messages.length === 0 && (
            <p className="chat-placeholder">
              JWTを取得してからチャットを開始してください
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

        <form onSubmit={handleChatSubmit} className="chat-form">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="メッセージを入力..."
            className="input chat-input"
            disabled={isStreaming || !jwt}
          />
          <button
            type="submit"
            className="button"
            disabled={isStreaming || !jwt || !chatInput.trim()}
          >
            送信
          </button>
        </form>
      </section>

      {/* String Reverser (legacy demo) */}
      <details className="section">
        <summary>String Reverser (Demo)</summary>
        <p className="description">
          Native Messaging を使用して文字列を反転します
        </p>
        <form action={formAction} className="form">
          <input
            type="text"
            name="text"
            placeholder="文字列を入力してください"
            className="input"
            disabled={isPending}
          />
          <button type="submit" className="button" disabled={isPending}>
            {isPending ? "処理中..." : "反転"}
          </button>
        </form>
        {state.error && <div className="error">{state.error}</div>}
        {state.result && (
          <div className="result">
            <h3>結果:</h3>
            <p className="result-text">{state.result}</p>
          </div>
        )}
      </details>
    </div>
  );
}

export default App;
