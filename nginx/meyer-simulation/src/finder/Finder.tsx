import React, { useRef, useState, useEffect } from "react";
import LeftTaskBarFinder from "./TaskBarFinder";
import QuestionDropZone from "../components/quesitons/QuestionDrag";
import { getAllQuestions } from "../indexDB/questionStorage";

import "./Finder.css";
import SurveyDropZone from "./editedVideoStorage/SurveyDropZone";
import VideoTable from "./editedVideoStorage/VideoTable";

interface FinderProps {
  hide: boolean;
  onClose: () => void;
}

const Finder: React.FC<FinderProps> = ({ hide, onClose }) => {
  const [tabs, setTabs] = useState<number[]>([1]);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [, forceUpdate] = useState(0); // used to trigger re-render

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadTabsFromQuestions = async () => {
      const questions = await getAllQuestions();

      const tabSet = new Set<number>();

      for (const q of questions) {
        const tab = q.data.associatedTab ?? 0;
        tabSet.add(tab);
      }

      // Ensure at least one tab
      if (tabSet.size === 0) {
        tabSet.add(1);
      }

      const sortedTabs = Array.from(tabSet).sort((a, b) => a - b);
      setTabs(sortedTabs);
      setSelectedTab(sortedTabs[0]);
    };

    loadTabsFromQuestions();
  }, []);

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

    // Only allow dragging when the click is on the tab bar or taskbar (but NOT inside content area)
    const isOnDraggableBar =
      target.closest(".top-menubar") ||
      target.closest(".finder-taskbar-container");

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

  const handleMouseUp = () => {
    if (dragging) {
      setDragging(false);
      forceUpdate((prev) => prev + 1);
    }
  };

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

  const handleResizeMouseUp = () => {
    if (resizing) {
      setResizing(false);
      forceUpdate((prev) => prev + 1);
    }
  };

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

  const addNewTab = () => {
    const nextTabNumber = tabs[tabs.length - 1] + 1;
    setTabs([...tabs, nextTabNumber]);
    setSelectedTab(tabs.length); // selects newly added tab
  };

  const closeTab = (indexToRemove: number) => {
    setTabs((prevTabs) => {
      if (prevTabs.length <= 1) return prevTabs; // prevent deleting the last tab

      const updatedTabs = [...prevTabs];
      updatedTabs.splice(indexToRemove, 1);

      // Adjust selectedTab if needed
      if (selectedTab >= updatedTabs.length) {
        setSelectedTab(Math.max(0, updatedTabs.length - 1));
      }

      return updatedTabs;
    });
  };

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

      <div className="finder-layout">
        <LeftTaskBarFinder onSelect={(index) => setSelectedIndex(index)} />

        <div className="finder-main">
          <div className="top-menubar tab-bar">
            {tabs.map((tabNumber, index) => (
              <button
                key={index}
                className={`tab-button ${selectedTab === index ? "active" : ""}`}
                onClick={() => setSelectedTab(index)}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    closeTab(index);
                  }
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: "10px",
                    height: "10px",
                    borderRadius: "50%",
                    backgroundColor: `hsl(${index * 50}, 70%, 50%)`,
                    marginRight: "8px",
                  }}
                />
                {tabNumber}
              </button>
            ))}
            <button className="tab-button add-tab" onClick={addNewTab}>
              +
            </button>
          </div>

          <div className="content-area">
            {selectedIndex === 1 ? (
              <SurveyDropZone tabIndex={selectedTab}/>
            ) : selectedIndex === 2 ? (
              <VideoTable />
            ) : (
              <QuestionDropZone tabIndex={selectedTab} />
            )}
          </div>
        </div>
      </div>

      <div className="resizer" onMouseDown={() => setResizing(true)} />
    </div>
  );
};

export default Finder;
