import { useCallback, useState } from "react";

type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  },
  "onClick"
>;

export function useTabs<T>(defaultTab: T) {
  const [activeTab, setActiveTab] = useState<T>(defaultTab);

  // NOTE: Tab のタイトルとかの部分は別に再レンダリング走ったり State が消し飛んでもいいだろうし、Render Props Pattern で良さそう
  const Tab = useCallback(
    ({
      tabType,
      children,
      className,
      ...rest
    }: { tabType: T } & ButtonProps) => {
      return (
        <button
          className={`tab ${activeTab === tabType ? "active" : ""} ${
            className ?? ""
          }`}
          onClick={() => setActiveTab(tabType)}
          {...rest}
        >
          {children}
        </button>
      );
    },
    [activeTab]
  );

  return { Tab, activeTab };
}
