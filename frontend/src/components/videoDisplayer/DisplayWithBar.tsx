import React, { useState, useRef, useEffect } from "react";
import DisplayBar from "./DisplayBar";
import VideoQuestionCard from "../videoEditor/VideoCard";
import Display from "./VideoDisplay";
import StopMeetingBox from "./components/StopMeetingBox";
import SurveyRenderer from "../../finder/editedVideoStorage/SurveyRenderer";
import { Survey } from "../../indexDB/surveyStorage";
import type {
  QuestionCardData,
  VideoSegmentData,
} from "../../types/QuestionCard";
import { useParams } from "react-router-dom";
import { useMainMeetingWebSocket } from "../../api/MainSocket";
import { getActiveMeetingWithSegments } from "./api/save";

export const PIXELS_PER_SECOND = 100;

const VideoStatus: React.FC = () => {
  const [videoTime, setVideoTime] = useState(0);
  const [videoStopped, setVideoStopped] = useState(true);
  const videoLength = useRef(0);
  const [videoSegments, setVideoSegments] = useState<VideoSegmentData[]>([]);
  const [currentQuestionCard, setCurrentQuestionCard] =
    useState<QuestionCardData | null>(null);
  const currentTimeRef = useRef<number>(0);
  const [baseWidth, setBaseWidth] = useState(0);
  const [innerBarWidthPx, setInnerBarWidthPx] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [widthPercent, setWidthPercent] = useState(50);

  const { socket } = useMainMeetingWebSocket();

  // const [endingID, setEndingID] = useState<string | null>(null);
  const [activeSurvey] = useState<Survey | null>(null); //TODO: set active survey

  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  const videoStoppedRef = useRef(true); // The entirety of video with question cards
  const videoRef = useRef<HTMLVideoElement>(null);

  const getVideoLengthFromSegments = (
    segments: { source: [number, number] }[],
  ): number => {
    if (!segments || segments.length === 0) return 0;
    return Math.max(...segments.map((seg) => seg.source[1]));
  };

  useEffect(() => {
    console.log(socket);
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      console.log("HANDLE MESSAGE CALLED");
      try {
        const msg = JSON.parse(event.data);
        console.log("__________________________");
        console.log("GOT MESSAGE", msg);

        // 🎬 1️⃣ Sync video time and stop/play state updates
        if (msg.type === "sync_update" && msg.state) {
          const newTime = msg.state.current_time;
          const newStopped = msg.state.stopped;

          // If time is off by ≥ 1 second, resync
          if (Math.abs(newTime - currentTimeRef.current) >= 0.5) {
            console.log(
              `⚙️ Syncing time: local=${currentTimeRef.current.toFixed(2)} → server=${newTime.toFixed(2)}`,
            );
            currentTimeRef.current = newTime;
          }

          // Update stopped state if changed
          if (videoStoppedRef.current !== newStopped) {
            console.log(`🎬 Updating stopped state → ${newStopped}`);
            videoStoppedRef.current = newStopped;
            setVideoStopped(newStopped);
          }
        }

        // 🟡 2️⃣ Handle meeting state change broadcast
        else if (msg.type === "meeting_state_changed") {
          console.log(
            "🔄 Meeting state changed — fetching new video + segments...",
          );
          try {
            const result = await getActiveMeetingWithSegments(
              Number(org_id),
              roomName!,
            );

            if (result) {
              const { video_segments, video_url } = result;

              // Compute video length based on segments
              const storedSegments = video_segments;
              const storedDuration = getVideoLengthFromSegments(video_segments);

              console.log("🎥 New Video URL:", video_url);
              console.log("🧩 Segments:", storedSegments);
              console.log("⏱️ Computed Duration:", storedDuration);

              // Update state and refs
              setVideoSegments(storedSegments);
              videoLength.current = storedDuration;

              // Adjust rendered width based on duration
              const calculatedWidth = storedDuration * PIXELS_PER_SECOND;
              handleUpdateWidth(calculatedWidth, (calculatedWidth * 50) / 100);

              setVideoSrc(video_url);
              setWidthPercent(50);
            } else {
              console.warn("⚠️ No active meeting data returned.");
            }
          } catch (fetchErr) {
            console.error("❌ Failed to refresh meeting data:", fetchErr);
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

  // useEffect(() => {
  //   if (hasRestoredRef.current) {
  //     console.log("loading saved");
  //     hasRestoredRef.current = false;
  //     return;
  //   }
  // }, [videoDuration]);

  const handleUpdateWidth = (base: number, inner: number) => {
    setBaseWidth(base);
    setInnerBarWidthPx(inner);
  };

  const handleStopMeeting = (id: string) => {
    console.log("Stopping meeting with ID:", id);
    // TODO: CAll function to stop meeting here, django view
  };

return (
  <>
    <div
      style={{
        position: "relative",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        gap: "2rem",
      }}
    >
      {/* Left side: Video OR Survey */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          position: "relative", // ✅ crucial for absolute positioning of overlay
        }}
      >
        {activeSurvey ? (
          // 📝 Show survey instead of video
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <SurveyRenderer survey={activeSurvey} />
          </div>
        ) : (
          <>
            {/* 🎥 Video Display area */}
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <Display
                editedLength={videoLength}
                videoTime={videoTime}
                setVideoStopped={setVideoStopped}
                videoStopped={videoStopped}
                metaData={videoSegments}
                currentQuestionCard={currentQuestionCard}
                setCurrentQuestionCard={setCurrentQuestionCard}
                currentTimeRef={currentTimeRef}
                videoSrc={videoSrc}
                setVideoSrc={setVideoSrc}
                setVideoSegments={setVideoSegments}
                updateWidths={handleUpdateWidth}
                setWidthPercent={setWidthPercent}
                videoStoppedRef={videoStoppedRef}
                videoRef={videoRef}
              />

              {/* 🃏 Question card overlay (now inside Display) */}
              {currentQuestionCard &&
                (() => {
                  const segmentIndex = videoSegments.findIndex(
                    (seg) =>
                      seg.isQuestionCard &&
                      seg.questionCardData?.id === currentQuestionCard.id
                  );
                  if (segmentIndex === -1) return null;
                  const segment = videoSegments[segmentIndex];
                  const [start, end] = segment.source;

                  return (
                    <div
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        pointerEvents: "none", // so video controls still work
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
                          questionNumber={segmentIndex}
                          start={start}
                          end={end}
                          currentTimeRef={currentTimeRef}
                        />
                      </div>
                    </div>
                  );
                })()}
            </div>
          </>
        )}
      </div>
    </div>

    {/* Timeline bar */}
    <DisplayBar
      baseWidth={baseWidth}
      setVideoTime={setVideoTime}
      videoLength={videoLength}
      videoSegments={videoSegments}
      currentTimeRef={currentTimeRef}
      innerBarWidthPx={innerBarWidthPx}
      setInnerBarWidthPx={setInnerBarWidthPx}
      widthPercent={widthPercent}
      setWidthPercent={setWidthPercent}
      videoRef={videoRef}
      videoStoppedRef={videoStoppedRef}
    />

    {/* ✅ StopMeetingBox now sits at the bottom */}
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "2rem",
      }}
    >
      <StopMeetingBox
        onStopMeeting={handleStopMeeting}
        dropText="Drop Final Form Here"
        buttonText="End Meeting Now"
      />
    </div>
  </>
);

};

export default VideoStatus;
