// components/WithRoomSocket.tsx
import React from "react";
import { useParams } from "react-router-dom";
import { VideoSocketProvider } from "./types/videoSync/VideoSocketContext";

const WithRoomSocket: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { roomName } = useParams();

  if (!roomName) return <>{children}</>; // fallback or error

  return (
    <VideoSocketProvider roomName={roomName}>{children}</VideoSocketProvider>
  );
};

export default WithRoomSocket;
