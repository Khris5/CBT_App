import { useState, useMemo } from "react";

const availableTopics = [
  "Cardiovascular",
  "Complex Care Concepts",
  "Endocrine/Metabolic",
  "Ethical/Legal",
  "Eye, Ear, Nose, And Throat",
  "Fluids & Electrolytes/Acid-Base Balance",
  "Fundamentals",
  "Gastrointestinal",
  "Hematology/Oncology",
  "Immunology/Infectious Disease",
  "Integumentary",
  "Maternal & Newborn Health",
  "Medication Calculation",
  "Mental Health",
  "Musculoskeletal",
  "Neurological",
  "Pediatric Health",
  "Pharmacology",
  "Prioritization/Delegation",
  "Renal/Genitourinary",
  "Respiratory",
  "Vital Signs And Laboratory Values",
];

const questionOptions = [15, 20, 30];

function TopicPracticeConfig({ onStartSession, onBack, isLoading }) {
  const [selectedNumQuestions, setSelectedNumQuestions] = useState(15);
  const [selectedTopics, setSelectedTopics] = useState([]);

  const timeLimitMinutes = useMemo(
    () => Math.round(selectedNumQuestions + selectedNumQuestions * 0.2),
    [selectedNumQuestions]
  );

  const handleTopicToggle = (topic) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleStartClick = () => {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic.");
      return;
    }
    onStartSession({
      numQuestions: selectedNumQuestions,
      topics: selectedTopics,
      timeLimitMinutes,
    });
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 mb-5 w-full">
      <div className="bg-white shadow-xl rounded-lg px-4 py-6 md:p-8 w-full max-w-2xl space-y-6">
        <h2 className="text-2xl font-bold text-center text-text-primary">
          Topic-Specific Practice
        </h2>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
              Select Topics ({selectedTopics.length} selected):
            </label>
          </div>
          <div className="flex flex-wrap gap-2 p-3 bg-gray-50 border border-gray-300 rounded-md">
            {availableTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopicToggle(topic)}
                className={`py-2 px-4 rounded-full text-sm font-medium transition-all duration-150 ease-in-out whitespace-nowrap ${
                  selectedTopics.includes(topic)
                    ? "bg-accent text-white shadow-md"
                    : "bg-gray-200 hover:bg-gray-300 text-text-primary"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

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
            onChange={(e) => setSelectedNumQuestions(Number(e.target.value))}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-gray-50 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm text-text-primary"
          >
            {questionOptions.map((num) => (
              <option key={num} value={num}>
                {num} questions
              </option>
            ))}
          </select>
        </div>

        <div className="text-center py-3 bg-gray-100 rounded-md">
          <p className="text-lg font-medium text-text-primary">
            Est. Time Limit:{" "}
            <span className="text-accent font-semibold">
              {timeLimitMinutes} minutes
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBack}
            className="w-full sm:w-1/3 bg-gray-300 hover:bg-gray-400 text-text-primary font-bold py-3 px-4 rounded-md transition duration-150"
          >
            Back
          </button>
          <button
            onClick={handleStartClick}
            disabled={isLoading || selectedTopics.length === 0}
            className="w-full sm:w-2/3 bg-accent hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition duration-150"
          >
            {isLoading ? "Generating Questions..." : "Start AI-Powered Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TopicPracticeConfig;
