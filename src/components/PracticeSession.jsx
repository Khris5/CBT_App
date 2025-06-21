import { useEffect, useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Timer from "./Timer";
import QuestionCard from "./QuestionCard";
import Spinner from "./Spinner";
import ErrorMessage from "./ErrorMessage";
import { stillInSession } from "../utils/SessionStatus";
// Helper to transform options from DB object to array for QuestionCard
const transformOptionsToArray = (optionsObject) => {
  if (!optionsObject || typeof optionsObject !== "object") return [];
  return Object.entries(optionsObject)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([, value]) => value);
};

const PracticeSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionConfig, setSessionConfig] = useState(null);
  const [questionsList, setQuestionsList] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sessionEndedRef = useRef(false);

  // Load initial state (answers, currentIndex) from localStorage
  useEffect(() => {
    if (sessionId) {
      try {
        const savedState = localStorage.getItem(`practiceState_${sessionId}`);
        if (savedState) {
          const { currentIndex, answers } = JSON.parse(savedState);
          setCurrentQuestionIndex(currentIndex || 0);
          setUserAnswers(answers || {});
        }
      } catch (e) {
        console.error("Failed to load practice state from localStorage:", e);
        // Proceed with default empty state
      }
    }
  }, [sessionId]);

  // Save current state (answers, currentIndex) to localStorage
  useEffect(() => {
    if (sessionId && !isLoading) {
      // Avoid saving during initial load before data is ready
      try {
        localStorage.setItem(
          `practiceState_${sessionId}`,
          JSON.stringify({
            currentIndex: currentQuestionIndex,
            answers: userAnswers,
          })
        );
      } catch (e) {
        console.error("Failed to save practice state to localStorage:", e);
      }
    }
  }, [sessionId, currentQuestionIndex, userAnswers, isLoading]);

  // Fetch session data and questions
  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchSessionData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // 1. Fetch session configuration
        const { data: sessionData, error: sessionError } = await supabase
          .from("user_sessions")
          .select(
            "time_limit_seconds, started_at, ended_at, category_selection, total_questions_in_session, user_id"
          )
          .eq("id", sessionId)
          .single();

        if (sessionError)
          throw new Error(
            `Failed to load session configuration. Please try refreshing. (Details: ${sessionError.message})`
          );
        if (!sessionData)
          throw new Error(
            "Could not find the session details. It might have been removed or the link is incorrect."
          );
        if (!stillInSession(sessionData)) {
          navigate(`/results/${sessionId}`);
          return;
        }
        setSessionConfig(sessionData);

        // 2. Fetch questions for the session
        const { data: sessionQuestionsData, error: questionsError } =
          await supabase
            .from("session_questions")
            .select(
              "id, question_id, order_in_session, questions (id, questiontext, options, correctanswerletter, explanation)"
            )
            .eq("user_session_id", sessionId)
            .order("order_in_session", { ascending: true });

        if (questionsError)
          throw new Error(
            `Failed to load questions for this session. Please try refreshing. (Details: ${questionsError.message})`
          );
        if (!sessionQuestionsData || sessionQuestionsData.length === 0)
          throw new Error(
            "No questions are available for this session. Please check the session setup."
          );
        const formattedQuestions = sessionQuestionsData.map((sq) => ({
          ...sq.questions,
          options: transformOptionsToArray(sq.questions.options), // Ensure options are an array
          session_question_id: sq.id,
          order_in_session: sq.order_in_session,
        }));

        setQuestionsList(formattedQuestions);
      } catch (err) {
        console.error("Error in fetchSessionData:", err);
        setError(
          err.message ||
            "An unexpected error occurred while loading session data. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const handleAnswerChange = useCallback(
    (questionId, selectedLetter) => {
      setUserAnswers((prevAnswers) => ({
        ...prevAnswers,
        [questionId]: selectedLetter,
      }));
    },
    [setUserAnswers]
  );

  const handleSessionSubmit = useCallback(async () => {
    if (sessionEndedRef.current || !questionsList.length || !sessionConfig)
      return;
    sessionEndedRef.current = true;
    setIsSubmitting(true);
    setError(null); // Clear previous submission errors

    try {
      let score = 0;
      const sessionQuestionUpdates = questionsList.map((q) => {
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correctanswerletter;
        if (isCorrect) {
          score++;
        }
        return {
          id: q.session_question_id,
          question_id: q.id,
          user_answer_letter: userAnswer || null,
          order_in_session: q.order_in_session,
          is_correct: isCorrect,
          user_session_id: sessionId,
        };
      });

      // Update session_questions with answers and correctness
      const { error: updateError } = await supabase
        .from("session_questions")
        .upsert(sessionQuestionUpdates, { onConflict: "id" });

      if (updateError)
        throw new Error(
          `Failed to save your answers. Please try submitting again. (Details: ${updateError.message})`
        );

      // Update user_sessions with score
      const { error: sessionUpdateError } = await supabase
        .from("user_sessions")
        .update({
          score_achieved: score,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (sessionUpdateError)
        throw new Error(
          `Failed to finalize your session. Please try submitting again. (Details: ${sessionUpdateError.message})`
        );

      // Clear localStorage for this session
      localStorage.removeItem(`practiceState_${sessionId}`);
      navigate(`/results/${sessionId}`);
    } catch (err) {
      console.error("Error submitting session:", err);
      setError(
        err.message ||
          "An unexpected error occurred while submitting your session. Please try again."
      );
      sessionEndedRef.current = false;
    } finally {
      setIsSubmitting(false);
    }
  }, [sessionId, userAnswers, questionsList, navigate, sessionConfig]);

  const handleTimeUp = useCallback(() => {
    if (!sessionEndedRef.current) {
      handleSessionSubmit();
    }
  }, [handleSessionSubmit]);

  const handleNext = () => {
    setCurrentQuestionIndex((prevIndex) =>
      Math.min(prevIndex + 1, questionsList.length - 1)
    );
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleGoToQuestion = (index) => {
    if (index >= 0 && index < questionsList.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // --- Render Logic Starts Here ---

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background text-text-primary">
        <Spinner size="h-12 w-12" />
        <p className="text-xl mt-4">Loading session...</p>
      </div>
    );
  }

  // Use 'error' state for fetch errors; submission errors are handled via 'submissionErrorMessage' below
  if (error && !isSubmitting) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <ErrorMessage message={error} />
        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  if (!sessionConfig || questionsList.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <ErrorMessage message="Session data is incomplete or no questions are available. Please try starting a new session." />
        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const currentQuestion = questionsList[currentQuestionIndex];
  // This case should ideally not be reached if the above checks are solid
  if (!currentQuestion) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4">
        <ErrorMessage message="Could not load the current question. Please try refreshing or return to homepage." />
        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const questionNavButtonBase =
    "w-10 h-10 flex items-center justify-center border rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed";

  // Submission error is specifically the 'error' state when 'isSubmitting' was true and failed.
  const submissionErrorMessage =
    error && sessionEndedRef.current === false && isSubmitting === false;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-background text-text-primary min-h-screen flex flex-col">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b border-gray-300">
        <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-3 sm:mb-0">
          {sessionConfig.category_selection || "Practice Test"}{" "}
          <span className="text-gray-600 font-normal">
            ({currentQuestionIndex + 1} / {questionsList.length})
          </span>
        </h1>
        {sessionConfig.started_at && sessionConfig.time_limit_seconds && (
          <Timer
            totalDuration={sessionConfig.time_limit_seconds}
            startTimeISO={sessionConfig.started_at}
            onTimeUp={handleTimeUp}
          />
        )}
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

      <nav className="mt-6 py-4 border-t border-gray-300">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0 || isSubmitting}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-text-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            &larr; Previous
          </button>
          <button
            onClick={handleNext}
            disabled={
              currentQuestionIndex === questionsList.length - 1 || isSubmitting
            }
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-text-primary bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next &rarr;
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-text-primary mb-2 text-center sm:text-left">
            Go to question:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {questionsList.map((q, index) => {
              let qNavBtnClasses = `${questionNavButtonBase} border-gray-300 text-text-primary hover:bg-gray-100 focus:ring-accent focus:ring-offset-2`;
              if (userAnswers[q.id] !== undefined) {
                qNavBtnClasses = `${questionNavButtonBase} border-accent bg-orange-50 text-accent hover:bg-orange-100 focus:ring-accent focus:ring-offset-2`;
              }
              if (index === currentQuestionIndex) {
                qNavBtnClasses = `${questionNavButtonBase} bg-accent text-white border-accent ring-2 ring-orange-600 ring-offset-2`;
              }
              return (
                <button
                  key={q.id}
                  onClick={() => handleGoToQuestion(index)}
                  className={qNavBtnClasses}
                  title={`Go to question ${index + 1}`}
                  disabled={isSubmitting}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        {submissionErrorMessage && (
          <div className="my-4">
            <ErrorMessage message={error} />{" "}
            {/* Display the actual error message for submission failure */}
          </div>
        )}
        <div className="text-center">
          <button
            onClick={handleSessionSubmit}
            disabled={isSubmitting || sessionEndedRef.current}
            className="bg-accent hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            {isSubmitting ? "Submitting..." : "Submit All Answers"}
          </button>
        </div>
      </nav>
    </div>
  );
};

export default PracticeSession;
