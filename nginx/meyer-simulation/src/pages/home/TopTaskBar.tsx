import React from "react";
import "./TopTaskBar.css";

export type TabKey = "current" | "past" | "stats" | "settings";

export interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: "current", label: "Current Meetings" },
  { key: "past", label: "Past Meetings" },
  { key: "stats", label: "Statistics" },
  { key: "settings", label: "Settings" },
];

interface TopTaskBarProps {
  value: TabKey;
  onChange: (next: TabKey) => void;
}

const TopTaskBar: React.FC<TopTaskBarProps> = ({ value, onChange }) => {
  return (
    <header className="ttb-header" role="banner">
      <div className="ttb-container">
        <div className="ttb-inner">
          {/* Brand */}
          <div className="ttb-brand" aria-label="MeetDash">
            <div className="ttb-logo" />
            <span className="ttb-title">Illusion Classroom</span>
          </div>

          {/* Tabs */}
          <nav aria-label="Primary" className="ttb-nav">
            <div className="ttb-tabs">
              {TABS.map((t) => {
                const active = t.key === value;
                return (
                  <button
                    key={t.key}
                    onClick={() => onChange(t.key)}
                    className={`ttb-tab ${active ? "is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default TopTaskBar;
