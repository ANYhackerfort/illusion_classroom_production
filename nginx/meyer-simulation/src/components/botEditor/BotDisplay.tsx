import React, { useEffect, useState } from "react";
import "./BotDisplay.css";
import type { Bot } from "./interfaces/bot";
import BotGrid from "./BotGrid";
import { getAllBotsView } from "./interfaces/bot_view_db";

type BotPreview = Pick<Bot, "id" | "name" | "videoThumbnail">;

const BotDisplay: React.FC = () => {
  const [previews, setPreviews] = useState<BotPreview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const bots = await getAllBotsView(); // [{ identifier, name, memory, answers, image }]
        if (cancelled) return;

        const items: BotPreview[] = bots.map((bot) => ({
          id: bot.identifier,
          name: bot.name ?? "Untitled",
          videoThumbnail: bot.image ?? "", // Assuming 'image' holds a thumbnail
        }));

        setPreviews(items);
      } catch (e) {
        console.error("❌ Failed to load bots from IndexedDB:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="bot-display-background">
      {/* faint center watermark */}
      <span className="bot-display-text">Video</span>

      {loading && <div className="bot-display-loading">Loading…</div>}

      {!loading && previews.length === 0 && (
        <div className="bot-display-empty">No bots yet</div>
      )}

      {!loading && previews.length > 0 && (
        <BotGrid
          items={previews}
          gap={4}
          // @ts-expect-error
          fillParent
          resizable={false}
        />
      )}
    </div>
  );
};

export default BotDisplay;
