import React, { useState, useRef, useEffect } from "react";
import DisplayBar from "./DisplayBar";
import VideoQuestionCard from "../videoEditor/VideoCard";
import Display from "./VideoDisplay";
import StopMeetingBox from "./components/StopMeetingBox";
import SurveyRenderer from "../../finder/editedVideoStorage/SurveyRenderer";
import { Survey } from "../../finder/editedVideoStorage/SurveyDropZone";

import type { QuestionCardData, VideoSegmentData } from "../../types/QuestionCard";
import { safeRoomName, useVideoSocketContext } from "../../types/videoSync/VideoSocketContext";

import { getAllSurveys, saveSurvey } from "../../indexDB/surveyStorage";
import { getSurveyFromBackend } from './api/save';

import { useParams } from "react-router-dom";

const VideoStatus: React.FC = () => {
  const [videoTime, setVideoTime] = useState(0);
  const [videoStopped, setVideoStopped] = useState(true);
  const [videoDuration] = useState(0);
  const videoLength = useRef(0);
  const [videoSegments, setVideoSegments] = useState<VideoSegmentData[]>([]);
  const [currentQuestionCard, setCurrentQuestionCard] = useState<QuestionCardData | null>(null);
  const currentTimeRef = useRef<number>(0);
  const [baseWidth, setBaseWidth] = useState(0);
  const [innerBarWidthPx, setInnerBarWidthPx] = useState(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [widthPercent, setWidthPercent] = useState(50);

  const currentUniqueID = useRef<string>("");
  const hasRestoredRef = useRef(false);
  const { socket, updateVideoState } = useVideoSocketContext();

  const [endingID, setEndingID] = useState<string | null>(null);
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);

  const { roomName } = useParams();

  const videoStoppedRef = useRef(true); // The entirety of video with question cards
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "sync_update" && msg.state) {
          const endingId = msg.state.ending_id;
          const time = msg.state.current_time;
          if (endingId && time === 0) {
            setEndingID(endingId);
          } else {
            setEndingID(null);
          }
          currentTimeRef.current = time;
          setVideoStopped(msg.state.stopped);
          videoStoppedRef.current = msg.state.stopped;

          console.log("Received sync_update:", msg.state.current_time, msg.state.stopped, msg.state.ending_id);
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };


    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener("message", handleMessage);
    };
  }, [socket]);

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
    if (hasRestoredRef.current) {
      console.log("loading saved");
      hasRestoredRef.current = false;
      return;
    }
  }, [videoDuration]);

  const handleUpdateWidth = (base: number, inner: number) => {
    setBaseWidth(base);
    setInnerBarWidthPx(inner);
    console.log("CALLED");
  };

  const handleStopMeeting = (id: string) => {
    console.log("Stopping meeting with ID:", id);
    updateVideoState({
      stopped: true,
      speed: 1,
      ending_id: id,
      current_time: 0,
    });
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
            position: "relative",
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
            // 🎥 Show video if no active survey
            <>
              <Display
                editedLength={videoLength}
                videoTime={videoTime}
                setVideoStopped={setVideoStopped}
                videoStopped={videoStopped}
                metaData={videoSegments}
                currentQuestionCard={currentQuestionCard}
                setCurrentQuestionCard={setCurrentQuestionCard}
                currentTimeRef={currentTimeRef}
                currentUniqueID={currentUniqueID}
                videoSrc={videoSrc}
                setVideoSrc={setVideoSrc}
                setVideoSegments={setVideoSegments}
                updateWidths={handleUpdateWidth}
                setWidthPercent={setWidthPercent}
                videoStoppedRef={videoStoppedRef}
                videoRef={videoRef}
              />

              {/* Question card overlay (only when video is showing) */}
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
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        pointerEvents: "auto",
                        zIndex: 10,
                        width: "100%",
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
                  );
                })()}
            </>
          )}
        </div>

        {/* Right side: StopMeetingBoxes */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2rem",
            alignItems: "center",
            paddingRight: "2rem",
          }}
        >
          <StopMeetingBox
            onStopMeeting={handleStopMeeting}
            dropText="Drop Final Form Here"
            buttonText="End Meeting Now"
          />

          <StopMeetingBox
            onStopMeeting={handleStopMeeting}
            dropText="Drop Intervention Here"
            buttonText="Stop Meeting Now"
          />
        </div>
      </div>

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
    </>
  );

};

export default VideoStatus;
