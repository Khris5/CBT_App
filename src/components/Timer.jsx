import { useState, useEffect, useRef, useCallback } from "react";

function Timer({ totalDuration, startTime, onTimeUp }) {
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const intervalRef = useRef(null);
  const timeUpCalledRef = useRef(false);
  const mountedRef = useRef(true);

  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateTimer = useCallback(() => {
    if (!mountedRef.current) return;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const currentRemaining = Math.max(0, totalDuration - elapsedSeconds);
    setTimeLeft(currentRemaining);
    if (currentRemaining <= 0 && !timeUpCalledRef.current) {
      timeUpCalledRef.current = true;
      clearTimerInterval();
      if (onTimeUp && typeof onTimeUp === "function") {
        setTimeout(() => {
          if (mountedRef.current) {
            onTimeUp();
          }
        }, 0);
      }
    }
  }, [startTime, totalDuration, onTimeUp, clearTimerInterval]);

  useEffect(() => {
    mountedRef.current = true;
    clearTimerInterval();
    timeUpCalledRef.current = false;
    if (startTime === null || startTime === undefined) {
      setTimeLeft(totalDuration);
      return;
    }
    if (typeof totalDuration !== "number" || totalDuration <= 0) {
      console.error("Timer: Invalid totalDuration", totalDuration);
      return;
    }
    if (typeof startTime !== "number" || startTime <= 0) {
      console.error("Timer: Invalid startTime", startTime);
      return;
    }
    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);
    return () => {
      clearTimerInterval();
    };
  }, [startTime, totalDuration, updateTimer, clearTimerInterval]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      clearTimerInterval();
    };
  }, [clearTimerInterval]);

  const formatTime = (seconds) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const isTimeRunningLow = timeLeft <= 300 && timeLeft > 60; // 5 minutes
  const isTimeCritical = timeLeft <= 60; // 1 minute

  let timerBaseClasses = "px-4 py-2 rounded-lg shadow-md flex items-center space-x-2 font-semibold text-base";
  let timerColorClasses = "bg-blue-100 text-blue-700";

  if (isTimeCritical) {
    timerColorClasses = "bg-red-100 text-red-700 animate-pulse";
  } else if (isTimeRunningLow) {
    timerColorClasses = "bg-yellow-100 text-yellow-700";
  }

  return (
    <div className={`${timerBaseClasses} ${timerColorClasses}`}>
      <span className="hidden sm:inline text-sm">Time:</span>
      <span className="text-xl sm:text-2xl tabular-nums tracking-wider">{formatTime(timeLeft)}</span>
      {isTimeCritical && <span className="text-lg sm:text-xl">⚠️</span>}
    </div>
  );
}

export default Timer;
