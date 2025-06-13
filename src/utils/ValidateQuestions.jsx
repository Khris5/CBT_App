const validateQuestion = (question) => {
  return (
    question &&
    typeof question === "object" &&
    typeof question.id === "string" &&
    typeof question.questiontext === "string" &&
    Array.isArray(question.options) &&
    question.options.length >= 2 &&
    typeof question.correctanswerletter === "string" &&
    typeof question.category === "string"
  );
};

export default validateQuestion;