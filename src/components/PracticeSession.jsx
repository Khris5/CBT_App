import { useEffect, useCallback, useRef, useState } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionEndedRef = useRef(false);

  const handleAnswerChange = useCallback(
    (questionId, selectedLetter) => {
      setUserAnswers((prevAnswers) => ({
        ...prevAnswers,
        [questionId]: selectedLetter,
      }));
    },
    [setUserAnswers]
  );

  const submitTest = useCallback(() => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    setIsSubmitting(true);
    console.log("PracticeSession state being submitted:", userAnswers);
    onSubmit(userAnswers);
  }, [onSubmit, userAnswers]);

  const handleTimeUp = useCallback(() => {
    console.log("Time is up!");
    if (!sessionEndedRef.current) {
      submitTest();
    }
  }, [submitTest]);

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

  useEffect(() => {
    if (!questions || questions.length === 0) {
      console.warn("PracticeSession received no questions. Ending session.");
      if (!sessionEndedRef.current) {
        submitTest();
      }
    }
  }, [questions, submitTest]);

  const currentQuestion = questions[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Loading question...</div>
      </div>
    );
  }

  if (startTime === null) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Initializing session...</div>
      </div>
    );
  }

  const baseButtonClasses = "px-6 py-2 rounded-md font-semibold text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${baseButtonClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
  const secondaryButtonClasses = `${baseButtonClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`;
  const navButtonClasses = "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const questionNavButtonBase = "w-10 h-10 flex items-center justify-center border rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50";

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen flex flex-col">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0">
          Practice Test <span className="text-gray-500 font-normal">({currentQuestionIndex + 1} / {questions.length})</span>
        </h1>
        <Timer
          totalDuration={timeLimit}
          startTime={startTime}
          onTimeUp={handleTimeUp}
        />
      </header>

      <main className="flex-grow">
        <QuestionCard
          key={currentQuestion.id}
          questionNumber={currentQuestionIndex + 1}
          question={currentQuestion}
          userAnswer={userAnswers[currentQuestion.id]}
          onAnswerChange={handleAnswerChange}
          isReviewMode={false}
        />
      </main>

      <nav className="mt-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevious} disabled={currentQuestionIndex === 0} className={navButtonClasses}>
            &larr; Previous
          </button>
          <button onClick={handleNext} disabled={currentQuestionIndex === questions.length - 1} className={navButtonClasses}>
            Next &rarr;
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2 text-center sm:text-left">Go to question:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {questions.map((q, index) => {
              let qNavBtnClasses = `${questionNavButtonBase} border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-indigo-500`;
              if (userAnswers[q.id] !== undefined) {
                qNavBtnClasses = `${questionNavButtonBase} border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100 focus:ring-blue-500`;
              }
              if (index === currentQuestionIndex) {
                qNavBtnClasses = `${questionNavButtonBase} bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500 ring-offset-1`;
              }
              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(index)}
                  className={qNavBtnClasses}
                  title={`Go to question ${index + 1}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={submitTest}
            disabled={isSubmitting || sessionEndedRef.current}
            className={`${primaryButtonClasses} w-full sm:w-auto`}
          >
            {isSubmitting ? "Submitting..." : "Submit All Answers"}
          </button>
        </div>
      </nav>
    </div>
  );
}

export default PracticeSession;
