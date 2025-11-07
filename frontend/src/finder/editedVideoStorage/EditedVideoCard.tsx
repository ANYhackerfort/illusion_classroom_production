import React, { useEffect, useState } from "react";
import { useMouse } from "../../hooks/drag/MouseContext";
import { deleteVideo } from "../../components/videoDisplayer/api/save";
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
} from "@mui/material";
import "./EditedVideoCard.css";
import type { VideoMetadata } from "../../indexDB/videoStorage";
import { deleteVideoFromIndexedDB } from "../../indexDB/videoStorage";

interface EditedVideoCardProps {
  video: VideoMetadata;
  setVideoIDs: React.Dispatch<React.SetStateAction<VideoMetadata[]>>;
}

const EditedVideoCard: React.FC<EditedVideoCardProps> = ({
  video,
  setVideoIDs,
}) => {
  const { id, videoName, videoTags, thumbnail_url, videoUrl } = video;
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    thumbnail_url ?? null,
  );
  const { setDraggedItem } = useMouse();
  const [openConfirm, setOpenConfirm] = useState(false);

  // 🖼️ Generate fallback thumbnail if missing
  useEffect(() => {
    if (thumbnailUrl || !videoUrl) return;

    const videoEl = document.createElement("video");
    videoEl.src = videoUrl;
    videoEl.crossOrigin = "anonymous";
    videoEl.currentTime = 1;

    videoEl.addEventListener("loadeddata", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL("image/jpeg");
        setThumbnailUrl(thumbnail);
      }
    });
  }, [videoUrl, thumbnailUrl]);

  // 🖱️ Drag logic
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".delete-btn")) return;
    if (!thumbnailUrl) return;

    console.log("🖱️ Drag start for video:", id);
    setDraggedItem({
      type: "edited-video",
      data: { id, videoName, videoTags, thumbnailUrl },
    });
  };

  // 🗑️ Delete logic
  const handleDelete = async () => {
    try {
      await deleteVideo(id);
      await deleteVideoFromIndexedDB(id);
      setVideoIDs((prev) => prev.filter((v) => v.id !== id));
      console.log(`✅ Deleted video ${id} (backend + IndexedDB)`);
      setOpenConfirm(false);
    } catch (err) {
      console.error("❌ Failed to delete video:", err);
    }
  };

  return (
    <div className="edited-video-card">
      {/* 🗑️ Delete button */}
      <div className="delete-btn-wrapper">
        <button
          className="delete-btn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpenConfirm(true);
          }}
        >
          ×
        </button>
      </div>

      {/* 🎞️ Thumbnail */}
      <div className="thumbnail-container" onMouseDown={handleMouseDown}>
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt="thumbnail"
            className="video-thumbnail"
            draggable={false}
          />
        ) : (
          <div className="video-placeholder">Loading...</div>
        )}
      </div>

      {/* 🧾 Info */}
      <div className="video-info-overlay" onMouseDown={handleMouseDown}>
        <div className="video-name">{videoName}</div>
        <div className="video-tags">
          {videoTags.map((tag) => (
            <span key={tag} className="video-tag">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ⚠️ Confirm delete */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)}>
        <DialogTitle>Delete Video?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete{" "}
            <strong>{videoName}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              await handleDelete();
            }}
            color="error"
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EditedVideoCard;
