import { useState, useEffect, useRef, useCallback } from "react";

function Timer({ totalDuration, startTime, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const intervalRef = useRef(null);
  const timeUpCalledRef = useRef(false);
  const mountedRef = useRef(true);

  // Cleanup function to clear interval safely
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Function to update the timer
  const updateTimer = useCallback(() => {
    if (!mountedRef.current) return;

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const currentRemaining = Math.max(0, totalDuration - elapsedSeconds);

    setTimeLeft(currentRemaining);

    if (currentRemaining <= 0 && !timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      clearTimerInterval();

      if (onTimeUp && typeof onTimeUp === "function") {
        // Use setTimeout to avoid potential state update issues
        setTimeout(() => {
          if (mountedRef.current) {
            onTimeUp();
          }
        }, 0);
      }
    }
  }, [startTime, totalDuration, onTimeUp, clearTimerInterval]);

  useEffect(() => {
    // Reset mounted flag
    mountedRef.current = true;

    // Clear any existing interval
    clearTimerInterval();

    // Reset time up flag when dependencies change
    timeUpCalledRef.current = false;

    if (startTime === null || startTime === undefined) {
      // Session hasn't started or was reset
      setTimeLeft(totalDuration);
      return;
    }

    // Validate inputs
    if (typeof totalDuration !== "number" || totalDuration <= 0) {
      console.error("Timer: Invalid totalDuration", totalDuration);
      return;
    }

    if (typeof startTime !== "number" || startTime <= 0) {
      console.error("Timer: Invalid startTime", startTime);
      return;
    }

    // Immediately update timer, then set interval
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    // Cleanup function
    return () => {
      clearTimerInterval();
    };
  }, [startTime, totalDuration, updateTimer, clearTimerInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  // Format time left into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  // Determine if time is running low (less than 5 minutes)
  const isTimeRunningLow = timeLeft <= 300 && timeLeft > 60;
  const isTimeCritical = timeLeft <= 60;

  let timerClassName = "timer";
  if (isTimeCritical) {
    timerClassName += " timer-critical";
  } else if (isTimeRunningLow) {
    timerClassName += " timer-warning";
  }

  return (
    <div className={timerClassName}>
      <span className="timer-label">Time Remaining: </span>
      <span className="timer-display">{formatTime(timeLeft)}</span>
      {isTimeCritical && <span className="timer-alert"> ⚠️</span>}
    </div>
  );
}

export default Timer;
