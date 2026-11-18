
import api from "./client";
import type {
  FlashcardDeck,
  FlashcardGenerateRequest,
} from "../types/flashcards";

export async function getFlashcardDecks(): Promise<FlashcardDeck[]> {
  const response = await api.get("/flashcards/decks");
  return response.data;
}

export async function generateFlashcards(
  data: FlashcardGenerateRequest
): Promise<FlashcardDeck> {
  const response = await api.post("/flashcards/generate", data);
  return response.data;
}
