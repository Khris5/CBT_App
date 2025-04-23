import React from "react";

// Helper to convert index (0, 1, 2) to letter ('A', 'B', 'C')
const indexToLetter = (index) => String.fromCharCode(65 + index);

// Helper to convert letter ('A', 'B', 'C') to index (0, 1, 2)
const letterToIndex = (letter) => letter.charCodeAt(0) - 65;

function QuestionCard({
  question,
  questionNumber,
  userAnswer, // Now expected to be 'A', 'B', 'C', or undefined
  onAnswerChange, // Only used in practice mode
  isReviewMode = false, // Flag to differentiate modes
}) {
  const { id, questionText, options, correctAnswer, rationale } = question; // correctAnswer is now expected to be 'A', 'B', or 'C'

  const handleOptionChange = (event) => {
    if (onAnswerChange && !isReviewMode) {
      const selectedIndex = parseInt(event.target.dataset.index, 10); // Get index from data attribute
      const selectedLetter = indexToLetter(selectedIndex); // Convert index to letter
      onAnswerChange(id, selectedLetter);
    }
  };

  return (
    <div className={`question-card ${isReviewMode ? "review-mode" : ""}`}>
      <h4>
        {questionNumber}. {questionText}
      </h4>
      <div className="options">
        {options.map((optionText, index) => {
          const optionLetter = indexToLetter(index); // 'A', 'B', 'C'
          const optionId = `${id}-option-${optionLetter}`;

          const isUserSelected = userAnswer === optionLetter;
          const isCorrect = correctAnswer === optionLetter;

          let optionClassName = "option";
          let labelClassName = "option-label";

          if (isReviewMode) {
            // Always highlight the correct answer's option
            if (isCorrect) {
              optionClassName += " correct-answer";
              labelClassName += " label-correct";
            }
            // Highlight the user's selection
            if (isUserSelected) {
              optionClassName += " user-selected";
              if (!isCorrect) {
                optionClassName += " incorrect-answer";
                labelClassName += " label-incorrect";
              } else {
                // User selected the correct answer
                labelClassName += " label-correct";
              }
            } else if (userAnswer === undefined && isCorrect) {
              // If user didn't answer, still ensure correct answer label is styled
              labelClassName += " label-correct";
            }
          }

          return (
            <div key={optionId} className={optionClassName}>
              <input
                type="radio"
                id={optionId}
                name={`question-${id}`}
                value={optionLetter} // Use letter as value for consistency, though we use index for change handling
                data-index={index} // Store index here to easily get it in handler
                checked={isUserSelected}
                onChange={handleOptionChange}
                disabled={isReviewMode}
              />
              <label htmlFor={optionId} className={labelClassName}>
                {optionText} {/* Display the actual option text */}
              </label>
            </div>
          );
        })}
      </div>
      {isReviewMode && (
        <div className="rationale">
          <strong>Explanation:</strong>{" "}
          {rationale || "No explanation provided."}
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
