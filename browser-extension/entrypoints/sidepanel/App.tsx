import { JWT_SNIFFER_HOSTS } from "@/src/Contract";
import { sendTypedMessage } from "@/types/messaging";
import { useActionState } from "react";
import "./App.css";
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

function App() {
  const [state, formAction, isPending] = useActionState(reverseAction, {
    result: "",
    error: null,
  });
  const [currentHost, setCurrentHost] = useState(JWT_SNIFFER_HOSTS.at(0) || "");
  const jwt = useJwt(currentHost);

  return (
    <div className="app">
      <h1>String Reverser</h1>
      <p className="jwt-display">
        JWT for {currentHost}: {jwt ?? "<none>"}
      </p>
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
          <h2>結果:</h2>
          <p className="result-text">{state.result}</p>
        </div>
      )}
    </div>
  );
}

export default App;
