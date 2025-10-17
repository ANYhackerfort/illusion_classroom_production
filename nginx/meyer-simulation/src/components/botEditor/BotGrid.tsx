import React, { useRef, useState, useEffect, useCallback } from "react";
import NameOverlayCard from "./cards/NameOverLay";
import type { Bot } from "./interfaces/bot";
import "./BotGrid.css";

type BotPreview = Pick<Bot, "id" | "name" | "videoThumbnail">;

interface BotGridProps {
  items: BotPreview[];
  minCardWidth?: number;
  gap?: number;
  initialWidth?: number;
  initialHeight?: number;
}

type Mode = "drag" | "resize" | null;

const BotGrid: React.FC<BotGridProps> = ({
  items,
  minCardWidth = 220,
  gap = 12,
  initialWidth = 960,
  initialHeight = 280,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // size for resizing
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });

  // position for dragging
  const [pos, setPos] = useState({ x: 0, y: 0 });

  // mode + starting points
  const modeRef = useRef<Mode>(null);
  const dragDataRef = useRef<{
    sx: number;
    sy: number;
    sw: number;
    sh: number;
    px: number;
    py: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = e.target as Element;

    // decide mode
    const isHandle = el.classList.contains("bot-grid-resize-handle");
    modeRef.current = isHandle ? "resize" : "drag";

    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);

    dragDataRef.current = {
      sx: e.clientX,
      sy: e.clientY,
      sw: size.w,
      sh: size.h,
      px: pos.x,
      py: pos.y,
    };

    // nicer UX cursor while dragging
    if (!isHandle && containerRef.current) {
      containerRef.current.style.cursor = "grabbing";
    }
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragDataRef.current || !modeRef.current) return;
    const { sx, sy, sw, sh, px, py } = dragDataRef.current;

    if (modeRef.current === "resize") {
      const w = Math.max(240, sw + (e.clientX - sx));
      const h = Math.max(240, sh + (e.clientY - sy));
      setSize({ w, h });
      return;
    }

    // drag mode
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    setPos({ x: px + dx, y: py + dy });
  }, []);

  const onPointerUp = useCallback(() => {
    modeRef.current = null;
    dragDataRef.current = null;
    if (containerRef.current) containerRef.current.style.cursor = ""; // revert
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
      className="bot-grid-container"
      onPointerDown={onPointerDown}
      style={
        {
          width: size.w,
          height: size.h,
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          willChange: "transform",
          "--gap": `${gap}px`,
          "--minCardWidth": `${minCardWidth}px`,
        } as React.CSSProperties
      }
    >
      <div className="bot-grid-scroll">
        <div className="bot-grid">
          {items.map((it) => (
            <NameOverlayCard
              key={it.id}
              name={it.name}
              image={it.videoThumbnail}
            />
          ))}
        </div>
      </div>

      <div
        className="bot-grid-resize-handle"
        aria-label="Resize"
        title="Drag to resize"
      />
    </div>
  );
};

export default BotGrid;
