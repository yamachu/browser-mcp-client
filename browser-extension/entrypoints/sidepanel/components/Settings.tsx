import { JWT_SNIFFER_HOSTS } from "@/src/Contract";
import { zodResolver } from "@hookform/resolvers/zod";
import { use, type ChangeEventHandler } from "react";
import { useForm } from "react-hook-form";
import { SettingsContext } from "../settings/SettingsContext";
import { FormSettingsSchema, type Settings } from "../settings/schema";

export default function Settings() {
  const { settings, setSettings, setLatestHost } = use(SettingsContext);
  const { register, handleSubmit, reset } = useForm<Settings>({
    defaultValues: settings,
    resolver: zodResolver(FormSettingsSchema),
  });
  useEffect(() => {
    reset(settings);
  }, [settings, reset]);

  const submit = (vals: Settings) => {
    setSettings(vals);
  };

  return (
    <section className="section">
      <h2>Settings</h2>
      <details>
        <form onSubmit={handleSubmit(submit)}>
          <div className="settings-grid">
            <label>
              Host:
              <select
                {...register("currentHost", {
                  onChange: ((e) => {
                    console.log("Host changed to:", e.target.value);
                    setLatestHost(e.target.value);
                  }) satisfies ChangeEventHandler<HTMLSelectElement>,
                })}
                className="host-select"
              >
                {JWT_SNIFFER_HOSTS.map((host) => (
                  <option key={host} value={host}>
                    {host}
                  </option>
                ))}
              </select>
            </label>

            {/* autoRefresh or inputValue */}

            <label>
              API Base URL:
              <input
                {...register("apiBaseUrl")}
                type="text"
                placeholder="https://your-proxy.example.com/v1"
                className="input"
              />
            </label>

            <label>
              Provider:
              <select {...register("provider")}>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </label>

            <label>
              Model:
              <input
                {...register("model")}
                type="text"
                placeholder="gpt-4o / claude-3-5-sonnet-20241022"
                className="input"
              />
            </label>
          </div>

          <div style={{ marginTop: 8 }}>
            <button type="submit" className="button">
              Save settings
            </button>
          </div>
        </form>
      </details>
    </section>
  );
}
