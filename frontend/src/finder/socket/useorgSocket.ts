// src/hooks/useOrgSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";

export interface OrgUpdateMessage {
  type: "org_update";
  category: string; // e.g. "video", "survey", etc.
  action: string; // e.g. "create", "delete", "update"
  payload: any; // e.g. { video_id: "123" }
}

export const useOrgSocket = (orgId: string) => {
  const socketRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!orgId) return;

    // Automatically pick ws:// or wss:// based on current protocol
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";

    // Build socket URL relative to current host (Nginx proxy)
    const socketUrl = `${wsProtocol}://${window.location.host}/ws/org/${orgId}/`;
    const ws = new WebSocket(socketUrl);

    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`✅ Org WebSocket connected to org ${orgId}`);
      setConnected(true);
    };

    ws.onclose = () => {
      console.log(`🔌 Org WebSocket disconnected from org ${orgId}`);
      setConnected(false);
    };

    ws.onerror = (err) => {
      console.error("❌ Org WebSocket error:", err);
    };

    return () => {
      ws.close();
    };
  }, [orgId]);

  const sendMessage = useCallback((msg: any) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    } else {
      console.warn("⚠️ Org WebSocket not ready to send message");
    }
  }, []);

  return { socket: socketRef.current, connected, sendMessage };
};
