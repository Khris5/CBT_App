import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import ConfigScreen from "../components/ConfigScreen";
import LoginPromptModal from "../components/Modals/LoginPromptModal";
import validateQuestion from "../utils/ValidateQuestions";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import {
  createUserSession_supabase,
  createSessionQuestions_supabase,
} from "../supabase/SupabaseQueries";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [startSessionError, setStartSessionError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const fetchAndPrepareQuestions = useCallback(
    async (category, numQuestions) => {
      let categories;
      switch (category) {
        case "Medicine Only":
          categories = ["Medicine"];
          break;
        case "Surgery Only":
          categories = ["Surgery"];
          break;
        case "General Only":
          categories = ["General"];
          break;
        case "Combined":
          categories = ["Medicine", "Surgery", "General"];
          break;
        default:
          categories = null;
      }

      const { data: allMatchingQuestions, error: queryError } =
        await supabase.rpc("get_random_questions", {
          num_questions: numQuestions,
          categories: categories,
        });

      console.log("allMatchingQuestions", allMatchingQuestions);
      if (queryError)
        throw new Error(`Database query failed: ${queryError.message}`);
      if (!allMatchingQuestions || allMatchingQuestions.length === 0)
        throw new Error("No questions found for the selected criteria.");

      const validatedQuestions = allMatchingQuestions.filter(validateQuestion);
      if (validatedQuestions.length === 0)
        throw new Error("No valid questions found after filtering.");

      return validatedQuestions;
    },
    []
  );

  const handleStartSession = useCallback(
    async (config) => {
      if (!user) {
        setShowLoginModal(true);
        return;
      }

      setIsStartingSession(true);
      setStartSessionError(null);

      try {
        const fetchedQuestions = await fetchAndPrepareQuestions(
          config.category,
          config.numQuestions
        );
        if (fetchedQuestions.length === 0) {
          throw new Error("No questions could be prepared for the session.");
        }
        const userSessionsData = {
          user_id: user.id,
          category_selection: config.category,
          time_limit_seconds: config.timeLimitMinutes * 60,
          total_questions_in_session: fetchedQuestions.length,
        };
        // 1. Create User Session
        const { sessionData, sessionError } = await createUserSession_supabase(
          userSessionsData
        );

        if (sessionError)
          throw new Error(`Failed to create session: ${sessionError.message}`);
        if (!sessionData || !sessionData.id)
          throw new Error("Session creation did not return an ID.");

        const newSessionId = sessionData.id;

        // 2. Prepare and Insert Session Questions
        const sessionQuestionsToInsert = fetchedQuestions.map(
          (question, index) => ({
            user_session_id: newSessionId,
            question_id: question.id,
            order_in_session: index + 1,
          })
        );

        const { sqError } = await createSessionQuestions_supabase(
          sessionQuestionsToInsert
        );
        if (sqError) {
          // Attempt to clean up the created user_session if questions fail
          await supabase.from("user_sessions").delete().eq("id", newSessionId);
          throw new Error(
            `Failed to link questions to session: ${sqError.message}`
          );
        }

        // Navigate to the practice session route
        navigate(`/session/${newSessionId}`);
      } catch (error) {
        console.error("Error starting session:", error);
        setStartSessionError(
          error.message ||
            "An unknown error occurred while starting the session."
        );
      } finally {
        setIsStartingSession(false);
      }
    },
    [user, navigate, fetchAndPrepareQuestions]
  );

  const handleCloseLoginModal = useCallback(() => setShowLoginModal(false), []);

  if (authLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background text-text-primary">
        <Spinner size="h-12 w-12" />
        <p className="text-xl mt-4">Loading authentication...</p>
      </div>
    );
  }

  return (
    <div className="flex-grow p-4 md:p-6 bg-background min-h-screen flex flex-col items-center">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl sm:text-4xl text-center font-bold mb-8 text-text-primary">
          Hello,{" "}
          <span className="text-accent">
            {user
              ? ` ${user.user_metadata.full_name.trim().split(/\s+/)[1]}`
              : `User`}
          </span>
          !
        </h1>
        <p className="text-lg text-gray-600 text-center mb-8">
          Configure your practice session below
        </p>

        {startSessionError && (
          <div className="mb-6">
            <ErrorMessage message={startSessionError} />
          </div>
        )}

        {isStartingSession && (
          <div className="mb-6 p-4 bg-gray-100 border border-gray-300 text-text-primary rounded-lg shadow flex flex-col items-center justify-center">
            <Spinner size="h-8 w-8" />
            <span className="mt-3">Preparing your practice session...</span>
          </div>
        )}

        {!isStartingSession && (
          <>
            <ConfigScreen
              onStartSession={handleStartSession}
              isLoading={isStartingSession} // Pass this down if ConfigScreen needs to disable its button
            />
            {user && (
              <div className="text-sm text-gray-600 flex justify-center">
                Signed in as
                <span className="font-bold text-text-primary">
                  {user?.user_metadata.email}
                </span>
                (via Google)
              </div>
            )}
          </>
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
