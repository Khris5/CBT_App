import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import "../App.css";
import ConfigScreen from "../components/ConfigScreen";
import PracticeSession from "../components/PracticeSession";
import ResultsScreen from "../components/ResultsScreen";
import ReviewScreen from "../components/ReviewScreen";

// Fisher-Yates (Knuth) Shuffle Algorithm
function shuffleArray(array) {
  const shuffled = [...array];
  let currentIndex = shuffled.length;
  while (currentIndex !== 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[currentIndex],
    ];
  }
  return shuffled;
}

const LOCAL_STORAGE_KEY = "nmcPrepCbtState";

// Safe localStorage operations with error handling
const loadState = () => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) return null;
    const parsed = JSON.parse(serializedState);
    // Validate loaded state structure
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error("Could not load state from localStorage", err);
    return null;
  }
};

const saveState = (state) => {
  try {
    const stateToSave = {
      view: state.view,
      sessionConfig: state.sessionConfig,
      sessionQuestions: state.sessionQuestions,
      userAnswers: state.userAnswers,
      results: state.results,
      currentQuestionIndex: state.currentQuestionIndex,
      sessionStartTime: state.sessionStartTime,
    };
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state to localStorage", err);
  }
};

// Validate question structure
const validateQuestion = (question) => {
  return (
    question &&
    typeof question === "object" &&
    typeof question.questionText === "string" &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    typeof question.correctAnswer === "string" &&
    (question.id !== undefined || question.global_id !== undefined)
  );
};

const HomePage = () => {
  const { loading: authLoading } = useAuth();

  // Initialize state with proper defaults
  const initialState = useMemo(() => {
    const loaded = loadState();
    return {
      view: loaded?.view || "config",
      sessionConfig: loaded?.sessionConfig || null,
      sessionQuestions: loaded?.sessionQuestions || [],
      userAnswers: loaded?.userAnswers || {},
      results: loaded?.results || { score: 0, total: 0 },
      currentQuestionIndex: loaded?.currentQuestionIndex || 0,
      sessionStartTime: loaded?.sessionStartTime || null,
    };
  }, []);

  const [view, setView] = useState(initialState.view);
  const [allQuestions, setAllQuestions] = useState([]);
  const [sessionConfig, setSessionConfig] = useState(
    initialState.sessionConfig
  );
  const [sessionQuestions, setSessionQuestions] = useState(
    initialState.sessionQuestions
  );
  const [userAnswers, setUserAnswers] = useState(initialState.userAnswers);
  const [results, setResults] = useState(initialState.results);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    initialState.currentQuestionIndex
  );
  const [sessionStartTime, setSessionStartTime] = useState(
    initialState.sessionStartTime
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [medicineRes, surgeryRes] = await Promise.all([
          fetch("/medicine_questions.json"),
          fetch("/surgery_questions.json"),
        ]);

        if (!medicineRes.ok || !surgeryRes.ok) {
          throw new Error("Failed to load question data.");
        }

        const medicineData = await medicineRes.json();
        const surgeryData = await surgeryRes.json();

        if (!Array.isArray(medicineData) || !Array.isArray(surgeryData)) {
          throw new Error("Invalid question data format.");
        }

        // Normalize questions and ensure consistent ID structure
        const normalizeQuestions = (questions, category) => {
          return questions
            .map((q, index) => ({
              ...q,
              id: q.id || q.global_id || `${category}_${index}`,
              category,
            }))
            .filter(validateQuestion);
        };

        const normalizedMedicine = normalizeQuestions(medicineData, "medicine");
        const normalizedSurgery = normalizeQuestions(surgeryData, "surgery");

        const combined = [...normalizedMedicine, ...normalizedSurgery];

        if (combined.length === 0) {
          throw new Error("No valid questions found.");
        }

        setAllQuestions(combined);
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError(err.message || "Could not fetch questions.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // Save state to localStorage when it changes (but not during initial load)
  useEffect(() => {
    if (!isLoading && allQuestions.length > 0) {
      saveState({
        view,
        sessionConfig,
        sessionQuestions,
        userAnswers,
        results,
        currentQuestionIndex,
        sessionStartTime,
      });
    }
  }, [
    view,
    sessionConfig,
    sessionQuestions,
    userAnswers,
    results,
    currentQuestionIndex,
    sessionStartTime,
    isLoading,
    allQuestions.length,
  ]);

  // Filter questions based on category
  const filterQuestions = useCallback((questions, category) => {
    switch (category) {
      case "Medicine Only":
        return questions.filter((q) => q.category === "medicine");
      case "Surgery Only":
        return questions.filter((q) => q.category === "surgery");
      case "Combined":
      default:
        return questions;
    }
  }, []);

  // Start a new practice session
  const startSession = useCallback(
    (config) => {
      if (allQuestions.length === 0) {
        setError("Questions not loaded yet.");
        return;
      }

      const { numQuestions, category, timeLimitSeconds } = config;

      // Filter questions by category
      const availableQuestions = filterQuestions(allQuestions, category);

      if (availableQuestions.length === 0) {
        setError(`No questions available for category: ${category}`);
        return;
      }

      const selectedCount = Math.min(numQuestions, availableQuestions.length);

      if (numQuestions > availableQuestions.length) {
        console.warn(
          `Requested ${numQuestions} questions, but only ${availableQuestions.length} available in ${category}. Starting with ${selectedCount}.`
        );
      }

      const shuffled = shuffleArray(availableQuestions);
      const selected = shuffled.slice(0, selectedCount);

      const newSessionConfig = {
        numQuestions: selectedCount,
        category,
        timeLimitSeconds,
      };

      setSessionConfig(newSessionConfig);
      setSessionQuestions(selected);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setSessionStartTime(Date.now());
      setView("session");
    },
    [allQuestions, filterQuestions]
  );

  // Submit the practice session
  const submitSession = useCallback(
    (finalAnswers) => {
      if (!sessionQuestions.length) {
        console.error("No session questions to evaluate");
        return;
      }

      let score = 0;
      sessionQuestions.forEach((q) => {
        const userAnswerLetter = finalAnswers[q.id];
        const correctAnswerLetter = q.correctAnswer;

        if (
          userAnswerLetter &&
          correctAnswerLetter &&
          userAnswerLetter.toLowerCase() === correctAnswerLetter.toLowerCase()
        ) {
          score++;
        }
      });

      setResults({ score, total: sessionQuestions.length });
      setUserAnswers(finalAnswers);
      setSessionStartTime(null);
      setView("results");
    },
    [sessionQuestions]
  );

  // Navigate to review screen
  const reviewAnswers = useCallback(() => {
    setCurrentQuestionIndex(0); // Reset to first question for review
    setView("review");
  }, []);

  // Restart the application
  const restartSession = useCallback(() => {
    setView("config");
    setSessionConfig(null);
    setSessionQuestions([]);
    setUserAnswers({});
    setResults({ score: 0, total: 0 });
    setCurrentQuestionIndex(0);
    setSessionStartTime(null);
    setError(null);
  }, []);

  // Loading states
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <p>Loading authentication...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <p>Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-text-primary">
        NMC Prep CBT
      </h1>

      {view === "config" && <ConfigScreen onStartSession={startSession} />}

      {view === "session" && sessionQuestions.length > 0 && sessionConfig && (
        <PracticeSession
          questions={sessionQuestions}
          timeLimit={sessionConfig.timeLimitSeconds}
          startTime={sessionStartTime}
          onSubmit={submitSession}
          currentQuestionIndex={currentQuestionIndex}
          setCurrentQuestionIndex={setCurrentQuestionIndex}
          userAnswers={userAnswers}
          setUserAnswers={setUserAnswers}
        />
      )}

      {view === "results" && (
        <ResultsScreen
          score={results.score}
          total={results.total}
          onReview={reviewAnswers}
          onRestart={restartSession}
        />
      )}

      {view === "review" && sessionQuestions.length > 0 && (
        <ReviewScreen
          questions={sessionQuestions}
          userAnswers={userAnswers}
          onRestart={restartSession}
          currentQuestionIndex={currentQuestionIndex}
          setCurrentQuestionIndex={setCurrentQuestionIndex}
        />
      )}
    </div>
  );
};

export default HomePage;
