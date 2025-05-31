import React, { useState, useMemo } from "react";

const questionOptions = [20, 30, 40, 50, 60];
const categoryOptions = ["Medicine Only", "Surgery Only", "Combined"];

function ConfigScreen({ onStartSession }) {
  const [selectedNumQuestions, setSelectedNumQuestions] = useState(20);
  const [selectedCategory, setSelectedCategory] = useState("Combined");

  // Calculate time limit: 1 minute per question
  const timeLimitMinutes = useMemo(
    () => selectedNumQuestions,
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
      timeLimitSeconds: timeLimitMinutes * 60,
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="bg-slate-800 shadow-xl rounded-lg p-6 md:p-8 w-full max-w-lg space-y-6">
        <h2 className="text-3xl font-bold text-center text-accent mb-6">
          Configure Your Practice Session
        </h2>

        {/* Number of Questions Selector */}
        <div className="space-y-2">
          <label
            htmlFor="numQuestions"
            className="block text-sm font-medium text-gray-300"
          >
            Number of Questions:
          </label>
          <select
            id="numQuestions"
            value={selectedNumQuestions}
            onChange={handleNumQuestionsChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-600 bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-white"
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
            className="block text-sm font-medium text-gray-300"
          >
            Question Category:
          </label>
          <select
            id="category"
            value={selectedCategory}
            onChange={handleCategoryChange}
            className="mt-1 block w-full py-2 px-3 border border-gray-600 bg-slate-700 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-white"
          >
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Timer Information Display */}
        <div className="text-center py-3 bg-slate-700 rounded-md">
          <p className="text-lg font-medium text-gray-200">
            Time Limit:{" "}
            <span className="text-accent font-semibold">
              {timeLimitMinutes} minutes
            </span>
          </p>
          <p className="text-sm text-gray-400 mt-1">(1 minute per question)</p>
        </div>

        {/* Session Summary */}
        <div className="text-center py-2 bg-slate-600 rounded-md">
          <p className="text-sm text-gray-300">
            You will answer{" "}
            <span className="font-semibold text-white">
              {selectedNumQuestions}
            </span>{" "}
            questions from{" "}
            <span className="font-semibold text-white">{selectedCategory}</span>{" "}
            category
          </p>
        </div>

        {/* Start Session Button */}
        <button
          onClick={handleStartSessionClick}
          disabled={!onStartSession}
          className="w-full bg-accent hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-accent transition duration-150 ease-in-out transform hover:scale-105 disabled:transform-none"
        >
          {onStartSession ? "Start Session" : "Loading..."}
        </button>
      </div>
    </div>
  );
}

export default ConfigScreen;
