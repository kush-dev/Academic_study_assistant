import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Loader2,
  RotateCcw,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";

import { getDocuments } from "../../api/documents";
import {
  generateFlashcards,
  getFlashcardDecks,
} from "../../api/flashcards";

import type { Document } from "../../types/documents";
import type {
  Flashcard,
  FlashcardDeck,
} from "../../types/flashcards";

function getDeckCards(deck: FlashcardDeck): Flashcard[] {
  return deck.flashcards ?? deck.cards ?? [];
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export default function FlashcardsPage() {
  const queryClient = useQueryClient();

  const [selectedDocument, setSelectedDocument] = useState("");
  const [cardCount, setCardCount] = useState(10);

  const [activeDeck, setActiveDeck] =
    useState<FlashcardDeck | null>(null);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const [knownCards, setKnownCards] = useState<string[]>([]);
  const [missedCards, setMissedCards] = useState<string[]>([]);

  const documentsQuery = useQuery({
    queryKey: ["flashcards", "documents"],
    queryFn: getDocuments,
  });

  const decksQuery = useQuery({
    queryKey: ["flashcard-decks"],
    queryFn: getFlashcardDecks,
  });

  const completedDocuments = useMemo(
    () =>
      (documentsQuery.data ?? []).filter(
        (document: Document) =>
          document.processing_status === "COMPLETED"
      ),
    [documentsQuery.data]
  );

  const currentCard = cards[currentIndex];

  const knownCount = knownCards.length;
  const missedCount = missedCards.length;

  const progress =
    cards.length > 0
      ? ((currentIndex + 1) / cards.length) * 100
      : 0;

  const generateMutation = useMutation({
    mutationFn: generateFlashcards,

    onSuccess: async (deck) => {
      await queryClient.invalidateQueries({
        queryKey: ["flashcard-decks"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["dashboard", "flashcards"],
      });

      const generatedCards = getDeckCards(deck);

      setActiveDeck(deck);
      setCards(generatedCards);
      setCurrentIndex(0);
      setIsFlipped(false);
      setKnownCards([]);
      setMissedCards([]);
    },

    onError: (error: any) => {
      console.error("FLASHCARD GENERATION ERROR:", error);
      console.error("HTTP STATUS:", error.response?.status);
      console.error("SERVER RESPONSE:", error.response?.data);
      console.error("ERROR MESSAGE:", error.message);
    },
  });

  function openDeck(deck: FlashcardDeck) {
    const deckCards = getDeckCards(deck);

    setActiveDeck(deck);
    setCards(deckCards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards([]);
    setMissedCards([]);
  }

  function resetSession() {
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards([]);
    setMissedCards([]);
  }

  function goToNext() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex((previous) => previous + 1);
      setIsFlipped(false);
    }
  }

  function goToPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
      setIsFlipped(false);
    }
  }

  function markKnown() {
    if (!currentCard) return;

    setKnownCards((previous) =>
      previous.includes(currentCard.id)
        ? previous
        : [...previous, currentCard.id]
    );

    setMissedCards((previous) =>
      previous.filter((id) => id !== currentCard.id)
    );

    goToNext();
  }

  function markMissed() {
    if (!currentCard) return;

    setMissedCards((previous) =>
      previous.includes(currentCard.id)
        ? previous
        : [...previous, currentCard.id]
    );

    setKnownCards((previous) =>
      previous.filter((id) => id !== currentCard.id)
    );

    goToNext();
  }

  function shuffleCards() {
    setCards((previous) => shuffleArray(previous));
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  function startNewDeck() {
    setActiveDeck(null);
    setCards([]);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards([]);
    setMissedCards([]);
  }

  function handleGenerate() {
    if (!selectedDocument) return;

    generateMutation.mutate({
      document_id: selectedDocument,
      count: cardCount,
    });
  }

  const isLoading =
    documentsQuery.isLoading || decksQuery.isLoading;

  return (
    <div className="space-y-8 pb-10">

      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Brain size={17} />
            Active Learning
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Flashcards
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Turn your study materials into interactive learning cards.
          </p>
        </div>

        {activeDeck && (
          <button
            onClick={startNewDeck}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Layers size={17} />
            Generate New Deck
          </button>
        )}
      </div>

      {/* Generation section */}
      {!activeDeck && (
        <div className="grid gap-6 lg:grid-cols-5">

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Sparkles size={22} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Generate Flashcards
                </h2>
                <p className="text-sm text-slate-500">
                  Choose a document and let AI create your cards.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Select study document
                </label>

                <select
                  value={selectedDocument}
                  onChange={(event) =>
                    setSelectedDocument(event.target.value)
                  }
                  disabled={
                    documentsQuery.isLoading ||
                    completedDocuments.length === 0
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">
                    Choose a completed document
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

                {completedDocuments.length === 0 &&
                  !documentsQuery.isLoading && (
                    <p className="mt-2 text-sm text-amber-600">
                      Upload and process a document before generating flashcards.
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Number of flashcards
                </label>

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[5, 10, 15, 20, 25, 30].map((count) => (
                    <button
                      key={count}
                      onClick={() => setCardCount(count)}
                      className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                        cardCount === count
                          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {generateMutation.isError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Flashcard generation failed. Please try again.
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={
                  !selectedDocument ||
                  generateMutation.isPending
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating your flashcards...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate {cardCount} Flashcards
                  </>
                )}
              </button>

              {generateMutation.isPending && (
                <p className="text-center text-xs text-slate-500">
                  AI is analysing your document. This may take a little while.
                </p>
              )}
            </div>
          </div>

          {/* Information card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm lg:col-span-2">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />

            <div className="relative">
              <div className="mb-5 inline-flex rounded-xl bg-white/15 p-3">
                <Brain size={25} />
              </div>

              <h2 className="text-xl font-bold">
                Learn through active recall
              </h2>

              <p className="mt-3 text-sm leading-6 text-indigo-100">
                Test what you remember, reveal answers, and identify
                the concepts that need more revision.
              </p>

              <div className="mt-7 space-y-4">
                <div className="flex items-center gap-3">
                  <Check size={18} />
                  <span className="text-sm">
                    AI-generated questions and answers
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <RotateCcw size={18} />
                  <span className="text-sm">
                    Interactive card flipping
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Layers size={18} />
                  <span className="text-sm">
                    Track your learning progress
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active study session */}
      {activeDeck && (
        <div className="space-y-6">

          {/* Deck heading and stats */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                <BookOpen size={15} />
                Study Session
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                {activeDeck.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {cards.length} flashcards in this deck
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="rounded-xl bg-emerald-50 px-4 py-2">
                <p className="text-xs text-emerald-700">Known</p>
                <p className="text-lg font-bold text-emerald-700">
                  {knownCount}
                </p>
              </div>

              <div className="rounded-xl bg-rose-50 px-4 py-2">
                <p className="text-xs text-rose-700">Need revision</p>
                <p className="text-lg font-bold text-rose-700">
                  {missedCount}
                </p>
              </div>
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <BookOpen className="mx-auto mb-3 text-amber-600" size={32} />
              <h3 className="font-semibold text-slate-900">
                No flashcards found
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                This deck does not contain any cards.
              </p>
            </div>
          ) : (
            <>
              {/* Progress */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    Study progress
                  </span>

                  <span className="font-semibold text-indigo-600">
                    {currentIndex + 1} / {cards.length}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Flashcard */}
              <div className="mx-auto max-w-3xl">
                <button
                  type="button"
                  onClick={() => setIsFlipped((previous) => !previous)}
                  className="group relative flex min-h-[340px] w-full flex-col items-center justify-center rounded-3xl border border-indigo-100 bg-gradient-to-br from-white to-indigo-50 p-8 text-center shadow-sm transition hover:shadow-md sm:min-h-[390px]"
                >
                  <div className="absolute left-6 top-6 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                    {isFlipped ? "ANSWER" : "QUESTION"}
                  </div>

                  <div className="absolute right-6 top-6 text-xs font-medium text-slate-400">
                    Card {currentIndex + 1}
                  </div>

                  {currentCard.difficulty && (
                    <div className="absolute bottom-6 left-6 text-xs text-slate-500">
                      Difficulty: {currentCard.difficulty}
                    </div>
                  )}

                  <div className="max-w-2xl">
                    <div className="mb-6 flex justify-center">
                      <div className="rounded-2xl bg-indigo-100 p-4 text-indigo-600">
                        {isFlipped ? (
                          <Brain size={30} />
                        ) : (
                          <BookOpen size={30} />
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                      {isFlipped ? "Answer" : "Think about it"}
                    </p>

                    <h3 className="mt-5 whitespace-pre-wrap text-xl font-semibold leading-relaxed text-slate-900 sm:text-2xl">
                      {isFlipped
                        ? currentCard.back
                        : currentCard.front}
                    </h3>
                  </div>

                  <div className="absolute bottom-6 right-6 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <RotateCcw size={15} />
                    Click to {isFlipped ? "see question" : "reveal answer"}
                  </div>
                </button>

                {/* Flip button */}
                <button
                  onClick={() => setIsFlipped((previous) => !previous)}
                  className="mx-auto mt-4 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
                >
                  <RotateCcw size={16} />
                  {isFlipped ? "Show Question" : "Reveal Answer"}
                </button>
              </div>

              {/* Card navigation */}
              <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>

                <button
                  onClick={shuffleCards}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Shuffle size={17} />
                  <span className="hidden sm:inline">Shuffle</span>
                </button>

                <button
                  onClick={goToNext}
                  disabled={currentIndex === cards.length - 1}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>

              {/* Self-assessment */}
              {isFlipped && (
                <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="mb-4 text-center text-sm font-semibold text-slate-800">
                    How well did you know this answer?
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={markKnown}
                      className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      <Check size={18} />
                      I knew this
                    </button>

                    <button
                      onClick={markMissed}
                      className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      <X size={18} />
                      Need to revise
                    </button>
                  </div>
                </div>
              )}

              {/* Completion */}
              {currentIndex === cards.length - 1 && (
                <div className="mx-auto max-w-3xl rounded-2xl border border-indigo-100 bg-indigo-50 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Check size={24} />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900">
                    You've reached the end of this deck!
                  </h3>

                  <p className="mt-2 text-sm text-slate-600">
                    You marked {knownCount} cards as known and{" "}
                    {missedCount} for revision.
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    <button
                      onClick={resetSession}
                      className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      <RotateCcw size={17} />
                      Study Again
                    </button>

                    <button
                      onClick={startNewDeck}
                      className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                    >
                      Generate Another Deck
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Previous decks */}
      {!activeDeck && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Previous Decks
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Continue studying from your previously generated cards.
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Layers size={17} />
              {decksQuery.data?.length ?? 0} decks
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12">
              <Loader2 className="animate-spin text-indigo-600" size={25} />
              <span className="ml-3 text-sm text-slate-500">
                Loading your flashcard decks...
              </span>
            </div>
          ) : decksQuery.isError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              Could not load your flashcard decks. Please refresh the page.
            </div>
          ) : !decksQuery.data?.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                <BookOpen size={27} />
              </div>

              <h3 className="font-semibold text-slate-900">
                No flashcard decks yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Generate your first deck using one of your completed documents.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {decksQuery.data.map((deck) => {
                const deckCards = getDeckCards(deck);

                return (
                  <div
                    key={deck.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                        <Layers size={21} />
                      </div>

                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        {deckCards.length} cards
                      </span>
                    </div>

                    <h3 className="line-clamp-2 font-semibold text-slate-900">
                      {deck.title}
                    </h3>

                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={14} />
                      Created {formatDate(deck.created_at)}
                    </div>

                    <button
                      onClick={() => openDeck(deck)}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-600"
                    >
                      <BookOpen size={17} />
                      Study Deck
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
