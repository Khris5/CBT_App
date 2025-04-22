import React, { useState, useEffect, useRef } from "react";

function Timer({ initialTime, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(initialTime);
  const intervalRef = useRef(null); // Use ref to hold interval ID

  useEffect(() => {
    // Clear any existing interval when the component mounts or initialTime changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Start a new interval
    intervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(intervalRef.current); // Clear interval when time reaches 0
          intervalRef.current = null;
          if (onTimeUp) {
            onTimeUp(); // Notify parent component that time is up
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    // Cleanup function to clear interval on component unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialTime, onTimeUp]); // Rerun effect if initialTime or onTimeUp changes

  // Format time left into minutes and seconds
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="timer">
      Time Remaining: {String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </div>
  );
}

export default Timer;
