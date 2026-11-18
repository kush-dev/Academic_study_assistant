
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  document_ids: string[];
  created_at: string;
}

export interface ChatCitation {
  [key: string]: unknown;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  citations: ChatCitation[] | string[];
  created_at: string;
}

export interface CreateChatSessionRequest {
  title: string;
  document_ids: string[];
}

export interface SendChatMessageRequest {
  session_id: string;
  message: string;
  document_ids?: string[];
}

export interface SendChatMessageResponse {
  session_id: string;
  user_message_id: string;
  assistant_message_id: string;
  answer: string;
  citations: ChatCitation[] | string[];
  sources: ChatCitation[] | string[];
  insufficient_evidence: boolean;
  retrieved_count: number;
}
