import React, { useEffect, useRef, useState } from "react";
import { useMouse } from "../../../hooks/drag/MouseContext";
import "./StopMeetingBox.css";
import {
  updateFinalState,
  getActiveSurveyId,
  getSurveyById,
} from "../api/save";
import { useParams } from "react-router-dom";
import { useMainMeetingWebSocket } from "../../../api/MainSocket";

interface SurveyItem {
  id: string;
  type: string;
  question?: string;
  content?: string;
  url?: string;
  options?: string[];
}

interface StopMeetingBoxProps {
  onStopMeeting: () => void;
  dropText?: string;
  buttonText?: string;
}

const StopMeetingBox: React.FC<StopMeetingBoxProps> = ({
  onStopMeeting,
  dropText = "Drop Final Form Here",
  buttonText = "STOP Meeting",
}) => {
  const { draggedItem } = useMouse();
  const { socket } = useMainMeetingWebSocket(); // 👈 use it here directly
  const [isHovered, setIsHovered] = useState(false);
  const [droppedSurvey, setDroppedSurvey] = useState<SurveyItem[] | null>(null);
  const [surveyId, setSurveyId] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  const { org_id, roomName } = useParams<{
    org_id: string;
    roomName: string;
  }>();

  // ============================================================
  // 🟢 Fetch current active survey (mount + socket refresh)
  // ============================================================
  const fetchActiveSurvey = async () => {
    if (!org_id || !roomName) return;
    try {
      const res = await getActiveSurveyId(parseInt(org_id), roomName);
      const activeId = res.active_survey_id;
      console.log("🟩 Active Survey ID:", activeId);

      if (activeId) {
        const survey = await getSurveyById(activeId);
        console.log("📋 Loaded survey:", survey);
        setDroppedSurvey(survey.items || []);
        setSurveyId(String(survey.id));
      } else {
        setDroppedSurvey(null);
        setSurveyId(null);
      }
    } catch (err) {
      console.error("❌ Failed to fetch active survey:", err);
    }
  };

  // Run once on mount
  useEffect(() => {
    fetchActiveSurvey();
  }, []); // 👈 no dependencies

  // ============================================================
  // 🧩 Handle survey drop
  // ============================================================
  useEffect(() => {
    const handleMouseUp = async (e: MouseEvent) => {
      const isOverBox = boxRef.current?.contains(e.target as Node);

      if (draggedItem?.type === "survey" && isOverBox) {
        setDroppedSurvey(draggedItem.data.items);
        setSurveyId(draggedItem.data.id);

        if (org_id && roomName && draggedItem.data.id) {
          try {
            const response = await updateFinalState(parseInt(org_id), roomName, {
              survey_id: draggedItem.data.id,
            });
            console.log("✅ [update_final_state] Success:", response);
          } catch (error) {
            console.error("❌ [update_final_state] Error:", error);
          }
        }
      }

      setIsHovered(false);
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [draggedItem, org_id, roomName]);

  // ============================================================
  // 🟡 Listen to meeting_state_changed events
  // ============================================================
  useEffect(() => {
    if (!socket) return;

    const handleSocketMessage = async (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "meeting_state_changed") {
          console.log("🔄 Meeting state changed — refreshing active survey...");
          await fetchActiveSurvey();
        }
      } catch (err) {
        console.error("❌ Failed to handle WebSocket message:", err);
      }
    };

    socket.addEventListener("message", handleSocketMessage);
    return () => socket.removeEventListener("message", handleSocketMessage);
  }, [socket]);

  // ============================================================
  // 🧱 Render
  // ============================================================
  return (
    <div className="stop-meeting-wrapper">
      <div
        ref={boxRef}
        className={`drop-box ${isHovered ? "active" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!droppedSurvey ? (
          <div>{dropText}</div>
        ) : (
          <div className="light-summary">
            <div className="summary-title">Survey Preview</div>
            <ul>
              {droppedSurvey.slice(0, 5).map((item, idx) => (
                <li key={idx}>
                  {item.type === "description" && <em>{item.content}</em>}
                  {item.type === "slider" && <>{item.question}</>}
                  {item.type === "mcq" && <>{item.question}</>}
                  {item.type === "qualtrics" && <>{item.url}</>}
                </li>
              ))}
              {droppedSurvey.length > 5 && <li>…and more</li>}
            </ul>
          </div>
        )}
      </div>

      <button
        className="stop-button"
        onClick={() => {
          if (surveyId) onStopMeeting();
        }}
        disabled={!surveyId}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default StopMeetingBox;
