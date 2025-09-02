import { GoogleGenAI } from "@google/genai";
const PRO_MODEL = "gemini-2.5-pro";
const FLASH_MODEL = "gemini-2.5-flash-preview-05-20";

// Normalize options to an array (supports array or object keyed by letters)
function normalizeOptionsToArray(options) {
  if (Array.isArray(options)) return options;
  if (options && typeof options === "object") {
    return Object.entries(options)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }
  return [];
}

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
      nonce: {
        type: "string",
        description:
          "Echo back the exact nonce provided with the question. Do not modify.",
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
    required: ["id", "nonce", "correctAnswerLetter", "explanation"],
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
        description:
          "An array of 3-4 potential answers(without the A, B, C, D, etc.)",
      },
      correctAnswerLetter: {
        type: "string",
        description:
          "The letter (A, B, C, etc.) corresponding to the correct option.",
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
  console.log("prompt", prompt);
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
  // Build a JSON-structured prompt to minimize cross-item bleed and ensure mapping
  const items = questions.map((q) => {
    const opts = normalizeOptionsToArray(q.options);
    return {
      id: q.id,
      nonce: q.nonce, // if present (batch processor attaches)
      questionText: q.questiontext,
      options: opts,
      textbookAnswerLetter: q.correctanswerletter,
    };
  });

  const prompt = [
    {
      role: "user",
      parts: [
        {
          text: `You are evaluating multiple-choice items with provided textbook answers (which may be inaccurate).
          Return JSON only that strictly follows the provided schema. Produce an array whose length and order exactly match the input array.
          For each item output: id (copy exactly), nonce (echo exactly), correctAnswerLetter, and explanation.

          Rules:
          - Determine the most accurate answer from the question and options; do not assume the textbook answer is correct.
          - correctAnswerLetter must be a single uppercase letter within the range of the provided options (A = first option, B = second, etc.).
          - Explanation should be ~5 sentences, concise, focus on core reasoning, and be educational; avoid unnecessary jargon.
          - Do not mention that the textbook answer might be wrong; simply justify why the correct answer is right.
          - Output JSON only with no extra commentary, or pre/post text.`,
        },
        { text: JSON.stringify({ items }) },
      ],
    },
  ];
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

  const opts = normalizeOptionsToArray(options);
  const payload = {
    questionText: questiontext,
    options: opts,
    textbookAnswerLetter: correctanswerletter,
  };
  const prompt = [
    {
      role: "user",
      parts: [
        {
          text: `Evaluate the question and its textbook answer.
Return JSON only that strictly follows the provided schema: isAnswerCorrect (boolean), correctAnswerLetter, explanation.

Rules:
- Be 100% certain before setting isAnswerCorrect to false.
- If the textbook answer is correct, set correctAnswerLetter to the textbook letter; otherwise set it to the letter you judge correct.
- correctAnswerLetter must be within the provided options (A = first option, B = second, etc.).
- Explanation should be ~5 sentences, concise, focus on core reasoning; avoid unnecessary jargon.
- Do not call out that the textbook answer is wrong; simply justify the correct answer.
- Output JSON only with no extra commentary or pre/post text.`,
        },
        { text: JSON.stringify(payload) },
      ],
    },
  ];

  return generateWithFallback({
    prompt,
    config: config_single,
  });
}
