import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useParams } from "react-router-dom";

interface MainMeetingWebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
}

const MainMeetingWebSocketContext =
  createContext<MainMeetingWebSocketContextType>({
    socket: null,
    isConnected: false,
  });

export const useMainMeetingWebSocket = () =>
  useContext(MainMeetingWebSocketContext);

interface MainMeetingWebSocketProviderProps {
  orgId?: number;
  roomName?: string;
  children: React.ReactNode;
}

export const MainMeetingWebSocketProvider: React.FC<
  MainMeetingWebSocketProviderProps
> = ({ orgId, roomName, children }) => {
  const params = useParams<{ org_id: string; roomName: string }>();
  const resolvedOrgId = orgId ?? Number(params.org_id);
  const resolvedRoomName = roomName ?? params.roomName;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!resolvedOrgId || !resolvedRoomName) {
      console.warn("⚠️ Missing orgId or roomName — not connecting WebSocket");
      return;
    }

    // Determine ws:// or wss:// automatically
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";

    // Build the URL relative to your current domain (goes through Nginx)
    const socketUrl = `${wsProtocol}://${window.location.host}/ws/meeting/${resolvedOrgId}/${resolvedRoomName}/`;

    console.log("🔌 Connecting to:", socketUrl);
    const newSocket = new WebSocket(socketUrl);
    setSocket(newSocket);

    newSocket.onopen = () => {
      console.log("✅ MainMeeting WebSocket connected");
      setIsConnected(true);
    };

    newSocket.onclose = () => {
      console.log("❌ MainMeeting WebSocket closed");
      setIsConnected(false);
    };

    newSocket.onerror = (err) => {
      console.error("⚠️ WebSocket error:", err);
      setIsConnected(false);
    };

    return () => {
      console.log("🔒 Closing MainMeeting WebSocket");
      newSocket.close();
      setSocket(null);
    };
  }, [resolvedOrgId, resolvedRoomName]);

  return (
    <MainMeetingWebSocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </MainMeetingWebSocketContext.Provider>
  );
};
