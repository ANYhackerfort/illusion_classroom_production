import React, { useRef, useEffect } from "react";
import "./VideoDisplay.css";
import { useMouse } from "../../hooks/drag/MouseContext";
import { getVideoById } from "../../indexDB/videoStorage";

import type { QuestionCardData } from "../../types/QuestionCard";
import type { VideoSegmentData } from "../../types/QuestionCard";
import { uploadVideoSegments } from "./api/save";

import { useParams } from "react-router-dom";
import { useVideoSocketContext } from "../../types/videoSync/VideoSocketContext";
import { setCurrentlyPlayingUrl } from "./api/save";
import { getVideoTimeBeforeSegment } from "../../pages/meeting-page/VideoSegmentRenderer";

interface DisplayProps {
  videoTime: number;
  editedLength: React.RefObject<number>;
  setVideoStopped: (stopped: boolean) => void;
  metaData: VideoSegmentData[];
  videoStopped: boolean;
  currentQuestionCard: QuestionCardData | null;
  setCurrentQuestionCard: (card: QuestionCardData | null) => void;
  currentTimeRef: React.RefObject<number>;
  currentUniqueID: React.RefObject<string>;
  videoSrc: string | null;
  setVideoSrc: (videoSrc: string | null) => void;
  setVideoSegments: (segments: VideoSegmentData[]) => void;
  updateWidths: (base: number, inner: number) => void;
  setWidthPercent: (width: number) => void;
  videoStoppedRef: React.RefObject<boolean>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

const Display: React.FC<DisplayProps> = ({
  videoTime,
  editedLength,
  metaData,
  currentQuestionCard,
  setCurrentQuestionCard,
  currentTimeRef,
  currentUniqueID,
  videoSrc,
  setVideoSrc,
  setVideoSegments,
  updateWidths,
  setWidthPercent,
  videoStoppedRef,
  videoRef,
}) => {
  // const [videoSrc, setVideoSrc] = useState<string | null>(null);
  
  // const [isPlaying, setIsPlaying] = useState(false);
  // const currentTimeRef = useRef<number>(0);

  const metaDataRef = useRef<VideoSegmentData[]>(metaData);


  const isPlayingRef = useRef(false); // actaul video

  const videoOverRef = useRef(false);
  const currentTimeDisplayRef = useRef<HTMLDivElement>(null);

  const { draggedItem } = useMouse();

  const PIXELS_PER_SECOND = 100;

  const { roomName } = useParams<{ roomName: string }>();

  const { updateVideoState, startMeeting, getOneUpdate } = useVideoSocketContext();

  useEffect(() => {
    metaDataRef.current = metaData;
  }, [metaData]);

  useEffect(() => {
    const restoreLastControlledVideo = async () => {
      const id = localStorage.getItem("last_controlled_video");
      if (!id) {
        console.log("!!!! No cached video ID found in localStorage.");
        return;
      }

      console.log("📦 Found cached edited-video ID:", id);

      const result = await getVideoById(id);
      if (!result) {
        console.warn("⚠️ No video found in IndexedDB with ID:", id);
        return;
      }

      const { metadata } = result;
      const {
        questionCards: storedSegments,
        videoLength: storedDuration,
        videoUrl,
      } = metadata;

      // ✅ Update state
      setVideoSegments(storedSegments);
      editedLength.current = storedDuration;

      const calculatedWidth = storedDuration * PIXELS_PER_SECOND;
      updateWidths(calculatedWidth, (calculatedWidth * 50) / 100);
      currentUniqueID.current = id;

      // ✅ Set video from backend URL
      setVideoSrc(videoUrl);

      try {
        const syncState = await getOneUpdate(); // 👈 Await sync_update from socket
        console.log("🔄 One-time sync update:", syncState);

        currentTimeRef.current = syncState.current_time;
        isPlayingRef.current = !syncState.stopped;

        if (videoRef.current) {
          videoRef.current.currentTime = syncState.current_time;

          if (syncState.stopped) {
            videoRef.current.pause();
          } else {
            await videoRef.current.play().catch((err) =>
              console.warn("⚠️ Failed to autoplay video:", err)
            );
          }
        }
      } catch (err) {
        console.warn("❌ Failed to get sync update:", err);
      }

      setWidthPercent(50);
    };

    restoreLastControlledVideo();
  }, []);

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
        
        if (videoRef.current) {
          videoRef.current.currentTime = getVideoTimeBeforeSegment(
                metaDataRef.current,
                activeSegment!,
                currentTimeRef.current,
              );
        }
        if (videoRef.current && isPlayingRef.current) {
            videoRef.current.pause();
            isPlayingRef.current = false;
          }

        if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
          setCurrentQuestionCard(activeSegment.questionCardData);
          
        } else {
          setCurrentQuestionCard(null);
        }
      } else {
        // ⏱️ Advance custom time by 100ms
        // currentTimeRef.current += 0.1;
        const now = currentTimeRef.current;

        // 🎯 Find active segment using latest metaData
        const activeSegment = metaDataRef.current.find((seg) => {
          const [start, end] = seg.source;
          return now >= start && now < end;
        });

        if (videoRef.current) {
          const newTime = getVideoTimeBeforeSegment(
                metaDataRef.current,
                activeSegment!,
                currentTimeRef.current,
              );
          if ((Math.abs(videoRef.current.currentTime - newTime) > 0.3) && activeSegment && !activeSegment.isQuestionCard) {
            videoRef.current.currentTime = newTime;
          }
        }

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
    }, 160);

    return () => clearInterval(interval);
  }, [videoSrc]);

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
    const activeSegment = metaData.find((seg) => {
      const [start, end] = seg.source;
      return now >= start && now < end;
    });

    if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
      if (videoRef.current) {
        videoRef.current.pause();
        isPlayingRef.current = false;
      }

      if (!currentQuestionCard) {
        setCurrentQuestionCard(activeSegment.questionCardData);
      }

      videoStoppedRef.current = !videoStoppedRef.current;

      // ✅ Send play/pause event
      updateVideoState({
        stopped: videoStoppedRef.current,
        current_time: now,
        speed: 1,
      });

      return;
    }

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
    }

    videoStoppedRef.current = !videoStoppedRef.current;

    // ✅ Broadcast play/pause
    updateVideoState({
      stopped: videoStoppedRef.current,
      current_time: now,
      speed: 1,
    });
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

  // const handleLoadedMetadata = () => {
  //   if (videoRef.current) {
  //     console.log("HI DOPPRED setting state");
  //     setVideoDuration(videoRef.current.duration);
  //   }
  // };

  const handleEnded = () => {
    isPlayingRef.current = false;
    videoStoppedRef.current = true;
    videoOverRef.current = true;

    updateVideoState({
      stopped: videoStoppedRef.current,
      current_time: 0,
      speed: 1,
    });

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

      try {
        // ✅ Upload only segments
        await uploadVideoSegments(roomName!, storedSegments);
      } catch (err) {
        console.error("❌ Failed to upload segments:", err);
      }

      // ✅ Update state
      setVideoSegments(storedSegments);
      editedLength.current = storedDuration;

      setCurrentlyPlayingUrl(roomName!, videoUrl); // store in backend

      const calculatedWidth = editedLength.current * PIXELS_PER_SECOND;
      updateWidths(calculatedWidth, (calculatedWidth * 50) / 100);
      currentUniqueID.current = id;

      // ✅ Set video from backend URL
      setVideoSrc(videoUrl);

      // ✅ Reset timers and playback state
      currentTimeRef.current = 0;
      isPlayingRef.current = false;

      startMeeting(videoUrl);

      updateVideoState({
        current_time: 0,
        speed: 1, // TODO: GET THE ENDOFVIDEO ID
      });

      setWidthPercent(50);
      localStorage.setItem("last_controlled_video", id);
    }
  };

  useEffect(() => {
    console.log("Received videoSrc in VideoDisplay:", videoSrc);
  }, [videoSrc]);

  return (
    <div className="video-display-wrapper">
      <div
        className="video-display-container"
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

export default Display;
