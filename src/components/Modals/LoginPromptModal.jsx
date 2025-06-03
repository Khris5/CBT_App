
const LoginPromptModal = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      await onSignIn();
      // Modal will close automatically when auth state changes
    } catch (error) {
      console.error('Sign in failed:', error);
      // You could add error handling here if needed
    }
  };

  const handleOverlayClick = (e) => {
    // Close modal if clicking on the overlay (not the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-background p-6 rounded-md shadow-lg max-w-md w-full mx-4">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-text-primary">
            Sign In Required
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary text-xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Modal content */}
        <div className="mb-6">
          <p className="text-text-secondary">
            Please sign in to start a practice session and track your progress.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSignIn}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
          >
            Sign In with Google
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;