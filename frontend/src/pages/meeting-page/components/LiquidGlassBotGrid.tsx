import React, { useRef, useEffect, useCallback, useState } from "react";
import NameOverlayCardGlass from "./NameOverlayCardGlass";
import "./LiquidGlassBotGrid.css";

interface Bot {
  name: string;
  video_url: string | null;
}

const LiquidGlassBotGrid: React.FC = ({}) => {
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

  const [bots] = useState<Bot[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ Fetch bots from server
  // useEffect(() => {
  //   getAllBotsFromServer(meetingName)
  //     .then(({ bots }) => setBots([]]))
  //     .catch((err) => {
  //       console.error("Failed to fetch bots:", err);
  //       setBots([]);
  //     });
  // }, [meetingName]);

  // ✅ Start webcam stream for local preview
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
      }
    };

    startCamera();
  }, []);

  // Drag and resize logic
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
    if (!dragDataRef.current || !modeRef.current || !containerRef.current)
      return;
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
          {/* ✅ Local camera preview box */}
          <div className="local-video-wrapper">
            <div className="local-label">You</div>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="local-camera-preview"
            />
          </div>

          {/* ✅ Bot video cards */}
          {bots.map((bot, i) => {
            console.log("Bot fetched:", bot);
            return (
              <NameOverlayCardGlass
                key={i}
                name={bot.name}
                ratio="16 / 9"
                videoSrc={
                  bot.video_url?.startsWith("http")
                    ? bot.video_url
                    : `http://localhost:8081${bot.video_url ?? ""}`
                }
              />
            );
          })}
        </div>
      </div>

      <div
        className="resize-handle"
        aria-label="Resize"
        title="Drag to resize"
      />
    </div>
  );
};

export default LiquidGlassBotGrid;
