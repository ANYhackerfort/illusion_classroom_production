import React, { useState, useRef, useEffect, useCallback } from "react";
import VideoBar from "./VideoBar";
import VideoDisplay from "./VideoDisplay";
import VideoQuestionCard from "./VideoCard";
import SaveButton from "./SaveForm";
import { v4 as uuidv4 } from "uuid";

import { saveVideoToIndexedDB, getVideoById } from "../../indexDB/videoStorage";
import type { VideoMetadata } from "../../indexDB/videoStorage";

import type { QuestionCardData } from "../../types/QuestionCard";
import type { VideoSegmentData } from "../../types/QuestionCard";

const VideoPlayerWithBar: React.FC = () => {
  const [videoTime, setVideoTime] = useState(0);
  const [videoStopped, setVideoStopped] = useState(true); // true if paused
  const [videoDuration, setVideoDuration] = useState(0);
  // const [editedLength, setEditedLength] = useState(0);
  const videoLength = useRef(0);
  const [videoSegments, setVideoSegments] = useState<VideoSegmentData[]>([]);
  const [currentQuestionCard, setCurrentQuestionCard] =
    useState<QuestionCardData | null>(null);
  const currentTimeRef = useRef<number>(0);
  const [baseWidth, setBaseWidth] = useState(0);
  const [innerBarWidthPx, setInnerBarWidthPx] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [widthPercent, setWidthPercent] = useState(50);
  const [updateBar, setuUpdateBar] = useState(false);
  const currentVideoSourceRef = useRef<string>("");

  const currentVideoNameRef = useRef<string>("Unsaved");
  const currentVideoTagsRef = useRef<string[]>([]);

  const videoDroppedInRef = useRef(false);

  const currentUniqueID = useRef<string>("");

  const PIXELS_PER_SECOND = 100;

  const hasRestoredRef = useRef(false);

  const currentSegmentsRef = useRef<VideoSegmentData[]>([]);
  const previousSegmentsRef = useRef<VideoSegmentData[]>([]);

  useEffect(() => {
    currentSegmentsRef.current = videoSegments;
  }, [videoSegments]);

  useEffect(() => {
    currentVideoSourceRef.current = videoSrc!;
  }, [videoSrc]);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = currentSegmentsRef.current;
      const previous = previousSegmentsRef.current;
      console.log("Checking for changes in segments...");

      // Check if segments changed (shallow compare for now)
      const changed = JSON.stringify(current) !== JSON.stringify(previous);
      console.log("Checking for changes:", changed);

      if (changed) {
        previousSegmentsRef.current = [...current]; // update previous

        const id = currentUniqueID.current;
        const length = videoLength.current;
        const videoUrl = currentVideoSourceRef.current; // ✅ Use videoSrc instead of videoFileRef

        console.log("AUTO UPDATINTG FOR ", videoUrl, "and length", length)

        if (!videoUrl || current.length === 0) return;

        const metadata: VideoMetadata = {
          id,
          videoName: hasRestoredRef.current
            ? currentVideoNameRef.current
            : "Unsaved",
          videoTags: hasRestoredRef.current ? currentVideoTagsRef.current : [],
          videoLength: length,
          questionCards: current,
          savedAt: new Date().toISOString(),
          videoUrl, // ✅ include videoUrl
        };

        saveVideoToIndexedDB(metadata)
          .then(() => {
            console.log("✅ Auto-saved updated segments to IndexedDB");
            localStorage.setItem("lastVideoID", id);
          })
          .catch((err) => {
            console.error("❌ Failed to auto-save:", err);
          });
      }
    }, 20000); // every 20 seconds

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const restoreFromIndexedDB = async (lastID: string) => {
      try {
        console.log("THE LAST sdfsdfID", lastID)
        const result = await getVideoById(lastID.toString());
        console.log("GOT THE RESULT", result)
        if (!result) return;

        const { id, metadata } = result; // ✅ Only metadata is stored
        hasRestoredRef.current = true;

        // 🎥 Restore from backend URL
        currentVideoNameRef.current = metadata.videoName || "Unsaved";
        currentVideoTagsRef.current = metadata.videoTags || [];

        // ✅ Restore segments (questionCards = all segments)
        console.log("Restoring segments:", metadata);
        videoLength.current = metadata.videoLength;
        currentUniqueID.current = id; // !!!

        // 🧠 Load video from saved backend URL
        setVideoSrc(metadata.videoUrl);

        // 📐 Recalculate bar width
        const calculatedWidth = metadata.videoLength * PIXELS_PER_SECOND;
        setBaseWidth(calculatedWidth);
        setInnerBarWidthPx((50 / 100) * calculatedWidth);

        setVideoDuration(metadata.videoLength);
        setWidthPercent(50);
        setVideoSegments(metadata.questionCards);

        console.log("✅ Restored full timeline from IndexedDB");
      } catch (err) {
        console.error("❌ Failed to restore video:", err);
      }
    };

    const lastID = localStorage.getItem("lastVideoID");
    if (lastID) {
      restoreFromIndexedDB(lastID);
    }
  }, []);

  useEffect(() => {
    console.log("🔄 videoSegments updated from IndexedDB", videoSegments);
  }, [videoSegments]);

  useEffect(() => {
    if (hasRestoredRef.current) {
      console.log("loading saved");
      hasRestoredRef.current = false;
      setuUpdateBar((prev) => !prev);
      return;
    } else if (videoDroppedInRef.current) {
      console.log("resetting everything", videoDuration);
      setVideoSegments([
        { id: uuidv4(), source: [0, videoDuration], isQuestionCard: false },
      ]);
      videoLength.current = videoDuration;
      const calculatedWidth = videoLength.current * PIXELS_PER_SECOND;
      setBaseWidth(calculatedWidth);
      setInnerBarWidthPx((50 / 100) * calculatedWidth);
    }
    console.log("ignored for handle dropped in already edited");
  }, [videoDuration]);

  const videoSegmentsRef = useRef<VideoSegmentData[]>(videoSegments);

  useEffect(() => {
    videoSegmentsRef.current = videoSegments;
  }, [videoSegments]);

  const extractAllSegments = (): VideoSegmentData[] => {
    return videoSegmentsRef.current;
  };

  const handleVideoSave = async (name: string, tag: string) => {
    const id = currentUniqueID.current;
    const length = videoLength.current;
    const questionCards = extractAllSegments();
    const videoUrlToSave = videoSrc;

    if (!videoUrlToSave) {
      console.error("❌ No video URL to save");
      return;
    }

    const metadata: VideoMetadata = {
      id,
      videoName: name,
      videoTags: tag.split(",").map((t) => t.trim()),
      videoLength: length,
      questionCards,
      savedAt: new Date().toISOString(),
      videoUrl: videoUrlToSave, // ✅ required for IndexedDB
    };

    console.log("💾 Saving video with metadata:", metadata);

    try {
      await saveVideoToIndexedDB(metadata); // ✅ Only pass metadata
      console.log("✅ Successfully saved to IndexedDB");
    } catch (err) {
      console.error("❌ Failed to save to IndexedDB:", err);
    }
  };

  const handleUpdateWidth = (base: number, inner: number) => {
    setBaseWidth(base);
    setInnerBarWidthPx(inner);
  };

  return (
    <>
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <VideoDisplay
          editedLength={videoLength}
          videoTime={videoTime}
          setVideoStopped={setVideoStopped}
          setVideoDuration={setVideoDuration}
          videoStopped={videoStopped}
          metaData={videoSegments}
          currentQuestionCard={currentQuestionCard}
          setCurrentQuestionCard={setCurrentQuestionCard}
          currentTimeRef={currentTimeRef}
          currentUniqueID={currentUniqueID}
          videoSrc={videoSrc}
          setVideoSrc={setVideoSrc}
          videoDroppedRef={videoDroppedInRef}
          setVideoSegments={setVideoSegments}
          updateWidths={handleUpdateWidth}
          setWidthPercent={setWidthPercent}
        />

        {currentQuestionCard && (
          <div
            style={{
              position: "absolute",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              pointerEvents: "auto",
              zIndex: 10,
            }}
          >
            <VideoQuestionCard
              question={currentQuestionCard.question}
              answers={currentQuestionCard.answers}
              difficulty={currentQuestionCard.difficulty}
              type={currentQuestionCard.type}
              displayType={currentQuestionCard.displayType}
              showWinner={currentQuestionCard.showWinner}
              live={currentQuestionCard.live}
            />
          </div>
        )}
      </div>

      <VideoBar
        updateBar={updateBar}
        baseWidth={baseWidth}
        setVideoTime={setVideoTime}
        // setEditedLength={setEditedLength}
        videoLength={videoLength}
        videoSegments={videoSegments}
        setVideoSegments={setVideoSegments}
        currentTimeRef={currentTimeRef}
        innerBarWidthPx={innerBarWidthPx}
        setInnerBarWidthPx={setInnerBarWidthPx}
        setBaseWidth={setBaseWidth}
        widthPercent={widthPercent}
        setWidthPercent={setWidthPercent}
      />

      {videoDuration !== 0 && <SaveButton onSave={handleVideoSave} />}
    </>
  );
};

export default VideoPlayerWithBar;
