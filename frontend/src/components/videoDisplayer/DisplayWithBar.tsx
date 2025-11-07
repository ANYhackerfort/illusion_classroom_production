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
import {
  getActiveSurveyId,
  getSurveyById,
  stopMeetingComplete,
  startMeeting,
  getActiveMeetingWithSegments,
} from "./api/save";
import { getMeetingState, getBotAnswers } from './api/save';
import type { GetBotAnswersResponse } from "./api/save";

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
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);

  const { socket } = useMainMeetingWebSocket();
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();
  const videoStoppedRef = useRef(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [botAnswersData, setBotAnswersData] = useState<GetBotAnswersResponse | null>(null); // ✅ new state

  const fetchBotAnswers = async () => {
    if (!org_id || !roomName) return;
    try {
      console.log("🤖 Fetching bot answers...");
      const data = await getBotAnswers(parseInt(org_id), roomName);
      console.log("✅ Bot answers loaded:", data);
      setBotAnswersData(data);
    } catch (err) {
      console.error("❌ Failed to fetch bot answers:", err);
    }
  };

  useEffect(() => {
    fetchBotAnswers();
  }, [org_id, roomName]);


  // ============================================================
  // Helpers
  // ============================================================

useEffect(() => {
  console.log("[DEBUG] org_id:", org_id, "roomName:", roomName);
  if (!org_id || !roomName) {
    console.log("⚠️ Missing org_id or roomName, skipping meeting state check");
    return;
  }

  const checkMeetingState = async () => {
    console.log("🧭 Checking meeting state...");
    const result = await getMeetingState(parseInt(org_id), roomName);
    console.log("🧾 Meeting state response:", result);
    if (result.ended) {
      console.log("🟥 Meeting already ended — fetching survey...");
      await fetchActiveSurvey();
    } else {
      console.log("🟩 Meeting currently active — showing video.");
      setActiveSurvey(null);
    }
  };
  checkMeetingState();
}, [org_id, roomName]);


  const getVideoLengthFromSegments = (
    segments: { source: [number, number] }[],
  ): number => {
    if (!segments || segments.length === 0) return 0;
    return Math.max(...segments.map((seg) => seg.source[1]));
  };

  const handleUpdateWidth = (base: number, inner: number) => {
    setBaseWidth(base);
    setInnerBarWidthPx(inner);
  };

  // ============================================================
  // 🟢 Fetch active survey
  // ============================================================
  const fetchActiveSurvey = async () => {
    if (!org_id || !roomName) return;
    try {
      const res = await getActiveSurveyId(parseInt(org_id), roomName);
      const activeId = res.active_survey_id;
      console.log("🟩 Active Survey ID:", activeId);

      if (activeId) {
        const survey = await getSurveyById(activeId);
        console.log("📋 Loaded final survey:", survey);
        setActiveSurvey(survey);
      } else {
        setActiveSurvey(null);
      }
    } catch (err) {
      console.error("❌ Failed to fetch active survey:", err);
    }
  };

  // ============================================================
  // 🎬 WebSocket listener
  // ============================================================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        // 🟡 Meeting state changed
        if (msg.type === "meeting_state_changed" && msg.state) {
          const { ended } = msg.state;

          await fetchBotAnswers();

          if (ended) {
            console.log("🟥 Meeting ended detected — fetching active survey...");
            await fetchActiveSurvey();
            return;
          } else {
            // 🟩 Meeting resumed — clear survey, return to video
            console.log("🟩 Meeting resumed — returning to video view");
            setActiveSurvey(null);
          }

          // Refresh video segments as normal
          console.log("🔄 Meeting state changed — refreshing video and segments...");
          try {
            const result = await getActiveMeetingWithSegments(
              Number(org_id),
              roomName!,
            );

            if (result) {
              const { video_segments, video_url } = result;
              const storedDuration = getVideoLengthFromSegments(video_segments);
              setVideoSegments(video_segments);
              videoLength.current = storedDuration;

              const calculatedWidth = storedDuration * PIXELS_PER_SECOND;
              handleUpdateWidth(calculatedWidth, (calculatedWidth * 50) / 100);
              setVideoSrc(video_url);
              setWidthPercent(50);
            }
          } catch (fetchErr) {
            console.error("❌ Failed to refresh meeting data:", fetchErr);
          }
        }

        // 🎬 Sync video state
        else if (msg.type === "sync_update" && msg.state) {
          const newTime = msg.state.current_time;
          const newStopped = msg.state.stopped;

          if (Math.abs(newTime - currentTimeRef.current) >= 0.5) {
            console.log(
              `⚙️ Syncing time: local=${currentTimeRef.current.toFixed(
                2,
              )} → server=${newTime.toFixed(2)}`,
            );
            currentTimeRef.current = newTime;
          }

          if (videoStoppedRef.current !== newStopped) {
            console.log(`🎬 Updating stopped state → ${newStopped}`);
            videoStoppedRef.current = newStopped;
            setVideoStopped(newStopped);
          }
        }
      } catch (err) {
        console.error("❌ Failed to parse WebSocket message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  // ============================================================
  // 🟥 Stop Meeting Handler
  // ============================================================
  const handleStopMeeting = async () => {
    if (!org_id || !roomName) return;
    try {
      console.log("🟥 Stopping meeting...");
      const response = await stopMeetingComplete(parseInt(org_id), roomName);
      console.log("✅ stop_meeting_complete:", response);
      await fetchActiveSurvey();
    } catch (err) {
      console.error("❌ Failed to stop meeting:", err);
    }
  };

  // ============================================================
  // 🟩 Start Meeting Handler
  // ============================================================
  const handleStartMeeting = async () => {
    if (!org_id || !roomName) return;
    try {
      console.log("🟩 Starting meeting...");
      const response = await startMeeting(parseInt(org_id), roomName);
      console.log("✅ start_meeting:", response);
      setActiveSurvey(null); // Immediately clear survey
    } catch (err) {
      console.error("❌ Failed to start meeting:", err);
    }
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
            position: "relative",
          }}
        >
          {activeSurvey ? (
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

                {/* 🃏 Question card overlay */}
                {currentQuestionCard &&
                  (() => {
                    const segmentIndex = videoSegments.findIndex(
                      (seg) =>
                        seg.isQuestionCard &&
                        seg.questionCardData?.id === currentQuestionCard.id,
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
                          pointerEvents: "none",
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
                            questionNumber={segmentIndex}
                            start={start}
                            end={end}
                            currentTimeRef={currentTimeRef}
                            correctAnswers={currentQuestionCard.correctAnswer}
                            id={currentQuestionCard.id}
                            botAnswersData={botAnswersData ?? undefined}
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

      {/* Timeline */}
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

      {/* Stop + Start buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "1.5rem",
          marginTop: "2rem",
        }}
      >
        <StopMeetingBox
          onStopMeeting={handleStopMeeting}
          dropText="Drop Final Form Here"
          buttonText="End Meeting Now"
        />
      </div>
              <button
          style={{
            backgroundColor: "#1a73e8",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px 20px",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background-color 0.2s ease",
            height: "fit-content",
            alignSelf: "center",
          }}
          onClick={handleStartMeeting}
        >
          Start Meeting
        </button>
    </>
  );
};

export default VideoStatus;
