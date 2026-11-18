
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FolderPlus,
  Folder,
  FileText,
  FileUp,
  Search,
  Trash2,
  Upload,
  X,
  Plus,
  RefreshCw,
  Files,
} from "lucide-react";
import {
  createFolder,
  deleteDocument,
  getDocuments,
  getFolders,
  uploadDocument,
} from "../../api/documents";
import ProcessingStatus from "../../components/ui/ProcessingStatus";
import type { Document, Folder as FolderType } from "../../types/documents";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".pptx"];

function formatFileSize(bytes: number) {
  if (!bytes) return "Unknown size";
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getErrorMessage(error: unknown) {
  const response = (
    error as {
      response?: {
        data?: {
          detail?: string | { message?: string };
        };
      };
    }
  )?.response?.data;

  if (typeof response?.detail === "string") {
    return response.detail;
  }

  if (response?.detail?.message) {
    return response.detail.message;
  }

  return "Something went wrong. Please try again.";
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();

  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [folderName, setFolderName] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const foldersQuery = useQuery({
    queryKey: ["folders"],
    queryFn: getFolders,
  });

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
    refetchInterval: (query) => {
      const documents = query.state.data as Document[] | undefined;

      const processing = documents?.some((document) =>
        ["PENDING", "PROCESSING"].includes(
          document.processing_status.toUpperCase()
        )
      );

      return processing ? 5000 : false;
    },
  });

  const folders = foldersQuery.data ?? [];
  const documents = documentsQuery.data ?? [];

  const createFolderMutation = useMutation({
    mutationFn: createFolder,
    onSuccess: async (folder) => {
      await queryClient.invalidateQueries({ queryKey: ["folders"] });
      setSelectedFolder(folder.id);
      setFolderName("");
      setShowFolderForm(false);
      setMessage(`Folder "${folder.name}" created successfully.`);
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      file,
      folderId,
    }: {
      file: File;
      folderId: string;
    }) => uploadDocument(file, folderId),
    onSuccess: async () => {
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["documents"] }),
            queryClient.invalidateQueries({
            queryKey: ["dashboard", "documents"],
            }),
        ]);

        setMessage("Document deleted successfully.");
        setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] });
      setMessage("Document deleted successfully.");
      setErrorMessage("");
    },
    onError: (error) => {
      setErrorMessage(getErrorMessage(error));
    },
  });

  const selectedFolderDocuments = useMemo(() => {
    return documents.filter(
      (document) => document.folder_id === selectedFolder
    );
  }, [documents, selectedFolder]);

  const filteredDocuments = selectedFolderDocuments.filter((document) =>
    document.filename.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const processingCount = documents.filter((document) =>
    ["PENDING", "PROCESSING"].includes(
      document.processing_status.toUpperCase()
    )
  ).length;

  const handleCreateFolder = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = folderName.trim();

    if (!name) {
      setErrorMessage("Please enter a folder name.");
      return;
    }

    setErrorMessage("");
    setMessage("");
    createFolderMutation.mutate({ name });
  };

  const handleFileSelection = (file?: File) => {
    setErrorMessage("");
    setMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setErrorMessage("Only PDF, DOCX and PPTX files are supported.");
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("The maximum allowed file size is 25 MB.");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFolder) {
      setErrorMessage("Please select a folder before uploading.");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please select a document to upload.");
      return;
    }

    setErrorMessage("");
    setMessage("");

    uploadMutation.mutate({
      file: selectedFile,
      folderId: selectedFolder,
    });
  };

  const handleDelete = (document: Document) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${document.filename}"?`
    );

    if (!confirmed) return;

    setErrorMessage("");
    setMessage("");
    deleteMutation.mutate(document.id);
  };

  const isLoading = foldersQuery.isLoading || documentsQuery.isLoading;

  return (
    <div className="space-y-7">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
            <Files size={16} />
            Academic library
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            My Documents
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Organize your study materials and prepare them for AI-powered learning.
          </p>
        </div>

        <button
          onClick={() => {
            setShowFolderForm(true);
            setMessage("");
            setErrorMessage("");
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
        >
          <FolderPlus size={18} />
          Create folder
        </button>
      </section>

      {/* Messages */}
      {message && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>{message}</span>
          <button onClick={() => setMessage("")} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage("")} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}

      {/* Folder creation */}
      {showFolderForm && (
        <section className="rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">
                Create a new folder
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Give your study materials a name.
              </p>
            </div>

            <button
              onClick={() => setShowFolderForm(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              aria-label="Close folder form"
            >
              <X size={19} />
            </button>
          </div>

          <form
            onSubmit={handleCreateFolder}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="e.g. Computer Science, Semester 1..."
              maxLength={100}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              autoFocus
            />

            <button
              type="submit"
              disabled={createFolderMutation.isPending}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {createFolderMutation.isPending
                ? "Creating..."
                : "Create folder"}
            </button>
          </form>
        </section>
      )}

      {/* Upload area */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-slate-900">
            Upload study materials
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a folder and upload your academic documents.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              1. Select destination folder
            </label>

            <select
              value={selectedFolder}
              onChange={(event) => setSelectedFolder(event.target.value)}
              disabled={folders.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-400 disabled:bg-slate-50"
            >
              <option value="">Choose a folder...</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>

            {folders.length === 0 && !foldersQuery.isLoading && (
              <p className="mt-2 text-xs text-amber-600">
                Create a folder before uploading documents.
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              2. Select document
            </label>

            <label
              className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition ${
                selectedFolder
                  ? "border-violet-300 bg-violet-50/50 hover:bg-violet-50"
                  : "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
              }`}
            >
              <div className="rounded-lg bg-white p-2 text-violet-600">
                <FileUp size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">
                  {selectedFile?.name || "Choose a file"}
                </p>
                <p className="text-xs text-slate-400">
                  PDF, DOCX or PPTX · Maximum 25 MB
                </p>
              </div>

              <input
                type="file"
                accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                disabled={!selectedFolder}
                className="hidden"
                onChange={(event) =>
                  handleFileSelection(event.target.files?.[0])
                }
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-400">
            Documents are processed automatically after uploading.
          </p>

          <button
            onClick={handleUpload}
            disabled={
              !selectedFolder ||
              !selectedFile ||
              uploadMutation.isPending
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Upload size={17} />
            {uploadMutation.isPending ? "Uploading..." : "Upload document"}
          </button>
        </div>
      </section>

      {/* Library statistics */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Folder size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Folders</p>
              <p className="text-2xl font-bold text-slate-900">
                {foldersQuery.isLoading ? "..." : folders.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <FileText size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Documents</p>
              <p className="text-2xl font-bold text-slate-900">
                {documentsQuery.isLoading ? "..." : documents.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
              <RefreshCw size={20} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Being processed</p>
              <p className="text-2xl font-bold text-slate-900">
                {documentsQuery.isLoading ? "..." : processingCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Folder library */}
      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Your folders
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose a folder to view its documents.
            </p>
          </div>

          <button
            onClick={() => {
              void foldersQuery.refetch();
              void documentsQuery.refetch();
            }}
            className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Loading your library...
          </div>
        ) : foldersQuery.isError || documentsQuery.isError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Unable to load your library. Please refresh or try again.
          </div>
        ) : folders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
            <FolderPlus className="mx-auto text-slate-300" size={40} />
            <h3 className="mt-4 font-semibold text-slate-800">
              No folders yet
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Create your first folder to start organizing your materials.
            </p>
            <button
              onClick={() => setShowFolderForm(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700"
            >
              <Plus size={17} />
              Create your first folder
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {folders.map((folder: FolderType) => {
                const count = documents.filter(
                  (document) => document.folder_id === folder.id
                ).length;

                const active = selectedFolder === folder.id;

                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      setSearchTerm("");
                    }}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-violet-300 bg-violet-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40"
                    }`}
                  >
                    <div className="rounded-xl bg-violet-100 p-3 text-violet-600">
                      <Folder size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-800">
                        {folder.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {count} {count === 1 ? "document" : "documents"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected folder documents */}
            {selectedFolder && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {folders.find((folder) => folder.id === selectedFolder)?.name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">
                      {selectedFolderDocuments.length} documents in this folder
                    </p>
                  </div>

                  <div className="relative w-full sm:max-w-xs">
                    <Search
                      size={17}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search this folder..."
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-violet-400"
                    />
                  </div>
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <FileText className="mx-auto text-slate-300" size={35} />
                    <p className="mt-3 font-medium text-slate-700">
                      {searchTerm
                        ? "No matching documents"
                        : "This folder is empty"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {searchTerm
                        ? "Try another search term."
                        : "Upload a document using the upload section above."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredDocuments.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                            <FileText size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {document.filename}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {document.file_type?.toUpperCase()} ·{" "}
                              {formatFileSize(document.file_size)} ·{" "}
                              {formatDate(document.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <ProcessingStatus
                            status={document.processing_status}
                          />

                          <button
                            onClick={() => handleDelete(document)}
                            disabled={deleteMutation.isPending}
                            title="Delete document"
                            aria-label={`Delete ${document.filename}`}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
