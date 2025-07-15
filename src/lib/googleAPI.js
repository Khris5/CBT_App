import { GoogleGenAI } from "@google/genai";
const PRO_MODEL = "gemini-2.5-pro";
const FLASH_MODEL = "gemini-2.5-flash-preview-05-20";

const schema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      id: {
        type: "string",
        description:
          "The question id would be provided in the questions below. Output them as they are",
      },
      correctAnswerLetter: {
        type: "string",
        description: "The letter (A, B, C, or D) of the correct answer.",
      },
      explanation: {
        type: "string",
        description:
          "A brief explanation, about 5 sentences, detailing why the correct answer is right and the others are wrong.",
      },
    },
    required: ["id", "correctAnswerLetter", "explanation"],
  },
};
const config_multiple = {
  responseMimeType: "application/json",
  responseSchema: schema,
  systemInstruction: [
    {
      text: `You are a helpful medical/health education assistant.`,
    },
  ],
};
const schema_single = {
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
const config_single = {
  responseMimeType: "application/json",
  responseSchema: schema_single,
  systemInstruction: [
    {
      text: `You are a helpful medical/health education assistant.`,
    },
  ],
};

const newQuestionSchema = {
  type: "array",
  items: {
    type: "object",
    properties: {
      questionText: {
        type: "string",
        description: "The full text of the multiple-choice question.",
      },
      options: {
        type: "array",
        items: { type: "string" },
        description: "An array of 3-4 potential answers.",
      },
      correctAnswerLetter: {
        type: "string",
        description:
          "The letter (A, B, C, D, etc.) corresponding to the correct option.",
      },
      explanation: {
        type: "string",
        description:
          "A brief explanation, about 5 sentences, detailing why the correct answer is right and the others are wrong.",
      },
      topic: {
        type: "string",
        description: "The primary medical topic this question relates to.",
      },
    },
    required: [
      "questionText",
      "options",
      "correctAnswerLetter",
      "explanation",
      "topic",
    ],
  },
};

const configForNewQuestions = {
  responseMimeType: "application/json",
  responseSchema: newQuestionSchema,
  systemInstruction: [
    {
      text: `You are an expert nursing question generator. Create challenging, case scenerio based multiple-choice questions. Ensure options are plausible and the explanation is clear and educational.`,
    },
  ],
};
async function generateWithFallback({ prompt, config, abortSignal }) {
  const ai = new GoogleGenAI({
    apiKey: import.meta.env.VITE_GEMINI_AI_KEY,
  });

  // --- ATTEMPT 1: PRO MODEL ---
  try {
    console.log(`[API] Attempting request with Primary Model: ${PRO_MODEL}`);
    const proResponse = await ai.models.generateContent({
      model: PRO_MODEL,
      config,
      contents: prompt,
      abortSignal,
    });
    console.log(`[API] ✅ Success with Primary Model: ${PRO_MODEL}`);
    return proResponse.text;
  } catch (proError) {
    if (abortSignal?.aborted) {
      throw new Error("API call cancelled by user.");
    }
    console.warn(
      `[API] ⚠️ Primary Model (${PRO_MODEL}) failed. Error: ${proError.message}`
    );
    console.log(`[API] Triggering fallback to: ${FLASH_MODEL}`);

    // --- ATTEMPT 2: FLASH MODEL (FALLBACK) ---
    try {
      const flashResponse = await ai.models.generateContent({
        model: FLASH_MODEL,
        config,
        contents: prompt,
        abortSignal,
      });
      console.log(`[API] ✅ Success with Fallback Model: ${FLASH_MODEL}`);
      return flashResponse.text;
    } catch (flashError) {
      console.error(
        `[API] ❌ Fallback Model (${FLASH_MODEL}) also failed. Error: ${flashError.message}`
      );
      throw new Error(
        `API call failed for both models. Last error: ${flashError.message}`
      );
    }
  }
}

export async function generateExplanations(questions, abortSignal) {
  const prompt = `
    Evaluate these questions and textbook answers below . Provide your output in the JSON format specified. Textbook answers are stated by the book to be the right answer but it **may** not be accurate.

    For correctAnswerLetter, Analyse the questons and the options and deduce the most accurate answer then output the letter (A,B,C,D) of the option you believe is correct.

    For explanation, provide a brief explanation (~5 sentences) for why the correct answer is correct for the following multiple-choice question. Be sure to give a good explanation to help the user understand the question and answer better.
    Focus on the core reasoning and avoid unnecessary jargon.

    Note: In the explanation don't single out the textbook answer being wrong, just explain why the correct answer is correct.
     Questions:
    ${questions
      .map(
        (q, index) => `
          ${index + 1}. ID: ${q.id}
          Question: ${q.questiontext}
          options: ${q.options
            .map((opt, i) => `${String.fromCharCode(65 + i)}: ${opt}`)
            .join("\n")}
          Textbook Answer: ${q.correctanswerletter}
    `
      )
      .join("\n")}
  `;
  return generateWithFallback({
    prompt,
    config: config_multiple,
    abortSignal,
  });
}

export async function generateQuestionsForTopic(
  topics,
  numQuestions,
  abortSignal
) {
  const prompt = `
    Please generate ${numQuestions} unique, high-quality, case scenerio based multiple-choice questions.
    The questions would be used to test a nursing student's knowledge of the following nursing topics: ${topics.join(
      ", "
    )}.
    
    For each question, provide:
    1.  A clear and concise question (questionText).
    2.  An array of 3-4 plausible options (options).
    3.  The letter of the correct answer (correctAnswerLetter).
    4.  A brief explanation for the correct answer (explanation).
    5.  The specific topic it falls under from the list provided (topic).

    Distribute the questions evenly across the topics if multiple are selected.
    Ensure the output is a JSON array that strictly follows the provided schema.
  `;

  const generatedRaw = await generateWithFallback({
    prompt,
    config: configForNewQuestions,
    abortSignal,
  });

  // Parse and add unique IDs and other metadata
  const generatedQuestions = JSON.parse(generatedRaw);

  return generatedQuestions.map((q) => ({
    is_ai_generated: true,
    questiontext: q.questionText,
    correctanswerletter: q.correctAnswerLetter,
    topic: q.topic,
    explanation: q.explanation,
    options: q.options,
    category: "AI_generated",
    is_edited: true,
    edited_at: new Date(),
    created_at: new Date(),
  }));
}

export async function generateExplanationSingle(question) {
  const { questiontext, options, correctanswerletter } = question;

  const optionsString = options
    .map((opt, index) => `${String.fromCharCode(65 + index)}: ${opt}`)
    .join("\n");
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

  return generateWithFallback({
    prompt,
    config: config_single,
    abortSignal,
  });
}
