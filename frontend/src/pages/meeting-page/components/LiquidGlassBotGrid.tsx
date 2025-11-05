import React, { useRef, useEffect, useCallback, useState } from "react";
import NameOverlayCardGlass from "./NameOverlayCardGlass";
import { getActiveBotsVideoName } from "../../api/meetingApi";
import type { ActiveBotVideo } from "../../api/meetingApi";
import { useParams } from "react-router-dom";
import { useMainMeetingWebSocket } from "../../../api/MainSocket";
import "./LiquidGlassBotGrid.css";

export const BACKEND_VIDEO_URL = "";

// 🎤 Inline Mic-Off SVG component
const MicOffIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = "#fff",
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <path d="M15 9.34V5a3 3 0 0 0-6 0v1.34" />
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M19 11v1a7 7 0 0 1-12 5M12 19v4M8 23h8" />
  </svg>
);

const LiquidGlassBotGrid: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 220, h: 910 });
  const posRef = useRef({ x: 25, y: 25 });
  const modeRef = useRef<"drag" | "resize" | null>(null);
  const dragDataRef = useRef<{
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    px: number;
    py: number;
  } | null>(null);

  const [bots, setBots] = useState<ActiveBotVideo[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();
  const { socket } = useMainMeetingWebSocket();

  // 🎥 Start webcam preview
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };
    startCamera();
  }, []);

  // 🔁 Fetch active bots from backend
  const fetchActiveBots = useCallback(async () => {
    if (!org_id || !roomName) return;
    try {
      const res = await getActiveBotsVideoName(Number(org_id), roomName);
      console.log("🎬 Active bots loaded:", res.bots);
      setBots(res.bots || []);
    } catch (err) {
      console.error("❌ Failed to fetch active bots:", err);
    }
  }, [org_id, roomName]);

  // 🔔 Listen for WebSocket meeting updates
  useEffect(() => {
    if (!socket) return;
    const handleMessage = async (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      console.log(msg, "ORG SOCKET MESSAGE");
      if (msg.type === "meeting_state_changed") {
        console.log("🔄 Meeting state changed, refreshing active bots...");
        fetchActiveBots();
      }
    };
    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, fetchActiveBots]);

  // 🧠 Fetch bots on mount
  useEffect(() => {
    fetchActiveBots();
  }, [fetchActiveBots]);

  // 🖱️ Drag and resize logic
  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.target as Element;
    const isHandle = el.classList.contains("resize-handle");
    modeRef.current = isHandle ? "resize" : "drag";

    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    dragDataRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      sw: sizeRef.current.w,
      sh: sizeRef.current.h,
      px: posRef.current.x,
      py: posRef.current.y,
    };

    if (!isHandle && containerRef.current) {
      containerRef.current.style.cursor = "grabbing";
    }
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragDataRef.current || !modeRef.current || !containerRef.current) return;
    const { sx, sy, sw, sh, px, py } = dragDataRef.current;

    if (modeRef.current === "resize") {
      const w = Math.max(240, sw + (e.clientX - sx));
      const h = Math.max(240, sh + (e.clientY - sy));
      sizeRef.current = { w, h };
      containerRef.current.style.width = `${w}px`;
      containerRef.current.style.height = `${h}px`;
      return;
    }

    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    const newX = px + dx;
    const newY = py + dy;
    posRef.current = { x: newX, y: newY };
    containerRef.current.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
  }, []);

  const onPointerUp = useCallback(() => {
    modeRef.current = null;
    dragDataRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = "";
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  
  return (
    <div
      ref={containerRef}
      className="liquid-glass-grid"
      onPointerDown={onPointerDown}
      style={{
        width: sizeRef.current.w,
        height: sizeRef.current.h,
        transform: `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`,
      }}
    >
      <div className="grid-scroll">
        <div className="grid-inner">
          {/* 🧍 Local camera preview */}
          <div className="local-video-wrapper">
            <div className="local-label">You</div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="local-camera-preview"
            />

            {/* 🔇 Mic-off badge for self */}
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                backgroundColor: "rgba(255, 0, 0, 0.85)",
                borderRadius: "50%",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 6px rgba(0,0,0,0.4)",
              }}
            >
              <MicOffIcon size={14} color="#fff" />
            </div>
          </div>

          {/* 🤖 Active bot videos */}
          {bots.map((bot, i) => (
            <NameOverlayCardGlass
              key={i}
              name={bot.name}
              ratio="16 / 9"
              muted
              videoSrc={
                bot.video_url?.startsWith("http")
                  ? bot.video_url
                  : `${BACKEND_VIDEO_URL}${bot.video_url ?? ""}`
              }
            />
          ))}
        </div>
      </div>

      <div className="resize-handle" aria-label="Resize" title="Drag to resize" />
    </div>
  );
};

export default LiquidGlassBotGrid;
