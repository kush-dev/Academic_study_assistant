
export interface DashboardDocument {
  id: string;
  filename: string;
  file_type?: string;
  processing_status: string;
  created_at: string;
}

export interface DashboardQuiz {
  id: string;
  title: string;
  document_id: string;
  created_at: string;
  questions?: unknown[];
}

export interface DashboardFlashcardDeck {
  id: string;
  title: string;
  document_id: string;
  created_at: string;
  flashcards?: unknown[];
}
