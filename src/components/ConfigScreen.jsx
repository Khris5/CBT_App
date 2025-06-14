import { useState, useMemo } from "react";

const questionOptions = [20, 30, 40, 50, 60];
const categoryOptions = [
  "Medicine Only",
  "Surgery Only",
  "General Only",
  "Combined",
];

function ConfigScreen({ onStartSession, isLoading }) {
  const [selectedNumQuestions, setSelectedNumQuestions] = useState(20);
  const [selectedCategory, setSelectedCategory] = useState("Combined");

  // Calculate time limit: 1 minute per question
  const timeLimitMinutes = useMemo(
    () => Math.round((selectedNumQuestions * 2) / 3),
    [selectedNumQuestions]
  );

  const handleStartSessionClick = () => {
    if (!onStartSession) {
      console.error("onStartSession prop not provided to ConfigScreen");
      return;
    }

    const sessionConfig = {
      numQuestions: selectedNumQuestions,
      category: selectedCategory,
      timeLimitMinutes: timeLimitMinutes,
    };
    console.log("Starting session with config:", sessionConfig);
    onStartSession(sessionConfig);
  };

  const handleNumQuestionsChange = (e) => {
    const value = Number(e.target.value);
    if (questionOptions.includes(value)) {
      setSelectedNumQuestions(value);
    }
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (categoryOptions.includes(value)) {
      setSelectedCategory(value);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 mb-5 w-full">
      <div className="bg-white shadow-xl rounded-lg px-4 py-6 md:p-8 w-full max-w-lg space-y-6">
        {/* Number of Questions Selector */}
        <div className="space-y-2">
          <label
            htmlFor="numQuestions"
            className="block text-sm font-medium text-gray-700"
          >
            Number of Questions:
          </label>
          <select
            id="numQuestions"
            value={selectedNumQuestions}
            onChange={handleNumQuestionsChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-50 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text-primary"
          >
            {questionOptions.map((num) => (
              <option key={num} value={num}>
                {num} questions
              </option>
            ))}
          </select>
        </div>

        {/* Question Category Selector */}
        <div className="space-y-2">
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700"
          >
            Question Category:
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-50 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text-primary"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Timer Information Display */}
        <div className="text-center py-3 bg-gray-100 rounded-md">
          <p className="text-lg font-medium text-text-primary">
            Time Limit:{" "}
            <span className="text-accent font-semibold">
              {timeLimitMinutes} minutes
            </span>
          </p>
          <p className="text-sm text-gray-600 mt-1">
            (40 seconds per question)
          </p>
        </div>

        {/* Session Summary */}
        <div className="text-center py-2 bg-gray-100 rounded-md">
          <p className="text-sm text-gray-700">
            You will answer{" "}
            <span className="font-semibold text-text-primary">
              {selectedNumQuestions}
            </span>{" "}
            questions from{" "}
            <span className="font-semibold text-text-primary">
              {selectedCategory}
            </span>{" "}
            category
          </p>
        </div>

        {/* Start Session Button */}
        <button
          onClick={handleStartSessionClick}
          disabled={!onStartSession || isLoading}
          className="w-full bg-accent hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-accent transition duration-150 ease-in-out transform hover:scale-105 disabled:transform-none"
        >
          {isLoading ? "Preparing Session..." : "Start Session"}
        </button>
      </div>
    </div>
  );
}

export default ConfigScreen;
