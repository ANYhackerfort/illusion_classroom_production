import React, { useEffect, useState, useRef } from "react";
import type {
  VideoSegmentData,
  QuestionCardData,
} from "../../types/QuestionCard";
import { checkMeetingAccess } from "../api/meetingApi";
import VideoQuestionCard from "../../components/videoEditor/VideoCard";
import SmartVideoPlayer from "./SmartVideoPlayer";
import { useParams } from "react-router-dom";
import "./VideoSegmentRenderer.css";
import MissionControl from "./components/MeetingControl";
import LiquidGlassBotGrid from "./components/LiquidGlassBotGrid";
import NoAccessJoinGate from "./components/NoAccessJoinGate";
import { Survey } from "../../indexDB/surveyStorage";
import SurveyRenderer from "../../finder/editedVideoStorage/SurveyRenderer";
import {
  getActiveMeetingWithSegments,
  getVideoState,
  getActiveSurveyId,
  getSurveyById,
} from "../../components/videoDisplayer/api/save";
import { useMainMeetingWebSocket } from "../../api/MainSocket";
import { getMeetingState } from "../../components/videoDisplayer/api/save";
import type { GetBotAnswersResponse } from "../../components/videoDisplayer/api/save";
import { getBotAnswers } from "../../components/videoDisplayer/api/save";

export function getVideoTimeBeforeSegment(
  segments: VideoSegmentData[],
  targetSegment: VideoSegmentData,
  time: number,
): number {
  for (const seg of segments) {
    if (seg.id === targetSegment.id) break;
    if (seg.isQuestionCard) {
      const [start, end] = seg.source;
      time -= end - start;
    }
  }
  return time;
}

const VideoSegmentRenderer: React.FC = () => {
  const [segments, setSegments] = useState<VideoSegmentData[]>([]);
  const [currentQuestionCard, setCurrentQuestionCard] =
    useState<QuestionCardData | null>(null);
  const { roomName, org_id } = useParams();
  const [adminAccess, setAdminAccess] = useState<boolean | null>(null);
  const [participantAccess, setParticipantAccess] = useState<boolean>(false);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentTimeRef = useRef<number>(0);
  const segmentsRef = useRef<VideoSegmentData[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const orgIdNum = org_id ? parseInt(org_id, 10) : NaN;
  const videoStoppedRef = useRef(true);
  const isPlayingRef = useRef(false);
  const { socket } = useMainMeetingWebSocket();

  const [botAnswersData, setBotAnswersData] = useState<GetBotAnswersResponse | null>(null);

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
  // 🟢 Fetch active survey
  // ============================================================
  // ============================================================
// 🟢 Initial load: fetch active survey once
// ============================================================
  useEffect(() => {
    const fetchInitialSurvey = async () => {
      if (!org_id || !roomName) return;

      try {
        // 🟢 Step 1: Check if the meeting is ended
        const meetingState = await getMeetingState(parseInt(org_id), roomName);
        console.log("🧩 Meeting state:", meetingState);

        if (!meetingState.ended) {
          console.log("🟩 Meeting is still active — skipping survey fetch.");
          setActiveSurvey(null);
          return;
        }

        // 🟥 Meeting is ended — proceed to load active survey
        console.log("🟥 Meeting ended — fetching active survey...");
        const res = await getActiveSurveyId(parseInt(org_id), roomName);
        const activeId = res.active_survey_id;
        console.log("🟢 Initial Active Survey ID:", activeId);

        if (activeId) {
          const survey = await getSurveyById(activeId);
          console.log("📋 Loaded initial survey:", survey);
          setActiveSurvey(survey);
        } else {
          setActiveSurvey(null);
        }
      } catch (err) {
        console.error("❌ Failed to fetch initial survey:", err);
        setActiveSurvey(null);
      }
    };

    fetchInitialSurvey();
  }, []); // ✅ runs once when component mounts


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
  // 🎬 WebSocket listener for meeting start/end & sync
  // ============================================================
  useEffect(() => {
    if (!socket) return;

    const handleMessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);

        // 🟡 Meeting state changed (ended or resumed)
        if (msg.type === "meeting_state_changed" && msg.state) {
          const { ended } = msg.state;
          console.log("🛰️ [Meeting state update]: ended =", ended);

          await fetchBotAnswers();

          if (ended) {
            console.log("🟥 Meeting ended detected — fetching active survey...");
            await fetchActiveSurvey();
            return;
          } else {
            console.log("🟩 Meeting resumed — returning to video view");
            setActiveSurvey(null);
          }

          // Refresh video & segments as usual
          console.log("🔄 Refreshing active meeting data...");
          try {
            const result = await getActiveMeetingWithSegments(
              Number(org_id),
              roomName!,
            );
            if (result) {
              const { video_segments, video_url } = result;
              setSegments(video_segments);
              segmentsRef.current = video_segments;
              setVideoUrl(video_url);
            }
            const videoState = await getVideoState(Number(org_id), roomName!);
            currentTimeRef.current = videoState.current_time;
            videoStoppedRef.current = videoState.stopped;
          } catch (fetchErr) {
            console.error("❌ Failed to refresh meeting data:", fetchErr);
          }
        }

        // 🎬 Sync video time / play state
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
            if (newStopped && videoRef.current) {
              videoRef.current.pause();
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  // ============================================================
  // 🧩 Access check & initial load
  // ============================================================
  useEffect(() => {
    const verifyAccess = async () => {
      if (!roomName) return;
      try {
        const result = await checkMeetingAccess(orgIdNum, roomName);
        setAdminAccess(result.admin_access);
      } catch (err) {
        console.error("Access check failed:", err);
        setAdminAccess(false);
      }
    };
    verifyAccess();
  }, []);

  useEffect(() => {
    const restoreLastControlledVideo = async () => {
      const result = await getActiveMeetingWithSegments(
        Number(org_id),
        roomName!,
      );

      if (result) {
        const { video_segments, video_url } = result;
        setSegments(video_segments);
        segmentsRef.current = video_segments;
        setVideoUrl(video_url);
      }

      const videoState = await getVideoState(Number(org_id), roomName!);
      currentTimeRef.current = videoState.current_time;
      videoStoppedRef.current = videoState.stopped;
    };

    restoreLastControlledVideo();
  }, []);

  // ============================================================
  // ⏱️ Manual frame loop for video/question sync
  // ============================================================
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoStoppedRef.current) {
        currentTimeRef.current += 0.16;
      }

      if (!videoUrl) return;
      const now = currentTimeRef.current;
      const activeSegment = segmentsRef.current.find((seg) => {
        const [start, end] = seg.source;
        return now >= start && now < end;
      });

      if (videoRef.current) {
        const newTime = getVideoTimeBeforeSegment(
          segmentsRef.current,
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
          isPlayingRef.current = false;
        }
        setCurrentQuestionCard(activeSegment.questionCardData);
      } else {
        setCurrentQuestionCard(null);
        if (videoRef.current && !videoStoppedRef.current) {
          videoRef.current.play();
          isPlayingRef.current = true;
        }
      }
    }, 160);

    return () => clearInterval(interval);
  }, [videoUrl]);

  // ============================================================
  // 🧱 Render
  // ============================================================
  return (
    <div className="video-layout-wrapper">
      <LiquidGlassBotGrid />
      <div className="video-container">
        {adminAccess && <MissionControl />}

        {!participantAccess && !adminAccess && (
          <div className="no-access-overlay">
            <NoAccessJoinGate
              onAccessGranted={() => setParticipantAccess(true)}
              orgId={orgIdNum}
            />
          </div>
        )}

        {activeSurvey ? (
          // 📝 Show survey instead of SmartVideoPlayer
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: "100%",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "1rem",
                backgroundColor: "#f9fafb",
                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                padding: "1.5rem",
                overflow: "auto",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              <SurveyRenderer survey={activeSurvey}/>
            </div>
          </div>
        ) : (
          <>
            <SmartVideoPlayer
              hasAccess={adminAccess!}
              segments={segments}
              meetingName={roomName}
              videoRef={videoRef}
              videoUrl={videoUrl}
            />

            {currentQuestionCard &&
              (() => {
                const segmentIndex = segments.findIndex(
                  (seg) =>
                    seg.isQuestionCard &&
                    seg.questionCardData?.id === currentQuestionCard.id,
                );
                if (segmentIndex === -1) return null;
                const segment = segments[segmentIndex];
                const [start, end] = segment.source;

                return (
                  <div className="video-question-layer">
                    <VideoQuestionCard
                      id={currentQuestionCard.id}
                      question={currentQuestionCard.question}
                      answers={currentQuestionCard.answers}
                      difficulty={currentQuestionCard.difficulty}
                      type={currentQuestionCard.type}
                      displayType={currentQuestionCard.displayType}
                      showWinner={currentQuestionCard.showWinner}
                      live={currentQuestionCard.live}
                      currentTimeRef={currentTimeRef}
                      questionNumber={segmentIndex}
                      start={start}
                      end={end}
                      correctAnswers={currentQuestionCard.correctAnswer}
                      botAnswersData={botAnswersData ?? undefined}
                    />
                  </div>
                );
              })()}
          </>
        )}
      </div>
    </div>
  );
};

export default VideoSegmentRenderer;
