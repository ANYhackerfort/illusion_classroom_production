import React from "react";

interface DefaultLengthControlProps {
  value: number;
  setValue: (v: number) => void;
}

const DefaultLengthControl: React.FC<DefaultLengthControlProps> = ({
  value,
  setValue,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (!isNaN(parsed) && parsed >= 1) {
      setValue(parsed);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <label className="zoom-label" htmlFor="default-length">
        Default Length
      </label>
      <input
        id="default-length"
        type="number"
        step="1"
        min="1"
        value={value}
        onChange={handleChange}
        style={{
          width: "50px",
          padding: "2px 6px",
          fontSize: "12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          color: "#333",
        }}
      />
    </div>
  );
};

export default DefaultLengthControl;
