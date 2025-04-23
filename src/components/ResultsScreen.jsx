import React from "react";

function ResultsScreen({ score, total, onReview, onRestart }) {
  const percentage = total > 0 ? ((score / total) * 100).toFixed(1) : 0;

  return (
    <div className="results-screen">
      <h2>Session Complete!</h2>
      <h3>Your Score:</h3>
      <p className="score-display">
        {score} out of {total} ({percentage}%)
      </p>
      <div className="results-actions">
        <button onClick={onReview} className="review-button">
          Review Answers
        </button>
        <button onClick={onRestart} className="restart-button">
          Start New Session
        </button>
      </div>
    </div>
  );
}

export default ResultsScreen;
