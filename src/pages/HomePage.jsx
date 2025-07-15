import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import { generateQuestionsForTopic } from "../lib/googleAPI";
import ConfigScreen from "../components/ConfigScreen";
import TopicPracticeConfig from "../components/TopicPracticeConfig";
import LoginPromptModal from "../components/Modals/LoginPromptModal";
import validateQuestion from "../utils/ValidateQuestions";
import Spinner from "../components/Spinner";
import ErrorMessage from "../components/ErrorMessage";
import {
  createUserSession_supabase,
  createSessionQuestions_supabase,
  insertQuestions_supabase,
} from "../supabase/SupabaseQueries";

const HomePage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [startSessionError, setStartSessionError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [practiceMode, setPracticeMode] = useState("mock"); // 'mock' or 'topic'

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

  const handleStartTopicPracticeSession = useCallback(
    async (config) => {
      if (!user) {
        setShowLoginModal(true);
        return;
      }

      setIsStartingSession(true);
      setErrorMessage("");

      const { numQuestions, topics, timeLimitMinutes } = config;
      try {
        // 1. Generate questions with AI
        setLoadingMessage(
          `Generating ${numQuestions} questions on selected topics...`
        );
        const generatedQuestions = await generateQuestionsForTopic(
          topics,
          numQuestions
        );
        if (!generatedQuestions || generatedQuestions.length === 0) {
          throw new Error(
            "The AI failed to generate questions. Please adjust topics or try again."
          );
        }

        // 2. Insert questions into Supabase
        setLoadingMessage("Saving new questions...");
        const { data: insertedQuestions, error: insertError } =
          await insertQuestions_supabase(generatedQuestions);
        if (insertError) {
          throw new Error(`Failed to save questions: ${insertError.message}`);
        }

        // 3. Create a user session
        setLoadingMessage("Preparing your session...");
        const userSessionsData = {
          user_id: user.id,
          category_selection: "AI_generated",
          time_limit_seconds: timeLimitMinutes * 60,
          total_questions_in_session: generatedQuestions.length,
        };
        const { sessionData, sessionError } = await createUserSession_supabase(
          userSessionsData
        );
        if (sessionError) {
          throw new Error(`Failed to create session: ${sessionError.message}`);
        }
        const sessionId = sessionData.id;

        // 4. Link questions to the session
        const sessionQuestions = insertedQuestions.map((q, index) => ({
          user_session_id: sessionId,
          question_id: q.id,
          order_in_session: index + 1,
        }));
        const { sqError } = await createSessionQuestions_supabase(
          sessionQuestions
        );
        if (sqError) {
          await supabase.from("user_sessions").delete().eq("id", sessionId);
          throw new Error(
            `Failed to link questions to session: ${sqError.message}`
          );
        }

        // 5. Navigate to the practice session
        navigate(`/session/${sessionId}`);
      } catch (error) {
        console.error("Error starting topic practice session:", error);
        setErrorMessage(
          error.message || "An unexpected error occurred. Please try again."
        );
      } finally {
        setIsStartingSession(false);
        setLoadingMessage("");
      }
    },
    [user, navigate]
  );

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
        <p className="text-lg text-gray-600 text-center mb-6 md:mb-8">
          Configure your practice session below
        </p>

        {(startSessionError || errorMessage) && (
          <div className="mb-6">
            <ErrorMessage message={startSessionError || errorMessage} />
          </div>
        )}

        {isStartingSession && (
          <div className="mb-6 p-4 bg-gray-100 border border-gray-300 text-text-primary rounded-lg shadow flex flex-col items-center justify-center">
            <Spinner size="h-8 w-8" />
            <span className="mt-3">{loadingMessage}</span>
          </div>
        )}

        {!isStartingSession && (
          <>
            {practiceMode === "mock" ? (
              <>
                <ConfigScreen
                  onStartSession={handleStartSession}
                  isLoading={isStartingSession}
                />
                <div className=" mb-6 flex flex-col items-center w-full">
                  <div className="w-full max-w-sm border-t border-gray-200 my-6"></div>
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      Or, sharpen your skills
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Focus on a specific area to improve.
                    </p>
                  </div>
                  <button
                    onClick={() => setPracticeMode("topic")}
                    className="flex items-center justify-center bg-white border-2 border-accent text-accent rounded-lg h-12 sm:h-14 px-6 text-base sm:text-lg font-bold tracking-wide transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent w-full max-w-xs"
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6 mr-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></path>
                    </svg>
                    Practice Specific Topics
                  </button>
                </div>
              </>
            ) : (
              <TopicPracticeConfig
                onStartSession={handleStartTopicPracticeSession}
                onBack={() => {
                  setPracticeMode("mock");
                  setErrorMessage("");
                }}
                isLoading={isStartingSession}
                loadingMessage={loadingMessage}
              />
            )}
            {user && (
              <p className="text-sm text-gray-600 flex justify-center">
                Signed in as
                <strong className="font-bold text-text-primary mx-1">
                  {user?.user_metadata?.email}
                </strong>
                (via Google)
              </p>
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
