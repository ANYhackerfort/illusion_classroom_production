import React from "react";
import "./bland.css";
import LiquidGlassBotGrid from "./components/LiquidGlassBotGrid";

const BlandSegmentRenderer: React.FC = () => {
  return (
    <div className="background-wrapper ">
      <LiquidGlassBotGrid />
    </div>
  );
};

export default BlandSegmentRenderer;
