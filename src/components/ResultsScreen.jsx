
const ResultsScreen = ({ 
  scoreAchieved, 
  totalQuestionsInSession, 
  onReviewSession, 
  onStartNewSession, 
  userSessionId,
  userDetails,
  
}) => {
  // Calculate percentage with proper handling for edge cases
  const percentage = totalQuestionsInSession > 0 ? Math.round((scoreAchieved / totalQuestionsInSession) * 100) : 0;
  
  const userName = userDetails.name.trim().split(/\s+/)[0];
  // Generate encouraging message based on score
  const getScoreMessage = (percentage) => {
    if (percentage >= 90) return `Excellent work ${userName}! 🎉`;
    if (percentage >= 80) return `Great job ${userName}! 👏`;
    if (percentage >= 70) return `Well done ${userName}! 👍`;
    if (percentage >= 60) return `Good effort ${userName}! 💪`;
    return `Keep practicing ${userName}! 📚`;
  };

  const scoreMessage = getScoreMessage(percentage);

  // Handle navigation with proper error checking
  const handleReviewAnswers = () => {
    if (onReviewSession && typeof onReviewSession === 'function') {
      onReviewSession(userSessionId);
    } else {
      console.warn('onReviewSession callback not provided or not a function');
    }
  };

  const handleStartNewSession = () => {
    if (onStartNewSession && typeof onStartNewSession === 'function') {
      onStartNewSession();
    } else {
      console.warn('onStartNewSession callback not provided or not a function');
    }
  };

  // Handle cases where props might not be available
  if (scoreAchieved === undefined || totalQuestionsInSession === undefined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            Results Not Available
          </h2>
          <p className="text-red-600 mb-4">
            There was an issue loading your session results.
          </p>
          <button
            onClick={handleStartNewSession}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Start New Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-96 p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 md:p-12 max-w-2xl w-full text-center">
        {/* Session Complete Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Session Complete!
          </h1>
          <p className="text-lg text-gray-600">
            Here's how you performed
          </p>
        </div>

        {/* Score Display */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-3">
              Your Score
            </h2>
            
            {/* Large Score Display */}
            <div className="flex items-center justify-center mb-3">
              <span className="text-5xl md:text-6xl font-bold text-indigo-600">
                {scoreAchieved }
              </span>
              <span className="text-2xl md:text-3xl font-medium text-gray-500 mx-2">
                /
              </span>
              <span className="text-3xl md:text-4xl font-semibold text-gray-600">
                {totalQuestionsInSession}
              </span>
            </div>
            
            {/* Percentage Display */}
            <div className="text-2xl md:text-3xl font-bold text-indigo-700 mb-3">
              {percentage}%
            </div>
            
            {/* Encouraging Message */}
            <p className="text-lg font-medium text-gray-700">
              {scoreMessage}
            </p>
          </div>

          {/* Performance Breakdown */}
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="font-semibold text-green-800">Correct</div>
              <div className="text-2xl font-bold text-green-700">{scoreAchieved}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <div className="font-semibold text-red-800">Incorrect</div>
              <div className="text-2xl font-bold text-red-700">{totalQuestionsInSession - scoreAchieved}</div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Review Answers - Primary Action */}
          <button
            onClick={handleReviewAnswers}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            Review Answers
          </button>

          {/* Start New Session - Secondary Action */}
          <button
            onClick={handleStartNewSession}
            className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            Start New Session
          </button>
        </div>

        {/* Additional Info */}
        {userSessionId && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Session ID: {userSessionId}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsScreen;