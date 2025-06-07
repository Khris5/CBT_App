import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FaSpinner, FaExclamationCircle, FaRedo, FaClipboardList } from 'react-icons/fa';

const ResultsScreen = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [sessionDetails, setSessionDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided.");
      setIsLoading(false);
      return;
    }

    const fetchSessionResults = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: sessionError } = await supabase
          .from('user_sessions')
          .select(`
            score_achieved,
            total_questions_in_session,
            category_selection,
            ended_at,
            user_id,
            profiles ( full_name )
          `)
          .eq('id', sessionId)
          .single();

        if (sessionError) {
          console.log(`sessionError`, sessionError);
          throw new Error(sessionError.message);
        }
        if (!data) {
          throw new Error('Session results not found.');
        }
        console.log(`sessionDetails`, data);
        setSessionDetails(data);
        
        if (data.profiles && data.profiles.full_name) {
          setUserName(data.profiles.full_name.trim().split(/\s+/)[1] || 'User');
        } else {
          // Fallback if profile or name is not available
          const { data: { user } } = await supabase.auth.getUser();
          setUserName(user?.email?.split('@')[0] || 'User');
        }

      } catch (err) {
        console.error("Error fetching session results:", err);
        setError(err.message || 'Failed to load session results.');
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
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-gray-700">
        <FaSpinner className="animate-spin h-12 w-12 mb-4 text-indigo-600" />
        <p className="text-xl">Loading results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-red-50 text-red-700 p-4">
        <FaExclamationCircle className="h-12 w-12 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Error Loading Results</h2>
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

  if (!sessionDetails) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-100 text-gray-700 p-4">
        <FaExclamationCircle className="h-12 w-12 mb-4 text-yellow-500" />
        <p className="text-xl text-center">Session results could not be displayed.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  const { score_achieved, total_questions_in_session, category_selection, ended_at } = sessionDetails;
  const percentage = total_questions_in_session > 0 ? Math.round((score_achieved / total_questions_in_session) * 100) : 0;
  const scoreMessage = getScoreMessage(percentage);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-8 md:p-12 max-w-2xl w-full text-center transform transition-all hover:scale-105 duration-300">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Session Complete!
          </h1>
          <p className="text-lg text-gray-600">
            Here's how you performed in {category_selection || 'the test'}.
          </p>
        </div>

        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg p-6 mb-4 shadow-inner">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              Your Score
            </h2>
            <div className="flex items-baseline justify-center mb-3">
              <span className="text-5xl md:text-6xl font-bold text-indigo-600">
                {score_achieved}
              </span>
              <span className="text-2xl md:text-3xl font-medium text-gray-500 mx-2">
                /
              </span>
              <span className="text-3xl md:text-4xl font-semibold text-gray-600">
                {total_questions_in_session}
              </span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-indigo-700 mb-3">
              {percentage}%
            </div>
            <p className="text-lg font-medium text-gray-700">
              {scoreMessage}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="bg-green-50 rounded-lg p-3 shadow">
              <div className="font-semibold text-green-800">Correct</div>
              <div className="text-2xl font-bold text-green-700">{score_achieved}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 shadow">
              <div className="font-semibold text-red-800">Incorrect</div>
              <div className="text-2xl font-bold text-red-700">{total_questions_in_session - score_achieved}</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(`/review/${sessionId}`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            <FaClipboardList />
            Review Answers
          </button>
          <button
            onClick={() => navigate('/')}
            className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            <FaRedo />
            Start New Session
          </button>
        </div>

        {ended_at && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Completed on: {new Date(ended_at).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsScreen;