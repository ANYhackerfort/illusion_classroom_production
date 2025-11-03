import React, { useEffect, useState } from "react";
import "./DataPage.css";
import { useParams } from "react-router-dom";
import {
  getAllQualtricSurveyAnswers,
  getAllVideoQuestionAnswers,
} from "../../components/videoDisplayer/api/save";

interface ParticipantData {
  participant: string;
  count: number;
  answers: {
    timestamp: string;
    answers: Record<string, any>;
  }[];
}

interface VideoQuestionData {
  participant: string;
  question_id: string;
  count: number;
  answers: {
    timestamp: string;
    answers: Record<string, any>;
  }[];
}

const DataPage: React.FC = () => {
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();
  const [qualtricData, setQualtricData] = useState<ParticipantData[]>([]);
  const [videoQuestionData, setVideoQuestionData] = useState<VideoQuestionData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!org_id || !roomName) return;
      const [qualtricRes, videoRes] = await Promise.all([
        getAllQualtricSurveyAnswers(parseInt(org_id), roomName),
        getAllVideoQuestionAnswers(parseInt(org_id), roomName),
      ]);

      if (qualtricRes.ok && qualtricRes.participants) {
        setQualtricData(qualtricRes.participants);
      }
      if (videoRes.ok && videoRes.participants) {
        setVideoQuestionData(videoRes.participants);
      }
    };
    fetchData();
  }, [org_id, roomName]);

  const handleDownloadJSON = () => {
    const jsonContent = JSON.stringify(
      { qualtricData, videoQuestionData },
      null,
      2
    );
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "collected_data.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="data-page">
      <h1 className="main-title">Collected Data</h1>

      {/* ===================== EXPORT SECTION ===================== */}
      <div className="settings-row">
        <h2 className="settings-title">Export Data</h2>
        <p className="settings-description">
          Download all collected survey and video question answers as a JSON file.
        </p>
        <button className="download-btn" onClick={handleDownloadJSON}>
          Download All JSON Data
        </button>
      </div>

      {/* ===================== QUALTRICS SECTION ===================== */}
      <div className="settings-row">
        <h2 className="settings-title">Qualtrics Survey Section</h2>
        <p className="settings-description">
          Responses collected from participants in the Qualtrics survey.
        </p>

        {qualtricData.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No Qualtrics survey data available yet.</p>
        ) : (
          qualtricData.map((participant) => (
            <div key={participant.participant} className="distribution-box">
              <h3 className="question-text">
                Participant: <strong> {participant.participant} </strong>
              </h3>
              <ul className="short-answers">
                {participant.answers.map((entry, idx) => (
                  <li key={idx}>
                    <strong>{new Date(entry.timestamp).toLocaleString()}:</strong>
                    <pre style={{ marginTop: "4px", background: "#f3f4f6", padding: "0.5rem", borderRadius: "6px" }}>
                      {JSON.stringify(entry.answers, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* ===================== VIDEO QUESTION SECTION ===================== */}
      <div className="settings-row">
        <h2 className="settings-title">Video Question Section</h2>
        <p className="settings-description">
          Responses collected from participants answering in-video questions.
        </p>

        {videoQuestionData.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No video question data available yet.</p>
        ) : (
          videoQuestionData.map((entry, idx) => (
            <div key={`${entry.participant}-${entry.question_id}-${idx}`} className="distribution-box">
              <h3 className="question-text">
                Participant: <strong>{entry.participant}</strong> — Question ID:{" "}
                <strong>{entry.question_id}</strong>
              </h3>
              <ul className="short-answers">
                {entry.answers.map((ans, i) => (
                  <li key={i}>
                    <strong>{new Date(ans.timestamp).toLocaleString()}:</strong>
                    <pre
                      style={{
                        marginTop: "4px",
                        background: "#f3f4f6",
                        padding: "0.5rem",
                        borderRadius: "6px",
                      }}
                    >
                      {JSON.stringify(ans.answers, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DataPage;
