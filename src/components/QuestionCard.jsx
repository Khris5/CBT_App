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
  const {
    id,
    questiontext = "Question text not available",
    options = [],
    correctanswerletter,
    explanation,
    // category, // category is not used, can be removed if not planned for future use
  } = question || {};

  if (!question || !id) {
    return (
      <div className="bg-red-50 border-2 border-red-300 p-6 rounded-lg shadow-md">
        <p className="text-red-600 font-medium">Error: Invalid question data provided.</p>
      </div>
    );
  }

  if (!Array.isArray(options) || options.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6 border-2 border-red-300">
        <h4 className="text-xl font-semibold mb-2 text-gray-800">
          {questionNumber}. {questiontext}
        </h4>
        <p className="text-red-600 font-medium">Error: No answer options available for this question.</p>
      </div>
    );
  }

  const handleOptionChange = (event) => {
    if (onAnswerChange && !isReviewMode) {
      const selectedIndex = parseInt(event.target.dataset.index, 10);
      if (!isNaN(selectedIndex) && selectedIndex >= 0 && selectedIndex < options.length) {
        const selectedLetter = indexToLetter(selectedIndex);
        onAnswerChange(id, selectedLetter);
      }
    }
  };

  return (
    <div className={`bg-white shadow-lg rounded-lg p-6 mb-6 ${isReviewMode ? 'border-l-4 border-blue-500' : ''}`}>
      <h4 className="text-xl font-semibold mb-5 text-gray-800">
        <span className="text-blue-600 mr-2">{questionNumber}.</span> {questiontext}
      </h4>

      <div className="space-y-3">
        {options.map((optionText, index) => {
          const optionLetter = indexToLetter(index);
          const optionId = `${id}-option-${optionLetter}`;
          const isUserSelected = userAnswer === optionLetter;
          const isCorrect = correctanswerletter === optionLetter;

          let optionBaseClasses = "flex items-center p-3 rounded-md border transition-all duration-150 ease-in-out";
          let optionStateClasses = "border-gray-300 hover:bg-gray-50 hover:border-gray-400";
          let labelTextClasses = "text-gray-700";

          if (isReviewMode) {
            optionStateClasses = "border-gray-300"; // Default for non-selected, non-correct options in review
            if (isCorrect) {
              optionStateClasses = "bg-green-50 border-green-500 ring-1 ring-green-500";
              labelTextClasses = "text-green-800 font-medium";
            }
            if (isUserSelected) {
              if (isCorrect) {
                optionStateClasses = "bg-green-100 border-green-600 ring-2 ring-green-600"; 
                labelTextClasses = "text-green-800 font-bold";
              } else {
                optionStateClasses = "bg-red-50 border-red-500 ring-1 ring-red-500";
                labelTextClasses = "text-red-800 font-medium";
              }
            } else if (isCorrect) { // If not user selected, but is the correct answer
                optionStateClasses = "bg-green-50 border-green-400";
                labelTextClasses = "text-green-700";
            }
          } else {
            // Practice mode styling for selected option
            if (isUserSelected) {
              optionStateClasses = "bg-blue-50 border-blue-500 ring-2 ring-blue-500";
              labelTextClasses = "text-blue-700 font-medium";
            }
          }

          return (
            <div key={optionId} className={`${optionBaseClasses} ${optionStateClasses}`}>
              <input
                type="radio"
                id={optionId}
                name={`question-${id}`}
                value={optionLetter}
                data-index={index}
                checked={isUserSelected}
                onChange={handleOptionChange}
                disabled={isReviewMode}
                className="form-radio h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500 mr-3 shrink-0"
              />
              <label htmlFor={optionId} className={`flex-1 cursor-pointer ${labelTextClasses}`}>
                <span className="font-semibold mr-2">{optionLetter}.</span>
                <span>{optionText}</span>
              </label>
            </div>
          );
        })}
      </div>

      {isReviewMode && explanation && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <h5 className="text-md font-semibold text-gray-700 mb-1">Explanation:</h5>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            {explanation}
          </p>
        </div>
      )}
      {isReviewMode && !explanation && (
         <div className="mt-5 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 italic">No explanation provided for this question.</p>
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
