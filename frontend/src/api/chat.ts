
import api from "./client";

import type {
  ChatSession,
  ChatMessage,
  CreateChatSessionRequest,
  SendChatMessageRequest,
  SendChatMessageResponse,
} from "../types/chat";

export async function getChatSessions(): Promise<ChatSession[]> {
  const response = await api.get("/chat/sessions");
  return response.data;
}

export async function createChatSession(
  data: CreateChatSessionRequest
): Promise<ChatSession> {
  const response = await api.post("/chat/sessions", data);
  return response.data;
}

export async function getChatMessages(
  sessionId: string
): Promise<ChatMessage[]> {
  const response = await api.get(
    `/chat/sessions/${sessionId}/messages`
  );

  return response.data;
}

export async function sendChatMessage(
  data: SendChatMessageRequest
): Promise<SendChatMessageResponse> {
  const response = await api.post("/chat/message", data);
  return response.data;
}
