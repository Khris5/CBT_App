import { generateExplanations } from "../lib/googleAPI";
import { supabaseAdmin } from "../lib/supabaseClient";

// Normalize options to an array for reliable letter bounds
function normalizeOptionsToArray(options) {
  if (Array.isArray(options)) return options;
  if (options && typeof options === "object") {
    return Object.entries(options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }
  return [];
}

function createNonce() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function validateCorrection(correction) {
  const errors = [];

  if (!correction.id) {
    errors.push("Missing question ID");
  }

  if (
    !correction.correctAnswerLetter ||
    !["A", "B", "C", "D", "E"].includes(
      correction.correctAnswerLetter.toUpperCase()
    )
  ) {
    errors.push("Invalid or missing correct answer letter");
  }

  if (!correction.explanation || correction.explanation.trim().length < 10) {
    errors.push("Explanation too short or missing");
  }

  // 2. Sanity checks - like double-checking math before submitting
  if (correction.explanation && correction.explanation.length > 2000) {
    errors.push("Explanation suspiciously long (>2000 chars)");
  }

  // 3. Content quality checks - like proofreading before publishing
  const explanation = correction.explanation?.toLowerCase() || "";
  const suspiciousPatterns = [
    "i cannot",
    "i am unable",
    "as an ai",
    "error occurred",
    "something went wrong",
    "try again",
  ];

  if (suspiciousPatterns.some((pattern) => explanation.includes(pattern))) {
    errors.push("Explanation contains AI error indicators");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

async function updateQuestionsInDB(parsedCorrections, originalQuestions) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const correction of parsedCorrections) {
    try {
      // Find the original question for comparison
      const originalQuestion = originalQuestions.find(
        (q) => q.id === correction.id
      );

      if (!originalQuestion) {
        results.failed++;
        results.errors.push(
          `Question ID ${correction.id} not found in original batch`
        );
        continue;
      }

      // Validate the correction
      const validation = validateCorrection(correction);

      if (!validation.isValid) {
        results.failed++;
        results.errors.push(
          `Question ID ${correction.id}: ${validation.errors.join(", ")}`
        );
        continue;
      }

      // Check if this would actually change anything
      const wouldChange =
        originalQuestion.correctanswerletter !==
          correction.correctAnswerLetter ||
        originalQuestion.explanation !== correction.explanation;

      if (!wouldChange) {
        console.log(
          `⏭️  Question ID ${correction.id}: No changes needed, skipping`
        );
        results.successful++; // Count as successful since no update was needed
        continue;
      }

      // All checks passed - perform the update
      const { error } = await supabaseAdmin
        .from("questions")
        .update({
          correctanswerletter: correction.correctAnswerLetter,
          explanation: correction.explanation,
          is_edited: true,
        })
        .eq("id", correction.id);

      if (error) {
        results.failed++;
        results.errors.push(
          `Database error for question ${correction.id}: ${error.message}`
        );
      } else {
        results.successful++;
        console.log(`✅ Updated question ID ${correction.id}`);
      }
    } catch (error) {
      results.failed++;
      results.errors.push(
        `Unexpected error for question ${correction.id}: ${error.message}`
      );
    }
  }

  return results;
}

async function processBatchWithRetries(
  batch,
  batchNumber,
  totalBatches,
  abortSignal
) {
  const MAX_RETRIES = 5;
  const INITIAL_DELAY_MS = 15000; // Start with a 15-second delay

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Check for cancellation before each attempt
    if (abortSignal?.aborted) {
      throw new Error("Background processing cancelled");
    }

    try {
      console.log(
        `🔄 Processing batch ${batchNumber}/${totalBatches}, Attempt ${attempt}/${MAX_RETRIES}...`
      );

      // Attach nonces to batch to guarantee one-to-one mapping from AI
      const batchWithNonces = batch.map((q) => ({
        ...q,
        nonce: createNonce(),
      }));

      const correctionsJSON = await generateExplanations(
        batchWithNonces,
        abortSignal
      );

      let parsedCorrections;
      try {
        parsedCorrections = JSON.parse(correctionsJSON);
      } catch (parseError) {
        //trigger a retry
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      if (!Array.isArray(parsedCorrections)) {
        throw new Error("AI response is not a valid JSON array.");
      }

      if (parsedCorrections.length !== batch.length) {
        throw new Error(
          `AI response length mismatch. Expected ${batch.length}, got ${parsedCorrections.length}.`
        );
      }
      // Build correction map by id for validation
      const idToCorrection = new Map();
      for (const c of parsedCorrections) {
        if (!c?.id) {
          throw new Error("AI response item missing id");
        }
        idToCorrection.set(c.id, c);
      }

      // Validate nonce and letter bounds per item; normalize letter
      const normalizedCorrections = [];
      for (const q of batchWithNonces) {
        const corr = idToCorrection.get(q.id);
        if (!corr) {
          throw new Error(`AI response missing item for id ${q.id}`);
        }
        if (corr.nonce !== q.nonce) {
          throw new Error(`Nonce mismatch for id ${q.id}`);
        }
        const optionsArr = normalizeOptionsToArray(q.options);
        const letter = (corr.correctAnswerLetter || "")
          .toString()
          .trim()
          .toUpperCase();
        const minLetterCode = "A".charCodeAt(0);
        const maxLetterCode =
          minLetterCode + Math.max(optionsArr.length - 1, 0);
        const code = letter.charCodeAt(0);
        if (!letter || code < minLetterCode || code > maxLetterCode) {
          throw new Error(
            `Invalid correctAnswerLetter '${corr.correctAnswerLetter}' for id ${q.id} with ${optionsArr.length} options`
          );
        }
        normalizedCorrections.push({
          id: q.id,
          correctAnswerLetter: letter,
          explanation: corr.explanation,
        });
      }

      const results = await updateQuestionsInDB(normalizedCorrections, batch);

      // Check for partial failures. If any item failed, retry the whole batch.
      if (results.failed > 0) {
        const errorSummary = results.errors.join("; ");
        throw new Error(
          `Batch processing failed with ${results.failed} errors: [${errorSummary}]`
        );
      }

      console.log(
        `✅ Batch ${batchNumber}/${totalBatches} completed successfully: ${results.successful} items processed.`
      );
      return results;
    } catch (error) {
      if (
        abortSignal?.aborted ||
        error.message === "Background processing cancelled"
      ) {
        throw new Error("Background processing cancelled"); // Re-throw cancellation
      }

      console.error(
        `❌ Attempt ${attempt} for batch ${batchNumber} failed:`,
        error.message
      );

      if (attempt === MAX_RETRIES) {
        console.error(
          `💀 Batch ${batchNumber} failed after ${MAX_RETRIES} attempts. Giving up on this batch.`
        );
        // Throw an error to be caught by the main orchestrator function
        throw new Error(
          `Batch ${batchNumber} failed permanently: ${error.message}`
        );
      }

      // Calculate exponential backoff delay
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`🕒 Retrying in ${delay / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function processSessionQuestionsInBackground(
  sessionQuestions,
  abortSignal
) {
  const unEditedQuestions = sessionQuestions.filter((q) => !q.is_edited);

  if (unEditedQuestions.length === 0) {
    console.log("No questions to process.");
    return;
  }

  console.log(
    `Starting background correction for ${unEditedQuestions.length} questions...`
  );

  const chunkSize = 10;
  let totalSuccessful = 0;
  let totalFailedInBatches = 0;
  const allErrors = [];

  for (let i = 0; i < unEditedQuestions.length; i += chunkSize) {
    if (abortSignal?.aborted) {
      console.log("Background processing was cancelled by the user.");
      break; // Exit the loop cleanly
    }

    const batch = unEditedQuestions.slice(i, i + chunkSize);
    const batchNumber = Math.floor(i / chunkSize) + 1;
    const totalBatches = Math.ceil(unEditedQuestions.length / chunkSize);

    try {
      // Delegate the entire batch processing, including retries, to the new function
      const batchResults = await processBatchWithRetries(
        batch,
        batchNumber,
        totalBatches,
        abortSignal
      );
      totalSuccessful += batchResults.successful;
    } catch (error) {
      // This catch block now only triggers if a batch fails after ALL retries
      console.error(`--- BATCH ${batchNumber} PERMANENTLY FAILED ---`);
      totalFailedInBatches += batch.length;
      allErrors.push(error.message);
    }
  }

  console.log(`🎉 Background correction finished!`);
  console.log(
    `📊 Summary: ${totalSuccessful} successful, ${totalFailedInBatches} failed out of ${unEditedQuestions.length} total.`
  );

  if (allErrors.length > 0) {
    console.warn(`⚠️  Permanent errors encountered:`, allErrors);
  }

  return {
    totalProcessed: unEditedQuestions.length,
    totalSuccessful,
    totalFailed: totalFailedInBatches,
    errors: allErrors,
  };
}
