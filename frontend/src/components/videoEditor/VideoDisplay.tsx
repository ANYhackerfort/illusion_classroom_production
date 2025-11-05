import React, { useRef, useEffect } from "react";
import "./VideoDisplay.css";
import { useMouse } from "../../hooks/drag/MouseContext";
import { getVideoById, saveVideoToIndexedDB } from "../../indexDB/videoStorage";

import type { QuestionCardData } from "../../types/QuestionCard";
import type { VideoSegmentData } from "../../types/QuestionCard";
import type { VideoMetadata } from "../../indexDB/videoStorage";
import { uploadVideoMetadata } from "../videoDisplayer/api/save";

import { useParams } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

interface VideoDisplayProps {
  videoTime: number;
  editedLength: React.RefObject<number>;
  setVideoStopped: (stopped: boolean) => void;
  setVideoDuration: (duration: number) => void;
  metaData: VideoSegmentData[];
  videoStopped: boolean;
  currentQuestionCard: QuestionCardData | null;
  setCurrentQuestionCard: (card: QuestionCardData | null) => void;
  currentTimeRef: React.RefObject<number>;
  currentUniqueID: React.RefObject<string>;
  videoSrc: string | null;
  setVideoSrc: (videoSrc: string | null) => void;
  videoDroppedRef: React.RefObject<boolean>;
  setVideoSegments: (segments: VideoSegmentData[]) => void;
  updateWidths: (base: number, inner: number) => void;
  setWidthPercent: (widthPercent: number) => void;
  currentIndividual: React.RefObject<boolean>;
  currentVideoNameRef: React.RefObject<string | null>;
  currentMeetingIdRef: React.RefObject<string | null>;
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({
  videoTime,
  setVideoDuration,
  editedLength,
  metaData,
  currentQuestionCard,
  setCurrentQuestionCard,
  currentTimeRef,
  currentUniqueID,
  videoSrc,
  setVideoSrc,
  videoDroppedRef,
  setVideoSegments,
  updateWidths,
  setWidthPercent,
  currentIndividual,
  currentVideoNameRef,
  currentMeetingIdRef,
}) => {
  // const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // const [isPlaying, setIsPlaying] = useState(false);
  // const currentTimeRef = useRef<number>(0);

  const metaDataRef = useRef<VideoSegmentData[]>(metaData);
  const isPlayingRef = useRef(false); // actaul video
  const videoStoppedRef = useRef(true); // The entirety of video with question cards
  const videoOverRef = useRef(false);
  const currentTimeDisplayRef = useRef<HTMLDivElement>(null);

  const { roomName, org_id } = useParams();

  const { draggedItem } = useMouse();

  const PIXELS_PER_SECOND = 100;
  const [isUploading, setIsUploading] = React.useState(false);

  useEffect(() => {
    metaDataRef.current = metaData;
  }, [metaData]);

  // useEffect(() => {
  //   isPlayingRef.current = isPlaying;
  // }, [isPlaying]);

  // useEffect(() => {
  //   videoStoppedRef.current = videoStopped;
  // }, [videoStopped]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTimeDisplayRef.current) {
        currentTimeDisplayRef.current.textContent = `${currentTimeRef.current.toFixed(1)}s`;
      }

      if (currentTimeRef.current > editedLength.current) {
        currentTimeRef.current = 0;
      }

      if (videoOverRef.current === true) {
        //TODO: todo to give me form logic
        currentTimeRef.current = 0;
        videoOverRef.current = false;
      }

      if (!videoSrc) return;
      if (videoStoppedRef.current) {
        const now = currentTimeRef.current;

        // 🎯 Find active segment using latest metaData
        const activeSegment = metaDataRef.current.find((seg) => {
          const [start, end] = seg.source;
          return now >= start && now < end;
        });

        if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
          setCurrentQuestionCard(activeSegment.questionCardData);
        } else {
          setCurrentQuestionCard(null);
        }
      } else {
        // ⏱️ Advance custom time by 100ms
        currentTimeRef.current += 0.1;
        const now = currentTimeRef.current;

        // 🎯 Find active segment using latest metaData
        const activeSegment = metaDataRef.current.find((seg) => {
          const [start, end] = seg.source;
          return now >= start && now < end;
        });

        if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
          if (videoRef.current && isPlayingRef.current) {
            videoRef.current.pause();
            // setIsPlaying(false);
            isPlayingRef.current = false;
          }
          setCurrentQuestionCard(activeSegment.questionCardData);
        } else {
          setCurrentQuestionCard(null);

          if (videoRef.current && !isPlayingRef.current) {
            videoRef.current.play();
            // setIsPlaying(true);
            isPlayingRef.current = true;
          }
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [videoSrc]);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("video/")) {
      videoDroppedRef.current = false;
      return;
    }

    setIsUploading(true);
    try {
      // 🕒 Step 1: Get video duration on the frontend
      const videoDuration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          resolve(video.duration);
        };

        video.onerror = () => reject("Failed to load video metadata.");
        video.src = URL.createObjectURL(file);
      });

      // 🛰️ Step 2: Upload video to backend
      const { video_id, video_url, description, meeting_id, thumbnail_url } =
        await uploadVideoMetadata(
          Number(org_id),
          roomName!,
          file,
          [], // optional tags
        );

      currentMeetingIdRef.current = video_id;

      console.log("Generated description is", description);
      console.log("✅ Uploaded video. Path:", video_url);

      // ✅ Compose full media URL (served by NGINX)

      // ✅ Step 3: Save metadata to IndexedDB
      const fileName = file.name;
      currentVideoNameRef.current = fileName;
      const videoMetadata: VideoMetadata = {
        id: String(video_id),
        videoName: fileName,
        videoTags: [],
        videoLength: videoDuration,
        questionCards: [
          {
            id: uuidv4(),
            source: [0, videoDuration],
            isQuestionCard: false,
          },
        ],
        savedAt: new Date().toISOString(),
        videoUrl: video_url,
        organization_id: org_id!,
        individual: true,
        associated_meeting_id: meeting_id!,
        thumbnail_url: thumbnail_url,
      };

      // ✅ Update refs
      currentIndividual.current = true;
      currentUniqueID.current = String(video_id);

      // ✅ Save to IndexedDB
      await saveVideoToIndexedDB(videoMetadata);
      console.log("💾 Saved video metadata to IndexedDB:", videoMetadata);

      // ✅ Persist ID in localStorage for automatic restore
      localStorage.setItem("lastVideoID", String(video_id));
      console.log("🧠 Saved to localStorage: lastVideoID =", video_id);

      // ✅ Update UI state
      setVideoSrc(video_url);
      videoDroppedRef.current = true;
    } catch (err) {
      console.error("❌ Failed to upload or store video:", err);
      videoDroppedRef.current = false;
    } finally {
      setIsUploading(false);
    }
  };

  // Unmounts
  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, [videoSrc]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const togglePlay = () => {
    const now = currentTimeRef.current;
    console.log(isPlayingRef, "ISPLAYING??");
    const activeSegment = metaData.find((seg) => {
      const [start, end] = seg.source;
      return now >= start && now < end;
    });

    if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
      console.log("YES");
      if (videoRef.current) {
        videoRef.current.pause();
        isPlayingRef.current = false;
        // setIsPlaying(false);
      }

      if (!currentQuestionCard) {
        setCurrentQuestionCard(activeSegment.questionCardData);
      }

      videoStoppedRef.current = !videoStoppedRef.current;
      return;
    } else {
      if (currentQuestionCard) {
        setCurrentQuestionCard(null);
      }

      if (videoRef.current) {
        if (isPlayingRef.current) {
          videoRef.current.pause();
        } else {
          videoRef.current.play();
        }
        isPlayingRef.current = !isPlayingRef.current;
        // setIsPlaying(!isPlaying);
      }
      videoStoppedRef.current = !videoStoppedRef.current;
    }
  };

  // ⏯️ Listen for spacebar key to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent page scroll
        togglePlay();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [metaData]);

  const getRealVideoTimeFromEditedTime = (
    editedTime: number,
    segments: VideoSegmentData[],
  ): number => {
    let offset = 0;

    for (const seg of segments) {
      if (seg.isQuestionCard) {
        const [start, end] = seg.source;

        if (editedTime >= end) {
          offset += end - start; // full question block before this time
        } else if (editedTime > start) {
          offset += editedTime - start; // partial overlap (currently in question)
        }
      }
    }

    return editedTime - offset;
  };

  // useEffect(() => {
  //   if (videoRef.current && editedLength > 0) {
  //     const targetTime = videoTime;
  //     videoRef.current.currentTime = getRealVideoTimeFromEditedTime(
  //       targetTime,
  //       metaData,
  //     );
  //     currentTimeRef.current = targetTime;

  //     // 🧠 Determine active segment based on time
  //     const activeSegment = metaData.find((seg) => {
  //       const [start, end] = seg.source;
  //       return targetTime >= start && targetTime < end;
  //     });

  //     if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
  //       setCurrentQuestionCard(activeSegment.questionCardData);
  //     } else {
  //       setCurrentQuestionCard(null);
  //     }
  //   }
  // }, [videoTime, setCurrentQuestionCard]);

  useEffect(() => {
    if (videoRef.current && editedLength.current > 0) {
      const targetTime = videoTime;
      currentTimeRef.current = targetTime;
      videoRef.current.currentTime = getRealVideoTimeFromEditedTime(
        targetTime,
        metaData,
      );

      // 🧠 Determine active segment based on time
      const activeSegment = metaData.find((seg) => {
        const [start, end] = seg.source;
        return targetTime >= start && targetTime < end;
      });

      if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
        setCurrentQuestionCard(activeSegment.questionCardData);
      } else {
        setCurrentQuestionCard(null);
      }
    }
  }, [videoTime]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      console.log("HI DOPPRED setting state");
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleEnded = () => {
    isPlayingRef.current = false;
    // videoStoppedRef.current = true;
    videoOverRef.current = true;
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedItem?.type === "edited-video") {
      e.preventDefault();

      const id = draggedItem.data.id;
      console.log("🎬 Found edited-video, ID:", id);

      try {
        // ✅ Attempt to retrieve video metadata from IndexedDB
        const metadata = await getVideoById(id);
        console.log("FOUND EMTA DATA", metaData)
        if (!metadata) {
          console.warn("⚠️ No video found in IndexedDB with ID:", id);
          return;
        }
        currentVideoNameRef.current = metadata.videoName;
        currentMeetingIdRef.current = metadata.associated_meeting_id;

        // ✅ Destructure relevant info
        const {
          questionCards: storedSegments,
          videoLength: storedDuration,
          videoUrl,
          individual,
        } = metadata;

        // 1️⃣ Apply video timeline + segments
        console.log("🧩 Loaded segments:", storedSegments);
        setVideoSegments(storedSegments);

        // 2️⃣ Set duration
        console.log("🕒 Stored duration:", storedDuration);
        editedLength.current = storedDuration;

        // 3️⃣ Update width scaling
        const calculatedWidth = storedDuration * PIXELS_PER_SECOND;
        updateWidths(calculatedWidth, (calculatedWidth * 50) / 100);
        console.log("📏 Calculated width:", calculatedWidth);

        // 4️⃣ Update refs + video source
        currentUniqueID.current = id;
        currentIndividual.current = individual;
        setVideoSrc(videoUrl);
        setVideoDuration(storedDuration);
        console.log("🎥 Loaded video URL:", videoUrl);

        // ✅ Persist this video ID in localStorage for auto-restore
        localStorage.setItem("lastVideoID", String(id));
        console.log("🧠 Saved to localStorage: lastVideoID =", id);

        // 5️⃣ Reset playback state
        currentTimeRef.current = 0;
        isPlayingRef.current = false;
        setWidthPercent(50);
      } catch (err) {
        console.error("❌ Failed to load dragged video:", err);
      }
    }
  };

  return (
    <div className="video-display-wrapper">
      <div
        className="video-display-container"
        onDrop={handleDrop}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
      >
        {isUploading && (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        )}

        {!videoSrc ? (
          <div className="video-drop-zone">Drag a video file here to edit</div>
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            className="video-element"
            onClick={togglePlay}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
          />
        )}
      </div>
    </div>
  );
};

export default VideoDisplay;
