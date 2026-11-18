
export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  difficulty?: string;
}

export interface FlashcardDeck {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  cards?: Flashcard[];
  flashcards?: Flashcard[];
}

export interface FlashcardGenerateRequest {
  document_id: string;
  count: number;
}
