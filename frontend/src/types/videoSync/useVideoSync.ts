// hooks/useVideoSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";

export interface VideoState {
  stopped: boolean;
  current_time: number;
  speed: number;
  ending_id: string | null;
}

export function useVideoSocket(roomName: string) {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketInstance, setSocketInstance] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!roomName) return;

    const ws = new WebSocket(`ws://localhost:8001/ws/meeting/${roomName}/`);
    socketRef.current = ws;
    setSocketInstance(ws);

    ws.onopen = () => {
      console.log("✅ WebSocket connected to", roomName);
      setConnected(true);

      // ws.send(
      //   JSON.stringify({
      //     type: "update_state",
      //     stopped: true,
      //     current_time: 0,
      //     speed: 1,
      //   }),
      // );
    };

    ws.onerror = (err) => {
      console.error("❌ WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket disconnected from", roomName);
      setConnected(false);
    };

    return () => {
      ws.close();
      setConnected(false);
      setSocketInstance(null);
    };
  }, [roomName]);

  const sendMessage = useCallback((msg: any) => {
    const socket = socketRef.current;
    console.log("current socket:", socket);
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not ready.");
      return;
    }
    socket.send(JSON.stringify(msg));
  }, []);

  const updateVideoState = useCallback(
    (stateUpdate: Partial<VideoState>) => {
      console.log("📤 Sending video state update:", stateUpdate);
      sendMessage({
        type: "update_state",
        ...stateUpdate,
      });
    },
    [sendMessage],
  );

  const startMeeting = useCallback(
    (videoUrl: string) => {
      console.log("🚀 Starting meeting with video:", videoUrl);
      sendMessage({
        type: "start_meeting",
        video_url: videoUrl,
      });
    },
    [sendMessage],
  );

  const getOneUpdate = useCallback((): Promise<VideoState> => {
    return new Promise((resolve, reject) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        return reject(new Error("WebSocket is not open"));
      }

      const handler = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "sync_update" && msg.state) {
            socket.removeEventListener("message", handler);
            resolve(msg.state);
          }
        } catch (err) {
          socket.removeEventListener("message", handler);
          reject(err);
        }
      };

      socket.addEventListener("message", handler);
    });
  }, []);

  return {
    socket: socketInstance,
    sendMessage,
    updateVideoState,
    startMeeting,
    connected,
    getOneUpdate,
  };
}
