import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "../App.css";
import ConfigScreen from "../components/ConfigScreen";
import PracticeSession from "../components/PracticeSession";
import ResultsScreen from "../components/ResultsScreen";
import ReviewScreen from "../components/ReviewScreen";
import LoginPromptModal from "../components/Modals/LoginPromptModal";
import { ShuffleArray } from "../utils/ShuffleArray";
import validateQuestion from "../utils/ValidateQuestions";


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
      activeUserSessionId: state.activeUserSessionId,
    };
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
  } catch (err) {
    console.error("Could not save state to localStorage", err);
  }
};



const HomePage = () => {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

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
      activeUserSessionId: loaded?.activeUserSessionId || null,
    };
  }, []);

  const [view, setView] = useState(initialState.view);
  const [sessionConfig, setSessionConfig] = useState(
    initialState.sessionConfig
  );
  const [sessionQuestions, setsessionQuestions] = useState(
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
  const [activeUserSessionId, setActiveUserSessionId] = useState(
    initialState.activeUserSessionId
  );

  // State for authentication modal and session management
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isFetchingQuestions, setIsFetchingQuestions] = useState(false);
  const [startSessionError, setStartSessionError] = useState(null);

  // Save state to localStorage when it changes
  useEffect(() => {
    saveState({
      view,
      sessionConfig,
      sessionQuestions,
      userAnswers,
      results,
      currentQuestionIndex,
      sessionStartTime,
      activeUserSessionId,
    });
  }, [
    view,
    sessionConfig,
    sessionQuestions,
    userAnswers,
    results,
    currentQuestionIndex,
    sessionStartTime,
    activeUserSessionId,
  ]);

  // Function to fetch questions from Supabase based on category and number
  const fetchQuestionsFromDatabase = useCallback(async (category, numQuestions) => {
    setIsFetchingQuestions(true);
    
    try {
      let query = supabase
        .from('questions')
        .select('id, questiontext, options, correctanswerletter, explanation, category');

      // Apply category filter
      if (category === "Medicine Only") {
        query = query.eq('category', 'Medicine');
      } else if (category === "Surgery Only") {
        query = query.eq('category', 'Surgery');
      } else if (category === "Combined") {
        query = query.or('category.eq.Medicine,category.eq.Surgery');
      }

      // Execute the query
      const { data: allMatchingQuestions, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        throw new Error(`Database query failed: ${error.message}`);
      }

      if (!allMatchingQuestions || allMatchingQuestions.length === 0) {
        throw new Error(`No questions found for category: ${category}`);
      }

      // Validate questions
      const validQuestions = allMatchingQuestions.filter(validateQuestion);
      console.log("Valid questions:", validQuestions);
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in the database');
      }

      // Check if we have enough questions
      if (validQuestions.length < numQuestions) {
        console.warn(`Requested ${numQuestions} questions, but only ${validQuestions.length} available for ${category}`);
      }

      // Randomize and select the required number of questions
      const shuffledQuestions = ShuffleArray(validQuestions);
      
      const selectedQuestions = shuffledQuestions.slice(0, Math.min(numQuestions, validQuestions.length));

      console.log(`Successfully fetched ${selectedQuestions.length} questions for category: ${category}`);
      
      return selectedQuestions;

    } catch (error) {
      console.error('Error fetching questions from database:', error);
      throw error;
    } finally {
      setIsFetchingQuestions(false);
    }
  }, []);

  // Handle session start with authentication check and question fetching
  const handleStartSession = useCallback(
    async (config) => {
      // Clear any previous errors
      setStartSessionError(null);

      // Check if user is authenticated
      if (!user) {
        setShowLoginModal(true);
        return;
      }

      // User is authenticated, proceed with session creation
      setIsStartingSession(true);

      try {
        // Create new session record in Supabase
        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            user_id: user.id,
            total_questions_in_session: config.numQuestions,
            time_limit_seconds: config.timeLimitSeconds,
            category_selection: config.category,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Error creating user session:", error);
          setStartSessionError(
            "Failed to create practice session. Please try again."
          );
          return;
        }

        const newSessionId = data.id;
        console.log("Created new user session with ID:", newSessionId);

        // Store session ID and config
        setActiveUserSessionId(newSessionId);
        setSessionConfig(config);

        // Fetch questions from database
        try {
          const fetchedQuestions = await fetchQuestionsFromDatabase(
            config.category, 
            config.numQuestions
          );

          // Store the fetched questions
          setsessionQuestions(fetchedQuestions);

          // Initialize other session state
          setUserAnswers({});
          setCurrentQuestionIndex(0);
          setSessionStartTime(Date.now());

          // Transition to practice session view
          setView("session");

          console.log("Session started successfully with", fetchedQuestions.length, "questions");

        } catch (questionError) {
          console.error("Error fetching questions:", questionError);
          setStartSessionError(
            questionError.message || "Failed to load questions. Please try again."
          );
          
          // Clean up the created session if question fetching fails
          // Note: In a production app, you might want to keep the session record for debugging
          // but mark it as failed, or delete it here
        }

      } catch (error) {
        console.error("Exception creating user session:", error);
        setStartSessionError("An unexpected error occurred. Please try again.");
      } finally {
        setIsStartingSession(false);
      }
    },
    [user, fetchQuestionsFromDatabase]
  );

  // Submit the practice session
  const submitSession = useCallback(
    (finalAnswers) => {
      if (!sessionQuestions.length) {
        console.error("No practice questions to evaluate");
        return;
      }

      let score = 0;
      sessionQuestions.forEach((q) => {
        const userAnswerLetter = finalAnswers[q.id];
        const correctAnswerLetter = q.correctanswerletter;

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
    setsessionQuestions([]);
    setUserAnswers({});
    setResults({ score: 0, total: 0 });
    setCurrentQuestionIndex(0);
    setSessionStartTime(null);
    setActiveUserSessionId(null);
    setStartSessionError(null);
  }, []);

  // Handle modal close
  const handleCloseLoginModal = useCallback(() => {
    setShowLoginModal(false);
  }, []);

  // Loading states
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-full py-10">
        <p>Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-text-primary">
        NMC Prep CBT
      </h1>

      {/* Display session creation error if any */}
      {startSessionError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {startSessionError}
        </div>
      )}

      {/* Display loading indicator when starting session or fetching questions */}
      {(isStartingSession || isFetchingQuestions) && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          {isStartingSession && !isFetchingQuestions && "Creating your practice session..."}
          {isFetchingQuestions && "Loading questions from database..."}
          {isStartingSession && isFetchingQuestions && "Setting up your practice session..."}
        </div>
      )}

      {view === "config" && (
        <ConfigScreen
          onStartSession={handleStartSession}
          isLoading={isStartingSession || isFetchingQuestions}
        />
      )}

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
          activeUserSessionId={activeUserSessionId}
          sessionConfig={sessionConfig}
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

      {/* Login Modal */}
      <LoginPromptModal
        isOpen={showLoginModal}
        onClose={handleCloseLoginModal}
        onSignIn={signInWithGoogle}
      />
    </div>
  );
};

export default HomePage;