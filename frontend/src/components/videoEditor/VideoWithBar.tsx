import React, { useState, useRef, useEffect } from "react";
import VideoBar from "./VideoBar";
import VideoDisplay from "./VideoDisplay";
import VideoQuestionCard from "./VideoCard";
import SaveButton from "./SaveForm";
import { v4 as uuidv4 } from "uuid";

import { saveVideoToIndexedDB, getVideoById } from "../../indexDB/videoStorage";
import { getVideoByIdFromBackend } from "../videoDisplayer/api/save";
import type { VideoMetadata } from "../../indexDB/videoStorage";

import type { QuestionCardData } from "../../types/QuestionCard";
import type { VideoSegmentData } from "../../types/QuestionCard";
import { editVideo } from "../videoDisplayer/api/save";
import { useParams } from "react-router-dom";

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
  const currentInvidual = useRef<boolean>(true); // tracking if its individual

  const PIXELS_PER_SECOND = 100;

  const hasRestoredRef = useRef(false);

  const currentSegmentsRef = useRef<VideoSegmentData[]>([]);
  const previousSegmentsRef = useRef<VideoSegmentData[]>([]);
  const currentMeetingIdRef = useRef<string | null>(null);

  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();
  
  useEffect(() => {
    currentSegmentsRef.current = videoSegments;
  }, [videoSegments]);

  useEffect(() => {
    currentVideoSourceRef.current = videoSrc!;
  }, [videoSrc]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = currentSegmentsRef.current;
      const previous = previousSegmentsRef.current;
      const id = currentUniqueID.current;
      const length = videoLength.current;
      const videoUrl = currentVideoSourceRef.current;
      const meetingId = currentMeetingIdRef.current; // 👈 add this ref if you track meeting ID

      // ✅ Early exits
      if (!id || !videoUrl || current.length === 0) return;

      const changed = JSON.stringify(current) !== JSON.stringify(previous);
      if (!changed) return;

      previousSegmentsRef.current = [...current]; // snapshot update

      console.log("🕒 Detected segment or metadata change, syncing video:", id);

      try {
        // ✅ Use current name and tags
        const videoName = currentVideoNameRef.current?.trim() || "Unsaved";
        const videoTags = currentVideoTagsRef.current || [];

        // 1️⃣ Save locally (always instant)
        const metadata: VideoMetadata = {
          id,
          videoName,
          videoTags,
          videoLength: length,
          questionCards: current,
          savedAt: new Date().toISOString(),
          videoUrl,
          organization_id: org_id!,
          individual: currentInvidual.current,
          associated_meeting_id: meetingId || "", // 👈 include the meeting ID
        };
        await saveVideoToIndexedDB(metadata);
        console.log("💾 Auto-saved locally with meeting ID:", meetingId);

        // 2️⃣ Sync with backend (includes tags & name)
        const updatedTime = await editVideo(Number(org_id), roomName!, id, current, videoName, videoTags);
        if (updatedTime) {
          console.log("🌐 Auto-synced with backend:", updatedTime);

          // Optional: re-save with backend timestamp
          const updatedMetadata = { ...metadata, savedAt: updatedTime };
          await saveVideoToIndexedDB(updatedMetadata);
        }
      } catch (err) {
        console.error("❌ Auto-save or backend sync failed:", err);
      }
    }, 20000); // every 20 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const restoreFromStorage = async (lastID: string) => {
      try {
        console.log("🔄 Trying to restore video with ID:", lastID);

        // 1️⃣ Try restoring from IndexedDB first
        let metadata = await getVideoById(lastID);
        console.log("📦 Retrieved from IndexedDB:", metadata);

        // 2️⃣ If not found or missing essential fields → fallback to backend
        if (
          !metadata ||
          !metadata.videoUrl ||
          metadata.questionCards.length === 0
        ) {
          console.warn("⚠️ IndexedDB incomplete — fetching from backend...");
          const backendData = await getVideoByIdFromBackend(lastID);
          if (!backendData) {
            console.error("❌ No video found in backend either.");
            return;
          }
          metadata = backendData;
          // Store it locally for future instant load
          await saveVideoToIndexedDB(metadata);
          console.log("💾 Cached backend data to IndexedDB.");
        }

        hasRestoredRef.current = true;

        // 🎥 Restore basic info
        currentVideoNameRef.current = metadata.videoName || "Unsaved";
        currentVideoTagsRef.current = metadata.videoTags || [];

        // ✅ Restore segments
        console.log("Restoring segments:", metadata.questionCards);
        videoLength.current = metadata.videoLength;
        currentUniqueID.current = metadata.id;

        // 🧠 Load video from saved backend URL
        setVideoSrc(metadata.videoUrl);

        // 📐 Recalculate bar width
        const calculatedWidth = metadata.videoLength * PIXELS_PER_SECOND;
        setBaseWidth(calculatedWidth);
        setInnerBarWidthPx((50 / 100) * calculatedWidth);

        setVideoDuration(metadata.videoLength);
        setWidthPercent(50);
        setVideoSegments(metadata.questionCards);

        // ✅ Restore org_id as int
        const orgId = Number(metadata.organization_id);
        console.log("Restored org_id:", orgId);

        console.log(
          "✅ Successfully restored timeline for:",
          metadata.videoName,
        );
      } catch (err) {
        console.error("❌ Failed to restore video:", err);
      }
    };

    const lastID = localStorage.getItem("lastVideoID");
    if (lastID) {
      restoreFromStorage(lastID);
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
    const meetingId = currentMeetingIdRef.current; // 👈 reference meeting ID

    if (!videoUrlToSave) {
      console.error("❌ No video URL to save");
      return;
    }

    // ✅ Construct full metadata
    const trimmedName = name.trim() || "Untitled Video";
    console.log("THE TRIMMED NAME IS", trimmedName);

    const parsedTags = tag
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const metadata: VideoMetadata = {
      id,
      videoName: trimmedName,
      videoTags: parsedTags,
      videoLength: length,
      questionCards,
      savedAt: new Date().toISOString(),
      videoUrl: videoUrlToSave,
      organization_id: org_id!,
      individual: currentInvidual.current,
      associated_meeting_id: meetingId || "", // ✅ include meeting link
    };

    console.log("💾 Saving video with metadata:", metadata);

    try {
      // 1️⃣ Save locally for instant feedback and offline support
      await saveVideoToIndexedDB(metadata);
      console.log("✅ Successfully saved to IndexedDB");

      // 2️⃣ Sync with backend (persistent update)
      const updatedTime = await editVideo(
        Number(org_id),
        roomName!,
        id,
        questionCards,
        trimmedName,
        parsedTags,
      );

      if (updatedTime) {
        console.log(`🌐 Synced with backend at ${updatedTime}`);

        // ✅ Update local record to reflect backend timestamp
        const updatedMetadata = { ...metadata, savedAt: updatedTime };
        await saveVideoToIndexedDB(updatedMetadata);
        console.log("🔁 Local metadata updated with backend timestamp");
      } else {
        console.warn("⚠️ Backend sync failed — keeping local copy only");
      }
    } catch (err) {
      console.error("❌ Failed to save video:", err);
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
              transform: "scale(0.5)", // ✅ scales the card to 50%
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
