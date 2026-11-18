
import api from "./client";
import type {
  DashboardDocument,
  DashboardQuiz,
  DashboardFlashcardDeck,
} from "../types/dashboard";

function extractList<T>(response: unknown): T[] {
  if (Array.isArray(response)) {
    return response as T[];
  }

  if (response && typeof response === "object") {
    const result = response as Record<string, unknown>;

    for (const key of ["items", "documents", "quizzes", "decks", "data"]) {
      if (Array.isArray(result[key])) {
        return result[key] as T[];
      }
    }
  }

  return [];
}

export async function getDashboardDocuments(): Promise<DashboardDocument[]> {
  const response = await api.get("/documents");
  return extractList<DashboardDocument>(response.data);
}

export async function getDashboardQuizzes(): Promise<DashboardQuiz[]> {
  const response = await api.get("/quizzes");
  return extractList<DashboardQuiz>(response.data);
}

export async function getDashboardFlashcardDecks(): Promise<DashboardFlashcardDeck[]> {
  const response = await api.get("/flashcards/decks");
  return extractList<DashboardFlashcardDeck>(response.data);
}
