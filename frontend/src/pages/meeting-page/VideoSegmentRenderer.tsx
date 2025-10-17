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
import { Survey } from "../../indexDB/surveyStorage"; // import getAllSurveys, { saveSurvey } from "../../indexDB/surveyStorage";
// import { getAllSurveys, saveSurvey } from "../../indexDB/surveyStorage";
// import { getAllSurveys } from "../../indexDB/surveyStorage";
import SurveyRenderer from "../../finder/editedVideoStorage/SurveyRenderer";
import {
  getActiveMeetingWithSegments,
  getVideoState,
} from "../../components/videoDisplayer/api/save";
import { useMainMeetingWebSocket } from "../../api/MainSocket";

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
  const [participantAccess, setParticipantAccess] = useState<boolean | null>(
    null,
  );
  const [noAccess, setNoAccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(
    null,
  ) as React.RefObject<HTMLVideoElement>;
  const currentTimeRef = useRef<number>(0);
  const segmentsRef = useRef<VideoSegmentData[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // const [endingID, setEndingID] = useState<string | null>(null);
  const [activeSurvey] = useState<Survey | null>(null);

  const orgIdNum = org_id ? parseInt(org_id, 10) : NaN;
  const videoStoppedRef = useRef(true);
  const isPlayingRef = useRef(false);

  const { socket } = useMainMeetingWebSocket();
  
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
              
              // setVideoStopped(newStopped);
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
                const storedSegments = video_segments;
  
                console.log("🎥 New Video URL:", video_url);
                console.log("🧩 Segments:", storedSegments);
  
                // Update state and refs
                setSegments(storedSegments);
                segmentsRef.current = storedSegments;
                setVideoUrl(video_url);
              } else {
                console.warn("⚠️ No active meeting data returned.");
              }

              const videoState = await getVideoState(Number(org_id), roomName!);
              currentTimeRef.current = videoState.current_time;
              videoStoppedRef.current = videoState.stopped;
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
  

  // ✅ Access check
  useEffect(() => {
    const verifyAccess = async () => {
      if (!roomName) return;
      try {
        const cachedEmail = localStorage.getItem("currentUserEmail");
        const result = await checkMeetingAccess(
          orgIdNum,
          roomName,
          cachedEmail ?? undefined,
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
  }, []);

  useEffect(() => {
    // Update whenever adminAccess, participantAccess, or roomName changes
    setNoAccess(
      adminAccess === false && participantAccess === false && !!roomName,
    );
  }, [adminAccess, participantAccess, roomName]);

  // setSegemnts, setVideoUrl
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

        console.log("🎥 Video URL:", video_url);
        console.log("🧩 Segments:", storedSegments);

        setSegments(storedSegments);
        segmentsRef.current = storedSegments;
        setVideoUrl(video_url);
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

      if (!videoUrl) return;
      if (videoStoppedRef.current) {
        const now = currentTimeRef.current;
        // 🎯 Find active segment using latest metaData
        const activeSegment = segmentsRef.current.find((seg) => {
          const [start, end] = seg.source;
          return now >= start && now < end;
        });

        if (videoRef.current) {
          videoRef.current.currentTime = getVideoTimeBeforeSegment(
            segmentsRef.current,
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

          if (videoRef.current && !isPlayingRef.current) {
            videoRef.current.play();
            isPlayingRef.current = true;
          }
        }
      }
    }, 160);

    return () => clearInterval(interval);
  }, [videoUrl]);

  return (
    <div className="video-layout-wrapper">
      <LiquidGlassBotGrid />
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
              alignItems: "center", // ⬅️ centers vertically
              width: "100%",
              height: "100%", // ⬅️ let parent container height control this
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
                overflow: "auto", // ⬅️ scrolling inside the box
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
                      questionNumber={segmentIndex} // ✅ pass index
                      start={start} // ✅ pass start time
                      end={end} // ✅ pass end time
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
