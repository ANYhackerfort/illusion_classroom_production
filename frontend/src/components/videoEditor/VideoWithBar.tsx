import React, { useState, useRef, useEffect } from "react";
import VideoBar from "./VideoBar";
import VideoDisplay from "./VideoDisplay";
import VideoQuestionCard from "./VideoCard";
import SaveButton from "./SaveForm";
import { v4 as uuidv4 } from "uuid";

import { saveVideoToIndexedDB, getVideoById } from "../../indexDB/videoStorage";
import { getVideoByIdFromBackend, editVideo } from "../videoDisplayer/api/save";
import type { VideoMetadata } from "../../indexDB/videoStorage";

import type { QuestionCardData } from "../../types/QuestionCard";
import type { VideoSegmentData } from "../../types/QuestionCard";
import { useParams } from "react-router-dom";

const VideoPlayerWithBar: React.FC = () => {
  const [videoTime, setVideoTime] = useState(0);
  const [videoStopped, setVideoStopped] = useState(true);
  const [videoDuration, setVideoDuration] = useState(0);
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
  const currentInvidual = useRef<boolean>(true);
  const PIXELS_PER_SECOND = 100;
  const hasRestoredRef = useRef(false);
  const currentSegmentsRef = useRef<VideoSegmentData[]>([]);
  // const previousSegmentsRef = useRef<VideoSegmentData[]>([]);
  const currentMeetingIdRef = useRef<string | null>(null);
  const currentThumbnailRef = useRef<string | null>(null);

  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  useEffect(() => {
    currentSegmentsRef.current = videoSegments;
  }, [videoSegments]);

  useEffect(() => {
    currentVideoSourceRef.current = videoSrc || "";
  }, [videoSrc]);

  // ============================================================
  // 🧩 Auto-save loop (every 20s)
  // ============================================================
  // useEffect(() => {
  //   const interval = setInterval(async () => {
  //     const current = currentSegmentsRef.current;
  //     const previous = previousSegmentsRef.current;
  //     const id = currentUniqueID.current;
  //     const length = videoLength.current;
  //     const videoUrl = currentVideoSourceRef.current;
  //     const meetingId = currentMeetingIdRef.current;

  //     if (!id || !videoUrl || current.length === 0) return;
  //     const changed = JSON.stringify(current) !== JSON.stringify(previous);
  //     if (!changed) return;

  //     previousSegmentsRef.current = [...current];

  //     console.log("🕒 Detected segment or metadata change, syncing video:", id);

  //     try {
  //       const videoName = currentVideoNameRef.current?.trim() || "Unsaved";
  //       const videoTags = currentVideoTagsRef.current || [];

  //       const metadata: VideoMetadata = {
  //         id,
  //         videoName,
  //         videoTags,
  //         videoLength: length,
  //         questionCards: current,
  //         savedAt: new Date().toISOString(),
  //         videoUrl,
  //         organization_id: org_id!,
  //         individual: currentInvidual.current,
  //         associated_meeting_id: meetingId || "",
  //         thumbnail_url: currentThumbnailRef.current,
  //       };

  //       console.log("💾 Auto-saving:", metadata);
  //       await saveVideoToIndexedDB(metadata);
  //       console.log("✅ Auto-saved locally with meeting ID:", meetingId);

  //       const updatedTime = await editVideo(
  //         Number(org_id),
  //         roomName!,
  //         id,
  //         current,
  //         videoName,
  //         videoTags,
  //       );

  //       if (updatedTime) {
  //         console.log("🌐 Synced with backend:", updatedTime);
  //         const updatedMetadata = { ...metadata, savedAt: updatedTime };
  //         await saveVideoToIndexedDB(updatedMetadata);
  //       }
  //     } catch (err) {
  //       console.error("❌ Auto-save failed:", err);
  //     }
  //   }, 20000);

  //   return () => clearInterval(interval);
  // }, []);

  // ============================================================
  // 🔄 Restore last video from IndexedDB or backend
  // ============================================================
  useEffect(() => {
    const restoreFromStorage = async (lastID: string) => {
      try {
        console.log("🔄 Trying to restore video with ID:", lastID);

        let metadata = await getVideoById(lastID);
        console.log("📦 Retrieved from IndexedDB:", metadata);

        if (!metadata || !metadata.videoUrl || metadata.questionCards.length === 0) {
          console.warn("⚠️ IndexedDB incomplete — fetching from backend...");
          const backendData = await getVideoByIdFromBackend(lastID);
          if (!backendData) {
            console.error("❌ No video found in backend either.");
            return;
          }
          metadata = backendData;
          await saveVideoToIndexedDB(metadata);
          console.log("💾 Cached backend data to IndexedDB.");
        }

        hasRestoredRef.current = true;
        currentVideoNameRef.current = metadata.videoName || "Unsaved";
        currentVideoTagsRef.current = metadata.videoTags || [];

        console.log("Restoring segments:", metadata.questionCards);
        videoLength.current = metadata.videoLength;
        currentUniqueID.current = metadata.id;
        setVideoSrc(metadata.videoUrl);
        currentThumbnailRef.current = metadata.thumbnail_url ?? null;

        const calculatedWidth = metadata.videoLength * PIXELS_PER_SECOND;
        setBaseWidth(calculatedWidth);
        setInnerBarWidthPx((50 / 100) * calculatedWidth);

        setVideoDuration(metadata.videoLength);
        setWidthPercent(50);
        setVideoSegments(metadata.questionCards);

        const orgId = Number(metadata.organization_id);
        console.log("Restored org_id:", orgId);
        console.log("✅ Successfully restored timeline for:", metadata.videoName);
      } catch (err) {
        console.error("❌ Failed to restore video:", err);
      }
    };

    const lastID = localStorage.getItem("lastVideoID");
    if (lastID) restoreFromStorage(lastID);
  }, []);

  useEffect(() => {
    console.log("🔄 videoSegments updated from IndexedDB", videoSegments);
  }, [videoSegments]);

  // ============================================================
  // 🧩 Video duration handling
  // ============================================================
  useEffect(() => {
    if (hasRestoredRef.current) {
      hasRestoredRef.current = false;
      setuUpdateBar((prev) => !prev);
      return;
    } else if (videoDroppedInRef.current) {
      console.log("🆕 Resetting everything for new video:", videoDuration);
      setVideoSegments([{ id: uuidv4(), source: [0, videoDuration], isQuestionCard: false }]);
      videoLength.current = videoDuration;
      const calculatedWidth = videoLength.current * PIXELS_PER_SECOND;
      setBaseWidth(calculatedWidth);
      setInnerBarWidthPx((50 / 100) * calculatedWidth);
    }
  }, [videoDuration]);

  // ============================================================
  // 💾 Manual Save Handler
  // ============================================================
  const handleVideoSave = async (name: string, tag: string) => {
    if (!videoSrc) {
      console.error("❌ Cannot save: no videoSrc assigned.");
      return;
    }

    if (!currentUniqueID.current) {
      currentUniqueID.current = uuidv4();
      console.log("🆕 Generated video ID:", currentUniqueID.current);
    }

    const parsedTags = tag
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const metadata: VideoMetadata = {
      id: currentUniqueID.current,
      videoName: name.trim() || "Untitled Video",
      videoTags: parsedTags,
      videoLength: videoLength.current,
      questionCards: currentSegmentsRef.current,
      savedAt: new Date().toISOString(),
      videoUrl: videoSrc,
      organization_id: org_id!,
      individual: currentInvidual.current,
      associated_meeting_id: currentMeetingIdRef.current || "",
      thumbnail_url: currentThumbnailRef.current,
    };

    console.log("💾 Saving video metadata:", metadata);

    try {
      await saveVideoToIndexedDB(metadata);
      console.log("✅ Saved locally!");

      const updatedTime = await editVideo(
        Number(org_id),
        roomName!,
        metadata.id,
        metadata.questionCards,
        metadata.videoName,
        metadata.videoTags,
      );

      if (updatedTime) {
        console.log("🌐 Synced backend:", updatedTime);
        await saveVideoToIndexedDB({ ...metadata, savedAt: updatedTime });
      } else {
        console.warn("⚠️ No backend timestamp returned.");
      }
    } catch (err) {
      console.error("❌ Failed saving:", err);
    }
  };

  const handleUpdateWidth = (base: number, inner: number) => {
    setBaseWidth(base);
    setInnerBarWidthPx(inner);
  };

  // ============================================================
  // 🧱 Render
  // ============================================================
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
          currentIndividual={currentInvidual}
          currentVideoNameRef={currentVideoNameRef}
          currentMeetingIdRef={currentMeetingIdRef}
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
            <div
              style={{
                pointerEvents: "auto",
                transform: "scale(0.5)",
                transformOrigin: "center",
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
                correctAnswers={currentQuestionCard.correctAnswer}
                id={currentQuestionCard.id}
              />
            </div>
          </div>
        )}
      </div>

      <VideoBar
        updateBar={updateBar}
        baseWidth={baseWidth}
        setVideoTime={setVideoTime}
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

      {videoDuration !== 0 && (
        <SaveButton
          onSave={handleVideoSave}
          initialName={currentVideoNameRef.current}
          initialTags={currentVideoTagsRef.current}
        />
      )}
    </>
  );
};

export default VideoPlayerWithBar;
