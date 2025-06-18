import { useState } from "react";
import ErrorMessage from "./ErrorMessage";
import { supabaseAdmin } from "../lib/supabaseClient";
import generateExplanation from "../lib/googleAPI";
import Spinner from "./Spinner";
import { MarkdownRenderer } from "../utils/MarkdownRenderer";
// Helper to convert index (0, 1, 2) to letter ('A', 'B', 'C')
const indexToLetter = (index) => String.fromCharCode(65 + index);

function QuestionCard({
  question,
  questionNumber,
  userAnswer, // Expected to be 'A', 'B', 'C', or undefined
  onAnswerChange, // Only used in practice mode
  isReviewMode = false, // Flag to differentiate modes
  onExplanationGenerated, // Callback to update parent state
}) {
  const {
    id,
    questiontext = "Question text not available",
    options = [],
    correctanswerletter,
    explanation,
  } = question || {};

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);
  // Use the explanation from the parent first, but allow a local override once generated
  const [localExplanation, setLocalExplanation] = useState(explanation);

  if (!question || !id) {
    return (
      <div className="bg-background p-6 rounded-lg shadow-md mb-6">
        <ErrorMessage message="Error: Invalid question data provided." />
      </div>
    );
  }

  if (!Array.isArray(options) || options.length === 0) {
    return (
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
        <h4 className="text-xl font-semibold mb-2 text-text-primary">
          <span className="text-accent mr-2">{questionNumber}.</span>{" "}
          {questiontext}
        </h4>
        <ErrorMessage message="Error: No answer options available for this question." />
      </div>
    );
  }

  const handleGenerateExplanation = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const generatedText = await generateExplanation(question);
      const {
        correctAnswerLetter,
        explanation: newExplanation,
        isAnswerCorrect,
      } = JSON.parse(generatedText);

      // Update Supabase first
      const { error: updateExplanationError } = await supabaseAdmin
        .from("questions")
        .update({ explanation: newExplanation })
        .eq("id", id);

      if (updateExplanationError) {
        throw new Error(updateExplanationError);
      }
      if (!isAnswerCorrect || false) {
        setLocalExplanation(
          `**Sorry the marked answer (${correctanswerletter}) above is wrong. The correct answer is (${correctAnswerLetter})** \n\n${newExplanation}`
        );
        const { error: updateAnswerError } = await supabaseAdmin
          .from("questions")
          .update({ correctanswerletter: correctAnswerLetter })
          .eq("id", id);
        if (updateAnswerError) {
          throw new Error(updateAnswerError);
        }
      }

      // Update local state to show immediately
      if (isAnswerCorrect) {
        setLocalExplanation(newExplanation);
      }

      // Notify parent component to update its state for persistence across re-renders
      if (onExplanationGenerated) {
        onExplanationGenerated(id, newExplanation);
      }
    } catch (err) {
      console.error("Failed to generate or save explanation:", err);
      setGenerationError(err.message || "An unexpected error occurred.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleOptionChange = (event) => {
    if (onAnswerChange && !isReviewMode) {
      const selectedIndex = parseInt(event.target.dataset.index, 10);
      if (
        !isNaN(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < options.length
      ) {
        const selectedLetter = indexToLetter(selectedIndex);
        onAnswerChange(id, selectedLetter);
      }
    }
  };

  return (
    <div
      className={`bg-white shadow-lg rounded-lg p-6 mb-6 ${
        isReviewMode ? "border-l-4 border-accent" : ""
      }`}
    >
      <h4 className="text-lg md:text-xl font-semibold mb-5 text-text-primary">
        <span className="text-accent mr-2">{questionNumber}.</span>{" "}
        {questiontext}
      </h4>

      <div className="space-y-3">
        {options.map((optionText, index) => {
          const optionLetter = indexToLetter(index);
          const optionId = `${id}-option-${optionLetter}`;
          const isUserSelected = userAnswer === optionLetter;
          const isCorrect = correctanswerletter === optionLetter;

          let optionBaseClasses =
            "flex items-center pl-3 rounded-md border transition-all duration-150 ease-in-out";
          let optionStateClasses =
            "border-gray-300 hover:bg-gray-100 hover:border-gray-400";
          let labelTextClasses = "text-text-primary";

          if (isReviewMode) {
            optionStateClasses = "border-gray-300";
            if (isCorrect) {
              optionStateClasses =
                "bg-green-50 border-green-500 ring-1 ring-green-500";
              labelTextClasses = "text-green-800 font-medium";
            }
            if (isUserSelected) {
              if (isCorrect) {
                optionStateClasses =
                  "bg-green-100 border-green-600 ring-2 ring-green-600";
                labelTextClasses = "text-green-800 font-bold";
              } else {
                optionStateClasses =
                  "bg-red-50 border-red-500 ring-1 ring-red-500";
                labelTextClasses = "text-red-800 font-medium";
              }
            } else if (isCorrect) {
              optionStateClasses = "bg-green-50 border-green-400";
              labelTextClasses = "text-green-700";
            }
          } else {
            if (isUserSelected) {
              optionStateClasses =
                "bg-orange-50 border-accent ring-2 ring-accent";
              labelTextClasses = "text-accent font-medium";
            }
          }

          return (
            <div
              key={optionId}
              className={`${optionBaseClasses} ${optionStateClasses}`}
            >
              <input
                type="radio"
                id={optionId}
                name={`question-${id}`}
                value={optionLetter}
                data-index={index}
                checked={isUserSelected}
                onChange={handleOptionChange}
                disabled={isReviewMode}
                className="form-radio h-5 w-5 text-accent border-gray-300 focus:ring-accent mr-3 shrink-0"
              />
              <label
                htmlFor={optionId}
                className={`flex-1 p-3 cursor-pointer ${labelTextClasses}`}
              >
                <span className="font-semibold mr-2">{optionLetter}.</span>
                <span>{optionText}</span>
              </label>
            </div>
          );
        })}
      </div>

      {isReviewMode && localExplanation && (
        <div className="mt-5 pt-4 border-t border-gray-300">
          <h5 className="text-md font-semibold text-text-secondary mb-1">
            Explanation:
          </h5>
          <div className="text-text-secondary whitespace-pre-wrap">
            <MarkdownRenderer text={localExplanation} />
          </div>
        </div>
      )}

      {isReviewMode && !localExplanation && (
        <div className="mt-5 pt-4 border-t border-gray-300">
          <div className="flex flex-col items-start">
            <button
              onClick={handleGenerateExplanation}
              disabled={isGenerating}
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Spinner size="h-5 w-5" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate Explanation</span>
              )}
            </button>
            {generationError && (
              <div className="mt-2 w-full">
                <ErrorMessage message={generationError} />
              </div>
            )}
            {!isGenerating && (
              <p className="text-xs text-gray-500 mt-2">
                Click to generate an explanation using AI.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
