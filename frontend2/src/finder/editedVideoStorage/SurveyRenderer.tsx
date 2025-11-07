import React, { useEffect, useState } from "react";
import "./SurveyRenderer.css";
import { Survey } from "../../indexDB/surveyStorage";
import { useParams } from "react-router-dom";
import { storeQualtricSurveyAnswers } from "../../components/videoDisplayer/api/save";

type SurveyRendererProps = {
  survey: Survey;
};

const SurveyRenderer: React.FC<SurveyRendererProps> = ({ survey }) => {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [participantName, setParticipantName] = useState<string | null>(null);

  const { org_id, roomName } = useParams<{ org_id: string; roomName: string }>();

  // ✅ Load participant name from localStorage
  useEffect(() => {
    const storedName = localStorage.getItem("participantName");
    if (storedName) {
      setParticipantName(storedName);
    }
  }, []);

  // ✅ Function to update answers
  const handleChange = (id: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // ✅ Handle submit
  const handleSubmit = async () => {
    if (!org_id || !roomName) return;

    if (!participantName) {
      alert("⚠️ You are not a registered participant. Please join the session before submitting.");
      return;
    }

    const result = await storeQualtricSurveyAnswers(
      parseInt(org_id),
      roomName,
      participantName,
      answers
    );

    if (result.ok) {
      console.log("✅ Survey submitted successfully:", result.message);
      setSubmitted(true);
    } else {
      console.error("❌ Survey submission failed:", result.message);
      alert("Submission failed. Please try again later.");
    }
  };

  // ✅ Detect if survey is only Qualtrics
  const onlyQualtrics =
    survey.items.length > 0 &&
    survey.items.every((item) => item.type === "qualtrics" || item.type === "description");

  // ✅ After submit message
  if (submitted) {
    return (
      <p
        style={{
          textAlign: "center",
          marginTop: "2rem",
          color: "#1a73e8",
          fontWeight: 600,
        }}
      >
        Thank you for your response!
      </p>
    );
  }

  return (
    <div className="survey-wrapper">
      <div className="survey-scroll">
        {survey.items.map((item) => (
          <div key={item.id} className="survey-item-modern">
            {item.type === "description" && (
              <>
                <p className="survey-description">{item.content}</p>
              </>
            )}

            {item.type === "slider" && (
              <>
                <p className="survey-question">{item.question}</p>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  className="survey-slider2"
                  onChange={(e) => handleChange(item.id, e.target.value)}
                />
                <div className="survey-slider-labels">
                  <span>{item.min}</span>
                  <span>{item.max}</span>
                </div>
              </>
            )}

            {item.type === "mcq" && (
              <>
                <p className="survey-question">{item.question}</p>
                <ul className="survey-mcq">
                  {item.options.map((option, idx) => (
                    <li key={idx}>
                      <label>
                        <input
                          type="radio"
                          name={item.id}
                          value={option}
                          onChange={(e) =>
                            handleChange(item.id, e.target.value)
                          }
                        />
                        {option}
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {item.type === "qualtrics" && (
              <>
                <p className="survey-question">External Survey Link:</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="survey-link"
                >
                  Open Qualtrics Survey
                </a>
              </>
            )}
          </div>
        ))}

        {/* ✅ Submit button — hidden if only Qualtrics */}
        {!onlyQualtrics && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={handleSubmit}
              style={{
                backgroundColor: "#1a73e8",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "12px 20px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "background-color 0.2s ease",
              }}
            >
              Submit Survey
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyRenderer;
