import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  FolderOpen,
  ClipboardCheck,
  Layers,
  Upload,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Flame,
  MessageCircle,
  FileText,
  ArrowRight,
  Sparkles,
  BookOpen,
  GraduationCap,
  Clock3,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import StatCard from "../components/ui/StatCard";

import {
  getDashboardDocuments,
  getDashboardQuizzes,
  getDashboardFlashcardDecks,
} from "../api/dashboard";

import { useStudyTimer } from "../hooks/useStudyTimer";

import type {
  DashboardDocument,
} from "../types/dashboard";

const quickActions = [
  {
    title: "Upload study materials",
    description:
      "Add PDF, DOCX or PPTX documents and organize them into folders.",
    icon: Upload,
    color: "text-blue-600",
    background: "bg-blue-50",
    link: "/documents",
    action: "Manage documents",
  },
  {
    title: "Ask your AI study assistant",
    description:
      "Ask questions and get answers grounded in your uploaded materials.",
    icon: MessageCircle,
    color: "text-violet-600",
    background: "bg-violet-50",
    link: "/chat",
    action: "Start a conversation",
  },
  {
    title: "Generate a summary",
    description:
      "Turn lengthy academic documents into clear, structured summaries.",
    icon: FileText,
    color: "text-emerald-600",
    background: "bg-emerald-50",
    link: "/summaries",
    action: "Create a summary",
  },
  {
    title: "Practice with quizzes",
    description:
      "Test your understanding with AI-generated questions and explanations.",
    icon: ClipboardCheck,
    color: "text-orange-600",
    background: "bg-orange-50",
    link: "/quizzes",
    action: "Explore quizzes",
  },
];

function formatDate(date?: string) {
  if (!date) return "Date unavailable";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date unavailable";
  }

  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getStatus(status?: string) {
  const normalized = status?.toUpperCase() || "UNKNOWN";

  if (normalized === "COMPLETED") {
    return {
      label: "Completed",
      style: "bg-emerald-50 text-emerald-700",
    };
  }

  if (normalized === "PROCESSING") {
    return {
      label: "Processing",
      style: "bg-blue-50 text-blue-700",
    };
  }

  if (normalized === "PENDING") {
    return {
      label: "Pending",
      style: "bg-amber-50 text-amber-700",
    };
  }

  if (normalized === "FAILED") {
    return {
      label: "Failed",
      style: "bg-red-50 text-red-700",
    };
  }

  return {
    label: status || "Unknown",
    style: "bg-slate-100 text-slate-600",
  };
}

function formatTimer(milliseconds: number) {
  const totalSeconds = Math.floor(milliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatStudyTime(milliseconds: number) {
  const totalMinutes = Math.floor(milliseconds / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}h ${minutes}m`;
}


function RecentDocuments({
  documents,
  isLoading,
}: {
  documents: DashboardDocument[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-14 animate-pulse rounded-xl bg-slate-100"
          />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="py-10 text-center">
        <FolderOpen className="mx-auto text-slate-300" size={35} />
        <p className="mt-3 font-medium text-slate-700">
          No documents uploaded yet
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Upload your first study document to get started.
        </p>
        <Link
          to="/documents"
          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-600"
        >
          Upload documents <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {documents.slice(0, 5).map((document) => {
        const status = getStatus(document.processing_status);

        return (
          <div
            key={document.id}
            className="flex items-center justify-between gap-3 py-4 first:pt-1 last:pb-1"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
                <FileText size={19} />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {document.filename}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Uploaded {formatDate(document.created_at)}
                </p>
              </div>
            </div>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${status.style}`}
            >
              {status.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const firstName = user?.full_name?.split(" ")[0] || "Student";
  const studyTimer = useStudyTimer();

  const documentsQuery = useQuery({
    queryKey: ["dashboard", "documents"],
    queryFn: getDashboardDocuments,
    staleTime: 30000,
    refetchInterval: 30000,
  });

  const quizzesQuery = useQuery({
    queryKey: ["dashboard", "quizzes"],
    queryFn: getDashboardQuizzes,
    staleTime: 30000,
  });

  const decksQuery = useQuery({
    queryKey: ["dashboard", "flashcard-decks"],
    queryFn: getDashboardFlashcardDecks,
    staleTime: 30000,
  });

  const documents = documentsQuery.data ?? [];

  const processingCount = documents.filter((document) => {
    const status = document.processing_status?.toUpperCase();

    return status === "PENDING" || status === "PROCESSING";
  }).length;

  const formatCount = (value: number | undefined, isLoading: boolean, isError: boolean) => {
    if (isLoading) return "...";
    if (isError) return "—";
    return value ?? 0;
  };

  const hasErrors =
    documentsQuery.isError ||
    quizzesQuery.isError ||
    decksQuery.isError;

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-violet-600">
            <Sparkles size={16} />
            Your learning workspace
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Academic Overview
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Welcome back, {firstName}. Here's an overview of your study space.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 shadow-sm">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400">
              Your workspace
            </p>
            <p className="text-sm font-semibold text-slate-800">
              Ready to learn
            </p>
          </div>
        </div>
      </section>

      {/* Study Timer */}
      <section className="rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 via-white to-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-violet-100 p-4 text-violet-600">
              <Timer size={27} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Study Timer
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Track the time you spend studying.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Current session
              </p>

              <p className="mt-1 font-mono text-3xl font-bold tracking-wider text-slate-900 sm:text-4xl">
                {formatTimer(studyTimer.sessionElapsedMs)}
              </p>

              <p className={`mt-1 text-xs font-medium ${
                studyTimer.isRunning
                  ? "text-emerald-600"
                  : "text-slate-400"
              }`}>
                {studyTimer.isRunning ? "● Timer running" : "○ Timer paused"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={
                  studyTimer.isRunning
                    ? studyTimer.pause
                    : studyTimer.start
                }
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition ${
                  studyTimer.isRunning
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-violet-600 hover:bg-violet-700"
                }`}
              >
                {studyTimer.isRunning ? (
                  <>
                    <Pause size={17} />
                    Pause
                  </>
                ) : (
                  <>
                    <Play size={17} fill="currentColor" />
                    Start Studying
                  </>
                )}
              </button>

              <button
                onClick={studyTimer.resetSession}
                disabled={
                  studyTimer.sessionElapsedMs === 0 &&
                  !studyTimer.isRunning
                }
                title="Finish and reset current session"
                className="rounded-xl border border-slate-200 bg-white p-3 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Data connection errors */}
      {hasErrors && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Some dashboard information could not be loaded.
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Check your backend connection or try refreshing the information.
            </p>
          </div>

          <button
            onClick={() => {
              void documentsQuery.refetch();
              void quizzesQuery.refetch();
              void decksQuery.refetch();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-slate-800">
            Learning overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your academic resources and study progress.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Uploaded documents"
            value={formatCount(
              documentsQuery.data?.length,
              documentsQuery.isLoading,
              documentsQuery.isError
            )}
            description="Academic materials in your library"
            icon={FolderOpen}
            iconColor="text-blue-600"
            iconBackground="bg-blue-50"
          />

          <StatCard
            title="Quizzes generated"
            value={formatCount(
              quizzesQuery.data?.length,
              quizzesQuery.isLoading,
              quizzesQuery.isError
            )}
            description="AI-generated assessments"
            icon={ClipboardCheck}
            iconColor="text-violet-600"
            iconBackground="bg-violet-50"
          />

          <StatCard
            title="Flashcard decks"
            value={formatCount(
              decksQuery.data?.length,
              decksQuery.isLoading,
              decksQuery.isError
            )}
            description="Your generated study decks"
            icon={Layers}
            iconColor="text-emerald-600"
            iconBackground="bg-emerald-50"
          />

          <StatCard
            title="Documents processing"
            value={formatCount(
              processingCount,
              documentsQuery.isLoading,
              documentsQuery.isError
            )}
            description="Pending or currently processing"
            icon={Clock3}
            iconColor="text-orange-600"
            iconBackground="bg-orange-50"
          />

          <StatCard
            title="Active study streak"
            value={`${studyTimer.streakDays} ${
              studyTimer.streakDays === 1 ? "day" : "days"
            }`}
            description="Consecutive days with a study session"
            icon={Flame}
            iconColor="text-orange-600"
            iconBackground="bg-orange-50"
          />

          <StatCard
            title="Total study time"
            value={formatStudyTime(studyTimer.totalStudyMs)}
            description="Accumulated time recorded by your timer"
            icon={Clock3}
            iconColor="text-violet-600"
            iconBackground="bg-violet-50"
          />
        </div>
      </section>

      
      {/* Quick actions */}
      <section>
        <div className="mb-4">
          <h2 className="font-semibold text-slate-800">
            Quick actions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Jump straight into your study activities.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {quickActions.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.title}
                to={item.link}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className={`rounded-xl p-3 ${item.background} ${item.color}`}>
                    <Icon size={22} />
                  </div>

                  <ArrowRight
                    size={19}
                    className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
                  />
                </div>

                <h3 className="mt-5 font-semibold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">
                  {item.description}
                </p>

                <p className="mt-4 text-sm font-semibold text-violet-600">
                  {item.action} →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent documents */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Recent documents
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              The latest materials in your library.
            </p>
          </div>

          <Link
            to="/documents"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            View all <ArrowRight size={16} />
          </Link>
        </div>

        <RecentDocuments
          documents={documents}
          isLoading={documentsQuery.isLoading}
        />
      </section>

      {/* Learning information */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <BookOpen size={21} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Your study materials
              </h3>
              <p className="text-xs text-slate-400">
                Organize your academic resources
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-500">
            Upload your lecture notes, textbooks and presentations.
            Your documents become searchable resources for AI-powered learning.
          </p>

          <Link
            to="/documents"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            Open my documents <ArrowRight size={16} />
          </Link>
        </div>

        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white p-3 text-violet-600 shadow-sm">
              <Sparkles size={21} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Learn with AI
              </h3>
              <p className="text-xs text-slate-500">
                Your personal academic assistant
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Ask questions about your uploaded materials, create revision
            resources and test your knowledge using AI.
          </p>

          <Link
            to="/chat"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            Start learning <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
