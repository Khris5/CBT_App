import { useEffect, useCallback, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import Timer from "./Timer";
import QuestionCard from "./QuestionCard";
import { FaSpinner, FaExclamationCircle } from "react-icons/fa";

// Helper to transform options from DB object to array for QuestionCard
const transformOptionsToArray = (optionsObject) => {
  if (!optionsObject || typeof optionsObject !== 'object') return [];
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
    if (sessionId && !isLoading) { // Avoid saving during initial load before data is ready
      try {
        localStorage.setItem(
          `practiceState_${sessionId}`,
          JSON.stringify({ currentIndex: currentQuestionIndex, answers: userAnswers })
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
          .select("time_limit_seconds, started_at, category_selection, total_questions_in_session, user_id")
          .eq("id", sessionId)
          .single();

        if (sessionError) throw new Error(`Error fetching session config: ${sessionError.message}`);
        if (!sessionData) throw new Error("Session configuration not found.");
        setSessionConfig(sessionData);

        // 2. Fetch questions for the session
        const { data: sessionQuestionsData, error: questionsError } = await supabase
          .from("session_questions")
          .select("id, question_id, order_in_session, questions (id, questiontext, options, correctanswerletter, explanation)")
          .eq("user_session_id", sessionId)
          .order("order_in_session", { ascending: true });

        if (questionsError) throw new Error(`Error fetching questions: ${questionsError.message}`);
        if (!sessionQuestionsData || sessionQuestionsData.length === 0) throw new Error("No questions found for this session.");
        const formattedQuestions = sessionQuestionsData.map(sq => ({
          ...sq.questions, 
          options: transformOptionsToArray(sq.questions.options), // Ensure options are an array
          session_question_id: sq.id,
          order_in_session: sq.order_in_session
        }));
        
        setQuestionsList(formattedQuestions);

      } catch (err) {
        console.error("Error in fetchSessionData:", err);
        setError(err.message || "Failed to load session data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const handleAnswerChange = useCallback((questionId, selectedLetter) => {  
    setUserAnswers((prevAnswers) => ({
      ...prevAnswers,
      [questionId]: selectedLetter,
    }));
  }, [setUserAnswers]);

  const handleSessionSubmit = useCallback(async () => {
    if (sessionEndedRef.current || !questionsList.length || !sessionConfig) return;
    sessionEndedRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      let score = 0;
      const sessionQuestionUpdates = questionsList.map(q => {
        // console.log(q);
        
        const userAnswer = userAnswers[q.id];
        const isCorrect = userAnswer === q.correctanswerletter;
        if (isCorrect) {
          score++;
        }
        return {
          id: q.session_question_id,
          question_id: q.id,
          user_answer_letter: userAnswer || null,
          order_in_session:q.order_in_session,
          is_correct: isCorrect,
          user_session_id: sessionId, 
        };
      });
      console.log("SessionQuestionUpdates", sessionQuestionUpdates);
      
      // Update session_questions with answers and correctness
      const { error: updateError } = await supabase
        .from("session_questions")
        .upsert(sessionQuestionUpdates, { onConflict: 'id' });
      
      if (updateError) throw new Error(`Error updating session questions: ${updateError.message}`);

      // Update user_sessions with score
      const { error: sessionUpdateError } = await supabase
        .from("user_sessions")
        .update({
          score_achieved: score,
          ended_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      if (sessionUpdateError) throw new Error(`Error updating session: ${sessionUpdateError.message}`);

      // Clear localStorage for this session
      localStorage.removeItem(`practiceState_${sessionId}`);
      
      navigate(`/results/${sessionId}`);

    } catch (err) {
      console.error("Error submitting session:", err);
      setError(err.message || "An error occurred while submitting your session.");
      sessionEndedRef.current = false; // Allow retry if submission failed
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
  
  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-gray-700">
        <FaSpinner className="animate-spin h-12 w-12 mb-4 text-indigo-600" />
        <p className="text-xl">Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 text-red-700 p-4">
        <FaExclamationCircle className="h-12 w-12 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error</h2>
        <p className="text-center mb-4">{error}</p>
        <button 
          onClick={() => navigate('/')} 
          className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition"
        >
          Go to Homepage
        </button>
      </div>
    );
  }
  
  if (!sessionConfig || questionsList.length === 0) {
     return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-gray-700 p-4">
        <FaExclamationCircle className="h-12 w-12 mb-4 text-yellow-500" />
        <p className="text-xl text-center">Session data is incomplete or questions are missing.</p>
         <button 
          onClick={() => navigate('/')} 
          className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const currentQuestion = questionsList[currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Loading question... (Current question not found)</div>
      </div>
    );
  }

  const baseButtonClasses = "px-6 py-2 rounded-md font-semibold text-white transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${baseButtonClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
  const navButtonClasses = "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
  const questionNavButtonBase = "w-10 h-10 flex items-center justify-center border rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50";


  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen flex flex-col">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-center pb-4 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0">
          {sessionConfig.category_selection || "Practice Test"}{" "}
          <span className="text-gray-500 font-normal">({currentQuestionIndex + 1} / {questionsList.length})</span>
        </h1>
        {sessionConfig.started_at && sessionConfig.time_limit_seconds && (
            <Timer
                totalDuration={sessionConfig.time_limit_seconds}
                startTimeISO={sessionConfig.started_at} // Pass ISO string directly
                onTimeUp={handleTimeUp}
            />
        )}
      </header>

      <main className="flex-grow">
        <QuestionCard
          key={currentQuestion.id} // Use question_id from questions table
          questionNumber={currentQuestionIndex + 1}
          question={currentQuestion} // Contains questiontext, options (as array), explanation, etc.
          userAnswer={userAnswers[currentQuestion.id]}
          onAnswerChange={handleAnswerChange}
          isReviewMode={false}
        />
      </main>

      <nav className="mt-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevious} disabled={currentQuestionIndex === 0 || isSubmitting} className={navButtonClasses}>
            &larr; Previous
          </button>
          <button onClick={handleNext} disabled={currentQuestionIndex === questionsList.length - 1 || isSubmitting} className={navButtonClasses}>
            Next &rarr;
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-2 text-center sm:text-left">Go to question:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {questionsList.map((q, index) => {
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
                  disabled={isSubmitting}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={handleSessionSubmit}
            disabled={isSubmitting || sessionEndedRef.current}
            className={`${primaryButtonClasses} w-full sm:w-auto`}
          >
            {isSubmitting ? "Submitting..." : "Submit All Answers"}
          </button>
        </div>
      </nav>
    </div>
  );
};

export default PracticeSession;