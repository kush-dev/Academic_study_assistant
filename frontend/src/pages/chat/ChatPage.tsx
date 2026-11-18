
import { useEffect, useState, type FormEvent } from "react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Bot,
  BookOpen,
  Plus,
  Send,
  MessageSquare,
  User,
  Loader2,
  FileText,
  ChevronDown,
  AlertCircle,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import {
  getChatSessions,
  createChatSession,
  getChatMessages,
  sendChatMessage,
} from "../../api/chat";

import { getDocuments } from "../../api/documents";

import type {
  ChatCitation,
  ChatMessage,
  ChatSession,
} from "../../types/chat";

import type { Document } from "../../types/documents";


function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}


function getCitationLabel(citation: ChatCitation | string): string {
  if (typeof citation === "string") {
    return citation;
  }

  const source =
    citation.filename ??
    citation.document_name ??
    citation.source ??
    citation.title ??
    citation.name;

  const page = citation.page;
  const slide = citation.slide;

  let label = source ? String(source) : "Document source";

  if (page !== undefined && page !== null) {
    label += ` — Page ${String(page)}`;
  } else if (slide !== undefined && slide !== null) {
    label += ` — Slide ${String(slide)}`;
  }

  return label;
}


function getErrorMessage(error: unknown): string {
  const axiosError = error as {
    response?: {
      data?: {
        detail?: unknown;
        message?: unknown;
      };
    };
    message?: string;
  };

  const detail = axiosError.response?.data?.detail;
  const message = axiosError.response?.data?.message;

  if (typeof detail === "string") return detail;
  if (typeof message === "string") return message;

  return axiosError.message || "Something went wrong. Please try again.";
}


export default function ChatPage() {
  const queryClient = useQueryClient();

  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    null
  );

  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>(
    []
  );

  const [message, setMessage] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [currentSources, setCurrentSources] = useState<
    (ChatCitation | string)[]
  >([]);

  const [chatError, setChatError] = useState("");

  // Load chat sessions.
  const sessionsQuery = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: getChatSessions,
  });

  // Load available documents.
  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  // Load messages for the selected session.
  const messagesQuery = useQuery({
    queryKey: ["chat-messages", activeSessionId],
    queryFn: () => getChatMessages(activeSessionId!),
    enabled: Boolean(activeSessionId),
  });

  const sessions = sessionsQuery.data ?? [];

  const documents = documentsQuery.data ?? [];

  const completedDocuments = documents.filter(
    (document: Document) =>
      document.processing_status === "COMPLETED"
  );

  const messages: ChatMessage[] = messagesQuery.data ?? [];

  const activeSession = sessions.find(
    (session: ChatSession) => session.id === activeSessionId
  );

  // Restore document selection when opening an existing session.
  useEffect(() => {
    if (activeSession) {
      setSelectedDocumentIds(activeSession.document_ids ?? []);
    }
  }, [activeSessionId, activeSession?.id]);

  // Create a session if necessary, then send the message.
  const sendMutation = useMutation({
    mutationFn: async (messageText: string) => {
      let sessionId = activeSessionId;

      if (!sessionId) {
        const newSession = await createChatSession({
          title: messageText.slice(0, 60),
          document_ids: selectedDocumentIds,
        });

        sessionId = newSession.id;
      }

      const response = await sendChatMessage({
        session_id: sessionId,
        message: messageText,
        document_ids: selectedDocumentIds,
      });

      return {
        sessionId,
        response,
      };
    },

    onSuccess: async ({ sessionId, response }) => {
      setActiveSessionId(sessionId);
      setCurrentSources(response.sources ?? []);
      setMessage("");
      setChatError("");

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["chat-sessions"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["chat-messages", sessionId],
        }),
      ]);
    },

    onError: (error: unknown) => {
      console.error("Chat message error:", error);
      setChatError(getErrorMessage(error));
    },
  });


  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage || sendMutation.isPending) {
      return;
    }

    if (selectedDocumentIds.length === 0) {
      setChatError("Please select at least one completed document.");
      return;
    }

    setChatError("");
    setCurrentSources([]);

    sendMutation.mutate(trimmedMessage);
  }


  function handleNewChat() {
    setActiveSessionId(null);
    setSelectedDocumentIds([]);
    setMessage("");
    setCurrentSources([]);
    setChatError("");
  }


  function toggleDocument(documentId: string) {
    setSelectedDocumentIds((previous) =>
      previous.includes(documentId)
        ? previous.filter((id) => id !== documentId)
        : [...previous, documentId]
    );

    setChatError("");
  }


  function openSession(session: ChatSession) {
    setActiveSessionId(session.id);
    setCurrentSources([]);
    setChatError("");
  }


  const isLoading =
    sessionsQuery.isLoading || documentsQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }


  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-[600px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

      {/* CHAT HISTORY SIDEBAR */}
      {sidebarOpen && (
        <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200 bg-gray-50">

          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Chat History
              </h2>
              <p className="text-xs text-gray-500">
                Your previous conversations
              </p>
            </div>

            <button
              onClick={handleNewChat}
              className="rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700"
              title="Start a new chat"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">

            {sessions.length === 0 && (
              <div className="py-8 text-center text-sm text-gray-500">
                <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                No conversations yet.
              </div>
            )}

            {sessions.map((session: ChatSession) => (
              <button
                key={session.id}
                onClick={() => openSession(session)}
                className={`w-full rounded-xl p-3 text-left transition ${
                  activeSessionId === session.id
                    ? "border border-indigo-200 bg-indigo-50"
                    : "border border-transparent hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-2">
                  <MessageSquare
                    size={16}
                    className="mt-1 shrink-0 text-indigo-600"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {session.title}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(session.created_at)}
                    </p>
                  </div>
                </div>
              </button>
            ))}

          </div>
        </aside>
      )}


      {/* MAIN CHAT AREA */}
      <main className="flex min-w-0 flex-1 flex-col">

        {/* HEADER */}
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">

          <div className="flex items-center gap-3">

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              title={sidebarOpen ? "Hide history" : "Show history"}
            >
              {sidebarOpen ? (
                <PanelLeftClose size={19} />
              ) : (
                <PanelLeftOpen size={19} />
              )}
            </button>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Bot size={23} />
            </div>

            <div>
              <h1 className="font-semibold text-gray-900">
                AI Study Chat
              </h1>
              <p className="text-xs text-gray-500">
                Ask questions about your study materials
              </p>
            </div>

          </div>

          <div className="hidden items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 sm:flex">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            RAG Assistant
          </div>

        </header>


        {/* DOCUMENT SELECTOR */}
        <div className="border-b border-gray-200 bg-gray-50/70 px-5 py-3">

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between">

              <div className="flex items-center gap-2">
                <BookOpen size={17} className="text-indigo-600" />

                <span className="text-sm font-medium text-gray-700">
                  Knowledge sources
                </span>

                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {selectedDocumentIds.length} selected
                </span>
              </div>

              <ChevronDown
                size={18}
                className="text-gray-500 transition group-open:rotate-180"
              />

            </summary>

            <div className="mt-3 max-h-48 space-y-2 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3">

              {completedDocuments.length === 0 && (
                <p className="text-sm text-gray-500">
                  No completed documents available. Upload and process a document first.
                </p>
              )}

              {completedDocuments.map((document: Document) => (
                <label
                  key={document.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                >

                  <input
                    type="checkbox"
                    checked={selectedDocumentIds.includes(document.id)}
                    onChange={() => toggleDocument(document.id)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />

                  <FileText size={17} className="shrink-0 text-gray-400" />

                  <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                    {document.filename}
                  </span>

                </label>
              ))}

            </div>
          </details>

        </div>


        {/* CONVERSATION */}
        <div className="flex-1 space-y-5 overflow-y-auto bg-white p-5">

          {!activeSessionId && messages.length === 0 && (
            <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">

              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                <Sparkles size={32} />
              </div>

              <h2 className="text-xl font-semibold text-gray-900">
                Your AI Study Assistant
              </h2>

              <p className="mt-2 max-w-md text-sm leading-6 text-gray-500">
                Select one or more completed documents above, then ask
                questions about their contents. Your answers will be
                grounded in your study materials and include source references.
              </p>

              <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">

                <div className="rounded-xl border border-gray-200 p-3 text-left">
                  <BookOpen size={19} className="mb-2 text-indigo-600" />
                  <p className="text-sm font-medium text-gray-800">
                    Understand concepts
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Ask for explanations of difficult topics.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 p-3 text-left">
                  <FileText size={19} className="mb-2 text-indigo-600" />
                  <p className="text-sm font-medium text-gray-800">
                    Find information
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Ask questions based on your uploaded documents.
                  </p>
                </div>

              </div>

            </div>
          )}


          {activeSessionId && messagesQuery.isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          )}


          {messages.map((chatMessage: ChatMessage) => {
            const isUser = chatMessage.role === "user";

            return (
              <div
                key={chatMessage.id}
                className={`flex gap-3 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >

                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isUser
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {isUser ? <User size={18} /> : <Bot size={19} />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? "rounded-tr-sm bg-indigo-600 text-white"
                      : "rounded-tl-sm border border-gray-200 bg-gray-50 text-gray-800"
                  }`}
                >

                  <div className="whitespace-pre-wrap break-words text-sm leading-7">
                    {chatMessage.content}
                  </div>

                  {!isUser &&
                    Array.isArray(chatMessage.citations) &&
                    chatMessage.citations.length > 0 && (
                      <div className="mt-4 border-t border-gray-200 pt-3">

                        <p className="mb-2 text-xs font-semibold text-gray-600">
                          Sources
                        </p>

                        <div className="space-y-1">
                          {chatMessage.citations.map((citation, index) => (
                            <div
                              key={`${chatMessage.id}-citation-${index}`}
                              className="flex items-start gap-2 text-xs text-indigo-700"
                            >
                              <FileText size={13} className="mt-0.5 shrink-0" />
                              <span>
                                {getCitationLabel(citation)}
                              </span>
                            </div>
                          ))}
                        </div>

                      </div>
                    )}

                </div>

              </div>
            );
          })}


          {/* SOURCES FROM THE LATEST RESPONSE */}
          {currentSources.length > 0 && !sendMutation.isPending && (
            <div className="ml-12 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">

              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-900">
                <FileText size={16} />
                Retrieved document sources
              </p>

              <div className="space-y-2">
                {currentSources.map((source, index) => (
                  <div
                    key={`source-${index}`}
                    className="flex items-start gap-2 text-sm text-indigo-800"
                  >
                    <span className="font-semibold">
                      {index + 1}.
                    </span>

                    <span>
                      {getCitationLabel(source)}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          )}


          {/* GENERATION INDICATOR */}
          {sendMutation.isPending && (
            <div className="flex items-start gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                <Bot size={19} />
              </div>

              <div className="rounded-2xl rounded-tl-sm border border-gray-200 bg-gray-50 px-4 py-3">

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                  Searching your documents and generating an answer...
                </div>

              </div>
            </div>
          )}

          <div />

        </div>


        {/* ERROR MESSAGE */}
        {chatError && (
          <div className="mx-5 mb-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">

            <AlertCircle size={17} className="mt-0.5 shrink-0" />

            <span>{chatError}</span>

          </div>
        )}


        {/* MESSAGE INPUT */}
        <div className="border-t border-gray-200 bg-white p-4">

          <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">

            <div className="flex items-end gap-3 rounded-2xl border border-gray-300 bg-gray-50 p-2 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">

              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Ask a question about your selected documents..."
                rows={2}
                disabled={sendMutation.isPending}
                className="max-h-36 min-h-[48px] flex-1 resize-y bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={
                  !message.trim() ||
                  sendMutation.isPending ||
                  selectedDocumentIds.length === 0
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="Send message"
              >
                {sendMutation.isPending ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : (
                  <Send size={19} />
                )}
              </button>

            </div>

            <p className="mt-2 text-center text-xs text-gray-400">
              Answers are generated using your selected study documents.
            </p>

          </form>

        </div>

      </main>

    </div>
  );
}
