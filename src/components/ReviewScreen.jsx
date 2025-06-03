import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import QuestionCard from './QuestionCard'; 
import { FaCheckCircle ,FaTimesCircle,FaInfoCircle, FaArrowLeft, FaArrowRight } from "react-icons/fa";

// Helper to convert object options {A: "text", B: "text"} to array ["text", "text"]
// preserving order A, B, C, D etc.
const transformOptionsToArray = (optionsObject) => {
  if (!optionsObject || typeof optionsObject !== 'object') return [];
  return Object.entries(optionsObject)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort by letter A, B, C...
    .map(([, value]) => value);
};


const ReviewScreen = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionDetails, setSessionDetails] = useState(null);
  const [reviewedQuestions, setReviewedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      setIsLoading(false);
      setError('No session ID provided for review.');
      return;
    }

    const fetchSessionData = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentQuestionIndex(0); // Reset index when new session is loaded
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('user_sessions')
          .select('score_achieved, total_questions_in_session, category_selection, started_at')
          .eq('id', sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error('Session not found.');
        setSessionDetails(sessionData);

        const { data: questionsData, error: questionsError } = await supabase
          .from('session_questions')
          .select(`
            order_in_session,
            user_answer_letter,
            is_correct,
            question_id,
            questions (
              questiontext,
              options, 
              correctanswerletter,
              explanation
            )
          `)
          .eq('user_session_id', sessionId)
          .order('order_in_session', { ascending: true });

        if (questionsError) throw questionsError;
        if (!questionsData) throw new Error('No questions found for this session.');
        
        const processedQuestions = questionsData.map(sq => ({
          id: sq.question_id,
          orderInSession: sq.order_in_session,
          userAnswerLetter: sq.user_answer_letter,
          isCorrect: sq.is_correct,
          questiontext: sq.questions.questiontext,
          options: transformOptionsToArray(sq.questions.options), // Transform options to array
          correctanswerletter: sq.questions.correctanswerletter,
          explanation: sq.questions.explanation,
        }));
        setReviewedQuestions(processedQuestions);

      } catch (err) {
        console.error('Error fetching review data:', err);
        setError(err.message || 'Failed to load review data.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  const handleNext = () => {
    setCurrentQuestionIndex((prevIndex) =>
      Math.min(prevIndex + 1, reviewedQuestions.length - 1)
    );
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleGoToQuestion = (index) => {
    if (index >= 0 && index < reviewedQuestions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-gray-100"><div className="text-xl text-gray-700">Loading session review...</div></div>;
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 text-center">
        <FaTimesCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-red-700 mb-2">Error Loading Review</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-150">Back to Home</button>
      </div>
    );
  }

  if (!sessionDetails || reviewedQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white shadow-lg rounded-lg mt-10 text-center">
        <FaInfoCircle className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-gray-700 mb-2">No Data Available</h2>
        <p className="text-gray-600 mb-6">Could not find details for the selected session.</p>
        <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-150">Back to Home</button>
      </div>
    );
  }
  
  const currentQuestionToDisplay = reviewedQuestions[currentQuestionIndex];
  const scorePercentage = sessionDetails.total_questions_in_session > 0
    ? ((sessionDetails.score_achieved / sessionDetails.total_questions_in_session) * 100).toFixed(1)
    : 0;

  const navButtonClasses = "px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center";
  const questionNavButtonBase = "w-10 h-10 flex items-center justify-center border rounded-md text-sm font-medium transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50";
  
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen flex flex-col">
      {/* Header: Session Summary & Back Button */}
      <header className="mb-6 pb-4 border-b border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
            Session Review 
            <span className="text-gray-500 font-normal ml-2 text-xl">
              ({currentQuestionIndex + 1} / {reviewedQuestions.length})
            </span>
          </h1>
          <button onClick={() => navigate('/dashboard')} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition duration-150 text-sm flex items-center">
            <FaArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700 mb-6">
          <div className="bg-white p-3 rounded-lg shadow"><span className="font-semibold">Date:</span> {formatDate(sessionDetails.started_at)}</div>
          <div className="bg-white p-3 rounded-lg shadow"><span className="font-semibold">Category:</span> {sessionDetails.category_selection}</div>
          <div className="bg-white p-3 rounded-lg shadow"><span className="font-semibold">Score:</span> {sessionDetails.score_achieved} / {sessionDetails.total_questions_in_session} ({scorePercentage}%)</div>
        </div>
      </header>

      {/* Question Jump Navigation */}
      <nav className="mb-6">
        <p className="text-sm font-medium text-gray-700 mb-2 text-center sm:text-left">Jump to question:</p>
        <div className="flex flex-wrap justify-center gap-2 p-2 bg-white rounded-md shadow-sm border border-gray-200">
          {reviewedQuestions.map((q, index) => {
            let qStatusClass = "border-gray-300 text-gray-600 hover:bg-gray-100 focus:ring-indigo-500";
            // q.isCorrect refers to the correctness of the user's answer for this question
            if (q.userAnswerLetter === undefined || q.userAnswerLetter === null || q.userAnswerLetter === '') {
              qStatusClass = "border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 focus:ring-yellow-500"; // Unanswered
            } else if (q.isCorrect) {
              qStatusClass = "border-green-400 bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500"; // Correct
            } else {
              qStatusClass = "border-red-400 bg-red-50 text-red-700 hover:bg-red-100 focus:ring-red-500"; // Incorrect
            }
            
            if (index === currentQuestionIndex) {
              qStatusClass = `${qStatusClass} ring-2 ring-offset-1`; 
              if (q.userAnswerLetter === undefined || q.userAnswerLetter === null || q.userAnswerLetter === '') qStatusClass += ' ring-yellow-500';
              else if (q.isCorrect) qStatusClass += ' ring-green-500';
              else qStatusClass += ' ring-red-500';
            }
            
            return (
              <button
                key={q.id}
                onClick={() => handleGoToQuestion(index)}
                className={`${questionNavButtonBase} ${qStatusClass}`}
                title={`Question ${index + 1}: ${q.userAnswerLetter === undefined ? 'Unanswered' : (q.isCorrect ? 'Correct' : 'Incorrect')}`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Content: Question Card */}
      <main className="flex-grow">
        {currentQuestionToDisplay && (
          <QuestionCard
            key={currentQuestionToDisplay.id}
            questionNumber={currentQuestionIndex + 1} 
            question={currentQuestionToDisplay} // Pass the whole question object
            userAnswer={currentQuestionToDisplay.userAnswerLetter} // Pass the user's answer letter
            isReviewMode={true}
          />
        )}
      </main>

      {/* Footer: Prev/Next Navigation */}
      <footer className="mt-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <button onClick={handlePrevious} disabled={currentQuestionIndex === 0} className={navButtonClasses}>
            <FaArrowLeft className="h-4 w-4 mr-2" /> Previous
          </button>
          <button onClick={handleNext} disabled={currentQuestionIndex === reviewedQuestions.length - 1} className={navButtonClasses}>
            Next <FaArrowRight className="h-4 w-4 ml-2" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ReviewScreen;
