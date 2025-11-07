import React, { createContext, useContext } from "react";
import { useVideoSocket } from "./useVideoSync";
import type { VideoState } from "./useVideoSync";

interface VideoSocketProviderProps {
  roomName: string;
  children: React.ReactNode;
}

interface VideoSocketContextValue {
  socket: WebSocket | null;
  sendMessage: (msg: any) => void;
  updateVideoState: (partialState: Partial<VideoState>) => void;
  startMeeting: (videoUrl: string) => void;
  getOneUpdate: () => Promise<VideoState>;
  connected: boolean;
}

const VideoSocketContext = createContext<VideoSocketContextValue | undefined>(
  undefined,
);

export function safeRoomName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\-\.]/g, "_");
}

export const VideoSocketProvider: React.FC<VideoSocketProviderProps> = ({
  roomName,
  children,
}) => {
  const {
    socket,
    sendMessage,
    startMeeting,
    updateVideoState,
    getOneUpdate,
    connected,
  } = useVideoSocket(safeRoomName(roomName));

  return (
    <VideoSocketContext.Provider
      value={{
        socket,
        startMeeting,
        sendMessage,
        updateVideoState,
        getOneUpdate,
        connected,
      }}
    >
      {children}
    </VideoSocketContext.Provider>
  );
};

export const useVideoSocketContext = () => {
  const context = useContext(VideoSocketContext);
  if (!context) {
    throw new Error(
      "useVideoSocketContext must be used within a VideoSocketProvider",
    );
  }
  return context;
};
