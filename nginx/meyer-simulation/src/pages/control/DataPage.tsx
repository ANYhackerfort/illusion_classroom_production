import React from "react";
import "./DataPage.css";

const DataPage: React.FC = () => {
  const handleDownload = () => {
    // 👇 dummy download
    const data = [
      ["Name", "Q1", "Q2", "Q3"],
      ["Alice", "A", "Yes", "3"],
      ["Bob", "B", "No", "5"],
    ];
    const csvContent =
      "data:text/csv;charset=utf-8," +
      data.map((row) => row.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "user_answers.csv";
    link.click();
  };

  return (
    <div className="data-page">
      <h1 className="main-title">Collected Data</h1>

      {/* Section 1 */}
      <div className="settings-row">
        <h2 className="settings-title">Export Data</h2>
        <p className="settings-description">
          Download all collected answers in CSV format for further analysis.
        </p>
        <button className="download-btn" onClick={handleDownload}>
          Download CSV of user answers
        </button>
      </div>

      {/* Section 2 */}
      <div className="settings-row">
        <h2 className="settings-title">Answer Distributions</h2>
        <p className="settings-description">
          Quick preview of how users responded to a few sample questions.
        </p>

        <div className="distribution-box">
          <h3 className="question-text">Q1: Favorite Color? (MCQ)</h3>
          <ul className="bar-chart">
            <li><span>Red</span><div className="bar" style={{width: "60%"}}>60%</div></li>
            <li><span>Blue</span><div className="bar" style={{width: "30%"}}>30%</div></li>
            <li><span>Green</span><div className="bar" style={{width: "10%"}}>10%</div></li>
          </ul>
        </div>

        <div className="distribution-box">
          <h3 className="question-text">Q2: How satisfied are you? (Slider)</h3>
          <div className="slider-bar">
            <div className="slider-fill" style={{width: "70%"}}>Avg: 7/10</div>
          </div>
        </div>

        <div className="distribution-box">
          <h3 className="question-text">Q3: Any feedback? (Short Answer)</h3>
          <ul className="short-answers">
            <li>"Great experience!"</li>
            <li>"Too long."</li>
            <li>"Loved the interactive part."</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataPage;
