import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Trophy,
  XCircle,
  Target,
  Brain,
  TrendingUp,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import { getDocuments } from "../../api/documents";

import {
  generateAdaptiveQuiz,
  generateQuiz,
  getQuizzes,
  submitQuiz,
} from "../../api/quizzes";

import type {
  AdaptiveQuizResponse,
  Quiz,
  QuizResult,
} from "../../types/quizzes";

export default function QuizzesPage() {
  const queryClient = useQueryClient();

  const [selectedDocument, setSelectedDocument] = useState("");
  const [questionCount, setQuestionCount] = useState(10);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);

  const [adaptiveInfo, setAdaptiveInfo] =
    useState<AdaptiveQuizResponse | null>(null);

  const documentsQuery = useQuery({
    queryKey: ["documents"],
    queryFn: getDocuments,
  });

  const quizzesQuery = useQuery({
    queryKey: ["quizzes"],
    queryFn: getQuizzes,
  });

  const completedDocuments = useMemo(
    () =>
      (documentsQuery.data ?? []).filter(
        (document) => document.processing_status === "COMPLETED"
      ),
    [documentsQuery.data]
  );

  // Normal quiz generation
  const generateMutation = useMutation({
    mutationFn: generateQuiz,

    onSuccess: (quiz) => {
      queryClient.invalidateQueries({
        queryKey: ["quizzes"],
      });

      setActiveQuiz(quiz);
      setAnswers({});
      setQuizResult(null);
    },
  });

  // Adaptive quiz generation
  const adaptiveMutation = useMutation({
    mutationFn: generateAdaptiveQuiz,

    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: ["quizzes"],
      });

      setAdaptiveInfo(response);
      setActiveQuiz(response);
      setAnswers({});
      setQuizResult(null);
    },
  });

  // Quiz submission
  const submitMutation = useMutation({
    mutationFn: ({
      quizId,
      submittedAnswers,
    }: {
      quizId: string;
      submittedAnswers: Record<string, number>;
    }) =>
      submitQuiz(quizId, {
        answers: submittedAnswers,
      }),

    onSuccess: async (result) => {
      setQuizResult(result);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["quizzes"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["quiz-analytics"],
        }),
      ]);
    },
  });

  const sortedQuestions = useMemo(
    () =>
      [...(activeQuiz?.questions ?? [])].sort(
        (a, b) => a.question_order - b.question_order
      ),
    [activeQuiz]
  );

  const handleGenerate = () => {
    if (!selectedDocument) return;

    setActiveQuiz(null);
    setQuizResult(null);
    setAnswers({});
    setAdaptiveInfo(null);

    generateMutation.mutate({
      document_id: selectedDocument,
      count: questionCount,
    });
  };

  const handleAdaptiveGenerate = () => {
    if (!selectedDocument) return;

    setActiveQuiz(null);
    setQuizResult(null);
    setAnswers({});

    adaptiveMutation.mutate({
      document_id: selectedDocument,
      count: questionCount,
    });
  };

  const handleAnswer = (
    questionId: string,
    optionIndex: number
  ) => {
    if (quizResult) return;

    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionIndex,
    }));
  };

  const handleSubmit = () => {
    if (!activeQuiz) return;

    if (
      Object.keys(answers).length !==
      activeQuiz.questions.length
    ) {
      return;
    }

    submitMutation.mutate({
      quizId: activeQuiz.id,
      submittedAnswers: answers,
    });
  };

  const openPreviousQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setAnswers({});
    setQuizResult(null);
  };

  const closeQuiz = () => {
    setActiveQuiz(null);
    setAnswers({});
    setQuizResult(null);

    queryClient.invalidateQueries({
      queryKey: ["quizzes"],
    });

    queryClient.invalidateQueries({
      queryKey: ["quiz-analytics"],
    });
  };

  const formatDate = (
    date: string | null | undefined
  ) => {
    if (!date) return "Not attempted";

    return new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const scorePercentage =
    quizResult && quizResult.total_questions > 0
      ? Math.round(
          (quizResult.correct_answers /
            quizResult.total_questions) *
            100
        )
      : 0;

  const getQuestionResult = (questionId: string) =>
    quizResult?.results?.find(
      (result) => result.question_id === questionId
    );

  const difficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-700";
      case "Medium":
        return "bg-blue-100 text-blue-700";
      case "Hard":
        return "bg-orange-100 text-orange-700";
      case "Advanced":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-700";
      case "Medium":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-green-100 text-green-700";
    }
  };

  const currentAdaptiveInfo =
    adaptiveInfo?.document_id === selectedDocument
      ? adaptiveInfo
      : null;

  // --------------------------------------------------
  // ACTIVE QUIZ VIEW
  // --------------------------------------------------

  return (
    <div className="space-y-8">

      {/* Header */}

      <div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <BookOpen size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Quizzes
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Test your understanding with AI-generated quizzes
              from your study materials.
            </p>
          </div>
        </div>
      </div>

      {/* Active quiz */}

      {activeQuiz ? (
        <div className="space-y-6">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {activeQuiz.title}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {activeQuiz.questions.length} questions
              </p>

              {activeQuiz.title.startsWith("Adaptive Quiz") && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">
                  <Sparkles size={13} />
                  Adaptive quiz
                </span>
              )}
            </div>

            <button
              onClick={closeQuiz}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Back to quizzes
            </button>
          </div>

          {/* Progress */}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700">
                Your progress
              </span>

              <span className="text-gray-500">
                {Object.keys(answers).length} /{" "}
                {activeQuiz.questions.length} answered
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-violet-600 transition-all"
                style={{
                  width: `${
                    (Object.keys(answers).length /
                      Math.max(activeQuiz.questions.length, 1)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Results */}

          {quizResult && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-white p-4 text-violet-700">
                  <Trophy size={32} />
                </div>

                <h2 className="mt-3 text-2xl font-bold text-gray-900">
                  Quiz completed!
                </h2>

                <p className="mt-1 text-gray-600">
                  You scored {quizResult.correct_answers} out of{" "}
                  {quizResult.total_questions}.
                </p>

                <p className="mt-3 text-4xl font-bold text-violet-700">
                  {scorePercentage}%
                </p>

                <p className="mt-2 text-sm text-gray-600">
                  Your result has been saved to your performance
                  history.
                </p>

                <button
                  onClick={() => {
                    setAnswers({});
                    setQuizResult(null);
                  }}
                  className="mt-5 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Retake this quiz
                </button>

                <button
                  onClick={closeQuiz}
                  className="mt-3 text-sm font-medium text-violet-700 hover:underline"
                >
                  Back to quizzes
                </button>
              </div>
            </div>
          )}

          {/* Questions */}

          {sortedQuestions.map((question, index) => {
            const selectedOption = answers[question.id];
            const result = getQuestionResult(question.id);

            return (
              <div
                key={question.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-violet-600">
                      Question {index + 1}
                    </span>

                    {question.topic && (
                      <span className="ml-2 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                        {question.topic}
                      </span>
                    )}

                    <h3 className="mt-2 font-semibold leading-relaxed text-gray-900">
                      {question.question_text}
                    </h3>
                  </div>

                  {quizResult &&
                    result &&
                    (result.is_correct ? (
                      <CheckCircle2 className="shrink-0 text-green-600" />
                    ) : (
                      <XCircle className="shrink-0 text-red-500" />
                    ))}
                </div>

                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const isSelected =
                      selectedOption === optionIndex;

                    const isCorrectOption =
                      quizResult &&
                      result?.correct_option === optionIndex;

                    const isWrongSelection =
                      quizResult &&
                      isSelected &&
                      result?.is_correct === false;

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        disabled={!!quizResult}
                        onClick={() =>
                          handleAnswer(question.id, optionIndex)
                        }
                        className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition ${
                          isCorrectOption
                            ? "border-green-500 bg-green-50 text-green-800"
                            : isWrongSelection
                              ? "border-red-400 bg-red-50 text-red-800"
                              : isSelected
                                ? "border-violet-500 bg-violet-50 text-violet-800"
                                : "border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-gray-50"
                        }`}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            isSelected || isCorrectOption
                              ? "bg-violet-600 text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {String.fromCharCode(65 + optionIndex)}
                        </span>

                        <span className="flex-1">{option}</span>

                        {isCorrectOption && (
                          <CheckCircle2
                            size={18}
                            className="text-green-600"
                          />
                        )}

                        {isWrongSelection && (
                          <XCircle
                            size={18}
                            className="text-red-500"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {quizResult && result?.explanation && (
                  <div className="mt-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-700">
                    <strong>Explanation:</strong>{" "}
                    {result.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit */}

          {!quizResult && (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-sm text-gray-500">
                Answer every question before submitting.
              </p>

              <button
                onClick={handleSubmit}
                disabled={
                  Object.keys(answers).length !==
                    activeQuiz.questions.length ||
                  submitMutation.isPending
                }
                className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Send size={17} />
                )}

                Submit quiz
              </button>
            </div>
          )}

          {submitMutation.isError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Failed to submit the quiz. Please try again.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* DOCUMENT AND QUESTION SETTINGS */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Quiz settings
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select the study material you want to practise.
              </p>
            </div>

            {documentsQuery.isLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-gray-500">
                <Loader2 size={18} className="animate-spin" />
                Loading your documents...
              </div>
            ) : completedDocuments.length === 0 ? (
              <div className="rounded-xl bg-amber-50 p-5 text-sm text-amber-800">
                No completed documents found. Upload a PDF,
                DOCX, or PPTX in My Documents and wait for
                processing to finish before generating a quiz.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Select study document
                  </label>

                  <select
                    value={selectedDocument}
                    onChange={(event) =>
                      setSelectedDocument(event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">
                      Choose a document...
                    </option>

                    {completedDocuments.map((document) => (
                      <option
                        key={document.id}
                        value={document.id}
                      >
                        {document.filename}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Number of questions
                  </label>

                  <select
                    value={questionCount}
                    onChange={(event) =>
                      setQuestionCount(Number(event.target.value))
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                  >
                    {[5, 10, 15, 20, 25, 30].map((count) => (
                      <option key={count} value={count}>
                        {count} questions
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* NORMAL QUIZ GENERATION - FIRST */}

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-gray-100 p-3 text-gray-700">
                  <BookOpen size={24} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Normal Quiz Generation
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Create a regular quiz from your selected study
                    document without adapting it to previous scores.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={
                !selectedDocument ||
                generateMutation.isPending ||
                adaptiveMutation.isPending ||
                completedDocuments.length === 0
              }
              className="flex items-center gap-2 rounded-lg bg-gray-800 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generateMutation.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Play size={18} />
              )}

              {generateMutation.isPending
                ? "Generating quiz..."
                : "Generate normal quiz"}
            </button>

            {generateMutation.isError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                Failed to generate the quiz. Please check that
                the document is processed and try again.
              </p>
            )}
          </div>

          {/* ADAPTIVE LEARNING - SECOND */}

          <div className="overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
            <div className="border-b border-violet-100 bg-violet-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white p-3 text-violet-700">
                  <Brain size={25} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Adaptive Learning
                  </h2>

                  <p className="mt-1 text-sm text-gray-600">
                    Your next quiz adjusts its difficulty and
                    topic focus based on your previous performance.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-6">
              {!selectedDocument ? (
                <div className="flex items-start gap-3 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                  <AlertCircle
                    size={19}
                    className="mt-0.5 shrink-0"
                  />

                  Select a completed study document above to
                  see your adaptive learning settings.
                </div>
              ) : currentAdaptiveInfo ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">
                        Recommended difficulty
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-semibold ${difficultyColor(
                          currentAdaptiveInfo.adaptation.difficulty
                        )}`}
                      >
                        {currentAdaptiveInfo.adaptation.difficulty}
                      </span>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">
                        Recent average score
                      </p>

                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {currentAdaptiveInfo.adaptation
                          .recent_average_score == null
                          ? "—"
                          : `${Math.round(
                              currentAdaptiveInfo.adaptation
                                .recent_average_score
                            )}%`}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs font-medium text-gray-500">
                        Attempts analysed
                      </p>

                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {
                          currentAdaptiveInfo.adaptation
                            .attempts_considered
                        }
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <TrendingUp
                        size={17}
                        className="text-violet-600"
                      />
                      Adaptation explanation
                    </h3>

                    <p className="rounded-lg bg-violet-50 p-4 text-sm leading-relaxed text-violet-900">
                      {currentAdaptiveInfo.adaptation.reason}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-gray-800">
                      Topic priorities
                    </h3>

                    {currentAdaptiveInfo.adaptation.topic_focus
                      .length === 0 ? (
                      <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                        No weak topics have been identified yet.
                        Complete a quiz on this document to help
                        the system identify areas that need more
                        attention.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {currentAdaptiveInfo.adaptation.topic_focus.map(
                          (topic) => (
                            <div
                              key={topic.topic}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-4"
                            >
                              <div>
                                <p className="font-medium text-gray-800">
                                  {topic.topic}
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {topic.total_questions} questions
                                  analysed
                                </p>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-gray-700">
                                  {Math.round(topic.accuracy)}%
                                  accuracy
                                </span>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${priorityColor(
                                    topic.priority
                                  )}`}
                                >
                                  {topic.priority} priority
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">
                    Ready to analyse your performance
                  </p>

                  <p className="mt-1">
                    Generate an adaptive quiz to calculate the
                    recommended difficulty and identify topics
                    that need more practice.
                  </p>
                </div>
              )}

              <button
                onClick={handleAdaptiveGenerate}
                disabled={
                  !selectedDocument ||
                  adaptiveMutation.isPending ||
                  generateMutation.isPending ||
                  completedDocuments.length === 0
                }
                className="flex items-center gap-2 rounded-lg bg-violet-700 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {adaptiveMutation.isPending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Sparkles size={18} />
                )}

                {adaptiveMutation.isPending
                  ? "Analysing performance and generating..."
                  : "Generate Adaptive Quiz"}
              </button>

              {adaptiveMutation.isError && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  Adaptive quiz generation failed. Check that
                  the backend is running and try again.
                </p>
              )}
            </div>
          </div>

          {/* PREVIOUS QUIZZES */}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Your previous quizzes
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Review your previous results or practise again.
                </p>
              </div>

              <button
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ["quizzes"],
                  })
                }
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
                title="Refresh quizzes"
              >
                <RotateCcw size={17} />
              </button>
            </div>

            {quizzesQuery.isLoading ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <Loader2 className="mx-auto mb-2 animate-spin" />
                Loading quizzes...
              </div>
            ) : quizzesQuery.isError ? (
              <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                Could not load your previous quizzes.
              </p>
            ) : (quizzesQuery.data ?? []).length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <BookOpen
                  className="mx-auto mb-3 text-gray-400"
                  size={30}
                />

                <p className="font-medium text-gray-700">
                  No quizzes yet
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Generate your first quiz using one of your
                  study documents.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(quizzesQuery.data ?? []).map((quiz) => {
                  const document = documentsQuery.data?.find(
                    (item) => item.id === quiz.document_id
                  );

                  const attempts = quiz.attempt_count ?? 0;
                  const hasAttempts = attempts > 0;

                  const isAdaptive =
                    quiz.title.startsWith("Adaptive Quiz");

                  return (
                    <div
                      key={quiz.id}
                      className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-violet-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="rounded-lg bg-violet-50 p-3 text-violet-700">
                          <FileText size={21} />
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {isAdaptive && (
                            <span className="rounded-full bg-violet-100 px-2 py-1 text-xs font-semibold text-violet-700">
                              Adaptive
                            </span>
                          )}

                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock size={13} />
                            {formatDate(quiz.created_at)}
                          </span>
                        </div>
                      </div>

                      <h3 className="mt-4 font-semibold text-gray-900">
                        {quiz.title}
                      </h3>

                      <p className="mt-1 truncate text-sm text-gray-500">
                        {document?.filename ?? "Study document"}
                      </p>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">
                            Questions
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {quiz.questions.length}
                          </p>
                        </div>

                        <div className="rounded-lg bg-gray-50 p-3">
                          <p className="text-xs text-gray-500">
                            Attempts
                          </p>

                          <p className="mt-1 font-bold text-gray-900">
                            {attempts}
                          </p>
                        </div>

                        <div className="rounded-lg bg-violet-50 p-3">
                          <p className="text-xs text-gray-500">
                            Latest score
                          </p>

                          <p className="mt-1 font-bold text-violet-700">
                            {quiz.latest_score == null
                              ? "—"
                              : `${Math.round(
                                  quiz.latest_score
                                )}%`}
                          </p>
                        </div>

                        <div className="rounded-lg bg-green-50 p-3">
                          <p className="text-xs text-gray-500">
                            Best score
                          </p>

                          <p className="mt-1 font-bold text-green-700">
                            {quiz.best_score == null
                              ? "—"
                              : `${Math.round(
                                  quiz.best_score
                                )}%`}
                          </p>
                        </div>
                      </div>

                      {hasAttempts && (
                        <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                          <Target size={13} />
                          Last attempted:{" "}
                          {formatDate(quiz.last_attempt_at)}
                        </p>
                      )}

                      <button
                        onClick={() => openPreviousQuiz(quiz)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-violet-200 px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        {hasAttempts ? (
                          <>
                            <RotateCcw size={16} />
                            Retake quiz
                          </>
                        ) : (
                          <>
                            <Play size={16} />
                            Take quiz
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
