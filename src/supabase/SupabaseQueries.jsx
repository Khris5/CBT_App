import { supabase } from "../lib/supabaseClient";

// createUserSession_supabase used in HomePage.jsx
export const createUserSession_supabase = async (userSessionData) => {
  const { data: sessionData, error: sessionError } = await supabase
    .from("user_sessions")
    .insert(userSessionData)
    .select("id")
    .single();

  return { sessionData, sessionError };
};

export const createSessionQuestions_supabase = async (
  sessionQuestionsToInsert
) => {
  const { error: sqError } = await supabase
    .from("session_questions")
    .insert(sessionQuestionsToInsert);

  return { sqError };
};

export const insertQuestions_supabase = async (questionsToInsert) => {
  const questionsForDb = questionsToInsert.map(
    ({
      id,
      questiontext,
      options,
      correctanswerletter,
      explanation,
      category,
      topic,
      is_ai_generated,
      is_edited,
      edited_at,
      created_at,
    }) => ({
      id,
      questiontext,
      options,
      correctanswerletter,
      explanation,
      category,
      topic,
      is_ai_generated,
      is_edited,
      edited_at,
      created_at,
    })
  );
  const { data, error } = await supabase
    .from("questions")
    .insert(questionsForDb)
    .select();
  return { data, error };
};
// userSessionQuery_supabase used in PracticeSession.jsx and ResultsScreen.jsx
export const userSessionQuery_supabase = async (sessionId) => {
  const { data: sessionData, error: sessionError } = await supabase
    .from("user_sessions")
    .select(
      `score_achieved,
        total_questions_in_session,
        category_selection,
        ended_at,
        time_limit_seconds,
        started_at,
        user_id,
        profiles ( full_name )`
    )
    .eq("id", sessionId)
    .single();

  return { sessionData, sessionError };
};

// sessionQuestionsQuery_supabase used in PracticeSession.jsx and ReviewScreen.jsx
export const sessionQuestionsQuery_supabase = async (sessionId) => {
  const { data: sessionQuestionsData, error: questionsError } = await supabase
    .from("session_questions")
    .select(
      `id,
        order_in_session,
        user_answer_letter,
        is_correct,
        question_id,
        questions (*)`
    )
    .eq("user_session_id", sessionId)
    .order("order_in_session", { ascending: true });

  return { sessionQuestionsData, questionsError };
};

// updateSessionQuestions_supabase used in PracticeSession.jsx when submitting session
export const updateSessionQuestions_supabase = async (
  sessionQuestionUpdates
) => {
  const { error: updateError } = await supabase
    .from("session_questions")
    .upsert(sessionQuestionUpdates, { onConflict: "id" });

  return { updateError };
};

// updateUserSessions_supabase used in PracticeSession.jsx when submitting session
export const updateUserSessions_supabase = async (score, sessionId) => {
  const { error: sessionUpdateError } = await supabase
    .from("user_sessions")
    .update({
      score_achieved: score,
      ended_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  return { sessionUpdateError };
};
