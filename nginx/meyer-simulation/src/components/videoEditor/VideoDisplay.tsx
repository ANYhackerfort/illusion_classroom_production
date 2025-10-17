import React, { useRef, useEffect } from "react";
import "./VideoDisplay.css";
import { useMouse } from "../../hooks/drag/MouseContext";
import { getVideoById, saveVideoToIndexedDB } from '../../indexDB/videoStorage';

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

  const { roomName } = useParams();
  
  const { draggedItem } = useMouse();

  const PIXELS_PER_SECOND = 100;

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
    console.log("Handle drop video called!");
    e.preventDefault();

    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith("video/")) {
      videoDroppedRef.current = false;
      return;
    }

    try {
      // 🕒 Step 1: Get video duration on the frontend
      const videoDuration = await new Promise<number>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";

        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src); // Clean up blob URL
          resolve(video.duration);
        };

        video.onerror = () => reject("Failed to load video metadata.");

        video.src = URL.createObjectURL(file);
      });

      // 🛰️ Step 2: Upload file + metadata (tags) to backend
      const { video_id, storage_path, description } = await uploadVideoMetadata(
        roomName!,
        file,
        [] // optional tags
      );

      console.log("Generated description is", description);
      console.log("✅ Uploaded video. Path:", storage_path);

      // ✅ Compose final video URL (served by NGINX through /media/)
      const videoUrl = `http://localhost:8081/media/${storage_path}`;

      // ✅ Step 3: Save metadata to IndexedDB
      const videoMetadata: VideoMetadata = {
        id: video_id,
        videoName: file.name,
        videoTags: [],
        videoLength: videoDuration, // set duration from frontend
        questionCards: [
          {
            id: uuidv4(),
            source: [0, videoDuration],
            isQuestionCard: false,
          },
        ],
        savedAt: new Date().toISOString(),
        videoUrl: videoUrl,
      };

      await saveVideoToIndexedDB(videoMetadata);
      currentUniqueID.current = video_id;

      setVideoSrc(videoUrl);
      videoDroppedRef.current = true;

    } catch (err) {
      console.error("❌ Failed to upload or store video:", err);
      videoDroppedRef.current = false;
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
      console.log("Found edited-video, ID:", id);

      const result = await getVideoById(id);
      if (!result) {
        console.warn("No video found in IndexedDB with ID:", id);
        return;
      }

      const { metadata } = result;
      const {
        questionCards: storedSegments,
        videoLength: storedDuration,
        videoUrl,
      } = metadata;


      // 1) Merge segments
      setVideoSegments(storedSegments);

      // 2) Set duration
      console.log("STOREd duration", storedDuration)
      editedLength.current = storedDuration;

      // 3) Update width
      const calculatedWidth = editedLength.current * PIXELS_PER_SECOND;
      console.log("calcualted width",calculatedWidth)
      updateWidths(calculatedWidth, (calculatedWidth * 50) / 100);

      // 4) Update ID and video URL
      currentUniqueID.current = id;
      setVideoSrc(videoUrl);
      console.log("VIDEO URL IS", videoUrl)
      setVideoDuration(storedDuration);

      // 5) Reset playback state
      currentTimeRef.current = 0;
      isPlayingRef.current = false;

      setWidthPercent(50);
    }
  };


  useEffect(() => {
    console.log("Received videoSrc in VideoDisplay:", videoSrc);
  }, [videoSrc]);

  return (
    <div className="video-display-wrapper">
      <div
        className="video-display-container"
        onDrop={handleDrop}
        onMouseUp={handleMouseUp}
        onDragOver={handleDragOver}
      >
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

      {/* Time Display goes just below the video and aligned to the left */}
      <div className="video-time-display-wrapper">
        <div ref={currentTimeDisplayRef} className="video-time-display" />
      </div>
    </div>
  );
};

export default VideoDisplay;
