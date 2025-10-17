import React, { useState, useCallback, useEffect } from "react";
import "./VideoDropBox.css";
import { v4 as uuidv4 } from "uuid";
import BotCard from "./cards/BotCard";
import type { Bot } from "./interfaces/bot";
import { generateVideoThumbnail } from "./interfaces/bot";
import { useParams } from "react-router-dom";
import { storeBotToServer } from "./interfaces/bot_drop";
import { getAllBotsView, storeBotView } from "./interfaces/bot_view_db";

const VideoDropBox: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

  const { roomName } = useParams<{ roomName: string }>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const localBots = await getAllBotsView();
        if (!cancelled) {
          setBots(localBots.map((b) => ({
            id: b.identifier,
            name: b.name,
            videoThumbnail: b.image ?? "",
            memory: b.memory,
            answer_select: b.answers,
          })));
        }
      } catch (err) {
        console.error("Failed to load bots from IndexedDB:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const dt = e.dataTransfer;
      let droppedFiles: File[] = [];

      if (dt.items && dt.items.length) {
        for (const item of Array.from(dt.items)) {
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f) droppedFiles.push(f);
          }
        }
      } else {
        droppedFiles = Array.from(dt.files);
      }

      const videoExts = ["mp4", "mov", "webm", "mkv", "avi", "m4v", "wmv", "mpeg", "mpg"];
      const isVideoFile = (f: File) =>
        f.type.startsWith("video/") ||
        (f.type === "" && videoExts.some((ext) => f.name.toLowerCase().endsWith("." + ext)));

      const files = droppedFiles.filter(isVideoFile);
      if (files.length === 0 || !roomName) return;

      setIsLoading(true);
      setProgress({ done: 0, total: files.length });

      try {
        const newBots: Bot[] = await Promise.all(
          files.map(async (file) => {
            const id = uuidv4();
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const thumbnail = await generateVideoThumbnail(file);
            return {
              id,
              name: baseName,
              videoThumbnail: thumbnail,
              memory: "",
              answer_select: [],
            };
          })
        );

        function dataURLtoFile(dataUrl: string, filename: string): File {
          const [header, base64] = dataUrl.split(",");
          const mimeMatch = header.match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
          const binary = atob(base64);
          const array = Uint8Array.from(binary, (c) => c.charCodeAt(0));
          return new File([array], filename, { type: mime });
        }

        for (let i = 0; i < newBots.length; i++) {
          const bot = newBots[i];
          const imgFile = dataURLtoFile(bot.videoThumbnail, `${bot.id}.jpg`);
          const videoFile = files[i];

          // Save to server
          await storeBotToServer(
            {
              id: bot.id,
              name: bot.name,
              memory: bot.memory,
              answer_select: bot.answer_select,
              img: imgFile,
              video: videoFile,
            },
            roomName
          );

          // Save to IndexedDB
          await storeBotView({
            identifier: bot.id,
            name: bot.name,
            memory: bot.memory,
            answers: bot.answer_select,
            image: bot.videoThumbnail,
          });

          setProgress((p) => ({ ...p, done: p.done + 1 }));
        }

        setBots((prev) => [...prev, ...newBots]);
      } catch (err) {
        console.error("❌ Error:", err);
      } finally {
        setTimeout(() => setIsLoading(false), 300);
      }
    },
    [roomName]
  );

  return (
    <div
      className={`video-drop-box ${isDragging ? "dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isLoading && (
        <div className="vdb-overlay">
          <div className="vdb-spinner" />
          <div className="vdb-loading-text">
            Processing {progress.done}/{progress.total}…
          </div>
        </div>
      )}

      {bots.length === 0 && !isLoading && (
        <div className="drop-message">Drop bot video files here</div>
      )}

      <div className={`bot-masonry ${isLoading ? "disabled" : ""}`}>
        {bots.map((b) => (
          <div className="bot-card-wrapper" key={b.id}>
            <BotCard
              id={b.id}
              name={b.name}
              videoThumbnail={b.videoThumbnail}
              memory={b.memory}
              answer_select={b.answer_select}
              meetingName={roomName!}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default VideoDropBox;
