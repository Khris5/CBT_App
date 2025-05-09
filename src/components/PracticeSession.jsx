import React, { useEffect, useCallback, useRef } from "react";
import Timer from "./Timer";
import QuestionCard from "./QuestionCard";

function PracticeSession({
  questions,
  timeLimit,
  startTime,
  onSubmit,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  userAnswers,
  setUserAnswers,
}) {
  const [isSubmitting, setIsSubmitting] = React.useState(false); // Keep local state for submission status
  const sessionEndedRef = useRef(false);

  // Handler for when an answer changes - uses setUserAnswers from props
  const handleAnswerChange = useCallback(
    (questionId, selectedLetter) => {
      setUserAnswers((prevAnswers) => ({
        ...prevAnswers,
        [questionId]: selectedLetter,
      }));
    },
    [setUserAnswers]
  );

  // Function to submit the session
  const submitTest = useCallback(() => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    setIsSubmitting(true);
    console.log("PracticeSession state being submitted:", userAnswers);
    onSubmit(userAnswers);
  }, [onSubmit, userAnswers]);

  // Handler for when the timer runs out
  const handleTimeUp = useCallback(() => {
    console.log("Time is up!");
    if (!sessionEndedRef.current) {
      submitTest();
    }
  }, [submitTest]);

  // Navigation Handlers - use setCurrentQuestionIndex from props
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

  // Effect to handle potential edge case: if questions list becomes empty
  useEffect(() => {
    if (!questions || questions.length === 0) {
      console.warn("PracticeSession received no questions. Ending session.");
      if (!sessionEndedRef.current) {
        submitTest();
      }
    }
  }, [questions, submitTest]);

  // Get the current question based on the index from props
  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    // Handle case where questions might be loading or empty after initial check
    return <div className="loading">Loading question...</div>;
  }

  // Handle case where startTime might be null briefly on load/transition
  if (startTime === null) {
    return <div className="loading">Initializing session...</div>;
  }

  return (
    <div className="practice-session single-question-view">
      <div className="session-header">
        <h2>
          Practice Test ({currentQuestionIndex + 1} / {questions.length})
        </h2>
        <Timer
          totalDuration={timeLimit}
          startTime={startTime}
          onTimeUp={handleTimeUp}
        />
      </div>

      {/* Display only the current question */}
      <div className="current-question-container">
        <QuestionCard
          key={currentQuestion.id} // Key ensures component remounts if ID changes unexpectedly
          questionNumber={currentQuestionIndex + 1}
          question={currentQuestion}
          userAnswer={userAnswers[currentQuestion.id]}
          onAnswerChange={handleAnswerChange}
          isReviewMode={false}
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

      {/* Question Number Navigation */}
      <div className="question-navigation number-nav">
        <p>Go to question:</p>
        <div className="number-buttons-container">
          {questions.map((q, index) => (
            <button
              key={q.id}
              onClick={() => handleGoToQuestion(index)}
              className={`question-number-btn ${
                index === currentQuestionIndex ? "current" : ""
              } ${userAnswers[q.id] !== undefined ? "answered" : ""}`}
              title={`Go to question ${index + 1}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button
        onClick={submitTest}
        disabled={isSubmitting || sessionEndedRef.current}
        className="submit-button session-submit"
      >
        {isSubmitting ? "Submitting..." : "Submit All Answers"}
      </button>
    </div>
  );
}

export default PracticeSession;
