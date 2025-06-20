import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import QuestionCard from "./QuestionCard";
import { FaArrowLeft, FaArrowRight } from "react-icons/fa";
import Spinner from "./Spinner";
import ErrorMessage from "./ErrorMessage";
import { stillInSession } from "../utils/SessionStatus";
// Helper to convert object options {A: "text", B: "text"} to array ["text", "text"]
// preserving order A, B, C, D etc.
const transformOptionsToArray = (optionsObject) => {
  if (!optionsObject || typeof optionsObject !== "object") return [];
  return Object.entries(optionsObject)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by letter A, B, C...
    .map(([, value]) => value);
};

const ReviewScreen = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionDetails, setSessionDetails] = useState(null);
  const [reviewedQuestions, setReviewedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError("No session ID provided for review.");
      return;
    }

    const fetchSessionData = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentQuestionIndex(0); // Reset index when new session is loaded
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from("user_sessions")
          .select(
            "score_achieved, total_questions_in_session, category_selection, started_at, ended_at,time_limit_seconds"
          )
          .eq("id", sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error("Session not found.");
        setSessionDetails(sessionData);

        if (stillInSession(sessionData)) {
          navigate(`/session/${sessionId}`);
          return;
        }
        const { data: questionsData, error: questionsError } = await supabase
          .from("session_questions")
          .select(
            `
            order_in_session,
            user_answer_letter,
            is_correct,
            question_id,
            questions (
              questiontext,
              options, 
              correctanswerletter,
              explanation,
              category
            )
          `
          )
          .eq("user_session_id", sessionId)
          .order("order_in_session", { ascending: true });

        if (questionsError) throw questionsError;
        if (!questionsData)
          throw new Error("No questions found for this session.");

        const processedQuestions = questionsData.map((sq) => ({
          id: sq.question_id,
          orderInSession: sq.order_in_session,
          userAnswerLetter: sq.user_answer_letter,
          isCorrect: sq.is_correct,
          questiontext: sq.questions.questiontext,
          category: sq.questions.category,
          options: transformOptionsToArray(sq.questions.options), // Transform options to array
          correctanswerletter: sq.questions.correctanswerletter,
          explanation: sq.questions.explanation,
        }));
        setReviewedQuestions(processedQuestions);
      } catch (err) {
        console.error("Error fetching review data:", err);
        setError(err.message || "Failed to load review data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const handleNext = () => {
    setCurrentQuestionIndex((prevIndex) =>
      Math.min(prevIndex + 1, reviewedQuestions.length - 1)
    );
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleGoToQuestion = (index) => {
    if (index >= 0 && index < reviewedQuestions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const handleExplanationGenerated = (questionId, newExplanation) => {
    setReviewedQuestions((prevQuestions) =>
      prevQuestions.map((q) =>
        q.id === questionId ? { ...q, explanation: newExplanation } : q
      )
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background text-text-primary">
        <Spinner size="h-16 w-16" />
        <p className="text-xl mt-4">Loading session review...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <ErrorMessage
          message={
            error || "An unexpected error occurred while loading the review."
          }
        />
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!sessionDetails || reviewedQuestions.length === 0) {
    // This state is hit after loading is complete and no error, but data is missing.
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <ErrorMessage message="No review data is available for this session, or the session was empty." />
        <button
          onClick={() => navigate("/dashboard")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const currentQuestionToDisplay = reviewedQuestions[currentQuestionIndex];
  const scorePercentage =
    sessionDetails.total_questions_in_session > 0
      ? (
          (sessionDetails.score_achieved /
            sessionDetails.total_questions_in_session) *
          100
        ).toFixed(1)
      : 0;

  const navButtonClasses =
    "bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm";
  const questionNavButtonBase =
    "w-10 h-10 flex items-center justify-center border rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50";

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background text-text-primary min-h-screen flex flex-col">
      {/* Header: Session Summary & Back Button */}
      <header className="mb-6 pb-4 border-b border-gray-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary">
            Session Review
            <span className="text-text-secondary font-normal ml-2 text-xl">
              ({currentQuestionIndex + 1} / {reviewedQuestions.length})
            </span>
          </h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="border-2 border-accent text-accent hover:bg-orange-100 hover:text-orange-700 font-semibold py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-50 text-sm flex items-center"
          >
            <FaArrowLeft className="h-4 w-4 mr-2" /> Go to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-text-primary mb-6">
          <div className="bg-background p-3 rounded-lg shadow border border-gray-300">
            <span className="font-semibold text-text-secondary">Date:</span>{" "}
            {formatDate(sessionDetails.started_at)}
          </div>
          <div className="bg-background p-3 rounded-lg shadow border border-gray-300">
            <span className="font-semibold text-text-secondary">Category:</span>{" "}
            {sessionDetails.category_selection}
          </div>
          <div className="bg-background p-3 rounded-lg shadow border border-gray-300">
            <span className="font-semibold text-text-secondary">Score:</span>{" "}
            {sessionDetails.score_achieved} /{" "}
            {sessionDetails.total_questions_in_session} ({scorePercentage}%)
          </div>
        </div>
      </header>

      {/* Question Jump Navigation */}
      <nav className="mb-6">
        <p className="text-sm font-medium text-text-primary mb-2 text-center sm:text-left">
          Jump to question:
        </p>
        <div className="flex flex-wrap justify-center gap-2 p-2 bg-background rounded-md shadow-sm border border-gray-300">
          {reviewedQuestions.map((q, index) => {
            let qStatusClass =
              "border-gray-300 text-text-secondary hover:bg-gray-100 focus:ring-accent";
            // q.isCorrect refers to the correctness of the user's answer for this question
            if (
              q.userAnswerLetter === undefined ||
              q.userAnswerLetter === null ||
              q.userAnswerLetter === ""
            ) {
              qStatusClass =
                "border-yellow-500 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 focus:ring-yellow-500"; // Unanswered
            } else if (q.isCorrect) {
              qStatusClass =
                "border-green-500 bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500"; // Correct
            } else {
              qStatusClass =
                "border-red-500 bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500"; // Incorrect
            }

            if (index === currentQuestionIndex) {
              qStatusClass = `${qStatusClass} ring-2 ring-offset-1`;
              if (
                q.userAnswerLetter === undefined ||
                q.userAnswerLetter === null ||
                q.userAnswerLetter === ""
              )
                qStatusClass += " ring-yellow-600";
              else if (q.isCorrect) qStatusClass += " ring-green-600";
              else qStatusClass += " ring-red-600";
            }

            return (
              <button
                key={q.id}
                onClick={() => handleGoToQuestion(index)}
                className={`${questionNavButtonBase} ${qStatusClass}`}
                title={`Question ${index + 1}: ${
                  q.userAnswerLetter === undefined
                    ? "Unanswered"
                    : q.isCorrect
                    ? "Correct"
                    : "Incorrect"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content: Question Card */}
      <main className="flex-grow">
        {currentQuestionToDisplay && (
          <QuestionCard
            key={currentQuestionToDisplay.id}
            questionNumber={currentQuestionIndex + 1}
            question={currentQuestionToDisplay} // Pass the whole question object
            userAnswer={currentQuestionToDisplay.userAnswerLetter} // Pass the user's answer letter
            isReviewMode={true}
            onExplanationGenerated={handleExplanationGenerated}
          />
        )}
      </main>

      {/* Footer: Prev/Next Navigation */}
      <footer className="mt-6 py-4 border-t border-gray-300">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            className={navButtonClasses}
          >
            <FaArrowLeft className="h-4 w-4 mr-2" /> Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentQuestionIndex === reviewedQuestions.length - 1}
            className={navButtonClasses}
          >
            Next <FaArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ReviewScreen;
