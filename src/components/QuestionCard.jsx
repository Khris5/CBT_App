// Helper to convert index (0, 1, 2) to letter ('A', 'B', 'C')
const indexToLetter = (index) => String.fromCharCode(65 + index);

// Helper to convert letter ('A', 'B', 'C') to index (0, 1, 2)
const letterToIndex = (letter) => {
  if (typeof letter !== "string" || letter.length !== 1) return -1;
  return letter.toUpperCase().charCodeAt(0) - 65;
};

function QuestionCard({
  question,
  questionNumber,
  userAnswer, // Expected to be 'A', 'B', 'C', or undefined
  onAnswerChange, // Only used in practice mode
  isReviewMode = false, // Flag to differentiate modes
}) {
  // Safely extract question properties with fallbacks
  const {
    id,
    questionText = "Question text not available",
    options = [],
    correctAnswer,
    rationale,
  } = question || {};

  // Validate question data
  if (!question || !id) {
    return (
      <div className="question-card error">
        <p className="text-red-500">Error: Invalid question data</p>
      </div>
    );
  }

  if (!Array.isArray(options) || options.length === 0) {
    return (
      <div className="question-card error">
        <h4>
          {questionNumber}. {questionText}
        </h4>
        <p className="text-red-500">Error: No answer options available</p>
      </div>
    );
  }

  const handleOptionChange = (event) => {
    if (onAnswerChange && !isReviewMode) {
      const selectedIndex = parseInt(event.target.dataset.index, 10);
      if (
        !isNaN(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < options.length
      ) {
        const selectedLetter = indexToLetter(selectedIndex);
        onAnswerChange(id, selectedLetter);
      }
    }
  };

  return (
    <div className={`question-card ${isReviewMode ? "review-mode" : ""}`}>
      <h4 className="question-text">
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
            }
          }

          return (
            <div key={optionId} className={optionClassName}>
              <input
                type="radio"
                id={optionId}
                name={`question-${id}`}
                value={optionLetter}
                data-index={index}
                checked={isUserSelected}
                onChange={handleOptionChange}
                disabled={isReviewMode}
                className="option-input"
              />
              <label htmlFor={optionId} className={labelClassName}>
                <span className="option-letter">{optionLetter}.</span>
                <span className="option-text">{optionText}</span>
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
