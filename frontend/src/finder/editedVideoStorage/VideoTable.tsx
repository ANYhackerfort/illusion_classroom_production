import React, { useEffect, useRef, useState } from "react";
import EditedVideoCard from "./EditedVideoCard";
import type { VideoMetadata } from "../../indexDB/videoStorage";
import {
  getAllVideos,
  saveVideoToIndexedDB,
  deleteVideoFromIndexedDB,
} from "../../indexDB/videoStorage";
import { getVideoByIdFromBackend } from "../../components/videoDisplayer/api/save";
import { useOrgSocketContext } from "../socket/OrgSocketContext";
import {
  getOrgVideos,
} from "../../components/videoDisplayer/api/save";
import { useParams } from "react-router-dom";
import { getMeetingId } from "../../components/videoDisplayer/api/save";
import { clearAllVideosFromIndexedDB } from "../../indexDB/videoStorage";
import "./VideoTable.css";

interface VideoTableProps {
  userChecked: boolean;
  orgChecked: boolean;
  selectedIndex: number;
}

const VideoTable: React.FC<VideoTableProps> = ({
  userChecked,
  orgChecked,
  selectedIndex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [videos, setVideos] = useState<VideoMetadata[]>([]);
  const { socket } = useOrgSocketContext(); // 👈 access org websocket
  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  const currentMeetingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchMeetingId = async () => {
      const id = await getMeetingId(Number(org_id), roomName!);
      if (id) {
        currentMeetingIdRef.current = id;
        console.log("✅ Meeting ID loaded and stored in ref:", id);
        await loadFromIndexedDB(); // 🔁 Immediately load once ID ready
      }
    };
    fetchMeetingId();
  }, [org_id, roomName, userChecked, orgChecked, selectedIndex]);

  useEffect(() => {
    const loadInitialVideos = async () => {
      try {
        console.log(
          "%c🚀 Loading videos on mount (fresh sync)...",
          "color: #00aaff",
        );

        // ✅ 1. Clear all existing videos
        await clearAllVideosFromIndexedDB();
        console.log(
          "%c🧹 Cleared all videos from IndexedDB.",
          "color: orange;",
        );

        // ✅ 2. Fetch from backend
        const orgVideos = await getOrgVideos(Number(org_id));
        console.log(
          `%c📡 Retrieved ${orgVideos.length} videos from backend.`,
          "color: #33cc33;",
        );

        // ✅ 3. Save all to IndexedDB (in parallel)
        await Promise.all(
          orgVideos.map(async (video) => await saveVideoToIndexedDB(video)),
        );
        console.log(
          `%c💾 Cached ${orgVideos.length} videos for org ${org_id}.`,
          "color: #00cc88;",
        );

        // ✅ 4. Now load from IndexedDB into state
        await loadFromIndexedDB();
        console.log(
          "%c✅ Videos loaded into display state.",
          "color: #00cc88; font-weight: bold;",
        );
      } catch (err) {
        console.error("❌ Failed to load initial videos:", err);
      }
    };

    loadInitialVideos();
  }, [selectedIndex]);

  // 🧩 Load from IndexedDB initially
  const loadFromIndexedDB = async () => {
    console.log(
      `%c💾 [VideoTable] Loading videos — userChecked=${userChecked}, orgChecked=${orgChecked}`,
      "color: #00aaff; font-weight: bold;",
    );

    if (!userChecked && !orgChecked) {
      console.log("%c🚫 No filters selected. Clearing list.", "color: gray;");
      setVideos([]);
      return;
    }

    try {
      console.log(
        "%c📂 Fetching all videos from IndexedDB...",
        "color: #33cc33;",
      );
      const localVideos = await getAllVideos();

      console.log(
        `%c📥 Retrieved ${localVideos.length} videos from IndexedDB`,
        "color: #33cc33;",
      );

      localVideos.sort(
        (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
      );

      let filteredVideos = localVideos;

      // ✅ Match userChecked with the current meeting ID
      if (userChecked && !orgChecked) {
        filteredVideos = localVideos.filter(
          (v) => v.associated_meeting_id === currentMeetingIdRef.current,
        );
        console.log(
          `%c🎥 Showing ${filteredVideos.length} videos for current meeting (${currentMeetingIdRef.current})`,
          "color: #66ccff;",
        );
      }
      // ✅ Org-wide videos (everything else in the same org)
      else if (orgChecked && !userChecked) {
        filteredVideos = localVideos.filter(
          (v) =>
            v.organization_id === org_id &&
            v.associated_meeting_id !== currentMeetingIdRef.current,
        );
        console.log(
          `%c🏢 Showing ${filteredVideos.length} org videos (not in current meeting)`,
          "color: #ffcc33;",
        );
      }

      setVideos(filteredVideos);
      console.log(
        "%c✅ Videos ready for display (IndexedDB).",
        "color: #00cc88; font-weight: bold;",
      );
    } catch (err) {
      console.error(
        "%c❌ Failed to fetch videos from IndexedDB:",
        "color: red;",
        err,
      );
      setVideos([]);
    }
  };

  // 🔁 Reload when filters change
  useEffect(() => {
    loadFromIndexedDB();
  }, [userChecked, orgChecked]);

  // 📡 Listen for org-level updates
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== "org_update" || msg.category !== "video") return;

      const { action, payload } = msg;
      const videoId = String(payload?.id || payload?.video_id || "");

      if (!videoId) {
        console.warn(
          "⚠️ [VideoTable] Received org_update with no video ID:",
          msg,
        );
        return;
      }

      console.log(
        `📢 [VideoTable] Org update (${action}) received for video ${videoId}`,
      );

      try {
        switch (action) {
          case "delete":
            console.log(`🗑️ Removing video ${videoId} from IndexedDB...`);
            await deleteVideoFromIndexedDB(videoId);
            break;

          case "create":
            console.log(`🆕 Fetching new video ${videoId} from backend...`);
            const newVideo = await getVideoByIdFromBackend(videoId);
            if (newVideo) {
              await saveVideoToIndexedDB(newVideo);
              console.log(`✅ Created video ${videoId} in IndexedDB.`);
            } else {
              console.warn(
                `⚠️ [VideoTable] Video ${videoId} not found in backend after creation.`,
              );
            }
            break;

          case "update":
            console.log(`♻️ Updating video ${videoId} from backend...`);
            const updatedVideo = await getVideoByIdFromBackend(videoId);
            if (updatedVideo) {
              await saveVideoToIndexedDB(updatedVideo);
              console.log(`✅ Updated video ${videoId} in IndexedDB.`);
            } else {
              console.warn(
                `⚠️ [VideoTable] Video ${videoId} not found in backend after update.`,
              );
            }
            break;

          default:
            console.warn(
              `⚠️ [VideoTable] Unknown action '${action}' in org_update.`,
            );
            return;
        }

        // 🔁 Refresh state after mutation
        await loadFromIndexedDB();
      } catch (err) {
        console.error(
          `❌ [VideoTable] Error handling org_update (${action}):`,
          err,
        );
      }
    };

    // ✅ Attach listener
    socket.addEventListener("message", handleMessage);

    // ✅ Cleanup on unmount to prevent multiple active handlers
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket, userChecked, orgChecked]);

  return (
    <div ref={containerRef} className="video-table">
      {videos.map((video) => (
        <EditedVideoCard key={video.id} video={video} setVideoIDs={setVideos} />
      ))}
    </div>
  );
};

export default VideoTable;
