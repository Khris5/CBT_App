import React, { useState, useEffect, useRef } from "react";

function Timer({ totalDuration, startTime, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(totalDuration); // Initial display value
  const intervalRef = useRef(null);
  const timeUpCalledRef = useRef(false); // Prevent multiple calls to onTimeUp

  useEffect(() => {
    if (startTime === null) {
      // If session hasn't started or was reset, clear timer if running
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setTimeLeft(totalDuration); // Reset display
      timeUpCalledRef.current = false; // Reset flag
      return;
    }

    // Function to update the timer
    const updateTimer = () => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const currentRemaining = totalDuration - elapsedSeconds;

      setTimeLeft(currentRemaining);

      if (currentRemaining <= 0 && !timeUpCalledRef.current) {
        timeUpCalledRef.current = true; // Mark as called
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimeLeft(0); // Ensure display hits 0
        if (onTimeUp) {
          onTimeUp();
        }
      }
    };

    // Clear any existing interval before starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Immediately update timer on mount/prop change, then set interval
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // Depend on startTime and totalDuration to restart/recalculate if session changes
  }, [startTime, totalDuration, onTimeUp]);

  // Format time left into minutes and seconds
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;

  return (
    <div className="timer">
      Time Remaining: {String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </div>
  );
}

export default Timer;
