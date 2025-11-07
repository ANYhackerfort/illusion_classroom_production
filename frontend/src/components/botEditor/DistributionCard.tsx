import React from "react";
import "./DistributionCard.css";

interface Props {
  name: string;
  type: string;
  mean: number;
  variance: number;
}

const DistributionCard: React.FC<Props> = ({ name, type, mean, variance }) => {
  return (
    <div className="distribution-card">
      <div className={`distribution-curve ${type}`}>
        <span className="distribution-title">{name}</span>
      </div>
      <div className="distribution-info">
        Mean: {mean}, Variance: {variance}
      </div>
    </div>
  );
};

export default DistributionCard;
