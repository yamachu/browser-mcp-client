import "./App.css";
import { Chat } from "./components/Chat";
import Settings from "./components/Settings";
import Tools from "./components/Tools";
import { useTabs } from "./hooks/useTabs";
import { LatestTargetHostProvider } from "./settings/LatestSelectedHost";
import { SettingsProvider } from "./settings/SettingsContext";
import { ToolsProvider } from "./settings/ToolsContext";

type Tab = "chat" | "settings" | "tools";

function AppInner() {
  const { Tab, activeTab } = useTabs<Tab>("chat");

  return (
    <div className="app">
      <div className="tabs">
        <Tab tabType="chat">Chat</Tab>
        <Tab tabType="settings">Settings</Tab>
        <Tab tabType="tools">Tools</Tab>
      </div>

      <div
        className="tab-content"
        style={{ display: activeTab === "settings" ? "block" : "none" }}
      >
        <Settings />
      </div>

      <div
        className="tab-content"
        style={{ display: activeTab === "tools" ? "block" : "none" }}
      >
        <Tools />
      </div>

      <section
        className="section chat-section"
        style={{ display: activeTab === "chat" ? "flex" : "none" }}
      >
        <Chat />
      </section>
    </div>
  );
}

export default function App() {
  return (
    <LatestTargetHostProvider>
      <SettingsProvider>
        <ToolsProvider>
          <AppInner />
        </ToolsProvider>
      </SettingsProvider>
    </LatestTargetHostProvider>
  );
}
