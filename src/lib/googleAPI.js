import { GoogleGenAI } from "@google/genai";

async function generateExplanation(question) {
  const { questiontext, options, correctanswerletter } = question;

  const optionsString = options
    .map((opt, index) => `${String.fromCharCode(65 + index)}: ${opt}`)
    .join("\n");

  const prompt = `
    Provide a brief explanation (~5 sentences) for why the correct answer is correct for the following multiple-choice question. Be sure to give a good explanation to help the user understand the question and answer better.
    Focus on the core reasoning and avoid unnecessary jargon.

    Question: ${questiontext}

    Options:
    ${optionsString}

    Correct Answer: ${correctanswerletter}
  `;

  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_AI_KEY,
  });
  const config = {
    responseMimeType: "text/plain",
    systemInstruction: [
      {
        text: `You are a helpful medical/health education assistant.`,
      },
    ],
  };
  const model = "gemini-2.5-flash-preview-05-20";
  const contents = prompt;

  try {
    const response = await ai.models.generateContent({
      model,
      config,
      contents,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating explanation from Google API:", error);
    throw new Error(
      "Failed to generate explanation. The API may be busy or configured incorrectly."
    );
  }
}

export default generateExplanation;
