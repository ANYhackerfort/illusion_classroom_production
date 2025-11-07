import React, { useRef, useState, useEffect } from "react";
import VideoCard from "./VideoCard";
import { v4 as uuidv4 } from "uuid";
import "./FolderTable.css";

interface VideoEntry {
  id: string;
  x: number;
  y: number;
  file: File;
  url: string;
  thumbnail: string;
  createdTime: string;
  lastAccessed: string;
}

const FolderTable: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoEntry[]>([]);

  const draggingIdRef = useRef<string | null>(null);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  const [ghost, setGhost] = useState<VideoEntry | null>(null);
  const [ghostPos, setGhostPos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const baseX = e.clientX - rect.left;
    const baseY = e.clientY - rect.top;

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("video/"),
    );

    const newEntries = await Promise.all(
      files.map(async (file, i) => {
        const url = URL.createObjectURL(file);
        const thumbnail = await generateThumbnail(url);
        const now = new Date();
        return {
          id: uuidv4(),
          x: baseX + i * 10,
          y: baseY + i * 10,
          file,
          url,
          thumbnail,
          createdTime: now.toLocaleString(),
          lastAccessed: now.toLocaleString(),
        };
      }),
    );

    setVideos((prev) => [...prev, ...newEntries]);
  };

  const generateThumbnail = (videoURL: string): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.src = videoURL;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.playsInline = true;
      video.currentTime = 0.1;

      const onLoadedData = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth / 2;
        canvas.height = video.videoHeight / 2;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumbnail = canvas.toDataURL("image/png");
          resolve(thumbnail);
        } else {
          resolve("");
        }
        video.removeEventListener("loadeddata", onLoadedData);
      };

      video.addEventListener("loadeddata", onLoadedData);
    });
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    const target = videos.find((v) => v.id === id);
    if (!target || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    draggingIdRef.current = id;
    prevMouseRef.current = { x: e.clientX, y: e.clientY };

    setGhost({ ...target });
    setGhostPos({ x: rect.left + target.x, y: rect.top + target.y });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingIdRef.current || !ghostPos) return;

      const deltaX = e.clientX - prevMouseRef.current.x;
      const deltaY = e.clientY - prevMouseRef.current.y;

      prevMouseRef.current = { x: e.clientX, y: e.clientY };
      setGhostPos((prev) =>
        prev ? { x: prev.x + deltaX, y: prev.y + deltaY } : null,
      );
    };

    const handleMouseUp = () => {
      const id = draggingIdRef.current;
      if (!id || !ghost || !ghostPos || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = ghostPos.x - rect.left;
      const relativeY = ghostPos.y - rect.top;

      if (
        relativeX < -40 ||
        relativeY < -90 ||
        relativeX > rect.width - 50 ||
        relativeY > rect.height - 40
      ) {
        draggingIdRef.current = null;
        setGhost(null);
        setGhostPos(null);
        return;
      }

      setVideos((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, x: relativeX, y: relativeY } : v,
        ),
      );

      draggingIdRef.current = null;
      setGhost(null);
      setGhostPos(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [ghost, ghostPos]);

  return (
    <div
      className="folder-table"
      ref={containerRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {videos.map((video) => (
        <div
          key={video.id}
          className="video-card-wrapper"
          style={{
            left: video.x,
            top: video.y,
            position: "absolute",
          }}
          onMouseDown={(e) => handleMouseDown(e, video.id)}
          draggable={false}
        >
          <VideoCard
            location="User/VideoDrops"
            thumbnail={video.thumbnail}
            title={video.file.name}
            createdTime={video.createdTime}
            lastAccessed={video.lastAccessed}
          />
        </div>
      ))}

      {ghost && ghostPos && (
        <div
          className="ghost-video-card"
          style={{
            position: "fixed",
            left: ghostPos.x,
            top: ghostPos.y,
            pointerEvents: "none",
            zIndex: 9999,
            transform: "scale(1.03)",
          }}
        >
          <VideoCard
            location="User/VideoDrops"
            thumbnail={ghost.thumbnail}
            title={ghost.file.name}
            createdTime={ghost.createdTime}
            lastAccessed={ghost.lastAccessed}
          />
        </div>
      )}
    </div>
  );
};

export default FolderTable;
