import React, { useRef, useEffect } from "react";
import "./VideoDisplay.css";
import { useMouse } from "../../hooks/drag/MouseContext";

import type { QuestionCardData } from "../../types/QuestionCard";
import type { VideoSegmentData } from "../../types/QuestionCard";
import {
  updateActiveMeeting,
  getActiveMeetingWithSegments,
  getVideoState,
  updateVideoState,
} from "./api/save";

import { useParams } from "react-router-dom";
import { getVideoTimeBeforeSegment } from "../../pages/meeting-page/VideoSegmentRenderer";
import { resetVideoState } from "./api/save";
import { PIXELS_PER_SECOND } from "./DisplayWithBar";

interface DisplayProps {
  videoTime: number;
  editedLength: React.RefObject<number>;
  setVideoStopped: (stopped: boolean) => void;
  metaData: VideoSegmentData[];
  videoStopped: boolean;
  currentQuestionCard: QuestionCardData | null;
  setCurrentQuestionCard: (card: QuestionCardData | null) => void;
  currentTimeRef: React.RefObject<number>;
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
  setCurrentQuestionCard,
  currentTimeRef,
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

  const currentTimeDisplayRef = useRef<HTMLDivElement>(null);

  const { draggedItem } = useMouse();

  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  useEffect(() => {
    metaDataRef.current = metaData;
  }, [metaData]);

  const getVideoLengthFromSegments = (
    segments: { source: [number, number] }[],
  ): number => {
    if (!segments || segments.length === 0) return 0;
    return Math.max(...segments.map((seg) => seg.source[1]));
  };

  useEffect(() => {
    const restoreLastControlledVideo = async () => {
      const result = await getActiveMeetingWithSegments(
        Number(org_id),
        roomName!,
      );

      if (result) {
        const { video_segments, video_url } = result;

        // Get video length directly from segments
        const storedSegments = video_segments;
        const storedDuration = getVideoLengthFromSegments(video_segments);

        console.log("🎥 Video URL:", video_url);
        console.log("🧩 Segments:", storedSegments);
        console.log("⏱️ Computed Duration:", storedDuration);

        setVideoSegments(storedSegments);
        editedLength.current = storedDuration;

        const calculatedWidth = storedDuration * PIXELS_PER_SECOND;
        updateWidths(calculatedWidth, (calculatedWidth * 50) / 100);

        setVideoSrc(video_url);
        setWidthPercent(50);
      }

      const videoState = await getVideoState(Number(org_id), roomName!);
      currentTimeRef.current = videoState.current_time;
      videoStoppedRef.current = videoState.stopped;
    };

    restoreLastControlledVideo();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoStoppedRef.current) {
        currentTimeRef.current += 0.16; // advance time by 0.16 seconds per tick
      }
      if (currentTimeDisplayRef.current) {
        currentTimeDisplayRef.current.textContent = `${currentTimeRef.current.toFixed(1)}s`;
      }
      if (currentTimeRef.current > editedLength.current) {
        currentTimeRef.current = 0;
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
          if (
            Math.abs(videoRef.current.currentTime - newTime) > 0.3 &&
            activeSegment &&
            !activeSegment.isQuestionCard
          ) {
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

  const togglePlay = async () => {
    // const now = currentTimeRef.current;
    // const activeSegment = metaData.find((seg) => {
    //   const [start, end] = seg.source;
    //   return now >= start && now < end;
    // });

    // if (activeSegment?.isQuestionCard && activeSegment.questionCardData) {
    //   if (videoRef.current) {
    //     videoRef.current.pause();
    //     isPlayingRef.current = false;
    //   }

    //   if (!currentQuestionCard) {
    //     setCurrentQuestionCard(activeSegment.questionCardData);
    //   }

    //   videoStoppedRef.current = !videoStoppedRef.current;
    //   return;
    // }

    // if (currentQuestionCard) {
    //   setCurrentQuestionCard(null);
    // }

    videoStoppedRef.current = !videoStoppedRef.current;
    // if (videoStoppedRef.current === true) {
    //   isPlayingRef.current = false
    // }
    // isPlayingRef.current = !isPlayingRef.current;

    if (videoRef.current) {
      if (isPlayingRef.current) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }

    const current_time = currentTimeRef.current;

    if (videoStoppedRef.current === true) {
      await updateVideoState(Number(org_id), String(roomName), {
        current_time: current_time,
        stopped: true,
      });
    } else if (videoStoppedRef.current === false) {
      await updateVideoState(Number(org_id), String(roomName), {
        current_time: current_time,
        stopped: false,
      });
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

  // const handleLoadedMetadata = () => {
  //   if (videoRef.current) {
  //     console.log("HI DOPPRED setting state");
  //     setVideoDuration(videoRef.current.duration);
  //   }
  // };

  const handleEnded = async () => {
    try {
      isPlayingRef.current = false;
      videoStoppedRef.current = true;

      console.log("🎬 Video ended — resetting state...");

      await resetVideoState(Number(org_id), String(roomName));

      console.log("🔴 Video state reset successfully after end.");
    } catch (err) {
      console.error("❌ Failed to reset video state on end:", err);
    }
  };

  const handleMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedItem?.type === "edited-video") {
      e.preventDefault();

      try {
        const videoId = draggedItem.data.id;

        console.log("🎬 Dropped video:", videoId);

        // ✅ 1. Update the active meeting to use this new video
        if (roomName) {
          await updateActiveMeeting(Number(org_id), roomName, {
            active_video_id: videoId,
            active_bot_ids: "djsut",
            active_survey_id: "djsut",
          });
        }

        console.log("✅ Active meeting video updated.");

        // ✅ 2. Reset video playback state
        await resetVideoState(Number(org_id), String(roomName));

        currentTimeRef.current = 0;
        isPlayingRef.current = false;

        console.log("🔴 Video state reset to start position.");
      } catch (err) {
        console.error("❌ Error during video drop handling:", err);
      }
    }
  };
  // if (draggedItem?.type === "edited-video") {
  //   e.preventDefault();

  //   const id = draggedItem.data.id;
  //   updateActiveMeeting(id, org_id, roomName)

  //   // call backend to set this as active meeting.

  //   console.log("Found edited-video, ID:", id);

  //   const result = await getVideoById(id);
  //   if (!result) {
  //     console.warn("No video found in IndexedDB with ID:", id);
  //     return;
  //   }

  //   const { metadata } = result;
  //   const {
  //     questionCards: storedSegments,
  //     videoLength: storedDuration,
  //     videoUrl,
  //   } = metadata;

  //   try {
  //     // ✅ Upload only segments
  //     await uploadVideoSegments(roomName!, storedSegments);
  //   } catch (err) {
  //     console.error("❌ Failed to upload segments:", err);
  //   }

  //   // ✅ Update state
  //   setVideoSegments(storedSegments);
  //   editedLength.current = storedDuration;

  //   setCurrentlyPlayingUrl(roomName!, videoUrl); // store in backend

  //   const calculatedWidth = editedLength.current * PIXELS_PER_SECOND;
  //   updateWidths(calculatedWidth, (calculatedWidth * 50) / 100);
  //   currentUniqueID.current = id;

  //   // ✅ Set video from backend URL
  //   setVideoSrc(videoUrl);

  //   // ✅ Reset timers and playback state
  //   currentTimeRef.current = 0;
  //   isPlayingRef.current = false;

  //   updateVideoState({
  //     current_time: 0,
  //     speed: 1, // TODO: GET THE ENDOFVIDEO ID
  //   });

  //   setWidthPercent(50);
  //   localStorage.setItem("last_controlled_video", id);
  //   }
  // };

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
