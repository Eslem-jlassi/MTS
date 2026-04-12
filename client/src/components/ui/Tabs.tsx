import React, { useState, useCallback } from "react";

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (key: string) => void;
  variant?: "underline" | "pills";
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeKey: controlledKey,
  defaultActiveKey,
  onChange,
  variant = "underline",
  className = "",
}) => {
  const [internalKey, setInternalKey] = useState(defaultActiveKey ?? tabs[0]?.key);
  const activeKey = controlledKey ?? internalKey;

  const handleClick = useCallback(
    (key: string) => {
      if (!controlledKey) setInternalKey(key);
      onChange?.(key);
    },
    [controlledKey, onChange],
  );

  const isUnderline = variant === "underline";

  return (
    <div
      className={`flex ${
        isUnderline
          ? "gap-0 border-b border-ds-border"
          : "gap-1 rounded-2xl border border-ds-border bg-ds-elevated/55 p-1 shadow-soft"
      } ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        const base = isUnderline
          ? `relative rounded-t-xl px-4 py-2.5 text-sm font-semibold tracking-[-0.01em] transition-colors duration-200 ${
              active
                ? "text-primary-600 dark:text-primary-400"
                : "text-ds-muted hover:text-ds-primary"
            }`
          : `rounded-xl px-3.5 py-2 text-sm font-semibold tracking-[-0.01em] transition-all duration-200 ${
              active
                ? "border border-ds-border bg-ds-card text-ds-primary shadow-soft"
                : "border border-transparent text-ds-muted hover:bg-ds-card/50 hover:text-ds-primary"
            }`;

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => handleClick(tab.key)}
            className={base}
          >
            <span className="flex items-center gap-1.5">
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center text-xs font-semibold rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </span>
            {isUnderline && active && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
