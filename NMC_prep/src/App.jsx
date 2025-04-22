import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import ConfigScreen from "./components/ConfigScreen";
import PracticeSession from "./components/PracticeSession";
import ResultsScreen from "./components/ResultsScreen";
import ReviewScreen from "./components/ReviewScreen";

// Fisher-Yates (Knuth) Shuffle Algorithm
function shuffleArray(array) {
  let currentIndex = array.length,
    randomIndex;
  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

const QUESTION_COUNTS = [50, 60, 70, 80];
const TIME_LIMITS = {
  50: 30 * 60, // 30 minutes
  60: 35 * 60, // 35 minutes
  70: 40 * 60, // 40 minutes
  80: 45 * 60, // 45 minutes
};

function App() {
  const [view, setView] = useState("config"); // 'config', 'session', 'results', 'review'
  const [allQuestions, setAllQuestions] = useState([]);
  const [sessionConfig, setSessionConfig] = useState({
    count: QUESTION_COUNTS[0],
    timeLimit: TIME_LIMITS[QUESTION_COUNTS[0]],
  });
  const [sessionQuestions, setSessionQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [results, setResults] = useState({ score: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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

        // Combine and potentially add unique IDs if needed (assuming 'id' is unique across files for now)
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
      setUserAnswers({}); // Reset answers for new session
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
      setView("results");
    },
    [sessionQuestions]
  );

  const reviewAnswers = () => {
    setView("review");
  };

  const restartSession = () => {
    setView("config");
    // Reset other relevant states if necessary
    setSessionQuestions([]);
    setUserAnswers({});
    setResults({ score: 0, total: 0 });
  };

  if (isLoading) {
    return <div className="loading">Loading questions...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="App">
      <h1>NMC Prep CBT</h1>
      {view === "config" && (
        <ConfigScreen
          questionCounts={QUESTION_COUNTS}
          defaultCount={QUESTION_COUNTS[0]}
          onStartSession={startSession}
        />
      )}
      {view === "session" && (
        <PracticeSession
          questions={sessionQuestions}
          timeLimit={sessionConfig.timeLimit}
          onSubmit={submitSession}
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
        />
      )}
    </div>
  );
}

export default App;
