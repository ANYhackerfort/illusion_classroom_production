import React, { useEffect, useState, useRef } from "react";
import type {
  VideoSegmentData,
  QuestionCardData,
} from "../../types/QuestionCard";
import {
  fetchVideoSegments,
  checkMeetingAccess,
  getCurrentlyPlayingUrl,
} from "../api/meetingApi";
import VideoQuestionCard from "../../components/videoEditor/VideoCard";
import SmartVideoPlayer from "./SmartVideoPlayer";
import { useParams } from "react-router-dom";
import "./VideoSegmentRenderer.css";
import MissionControl from "./components/MeetingControl";
import LiquidGlassBotGrid from "./components/LiquidGlassBotGrid";
import { safeRoomName } from "../../types/videoSync/VideoSocketContext";
import NoAccessJoinGate from "./components/NoAccessJoinGate";
import { Survey } from "../../finder/editedVideoStorage/SurveyDropZone";
// import getAllSurveys, { saveSurvey } from "../../indexDB/surveyStorage";
import { getAllSurveys, saveSurvey } from "../../indexDB/surveyStorage";
// import { getAllSurveys } from "../../indexDB/surveyStorage";
import { getSurveyFromBackend } from "../../components/videoDisplayer/api/save";
import SurveyRenderer from "../../finder/editedVideoStorage/SurveyRenderer";

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
  const { roomName } = useParams();
  const [adminAccess, setAdminAccess] = useState<boolean | null>(null);
  const [participantAccess, setParticipantAccess] = useState<boolean | null>(
    null,
  );

  const videoRef = useRef<HTMLVideoElement>(
    null,
  ) as React.RefObject<HTMLVideoElement>;
  const currentTimeRef = useRef<number>(0);
  const segmentsRef = useRef<VideoSegmentData[]>([]);
  const currentSegmentRef = useRef<VideoSegmentData | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [endingID, setEndingID] = useState<string | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  

  // ✅ Reset state when roomName changes
  useEffect(() => {
    setSegments([]);
    setCurrentQuestionCard(null);
    setAdminAccess(null);
    setParticipantAccess(null);
    setVideoUrl(null);
    currentTimeRef.current = 0;
    segmentsRef.current = [];
    currentSegmentRef.current = null;
  }, [roomName]);

  // ✅ Access check
  useEffect(() => {
    const verifyAccess = async () => {
      if (!roomName) return;
      try {
        const cachedEmail = localStorage.getItem("currentUserEmail");
        const result = await checkMeetingAccess(
          encodeURIComponent(roomName),
          cachedEmail! ?? undefined,
        );

        setAdminAccess(result.admin_access);
        setParticipantAccess(result.participant_access);
      } catch (err) {
        console.error("Access check failed:", err);
        setAdminAccess(false);
        setParticipantAccess(false);
      }
    };
    verifyAccess();
  }, [roomName]);

  const loadSegments = async () => {
    try {
      if (!roomName) return;
      const data = await fetchVideoSegments(roomName);
      console.log("📁 Loaded segments:", data);
      setSegments(data);
    } catch (err) {
      console.error("Failed to load segments:", err);
    }
  };

  const loadVideo = async () => {
    try {
      if (!roomName) return;
      const result = await getCurrentlyPlayingUrl(roomName);
      console.log("🎥 Fetched video URL:", result.currently_playing);
      setVideoUrl(result.currently_playing ?? null);
    } catch (err) {
      console.error("❌ Failed to fetch buffered video:", err);
      setVideoUrl(null);
    }
  };

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    loadSegments();
    loadVideo();
  }, []);

    useEffect(() => {
    const fetchSurvey = async () => {
      console.log("WASSSUP")
      if (!endingID) {
        setActiveSurvey(null);
        return;
      }
      // Try local first
      const surveys = await getAllSurveys();
      const existing = surveys.find((s) => s.id === endingID);
  
      if (existing) {
        console.log("🧠 Found survey in IndexedDB");
        setActiveSurvey(existing);
      } else {
        try {
          console.log("🌐 Fetching survey from backend");
          const fetched = await getSurveyFromBackend(roomName!, endingID);
          setActiveSurvey(fetched);
          await saveSurvey(fetched);
        } catch (err) {
          console.error("⚠️ Failed to fetch survey:", err);
          setActiveSurvey(null);
        }
      }
    };
  
    fetchSurvey();
  }, [endingID]);

  useEffect(() => {
    if (!roomName) return;

    const safeName = safeRoomName(roomName);
    console.log("🏠 Room name:", roomName);

    const url = `ws://localhost:8001/ws/meeting/${safeName}/`;
    console.log("🌐 Connecting to WebSocket at:", url);
    const ws = new WebSocket(url);

    socketRef.current = ws;
    currentTimeRef.current = 0;

    ws.onopen = () => console.log("✅ WebSocket connected");

    ws.onmessage = async (event) => {
      try {
        const msg = JSON.parse(event.data);

        // if (msg.type === "meeting_started" && msg.started === true) {
        //   console.log("🚀 Meeting started, loading content...");
        //   await Promise.all([loadSegments(), loadVideo()]);
        //   return;
        // }

        if (segmentsRef.current.length === 0) return;

        if (msg.type === "sync_update" && msg.state) {
          const stopped = msg.state.stopped;
          const currentTime = msg.state.current_time;
          currentTimeRef.current = currentTime;
          console.log("Received sync_update:", currentTime, stopped);
          const endingId = msg.state.ending_id;

          if (endingId && currentTime === 0) {
            setEndingID(endingId);
          } else {
            setEndingID(null);
          }

          const segment = segmentsRef.current.find(
            (seg) =>
              currentTime >= seg.source[0] && currentTime < seg.source[1],
          );
          if (!segment) return;


          if (stopped) {
            videoRef.current?.pause();

            if (segment.isQuestionCard && segment.questionCardData) {
              setCurrentQuestionCard(segment.questionCardData);
            } else {
              setCurrentQuestionCard(null);
            }
            
          } else {
            if (videoRef.current) {
              const newTime = getVideoTimeBeforeSegment(
                    segmentsRef.current,
                    segment,
                    currentTime,
                  );
              if ((Math.abs(videoRef.current.currentTime - newTime) > 0.3) && 
                  segment && !segment.isQuestionCard ) {
                videoRef.current.currentTime = newTime;
              }
            }

            if (segment.isQuestionCard && segment.questionCardData) {
              setCurrentQuestionCard(segment.questionCardData);
              if (videoRef.current) {
                videoRef.current.pause();
              }
            } else {
              setCurrentQuestionCard(null);
              if (videoRef.current && videoRef.current.paused) {
                videoRef.current
                  .play()
                  .catch((err) => console.warn("⚠️ Video play failed:", err));
              }
            }
          }
        }
      } catch (err) {
        console.error("❌ Invalid WS message:", event.data, err);
      }
    };

    ws.onerror = (err) => console.error("❌ WebSocket error:", err);

    ws.onclose = (event) =>
      console.log("🔌 WebSocket closed:", event.code, event.reason);

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      ws.close();
      socketRef.current = null;
    };
  }, [roomName]);

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const noAccess =
    adminAccess === false && participantAccess === false && roomName;

  return (
    <div className="video-layout-wrapper">
      <LiquidGlassBotGrid meetingName={roomName!} />
      <div className="video-container">
        {adminAccess && <MissionControl />}

        {noAccess && (
          <div className="no-access-overlay">
            <NoAccessJoinGate
              onAccessGranted={() => setParticipantAccess(true)}
            />
          </div>
        )}

{activeSurvey ? (
  // 📝 Show survey instead of SmartVideoPlayer
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",   // ⬅️ centers vertically
      width: "100%",
      height: "100%",         // ⬅️ let parent container height control this
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
        overflow: "auto",      // ⬅️ scrolling inside the box
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start", // ⬅️ survey starts at top, scrolls down
      }}
    >
      <SurveyRenderer survey={activeSurvey} />
    </div>
  </div>
) : (
  // 🎥 fallback...

  // 🎥 fallback...

          // 🎥 Fallback: show SmartVideoPlayer + QuestionCards
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
                    seg.questionCardData?.id === currentQuestionCard.id
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
                      meetingName={roomName!}
                      questionNumber={segmentIndex}   // ✅ pass index
                      start={start}                   // ✅ pass start time
                      end={end}                       // ✅ pass end time
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
