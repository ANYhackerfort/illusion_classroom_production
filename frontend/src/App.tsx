// App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import { MouseProvider } from "./hooks/drag/MouseContext";

import MeetingSettings from "./pages/MeetingSettings";
import LoginPage from "./pages/Login";
import GhostOverlay from "./GhostOverlay";
import HomePage from "./pages/home/Together";
import VideoSegmentRenderer from "./pages/meeting-page/VideoSegmentRenderer";
import JoinMeetingArt from "./pages/meeting-page/WaitingArtJoin";
import MainPage from "./pages/MainPage";
import "./App.css";
import JoinMeetingPage from "./pages/JoinMeeting";
import { MainMeetingWebSocketProvider } from "./api/MainSocket";

const App: React.FC = () => {
  return (
    <MouseProvider>
      <GhostOverlay />
      <Routes>
        <Route path="/" element={<MainPage />} />

        <Route
          path="/meeting-settings/:org_id/:roomName"
          element={
            <MainMeetingWebSocketProvider>
              <MeetingSettings />
            </MainMeetingWebSocketProvider>
          }
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />

        <Route
          path="/meeting-room/:org_id/:roomName"
          element={
            <MainMeetingWebSocketProvider>
              <VideoSegmentRenderer />
            </MainMeetingWebSocketProvider>
          }
        />

        <Route path="/join-meeting" element={<JoinMeetingArt />} />
        <Route path="/join-room" element={<JoinMeetingPage />} />
      </Routes>
    </MouseProvider>
  );
};

export default App;
