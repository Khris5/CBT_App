import React, { useState } from "react";

function ConfigScreen({ questionCounts, defaultCount, onStartSession }) {
  const [selectedCount, setSelectedCount] = useState(defaultCount);

  const handleSelectionChange = (event) => {
    setSelectedCount(Number(event.target.value));
  };

  const handleStartClick = () => {
    onStartSession(selectedCount);
  };

  return (
    <div className="config-screen">
      <h2>Configure Your Practice Session</h2>
      <div className="config-option">
        <label htmlFor="question-count">Number of Questions:</label>
        <select
          id="question-count"
          value={selectedCount}
          onChange={handleSelectionChange}
        >
          {questionCounts.map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
      <button onClick={handleStartClick} className="start-button">
        Start Session
      </button>
    </div>
  );
}

export default ConfigScreen;
