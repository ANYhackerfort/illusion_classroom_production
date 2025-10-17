import React from "react";
import { useState } from "react";
import TopTaskBar from "./TopTaskBar";
import type { TabKey } from "./TopTaskBar";
import CurrentMeetings from "./pages/CurrentMeetings";
import "./Together.css"; // Import the CSS file

const HomePage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>("current");

  return (
    <div className="app-container">
      <TopTaskBar value={tab} onChange={setTab} />

      {tab === "current" && <CurrentMeetings />}
    </div>
  );
};

export default HomePage;
