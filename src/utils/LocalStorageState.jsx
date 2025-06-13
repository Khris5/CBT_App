const LOCAL_STORAGE_KEY = "nmcPrepCbtState";

// Safe localStorage operations with error handling
export const loadState = () => {
  try {
    const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (serializedState === null) return null;
    const parsed = JSON.parse(serializedState);
    // Validate loaded state structure
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.error("Could not load state from localStorage", err);
    return null;
  }
};

export const saveState = (state) => {
    try {
      const stateToSave = {
        view: state.view,
        sessionConfig: state.sessionConfig,
        sessionQuestions: state.sessionQuestions,
        userAnswers: state.userAnswers,
        results: state.results,
        currentQuestionIndex: state.currentQuestionIndex,
        sessionStartTime: state.sessionStartTime,
        activeUserSessionId: state.activeUserSessionId,
      };
      const serializedState = JSON.stringify(stateToSave);
      localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (err) {
      console.error("Could not save state to localStorage", err);
    }
  };