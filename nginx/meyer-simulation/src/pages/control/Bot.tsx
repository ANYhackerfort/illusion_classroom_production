import React from "react";
import VideoDropBox from "../../components/botEditor/VideoDropBox";
import BlandSegmentRenderer from "../meeting-page/BlankSegmentRenderer";
import "./Questions.css";

const BotsPage: React.FC = () => {
  return (
    <div className="video-settings-page">
      <h1 className="main-title">Bot Control Page</h1>

      <div className="settings-row">
        <h2 className="settings-title">Video Particpants</h2>
        <p className="settings-description">
          Drag all your videos and we will determine number partcipants and
          where they are automatically. You can change the order later. We will
          use video file name as the partcipant name. However, you can also
          change this later down below.
        </p>

        <VideoDropBox />
      </div>

      <div className="settings-row">
        <h2 className="settings-title">Current layout user sees</h2>
        <p className="settings-description">
          Shuffle order or change the order based on names or etc... You can
          also change the name of each user by left clicking on the user.
        </p>
        <BlandSegmentRenderer />
      </div>
    </div>
  );
};

export default BotsPage;
