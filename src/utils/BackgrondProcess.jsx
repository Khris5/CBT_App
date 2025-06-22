import { generateExplanations } from "../lib/googleAPI";
import { supabaseAdmin } from "../lib/supabaseClient";
async function updateQuestionsInDB(parsedCorrections) {
  for (const correction of parsedCorrections) {
    await supabaseAdmin
      .from("questions")
      .update({
        correctanswerletter: correction.correctAnswerLetter,
        explanation: correction.explanation,
        is_edited: true,
      })
      .eq("id", correction.id);
  }
}

export async function processSessionQuestionsInBackground(
  sessionQuestions,
  abortSignal
) {
  // Filter out already edited questions
  const unEditedQuestions = sessionQuestions.filter((q) => !q.is_edited);

  if (unEditedQuestions.length === 0) return;

  console.log(
    `Starting background correction of ${unEditedQuestions.length} questions...`
  );

  const chunkSize = 10;

  for (let i = 0; i < unEditedQuestions.length; i += chunkSize) {
    if (abortSignal?.aborted) {
      throw new Error("Background processing cancelled");
    }
    const batch = unEditedQuestions.slice(i, i + chunkSize);

    try {
      const corrections = await generateExplanations(batch, abortSignal);
      const parsedCorrections = JSON.parse(corrections);
      if (abortSignal?.aborted) {
        throw new Error("Background processing cancelled");
      }
      await updateQuestionsInDB(parsedCorrections);

      console.log(
        `✅ Processed batch ${Math.floor(i / chunkSize) + 1}/${Math.ceil(
          unEditedQuestions.length / chunkSize
        )}`
      );
      console.log("Corrections:", parsedCorrections);
      // Longer delay since it's background - be gentle on API
      await new Promise((resolve) => setTimeout(resolve, 10000));
    } catch (error) {
      if (error.message === "Background processing cancelled") {
        throw error; // Re-throw cancellation errors
      }
      console.error(`❌ Batch ${Math.floor(i / chunkSize) + 1} failed:`, error);
      // Continue with next batch
    }
  }

  console.log(`🎉 Background correction completed!`);
}
