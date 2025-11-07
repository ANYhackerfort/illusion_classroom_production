import React from "react";
import VideoStatus from "../../components/videoDisplayer/DisplayWithBar";
import "./vsp.css";

const VideoSettingsPage: React.FC = () => {
  return (
    <div className="video-settings-page">
      <h1 className="main-title">Video Control Page</h1>

      <div className="settings-row">
        <div className="settings-title">Video Status</div>
        <ul className="settings-description">
          <li>
            After you <strong>drag in the edited video</strong>, you can{" "}
            <strong>pause and play</strong> it using the{" "}
            <strong>space bar</strong> or by simply{" "}
            <strong>clicking on the video</strong>. You can also{" "}
            <strong>click on the timeline</strong> to jump to a specific spot
            and use the <strong>zoom feature</strong> for more precise
            selection.
          </li>
          <li>
            You can <strong>replace the video</strong>, but you{" "}
            <strong>cannot stack</strong> videos on top of one another.
            <strong>
              Whatever is displayed here will also be shown in the meeting room.
            </strong>
          </li>
        </ul>
        <VideoStatus />
      </div>
    </div>
  );
};

export default VideoSettingsPage;
