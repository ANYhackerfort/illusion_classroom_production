import React, { useRef, useState, useEffect } from "react";
import LeftTaskBarFinder from "./TaskBarFinder";
import QuestionDropZone from "../components/quesitons/QuestionDrag";
import "./Finder.css";
import SurveyDropZone from "./editedVideoStorage/SurveyDropZone";
import VideoTable from "./editedVideoStorage/VideoTable";
import VideoDropBox from "../components/botEditor/VideoDropBox";

interface FinderProps {
  hide: boolean;
  onClose: () => void;
}

const Finder: React.FC<FinderProps> = ({ hide, onClose }) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(2);
  const [userChecked, setUserChecked] = useState(false);
  const [orgChecked, setOrgChecked] = useState(false);
  const [searchQuery, setSearchQuery] = useState(""); // ✅ search state

  const containerRef = useRef<HTMLDivElement>(null);

  // dummy handlers
  const handleUserToggle = () => {
    setUserChecked((prev) => !prev);
    console.log("User toggled:", !userChecked);
  };

  const handleOrgToggle = () => {
    setOrgChecked((prev) => !prev);
    console.log("Organization toggled:", !orgChecked);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("🔍 Search submitted:", searchQuery); // ✅ dud
  };

  // position + resize logic unchanged
  const positionRef = useRef({
    x: (window.innerWidth - 640) / 2,
    y: (window.innerHeight - 440) / 2,
  });
  const sizeRef = useRef({ width: 600, height: 400 });

  useEffect(() => {
    const updateSize = () => {
      sizeRef.current = {
        width: window.innerWidth * 0.5,
        height: window.innerHeight / 3,
      };
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isOnDraggableBar = target.closest(".finder-taskbar-container");
    const isInsideContentArea = target.closest(".content-area");
    if (isOnDraggableBar && !isInsideContentArea) {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (bounds) {
        setDragging(true);
        setOffset({
          x: e.clientX - bounds.left,
          y: e.clientY - bounds.top,
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging && containerRef.current) {
      positionRef.current = {
        x: e.clientX - offset.x,
        y: e.clientY - offset.y,
      };
      containerRef.current.style.left = `${positionRef.current.x}px`;
      containerRef.current.style.top = `${positionRef.current.y}px`;
    }
  };
  const handleMouseUp = () => setDragging(false);

  const handleResizeMouseMove = (e: MouseEvent) => {
    if (resizing && containerRef.current) {
      const newWidth = e.clientX - positionRef.current.x;
      const newHeight = e.clientY - positionRef.current.y;
      sizeRef.current = {
        width: Math.max(newWidth, 300),
        height: Math.max(newHeight, 200),
      };
      containerRef.current.style.width = `${sizeRef.current.width}px`;
      containerRef.current.style.height = `${sizeRef.current.height}px`;
    }
  };
  const handleResizeMouseUp = () => setResizing(false);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleResizeMouseMove);
    window.addEventListener("mouseup", handleResizeMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleResizeMouseMove);
      window.removeEventListener("mouseup", handleResizeMouseUp);
    };
  }, [dragging, offset, resizing]);

  return (
    <div
      ref={containerRef}
      className="finder-container"
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: positionRef.current.x,
        top: positionRef.current.y,
        width: sizeRef.current.width,
        height: sizeRef.current.height,
        cursor: dragging ? "grabbing" : "default",
        zIndex: 1000,
        display: hide ? "none" : "block",
      }}
    >
      <button className="mac-close-button" onClick={onClose}>
        &times;
      </button>

      {/* ✅ Floating Search Bar */}
      <form className="floating-search" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>

      <div className="finder-layout">
        <LeftTaskBarFinder
          onSelect={(index) => setSelectedIndex(index)}
          selectedIndex={selectedIndex}
        />

        <div className="finder-main">
          {/* Content area */}
          <div className="content-area">
            {selectedIndex === 1 ? (
              <SurveyDropZone
                userChecked={userChecked}
                orgChecked={orgChecked}
                selectedIndex={selectedIndex}
              />
            ) : selectedIndex === 2 ? (
              <VideoTable
                userChecked={userChecked}
                orgChecked={orgChecked}
                selectedIndex={selectedIndex}
              />
            ) : selectedIndex === 3 ? (
              <QuestionDropZone
                userChecked={userChecked}
                orgChecked={orgChecked}
                selectedIndex={selectedIndex}
              />
            ) : (
              <VideoDropBox
                userChecked={userChecked}
                orgChecked={orgChecked}
                selectedIndex={selectedIndex}
              />
            )}
          </div>

          {/* ✅ Floating bottom-right toggles (always visible) */}
          <div className="floating-checkboxes">
            <label className="checkbox-btn">
              <input
                type="checkbox"
                checked={userChecked}
                onChange={handleUserToggle}
              />
              <span>Meeting</span>
            </label>
            <label className="checkbox-btn">
              <input
                type="checkbox"
                checked={orgChecked}
                onChange={handleOrgToggle}
              />
              <span>Organization</span>
            </label>
          </div>
        </div>
      </div>

      <div className="resizer" onMouseDown={() => setResizing(true)} />
    </div>
  );
};

export default Finder;
