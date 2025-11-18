import React, { useEffect, useState } from "react";
import "./DataPage.css";
import { useParams } from "react-router-dom";
import {
  getAllQualtricSurveyAnswers,
  getAllVideoQuestionAnswers,
} from "../../components/videoDisplayer/api/save";
import { getQuestionCardMetaById } from "../../indexDB/questionStorage";

// Qualtrics interface
interface ParticipantData {
  participant: string;
  count: number;
  answers: {
    timestamp: string;
    answers: Record<string, any>;
  }[];
}

// Video Question interface
interface VideoQuestionData {
  participant_id: string;
  participant_name: string;
  question_id: string;
  count: number;
  answers: {
    timestamp: string;
    answers: Record<string, any>;
  }[];
}

// Combined participant type
interface UnifiedParticipantEntry {
  id: string;
  name: string;
  qualtrics?: ParticipantData;
  videos?: VideoQuestionData[];
}

const DataPage: React.FC = () => {
  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  const [qualtricData, setQualtricData] = useState<ParticipantData[]>([]);
  const [videoQuestionData, setVideoQuestionData] = useState<VideoQuestionData[]>([]);

  const [friendlyMode, setFriendlyMode] = useState(false);
  const [csvMode, setCsvMode] = useState(false);
  const [selectedParticipant, setSelectedParticipant] =
    useState<UnifiedParticipantEntry | null>(null);

  // NEW — metadata cache
  const [questionMeta, setQuestionMeta] = useState<Record<string, any>>({});

  // CSV Downloader
  const handleDownloadCSV = async () => {
    const rows: string[] = [];

    rows.push([
      "participant_name",
      "participant_id",
      "question_string",
      "show_right_answer",
      "display_type",
      "correct_answer",
      "user_answer",
      "timestamp",
    ].join(","));

    for (const entry of videoQuestionData) {
      for (const ans of entry.answers) {
        const meta = await getQuestionCardMetaById(entry.question_id);

        const questionString = meta?.question ?? "";
        const showWinner = meta?.showWinner ?? "";
        const displayType = meta?.displayType ?? "";
        const correctAnswer = Array.isArray(meta?.correctAnswer)
          ? meta.correctAnswer.join("|")
          : meta?.correctAnswer ?? "";

        const userAnswer = Array.isArray(ans.answers.answers)
          ? ans.answers.answers.join("|")
          : ans.answers.answers ?? "";

        const timestamp = new Date(ans.timestamp).toISOString();

        rows.push([
          `"${entry.participant_name}"`,
          `"${entry.participant_id}"`,
          `"${questionString}"`,
          `"${showWinner}"`,
          `"${displayType}"`,
          `"${correctAnswer}"`,
          `"${userAnswer}"`,
          `"${timestamp}"`,
        ].join(","));
      }
    }

    const csv = rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "video_question_responses.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const buildUnifiedData = (): UnifiedParticipantEntry[] => {
    const map = new Map<string, UnifiedParticipantEntry>();

    for (const q of qualtricData) {
      map.set(q.participant, {
        id: q.participant,
        name: q.participant,
        qualtrics: q,
        videos: [],
      });
    }

    for (const v of videoQuestionData) {
      if (!map.has(v.participant_id)) {
        map.set(v.participant_id, {
          id: v.participant_id,
          name: v.participant_name,
          videos: [],
        });
      }
      map.get(v.participant_id)!.videos!.push(v);
    }

    return Array.from(map.values());
  };

  const unifiedParticipants = buildUnifiedData();

  useEffect(() => {
    const fetchData = async () => {
      if (!org_id || !roomName) return;

      const [qualtricRes, videoRes] = await Promise.all([
        getAllQualtricSurveyAnswers(parseInt(org_id), roomName),
        getAllVideoQuestionAnswers(parseInt(org_id), roomName),
      ]);

      if (qualtricRes.ok && qualtricRes.participants)
        setQualtricData(qualtricRes.participants);

      if (videoRes.ok && videoRes.participants)
        setVideoQuestionData(videoRes.participants);
    };

    fetchData();
  }, [org_id, roomName]);

  useEffect(() => {
    const loadMeta = async () => {
      const metaCache: Record<string, any> = {};

      for (const v of videoQuestionData) {
        if (!metaCache[v.question_id]) {
          metaCache[v.question_id] = await getQuestionCardMetaById(v.question_id);
        }
      }
      setQuestionMeta(metaCache);
    };

    if (videoQuestionData.length > 0) loadMeta();
  }, [videoQuestionData]);

  const handleDownloadJSON = () => {
    const json = JSON.stringify(
      { qualtricData, videoQuestionData },
      null,
      2
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "collected_data.json";
    link.click();

    URL.revokeObjectURL(url);
  };

  // CSV TABLE MODE — clean spreadsheet view
  const renderCSVTable = () => {
    const rows: {
      name: string;
      id: string;
      question: string;
      type: string;
      correct: string;
      answer: string;
      timestamp: string;
    }[] = [];

    for (const v of videoQuestionData) {
      const meta = questionMeta[v.question_id];

      for (const ans of v.answers) {
        rows.push({
          name: v.participant_name,
          id: v.participant_id,
          question: meta?.question ?? `Question ${v.question_id}`,
          type: meta?.displayType ?? "",
          correct: meta?.correctAnswer
            ? Array.isArray(meta.correctAnswer)
              ? meta.correctAnswer.join(", ")
              : meta.correctAnswer
            : "",
          answer: Array.isArray(ans.answers.answers)
            ? ans.answers.answers.join(", ")
            : ans.answers.answers,
          timestamp: new Date(ans.timestamp).toLocaleString(),
        });
      }
    }

    return (
      <div className="csv-table-wrapper">
        <table className="csv-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Participant ID</th>
              <th>Question</th>
              <th>Type</th>
              <th>Correct</th>
              <th>Answer</th>
              <th>Timestamp</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td>{r.id}</td>
                <td>{r.question}</td>
                <td>{r.type}</td>
                <td>{r.correct}</td>
                <td>{r.answer}</td>
                <td>{r.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Friendly UI view
  const renderFriendlyUI = () => (
    <div className="friendly-ui-wrapper">
      <div className="participant-list">
        <h2 className="section-header">Participants</h2>

        {unifiedParticipants.length === 0 ? (
          <p className="empty">No participants yet.</p>
        ) : (
          unifiedParticipants.map((p) => (
            <div
              key={p.id}
              className={`participant-item ${
                selectedParticipant?.id === p.id ? "active" : ""
              }`}
              onClick={() => setSelectedParticipant(p)}
            >
              <strong>{p.name}</strong>
              <div className="small-text">ID: {p.id}</div>
            </div>
          ))
        )}
      </div>

      <div className="participant-details">
        {!selectedParticipant ? (
          <p className="empty">Select a participant to view their results.</p>
        ) : (
          <>
            <h2 className="section-header">Results for {selectedParticipant.name}</h2>

            {selectedParticipant.qualtrics ? (
              <div className="data-block">
                <h3>Qualtrics Responses</h3>
                {selectedParticipant.qualtrics.answers.map((a, idx) => (
                  <div key={idx} className="response-card">
                    <div className="timestamp">
                      {new Date(a.timestamp).toLocaleString()}
                    </div>
                    <div className="response-text">
                      {JSON.stringify(a.answers, null, 2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">No Qualtrics responses.</p>
            )}

            {selectedParticipant.videos && selectedParticipant.videos.length > 0 ? (
              <div className="data-block">
                <h3>Video Question Responses</h3>

                {selectedParticipant.videos.map((v, idx) => {
                  const meta = questionMeta[v.question_id];

                  return (
                    <div key={idx} className="question-meta-card">
                      <div className="qm-header">
                        <h3 className="qm-question">
                          {meta?.question ?? `Question ${v.question_id}`}
                        </h3>

                        <div className="qm-meta">
                          <span className="badge">Type: {meta?.displayType}</span>
                          {meta?.correctAnswer && (
                            <span className="badge green">
                              Correct: {meta.correctAnswer}
                            </span>
                          )}
                        </div>
                      </div>

                      {v.answers.map((ans, i) => (
                        <div key={i} className="answer-card">
                          <div className="time-label">
                            {new Date(ans.timestamp).toLocaleString()}
                          </div>

                          <div className="answer-bubble">
                            <div className="answer-row">
                              <span className="answer-key">Responded:</span>
                              <span className="answer-value">
                                {Array.isArray(ans.answers.answers)
                                  ? ans.answers.answers.join(", ")
                                  : ans.answers.answers}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="empty">No video question answers.</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="data-page">
      <h1 className="main-title">Collected Data</h1>

      <div className="toggle-container">
        <button
          className={!friendlyMode && !csvMode ? "toggle-btn active" : "toggle-btn"}
          onClick={() => {
            setFriendlyMode(false);
            setCsvMode(false);
          }}
        >
          JSON View
        </button>

        <button
          className={friendlyMode ? "toggle-btn active" : "toggle-btn"}
          onClick={() => {
            setFriendlyMode(true);
            setCsvMode(false);
          }}
        >
          Friendly UI View
        </button>

        <button
          className={csvMode ? "toggle-btn active" : "toggle-btn"}
          onClick={() => {
            setCsvMode(true);
            setFriendlyMode(false);
          }}
        >
          CSV Table View
        </button>
      </div>

      <div className="settings-row">
        <h2 className="settings-title">Export Data</h2>
        <p className="settings-description">
          Download all collected survey and video question answers.
        </p>
        <button className="download-btn" onClick={handleDownloadJSON}>
          Download JSON Data
        </button>
        <button className="download-btn" onClick={handleDownloadCSV}>
          Download Question CSV
        </button>
      </div>

      {csvMode ? (
        renderCSVTable()
      ) : friendlyMode ? (
        renderFriendlyUI()
      ) : (
        <>
          <div className="settings-row">
            <h2 className="settings-title">Qualtrics Survey (JSON)</h2>
            <pre>{JSON.stringify(qualtricData, null, 2)}</pre>
          </div>

          <div className="settings-row">
            <h2 className="settings-title">Video Questions (JSON)</h2>
            <pre>{JSON.stringify(videoQuestionData, null, 2)}</pre>
          </div>
        </>
      )}
    </div>
  );
};

export default DataPage;
