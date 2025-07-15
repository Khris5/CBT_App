import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaRedo, FaClipboardList } from "react-icons/fa";
import Spinner from "./Spinner";
import ErrorMessage from "./ErrorMessage";
import { stillInSession } from "../utils/SessionStatus";
import { userSessionQuery_supabase } from "../supabase/SupabaseQueries";

const ResultsScreen = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionDetails, setSessionDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setError(
        "No session ID provided. Please use a valid link from your dashboard."
      );
      setIsLoading(false);
      return;
    }

    const fetchSessionResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { sessionData: data, sessionError } =
          await userSessionQuery_supabase(sessionId);
        if (sessionError) {
          console.error(`sessionError`, sessionError);
          throw new Error(
            "We couldn't load your session results. Please check your internet connection and try again."
          );
        }
        if (!data) {
          throw new Error(
            "We couldn't find any results for this session. The link might be old or the session has been removed."
          );
        }
        if (stillInSession(data)) {
          navigate(`/session/${sessionId}`);
          return;
        }
        setSessionDetails(data);
        setUserName(data?.profiles?.full_name.trim().split(/\s+/)[1] || "User");
      } catch (err) {
        console.error("Error fetching session results:", err);
        setError(
          err.message ||
            "An unexpected error occurred while loading your results. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionResults();
  }, [sessionId]);

  const getScoreMessage = (percentage) => {
    if (percentage >= 90) return `Excellent work, ${userName}! 🎉`;
    if (percentage >= 80) return `Great job, ${userName}! 👏`;
    if (percentage >= 70) return `Well done, ${userName}! 👍`;
    if (percentage >= 60) return `Good effort, ${userName}! 💪`;
    return `Keep practicing, ${userName}! 📚`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background text-text-primary">
        <Spinner size="h-16 w-16" />
        <p className="text-xl mt-4">Loading results...</p>
      </div>
    );
  }

  if (error) {
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

  if (!sessionDetails) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background p-4 text-text-primary">
        <ErrorMessage message="Session results are not available or could not be displayed. Please try returning to the dashboard." />
        <button
          onClick={() => navigate("/")}
          className="mt-6 bg-accent hover:bg-orange-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const {
    score_achieved,
    total_questions_in_session,
    category_selection,
    ended_at,
  } = sessionDetails;
  const percentage =
    total_questions_in_session > 0
      ? Math.round((score_achieved / total_questions_in_session) * 100)
      : 0;
  const scoreMessage = getScoreMessage(percentage);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 md:p-8">
      <div className="bg-white rounded-lg shadow-xl border border-gray-300 p-8 md:p-12 max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">
            Session Complete!
          </h1>
          <p className="text-lg text-text-secondary">
            Here's how you performed in {category_selection || "the test"}.
          </p>
        </div>

        <div className="mb-8">
          <div className="bg-orange-50 rounded-lg p-6 mb-4 shadow-inner border border-orange-200">
            <h2 className="text-xl font-semibold text-text-primary mb-3">
              Your Score
            </h2>
            <div className="flex items-baseline justify-center mb-3">
              <span className="text-5xl md:text-6xl font-bold text-accent">
                {score_achieved}
              </span>
              <span className="text-2xl md:text-3xl font-medium text-text-secondary mx-2">
                /
              </span>
              <span className="text-3xl md:text-4xl font-semibold text-text-secondary">
                {total_questions_in_session}
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-accent mb-3">
              {percentage}%
            </div>
            <p className="text-lg font-medium text-text-primary">
              {scoreMessage}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-text-secondary">
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 shadow">
              <div className="font-semibold text-green-700">Correct</div>
              <div className="text-2xl font-bold text-green-600">
                {score_achieved}
              </div>
            </div>
            <div className="bg-red-100 border border-red-300 rounded-lg p-3 shadow">
              <div className="font-semibold text-red-700">Incorrect</div>
              <div className="text-2xl font-bold text-red-600">
                {total_questions_in_session - score_achieved}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(`/review/${sessionId}`)}
            className="bg-accent hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
          >
            <FaClipboardList />
            Review Answers
          </button>
          <button
            onClick={() => navigate("/")}
            className="border-2 border-accent text-accent hover:bg-orange-100 hover:border-orange-600 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-opacity-75"
          >
            <FaRedo />
            Start New Session
          </button>
        </div>

        {ended_at && (
          <div className="mt-8 pt-6 border-t border-gray-300">
            <p className="text-xs text-text-secondary">
              Completed on: {new Date(ended_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsScreen;
