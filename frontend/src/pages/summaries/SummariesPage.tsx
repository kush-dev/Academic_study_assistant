
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  FileText,
  FolderOpen,
  Sparkles,
  BookOpen,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSearch,
} from "lucide-react";

import { getFolders, getDocuments } from "../../api/documents";
import { generateSummary } from "../../api/summaries";

import type { Document } from "../../types/documents";
import type {
  SummaryDetailLevel,
  SummaryResponse,
} from "../../types/summaries";

const detailOptions: {
  value: SummaryDetailLevel;
  label: string;
  description: string;
}[] = [
  {
    value: "short",
    label: "Short",
    description: "Main ideas and key points",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Balanced topic coverage",
  },
  {
    value: "detailed",
    label: "Detailed",
    description: "More comprehensive explanation",
  },
];

export default function SummariesPage() {
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [detailLevel, setDetailLevel] =
    useState<SummaryDetailLevel>("medium");
  const [generatedSummary, setGeneratedSummary] =
    useState<SummaryResponse | null>(null);

  const {
    data: folders = [],
    isLoading: foldersLoading,
    isError: foldersError,
  } = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const {
    data: documents = [],
    isLoading: documentsLoading,
    isError: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
    refetchInterval: (query) => {
      const docs = query.state.data ?? [];
      return docs.some(
        (doc: Document) =>
          doc.processing_status === "PENDING" ||
          doc.processing_status === "PROCESSING"
      )
        ? 5000
        : false;
    },
  });

  // Select the first available folder automatically.
  useEffect(() => {
    if (!selectedFolderId && folders.length > 0) {
      setSelectedFolderId(folders[0].id);
    }
  }, [folders, selectedFolderId]);

  const folderDocuments = useMemo(
    () =>
      documents.filter(
        (document) => document.folder_id === selectedFolderId
      ),
    [documents, selectedFolderId]
  );

  // Keep the selected document valid when the folder changes.
  useEffect(() => {
    if (
      selectedDocumentId &&
      !folderDocuments.some((doc) => doc.id === selectedDocumentId)
    ) {
      setSelectedDocumentId("");
      setGeneratedSummary(null);
    }
  }, [folderDocuments, selectedDocumentId]);

  const selectedDocument = folderDocuments.find(
    (doc) => doc.id === selectedDocumentId
  );

  const summaryMutation = useMutation({
    mutationFn: generateSummary,
    onSuccess: (data) => {
      setGeneratedSummary(data);
    },
  });

  const handleFolderChange = (folderId: string) => {
    setSelectedFolderId(folderId);
    setSelectedDocumentId("");
    setGeneratedSummary(null);
    summaryMutation.reset();
  };

  const handleDocumentChange = (documentId: string) => {
    setSelectedDocumentId(documentId);
    setGeneratedSummary(null);
    summaryMutation.reset();
  };

  const handleGenerate = () => {
    if (!selectedDocumentId) return;

    setGeneratedSummary(null);

    summaryMutation.mutate({
      document_id: selectedDocumentId,
      detail_level: detailLevel,
    });
  };

  const isDocumentReady =
    selectedDocument?.processing_status === "COMPLETED";

  const formatCitationLocation = (
    citation: SummaryResponse["citations"][number]
  ) => {
    const locations: string[] = [];

    if (citation.page_number !== null) {
      locations.push(`Page ${citation.page_number}`);
    }

    if (citation.slide_number !== null) {
      locations.push(`Slide ${citation.slide_number}`);
    }

    if (locations.length === 0) {
      locations.push(`Chunk ${citation.chunk_index + 1}`);
    }

    return locations.join(" · ");
  };

  if (foldersLoading || documentsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="mr-3 h-6 w-6 animate-spin text-indigo-600" />
        <span className="text-sm text-gray-500">
          Loading your documents...
        </span>
      </div>
    );
  }

  if (foldersError || documentsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle size={20} />
          Could not load your folders or documents.
        </div>
        <button
          onClick={() => refetchDocuments()}
          className="mt-3 text-sm font-medium underline"
        >
          Try loading documents again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10">
      {/* Page heading */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Sparkles size={17} />
          AI-Powered Learning
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          AI Summaries
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
          Turn your academic documents into clear, structured summaries.
          Select a document and let AI identify its important concepts.
        </p>
      </div>

      {/* Summary configuration */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <FileSearch size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Choose your document
              </h2>
              <p className="text-sm text-gray-500">
                Select a folder and document to summarize.
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select folder
              </label>

              <div className="relative">
                <FolderOpen
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <select
                  value={selectedFolderId}
                  onChange={(e) => handleFolderChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Choose a folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Select document
              </label>

              <div className="relative">
                <FileText
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <select
                  value={selectedDocumentId}
                  onChange={(e) => handleDocumentChange(e.target.value)}
                  disabled={!selectedFolderId || folderDocuments.length === 0}
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  <option value="">Choose a document</option>

                  {folderDocuments.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.filename}
                    </option>
                  ))}
                </select>
              </div>

              {selectedFolderId && folderDocuments.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  This folder does not contain any documents.
                </p>
              )}
            </div>

            {selectedDocument && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <FileText className="mt-1 text-indigo-600" size={20} />

                  <div className="min-w-0 flex-1">
                    <p className="break-all text-sm font-medium text-gray-800">
                      {selectedDocument.filename}
                    </p>

                    <div className="mt-2 flex items-center gap-2 text-xs">
                      {isDocumentReady ? (
                        <>
                          <CheckCircle2
                            size={14}
                            className="text-green-600"
                          />
                          <span className="text-green-700">
                            Ready for summarization
                          </span>
                        </>
                      ) : selectedDocument.processing_status === "FAILED" ? (
                        <>
                          <AlertCircle
                            size={14}
                            className="text-red-600"
                          />
                          <span className="text-red-700">
                            Document processing failed
                          </span>
                        </>
                      ) : (
                        <>
                          <Clock
                            size={14}
                            className="text-amber-600"
                          />
                          <span className="text-amber-700">
                            Document is still processing
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                Summary preferences
              </h2>
              <p className="text-sm text-gray-500">
                Choose how much detail you want.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {detailOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setDetailLevel(option.value)}
                className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                  detailLevel === option.value
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {option.label}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {option.description}
                  </p>
                </div>

                <span
                  className={`h-4 w-4 rounded-full border-2 ${
                    detailLevel === option.value
                      ? "border-indigo-600 bg-indigo-600 ring-2 ring-indigo-100"
                      : "border-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!selectedDocumentId || !isDocumentReady || summaryMutation.isPending}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {summaryMutation.isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Generating summary...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Summary
              </>
            )}
          </button>

          {!selectedDocumentId && (
            <p className="mt-3 text-center text-xs text-gray-500">
              Select a document to continue.
            </p>
          )}

          {selectedDocument && !isDocumentReady && (
            <p className="mt-3 text-center text-xs text-gray-500">
              Your document must finish processing before it can be summarized.
            </p>
          )}
        </section>
      </div>

      {/* Error message */}
      {summaryMutation.isError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Summary generation failed.</p>
            <p className="mt-1">
              {summaryMutation.error instanceof Error
                ? summaryMutation.error.message
                : "An unexpected error occurred. Please try again."}
            </p>
          </div>
        </div>
      )}

      {/* Generated summary */}
      {generatedSummary && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-3 text-green-600">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    Summary generated successfully
                  </h2>
                  <p className="mt-1 break-all text-xs text-gray-500">
                    {generatedSummary.filename}
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                Complete
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-5 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>
                Detail:{" "}
                <strong className="capitalize text-gray-700">
                  {detailLevel}
                </strong>
              </span>
              <span>
                Retrieved passages:{" "}
                <strong className="text-gray-700">
                  {generatedSummary.retrieved_count}
                </strong>
              </span>
              <span>
                Sources:{" "}
                <strong className="text-gray-700">
                  {generatedSummary.citations.length}
                </strong>
              </span>
            </div>

            <div className="whitespace-pre-wrap text-sm leading-8 text-gray-700">
              {generatedSummary.summary}
            </div>

            {generatedSummary.citations.length > 0 && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                  <BookOpen size={18} className="text-indigo-600" />
                  Sources and citations
                </h3>

                <div className="space-y-3">
                  {generatedSummary.citations.map((citation) => (
                    <div
                      key={citation.source_id}
                      className="rounded-xl border border-gray-100 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
                          {citation.source_id}
                        </span>

                        <span className="text-xs text-gray-500">
                          {formatCitationLocation(citation)}
                        </span>
                      </div>

                      <p className="mt-2 break-all text-sm font-medium text-gray-800">
                        {citation.filename}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Empty state */}
      {folders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <FolderOpen className="mx-auto mb-3 text-gray-400" size={36} />
          <h3 className="font-semibold text-gray-900">
            No folders found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a folder and upload a document before generating a summary.
          </p>
        </div>
      )}
    </div>
  );
}
