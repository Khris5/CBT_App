import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ConfigScreen from "../components/ConfigScreen";
import LoginPromptModal from "../components/Modals/LoginPromptModal";
import { ShuffleArray } from "../utils/ShuffleArray"; 
import validateQuestion from "../utils/ValidateQuestions"; 
import { FaSpinner, FaExclamationCircle } from "react-icons/fa";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startSessionError, setStartSessionError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchAndPrepareQuestions = useCallback(async (category, numQuestions) => {
    let query = supabase
      .from('questions')
      .select('id, questiontext, options, correctanswerletter, explanation, category');

    if (category === "Medicine Only") query = query.eq('category', 'Medicine');
    else if (category === "Surgery Only") query = query.eq('category', 'Surgery');
    else if (category === "Combined") query = query.or('category.eq.Medicine,category.eq.Surgery');

    const { data: allMatchingQuestions, error: queryError } = await query;

    if (queryError) throw new Error(`Database query failed: ${queryError.message}`);
    if (!allMatchingQuestions || allMatchingQuestions.length === 0) throw new Error("No questions found for the selected criteria.");

    const validatedQuestions = allMatchingQuestions.filter(validateQuestion);
    if (validatedQuestions.length === 0) throw new Error("No valid questions found after filtering.");
    
    const shuffledQuestions = ShuffleArray(validatedQuestions);
    return shuffledQuestions.slice(0, Math.min(numQuestions, shuffledQuestions.length));
  }, []);


  const handleStartSession = useCallback(async (config) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    setIsStartingSession(true);
    setStartSessionError(null);

    try {
      const fetchedQuestions = await fetchAndPrepareQuestions(config.category, config.numQuestions);
      if (fetchedQuestions.length === 0) {
        throw new Error("No questions could be prepared for the session.");
      }
      
      // 1. Create User Session
      const { data: sessionData, error: sessionError } = await supabase
        .from("user_sessions")
        .insert({
          user_id: user.id,
          category_selection: config.category,
          time_limit_seconds: config.timeLimitMinutes * 60,
          total_questions_in_session: fetchedQuestions.length,
        })
        .select("id") // Select the new session ID
        .single();

      if (sessionError) throw new Error(`Failed to create session: ${sessionError.message}`);
      if (!sessionData || !sessionData.id) throw new Error("Session creation did not return an ID.");
      
      const newSessionId = sessionData.id;

      // 2. Prepare and Insert Session Questions
      const sessionQuestionsToInsert = fetchedQuestions.map((question, index) => ({
        user_session_id: newSessionId,
        question_id: question.id,
        order_in_session: index + 1,
        // user_answer_letter and is_correct will be updated during/after the session
      }));

      const { error: sqError } = await supabase
        .from("session_questions")
        .insert(sessionQuestionsToInsert);

      if (sqError) {
        // Attempt to clean up the created user_session if questions fail
        await supabase.from('user_sessions').delete().eq('id', newSessionId);
        throw new Error(`Failed to link questions to session: ${sqError.message}`);
      }
      
      // Navigate to the practice session route
      navigate(`/session/${newSessionId}`);

    } catch (error) {
      console.error("Error starting session:", error);
      setStartSessionError(error.message || "An unknown error occurred while starting the session.");
    } finally {
      setIsStartingSession(false);
    }
  }, [user, navigate, fetchAndPrepareQuestions]);

  const handleCloseLoginModal = useCallback(() => setShowLoginModal(false), []);

  if (authLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-gray-700">
        <FaSpinner className="animate-spin h-12 w-12 mb-4 text-indigo-600" />
        <p className="text-xl">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6 bg-gray-50 min-h-screen flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-8 text-gray-800">
          NMC Prep CBT
        </h1>

        {startSessionError && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg shadow">
            <div className="flex items-center">
              <FaExclamationCircle className="h-5 w-5 mr-3 text-red-500" />
              <span>{startSessionError}</span>
            </div>
          </div>
        )}

        {isStartingSession && (
          <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg shadow flex items-center justify-center">
            <FaSpinner className="animate-spin h-5 w-5 mr-3" />
            <span>Preparing your practice session...</span>
          </div>
        )}
        
        {!isStartingSession && (
            <ConfigScreen
                onStartSession={handleStartSession}
                isLoading={isStartingSession} // Pass this down if ConfigScreen needs to disable its button
            />
        )}

        <LoginPromptModal
          isOpen={showLoginModal}
          onClose={handleCloseLoginModal}
          onSignIn={signInWithGoogle}
        />
      </div>
    </div>
  );
};

export default HomePage;