import React from "react";
import "./SummaryView.css";

function SummaryView({ summary }) {
  return (
    <div className="summary-container">
      <h2 className="summary-title">Video Summary</h2>
      <p className="summary-text">{summary}</p>
    </div>
  );
}

export default SummaryView;
