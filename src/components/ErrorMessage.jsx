import { useState, useEffect } from 'react';
import { FaExclamationCircle } from "react-icons/fa";

const ErrorMessage = ({ message }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 10000); // 10 seconds

      // Cleanup the timer if the component unmounts or the message changes
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [message]);

  if (!isVisible) return null;

  return (
    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md my-4" role="alert">
      <div className="flex items-center">
        <FaExclamationCircle className="w-5 h-5 mr-3" />
        <div>
          <p className="font-bold">Oops! Something went wrong.</p>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
