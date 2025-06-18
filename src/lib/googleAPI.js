import { GoogleGenAI } from "@google/genai";

async function generateExplanation(question) {
  const { questiontext, options, correctanswerletter } = question;

  const optionsString = options
    .map((opt, index) => `${String.fromCharCode(65 + index)}: ${opt}`)
    .join("\n");

  const schema = {
    type: "object",
    properties: {
      isAnswerCorrect: {
        type: "boolean",
        description: "Whether the textbook's answer is correct.",
      },
      correctAnswerLetter: {
        type: "string",
        description: "Then letter (A, B, C, or D) of the correct answer.",
      },
      explanation: {
        type: "string",
        description:
          "A brief explanation, about 5 sentences, detailing why the correct answer is right and the others are wrong.",
      },
    },
    required: ["isAnswerCorrect", "correctAnswerLetter", "explanation"],
  };
  const prompt = `
    Evaluate the question below and the answer from the textbook. Provide your output in the JSON format specified. 

    For isAnswerCorrect, I want you to analyze the question and the "textbook answer" from the prompt below, then with your own knowledge determine if its textbook answer is correct or not. Be 100% sure that the textbook answer is wrong before outputting false

    For correctAnswerLetter, if the textbook answer, then output the option for the textbook answer. If it is wrong, output the letter (A,B,C,D) of the option you believe is correct.

    For explanation, provide a brief explanation (~5 sentences) for why the correct answer is correct for the following multiple-choice question. Be sure to give a good explanation to help the user understand the question and answer better.
    Focus on the core reasoning and avoid unnecessary jargon.

    Note: In the explanation don't single out the textbook answer being wrong, just explain why the correct answer is correct.

    Question: ${questiontext}

    Options:
    ${optionsString}

    Textbook Answer: ${correctanswerletter}
  `;

  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_AI_KEY,
  });
  const config = {
    responseMimeType: "application/json",
    responseSchema: schema,
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
      error?.message ||
        "Failed to generate explanation. The API may be busy or configured incorrectly."
    );
  }
}

export default generateExplanation;
