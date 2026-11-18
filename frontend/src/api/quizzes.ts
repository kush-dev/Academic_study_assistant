
import api from "./client";

import type {
  AdaptiveQuizResponse,
  Quiz,
  QuizGenerateRequest,
  QuizResult,
  QuizSubmitRequest,
} from "../types/quizzes";

export async function getQuizzes(): Promise<Quiz[]> {
  const response = await api.get("/quizzes");
  return response.data;
}

export async function generateQuiz(
  data: QuizGenerateRequest
): Promise<Quiz> {
  const response = await api.post("/quizzes/generate", data);
  return response.data;
}

export async function generateAdaptiveQuiz(
  data: QuizGenerateRequest
): Promise<AdaptiveQuizResponse> {
  const response = await api.post(
    "/quizzes/adaptive-generate",
    data
  );

  return response.data;
}

export async function submitQuiz(
  quizId: string,
  data: QuizSubmitRequest
): Promise<QuizResult> {
  const response = await api.post(
    `/quizzes/${quizId}/submit`,
    data
  );

  return response.data;
}

// Performance analytics used by ProfilePage
export async function getQuizAnalytics() {
  const response = await api.get("/quizzes/analytics");
  return response.data;
}
