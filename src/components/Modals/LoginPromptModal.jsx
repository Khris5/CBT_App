import { FaTimes, FaGoogle } from "react-icons/fa";

const LoginPromptModal = ({ isOpen, onClose, onSignIn }) => {
  if (!isOpen) return null;

  const handleSignIn = async () => {
    try {
      await onSignIn();
      // Modal will close automatically when auth state changes
    } catch (error) {
      console.error("Sign in failed:", error);
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
      <div className="bg-background py-6 px-8 rounded-md shadow-lg max-w-md w-full mx-4">
        {/* Header with close button */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-text-primary">Welcome Back</h2>
          <button
            onClick={onClose}
            className="text-text-primary hover:text-black text-2xl font-bold"
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal content */}
        <div className="mb-6">
          <p className="text-text-secondary text-center">
            Please sign in to start a practice session and track your progress.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <button
            onClick={handleSignIn}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-orange-600 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
          >
            <FaGoogle /> Sign In with Google
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPromptModal;
