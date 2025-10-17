import React from "react";
import "./Questions.css";
import VideoPlayerWithBar from "../../components/videoEditor/VideoWithBar";

const QuestionsPage: React.FC = () => {
  // const [showInnerBar, setShowInnerBar] = useState(true);

  return (
    <div className="video-settings-page">
      <h1 className="main-title">Questions Control Page</h1>

      <div className="settings-row">
        <h2 className="settings-title">Video Editor</h2>
        <p className="settings-description">
          This is a lightweight video editing interface designed to help you
          align questions or clips with precise video timestamps.
          <br />
          <br />
          <strong>Key features:</strong>
          <br />• Use the <strong>spacebar</strong> to play or pause, and{" "}
          <strong>left-click</strong> anywhere on the timeline to jump to a
          point.
          <br />• <strong>Drag</strong> question blocks or video clips into the
          timeline to create a combined video. Use the{" "}
          <strong>Zoom slider</strong> to fine-tune placement for better
          alignment.
        </p>
      </div>

      <div className="settings-row">
        <VideoPlayerWithBar />
      </div>
    </div>
  );
};

export default QuestionsPage;
