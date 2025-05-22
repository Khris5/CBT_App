import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext'; // Import useAuth hook
import "./App.css";
import ConfigScreen from "./components/ConfigScreen";
import PracticeSession from "./components/PracticeSession";
import ResultsScreen from "./components/ResultsScreen";
import ReviewScreen from "./components/ReviewScreen";

// Fisher-Yates (Knuth) Shuffle Algorithm
function shuffleArray(array) {
  let currentIndex = array.length,
    randomIndex;
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

const QUESTION_COUNTS = [20, 50, 60, 70, 80];
const TIME_LIMITS = {
  20: 20 * 60,
  50: 50 * 60, // 50 minutes
  60: 60 * 60, // 60 minutes
  70: 70 * 60, // 70 minutes
  80: 80 * 60, // 80 minutes
};

// --- LocalStorage Key ---
const LOCAL_STORAGE_KEY = "nmcPrepCbtState";

// --- Function to load state from LocalStorage ---
const loadState = () => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) {
      return undefined; // No state saved
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error("Could not load state from localStorage", err);
    return undefined; // Error loading state
  }
};

// --- Function to save state to LocalStorage ---
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

function App() {
  const { session, user, loading: authLoading, signInWithGoogle, signOut } = useAuth(); 
  // --- Load initial state from localStorage or set defaults ---
  console.log(user);
  console.log(authLoading);

  
  const initialAppState = loadState();
  const defaultState = {
    view: "config",
    sessionConfig: {
      count: QUESTION_COUNTS[0],
      timeLimit: TIME_LIMITS[QUESTION_COUNTS[0]],
    },
    sessionQuestions: [],
    userAnswers: {},
    results: { score: 0, total: 0 },
    currentQuestionIndex: 0,
    sessionStartTime: null,
  };

  const [view, setView] = useState(initialAppState?.view ?? defaultState.view);
  const [allQuestions, setAllQuestions] = useState([]);
  const [sessionConfig, setSessionConfig] = useState(
    initialAppState?.sessionConfig ?? defaultState.sessionConfig
  );
  const [sessionQuestions, setSessionQuestions] = useState(
    initialAppState?.sessionQuestions ?? defaultState.sessionQuestions
  );
  const [userAnswers, setUserAnswers] = useState(
    initialAppState?.userAnswers ?? defaultState.userAnswers
  );
  const [results, setResults] = useState(
    initialAppState?.results ?? defaultState.results
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    initialAppState?.currentQuestionIndex ?? defaultState.currentQuestionIndex
  );
  const [sessionStartTime, setSessionStartTime] = useState(
    initialAppState?.sessionStartTime ?? defaultState.sessionStartTime
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Effect to SAVE state whenever relevant parts change ---
  useEffect(() => {
    // Don't save while initially loading questions
    if (!isLoading) {
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
  ]);

  // Fetch question data on initial load
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

        // Basic validation (check if they are arrays)
        if (!Array.isArray(medicineData) || !Array.isArray(surgeryData)) {
          throw new Error("Invalid question data format.");
        }

        const combined = [...medicineData, ...surgeryData];
        // Simple check for duplicate IDs - log warning if found
        const ids = new Set();
        combined.forEach((q) => {
          if (ids.has(q.id)) {
            console.warn(`Duplicate question ID found: ${q.id}`);
          }
          ids.add(q.id);
        });

        setAllQuestions(combined);
      } catch (err) {
        console.error("Error fetching questions:", err);
        setError(
          err.message ||
            "Could not fetch questions. Please ensure JSON files are in the public directory."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const startSession = useCallback(
    (count) => {
      if (allQuestions.length === 0) {
        setError("Questions not loaded yet.");
        return;
      }
      if (count > allQuestions.length) {
        setError(
          `Not enough questions available (${allQuestions.length}) to start a session with ${count} questions.`
        );
        console.warn(
          `Attempted to start session with ${count} questions, but only ${allQuestions.length} are available.`
        );
        // Optionally adjust count or prevent start
        // For now, we proceed but log a warning, shuffle will handle it
      }

      const selectedCount = Math.min(count, allQuestions.length);
      const timeLimit = TIME_LIMITS[count] || TIME_LIMITS[QUESTION_COUNTS[0]]; // Fallback time

      const shuffled = shuffleArray([...allQuestions]);
      const selected = shuffled.slice(0, selectedCount);

      setSessionConfig({ count: selectedCount, timeLimit });
      setSessionQuestions(selected);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setSessionStartTime(Date.now());
      setView("session");
    },
    [allQuestions]
  );

  const submitSession = useCallback(
    (finalAnswers) => {
      let score = 0;
      console.log("--- Starting Submission ---");
      console.log("Final Answers Received (Letters):", finalAnswers);

      sessionQuestions.forEach((q, index) => {
        const userAnswerLetter = finalAnswers[q.id]; // Should be 'A', 'B', 'C', or undefined
        const correctAnswerLetter = q.correctAnswer; // Expected to be 'A', 'B', or 'C' from JSON

        console.log(`\n--- Question ${index + 1} (ID: ${q.id}) ---`);
        console.log(`User Answer:   '${userAnswerLetter}'`);
        console.log(`Correct Answer:'${correctAnswerLetter}'`);

        // Compare the letters
        if (
          userAnswerLetter &&
          userAnswerLetter.toLowerCase() === correctAnswerLetter.toLowerCase()
        ) {
          console.log("Result: CORRECT");
          score++;
        } else if (userAnswerLetter) {
          console.log("Result: INCORRECT");
        } else {
          console.log("Result: UNANSWERED");
        }
      });

      console.log("\n--- Submission Complete ---");
      console.log(`Final Score: ${score} / ${sessionQuestions.length}`);

      setResults({ score, total: sessionQuestions.length });
      setUserAnswers(finalAnswers); // Store the final answers (letters) for review
      setSessionStartTime(null);
      setView("results");
    },
    [sessionQuestions]
  );

  const reviewAnswers = () => {
    setView("review");
  };

  const restartSession = () => {
    setView("config");
    setSessionQuestions([]);
    setUserAnswers({});
    setResults({ score: 0, total: 0 });
    setCurrentQuestionIndex(0);
    setSessionStartTime(null);
  };

  if (isLoading) {
    return <div className="loading">Loading questions...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (authLoading) {
    return <div style={{ textAlign: 'center', marginTop: '50px', fontSize: '1.2em' }}>Loading authentication state...</div>;
  }

  return (
    <>
      {/* Authentication UI at the top */}
      <div style={{ padding: '10px', borderBottom: '1px solid #eee', marginBottom: '20px', textAlign: 'right' }}>
        {user ? (
          <>
            <span style={{ marginRight: '15px' }}>Logged in as: {user.email}</span>
            <button onClick={signOut} style={{ padding: '8px 12px', cursor: 'pointer' }}>Sign Out</button>
          </>
        ) : (
          <button onClick={signInWithGoogle} style={{ padding: '8px 12px', cursor: 'pointer' }}>Sign In with Google</button>
        )}
      </div>

      {/* Existing App Content */}
    <div className="App">
      <h1>NMC Prep CBT</h1>
      {view === "config" && (
        <ConfigScreen
          questionCounts={QUESTION_COUNTS}
          defaultCount={sessionConfig.count}
          onStartSession={startSession}
        />
      )}
      {view === "session" && (
        <PracticeSession
          questions={sessionQuestions}
          timeLimit={sessionConfig.timeLimit}
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
      {view === "review" && (
        <ReviewScreen
          questions={sessionQuestions}
          userAnswers={userAnswers}
          onRestart={restartSession}
          currentQuestionIndex={currentQuestionIndex}
          setCurrentQuestionIndex={setCurrentQuestionIndex}
        />
      )}
    </div>
    </>
  );
}

export default App;
