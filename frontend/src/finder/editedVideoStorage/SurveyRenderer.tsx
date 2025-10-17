// components/SurveyRenderer.tsx
import React from "react";
import "./SurveyRenderer.css";
import { Survey } from "../../indexDB/surveyStorage";

type SurveyRendererProps = {
  survey: Survey;
};

const SurveyRenderer: React.FC<SurveyRendererProps> = ({ survey }) => {
  return (
    <div className="survey-container">
      {survey.items.map((item) => (
        <div key={item.id} className="survey-item">
          {item.type === "description" && (
            <>
              <p className="survey-description">{item.content}</p>
              <textarea
                className="survey-textarea"
                placeholder="Your answer..."
              />
            </>
          )}

          {item.type === "slider" && (
            <>
              <p className="survey-question">{item.question}</p>
              <input
                type="range"
                min={item.min}
                max={item.max}
                className="survey-slider"
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
                      <input type="radio" name={item.id} value={option} />
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
    </div>
  );
};

export default SurveyRenderer;
