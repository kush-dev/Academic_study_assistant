
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "studyassistant_study_stats";

interface StudyStats {
  totalStudyMs: number;
  sessionElapsedMs: number;
  startedAt: number | null;
  streakDays: number;
  lastStudyDate: string | null;
}

const initialStats: StudyStats = {
  totalStudyMs: 0,
  sessionElapsedMs: 0,
  startedAt: null,
  streakDays: 0,
  lastStudyDate: null,
};

function getToday() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function loadStats(): StudyStats {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return initialStats;

    const parsed = JSON.parse(saved) as Partial<StudyStats>;

    return {
      ...initialStats,
      ...parsed,
    };
  } catch {
    return initialStats;
  }
}

function saveStats(stats: StudyStats) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
}

export function useStudyTimer() {
  const [stats, setStats] = useState<StudyStats>(loadStats);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!stats.startedAt) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [stats.startedAt]);

  const liveSessionMs =
    stats.sessionElapsedMs +
    (stats.startedAt ? Math.max(0, now - stats.startedAt) : 0);

  const liveTotalMs =
    stats.totalStudyMs +
    (stats.startedAt ? Math.max(0, now - stats.startedAt) : 0);

  const start = useCallback(() => {
    setStats((previous) => {
      if (previous.startedAt) return previous;

      const today = getToday();
      let streakDays = previous.streakDays;

      if (previous.lastStudyDate !== today) {
        if (previous.lastStudyDate === getYesterday()) {
          streakDays += 1;
        } else {
          streakDays = 1;
        }
      }

      const updated: StudyStats = {
        ...previous,
        startedAt: Date.now(),
        streakDays,
        lastStudyDate: today,
      };

      saveStats(updated);
      return updated;
    });

    setNow(Date.now());
  }, []);

  const pause = useCallback(() => {
    setStats((previous) => {
      if (!previous.startedAt) return previous;

      const elapsed = Math.max(0, Date.now() - previous.startedAt);

      const updated: StudyStats = {
        ...previous,
        totalStudyMs: previous.totalStudyMs + elapsed,
        sessionElapsedMs: previous.sessionElapsedMs + elapsed,
        startedAt: null,
      };

      saveStats(updated);
      return updated;
    });
  }, []);

  const resetSession = useCallback(() => {
    setStats((previous) => {
      const elapsed = previous.startedAt
        ? Math.max(0, Date.now() - previous.startedAt)
        : 0;

      const updated: StudyStats = {
        ...previous,
        totalStudyMs: previous.totalStudyMs + elapsed,
        sessionElapsedMs: 0,
        startedAt: null,
      };

      saveStats(updated);
      return updated;
    });
  }, []);

  return {
    isRunning: stats.startedAt !== null,
    sessionElapsedMs: liveSessionMs,
    totalStudyMs: liveTotalMs,
    streakDays: stats.streakDays,
    start,
    pause,
    resetSession,
  };
}
