export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  options: string[];
  question_order: number;
  topic?: string;
}

export interface Quiz {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  questions: QuizQuestion[];
  attempt_count?: number;
  latest_score?: number | null;
  best_score?: number | null;
  last_attempt_at?: string | null;
}

export interface QuizGenerateRequest {
  document_id: string;
  count: number;
}

export interface QuizSubmitRequest {
  answers: Record<string, number>;
}

export interface QuizQuestionResult {
  question_id: string;
  question_text: string;
  selected_option: number;
  correct_option: number;
  is_correct: boolean;
  explanation: string;
}

export interface QuizResult {
  quiz_id: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  submitted_at: string;
  results: QuizQuestionResult[];
}

export interface AdaptiveTopicFocus {
  topic: string;
  accuracy: number;
  priority: "High" | "Medium" | "Low";
  total_questions: number;
}

export interface AdaptiveQuizResponse extends Quiz {
  adaptive: boolean;
  adaptation: {
    difficulty: "Easy" | "Medium" | "Hard" | "Advanced";
    recent_average_score: number | null;
    attempts_considered: number;
    topic_focus: AdaptiveTopicFocus[];
    reason: string;
  };
}