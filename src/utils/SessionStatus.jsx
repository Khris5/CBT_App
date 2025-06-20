export const stillInSession = (sessionData) => {
  const startTime = Date.parse(sessionData.started_at) + 88000;
  const currentTime = Date.now();
  const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);
  if (
    sessionData.ended_at === null &&
    elapsedSeconds < sessionData.time_limit_seconds
  ) {
    return true;
  }
  return false;
};
