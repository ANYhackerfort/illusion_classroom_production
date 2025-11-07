import React from "react";
import DistributionCard from "./DistributionCard";
import "./DistributionGrid.css";

const distributions = [
  { name: "Normal", type: "normal", mean: 0, variance: 1 },
  { name: "Skewed Left", type: "skewLeft", mean: -1, variance: 1 },
  { name: "Skewed Right", type: "skewRight", mean: 1, variance: 1 },
  { name: "Bimodal", type: "bimodal", mean: 0, variance: 2 },
  { name: "Uniform", type: "uniform", mean: 0.5, variance: 0.1 },
  { name: "Random", type: "random", mean: 0, variance: 1.5 },
];

const DistributionGrid: React.FC = () => {
  return (
    <div className="distribution-grid-container">
      <div className="distribution-grid">
        {distributions.map((dist, idx) => (
          <DistributionCard
            key={idx}
            name={dist.name}
            type={dist.type}
            mean={dist.mean}
            variance={dist.variance}
          />
        ))}
      </div>
    </div>
  );
};

export default DistributionGrid;
