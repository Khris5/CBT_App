import React, { useMemo } from "react";
import QuestionCard from "./QuestionCard";

function ReviewScreen({
  questions,
  userAnswers,
  onRestart,
  currentQuestionIndex,
  setCurrentQuestionIndex,
}) {
  // Determine the status of each question for the number buttons
  const questionStatuses = useMemo(() => {
    return questions.map((q) => {
      const userAnswer = userAnswers[q.id];
      if (userAnswer === undefined) {
        return "unanswered";
      }
      return userAnswer === q.correctAnswer ? "correct" : "incorrect";
    });
  }, [questions, userAnswers]);

  // Navigation Handlers
  const handleNext = () => {
    setCurrentQuestionIndex((prevIndex) =>
      Math.min(prevIndex + 1, questions.length - 1)
    );
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleGoToQuestion = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return <div className="loading">Loading review...</div>;
  }

  return (
    <div className="review-screen single-question-view">
      <h2>
        Review Your Answers ({currentQuestionIndex + 1} / {questions.length})
      </h2>

      {/* Question Number Navigation (Above Question) */}
      <div className="question-navigation number-nav review-number-nav">
        <p>Go to question:</p>
        <div className="number-buttons-container">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => handleGoToQuestion(index)}
              className={`question-number-btn \
                          ${index === currentQuestionIndex ? "current" : ""} \
                          ${questionStatuses[index]}`}
              title={`Question ${index + 1}: ${questionStatuses[index]}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Display only the current question in review mode */}
      <div className="current-question-container">
        <QuestionCard
          key={currentQuestion.id}
          questionNumber={currentQuestionIndex + 1}
          question={currentQuestion}
          userAnswer={userAnswers[currentQuestion.id]}
          isReviewMode={true}
        />
      </div>

      {/* Main Navigation Buttons */}
      <div className="question-navigation main-nav">
        <button onClick={handlePrevious} disabled={currentQuestionIndex === 0}>
          &larr; Previous
        </button>
        <button
          onClick={handleNext}
          disabled={currentQuestionIndex === questions.length - 1}
        >
          Next &rarr;
        </button>
      </div>

      <button onClick={onRestart} className="restart-button review-restart">
        Start New Session
      </button>
    </div>
  );
}

export default ReviewScreen;
