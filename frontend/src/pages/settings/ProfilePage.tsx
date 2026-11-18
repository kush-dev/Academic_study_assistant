import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  UserRound,
  Mail,
  Lock,
  Trophy,
  Target,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { getQuizAnalytics } from "../../api/quizzes";
import { changePassword } from "../../api/profile";

export default function ProfilePage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const analyticsQuery = useQuery({
    queryKey: ["quiz-analytics"],
    queryFn: getQuizAnalytics,
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: (response) => {
      setPasswordMessage(response.message);
      setPasswordError("");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: any) => {
      setPasswordMessage("");
      setPasswordError(
        error.response?.data?.detail ||
          "Unable to change your password. Please try again."
      );
    },
  });

  const analytics = analyticsQuery.data;

  const handlePasswordChange = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setPasswordMessage("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError(
        "Your new password must contain at least 8 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return;
    }

    passwordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  const statCards = [
    {
      label: "Total quizzes",
      value: analytics?.total_quizzes ?? 0,
      icon: BookOpen,
      color: "bg-violet-50 text-violet-700",
    },
    {
      label: "Quiz attempts",
      value: analytics?.total_attempts ?? 0,
      icon: ClipboardCheck,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Average score",
      value: `${Math.round(analytics?.average_score ?? 0)}%`,
      icon: Target,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Best score",
      value: `${Math.round(analytics?.best_score ?? 0)}%`,
      icon: Trophy,
      color: "bg-amber-50 text-amber-700",
    },
  ];

  if (analyticsQuery.isLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-gray-500">
        <Loader2 className="animate-spin" size={22} />
        Loading your profile and performance...
      </div>
    );
  }

  if (analyticsQuery.isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Could not load your performance analytics. Please refresh the page
        and try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and track your academic performance.
        </p>
      </div>

      {/* Account details */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <UserRound size={23} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              Account information
            </h2>
            <p className="text-sm text-gray-500">
              Your registered account details.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
              <UserRound size={15} />
              Full name
            </div>
            <p className="mt-2 font-semibold text-gray-900">
              {user?.full_name || "Student"}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-400">
              <Mail size={15} />
              Email address
            </div>
            <p className="mt-2 break-all font-semibold text-gray-900">
              {user?.email || "Not available"}
            </p>
          </div>
        </div>
      </section>

      {/* Performance statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            Performance overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Your results based on saved quiz attempts.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className={`rounded-lg p-3 ${stat.color}`}>
                    <Icon size={21} />
                  </div>
                </div>

                <p className="mt-4 text-sm text-gray-500">
                  {stat.label}
                </p>

                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {stat.value}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Latest score */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-violet-600" size={22} />
          <h2 className="font-bold text-gray-900">
            Latest quiz result
          </h2>
        </div>

        {analytics?.latest_score === null ||
        analytics?.latest_score === undefined ? (
          <div className="mt-5 rounded-xl bg-gray-50 p-6 text-center">
            <BarChart3
              size={32}
              className="mx-auto mb-3 text-gray-400"
            />
            <p className="font-semibold text-gray-700">
              No quiz attempts yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Complete your first quiz to start tracking your progress.
            </p>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-violet-50 p-5">
            <div>
              <p className="text-sm text-gray-600">
                Most recent score
              </p>
              <p
                className={`mt-1 text-4xl font-bold ${scoreColor(
                  analytics.latest_score
                )}`}
              >
                {Math.round(analytics.latest_score)}%
              </p>
            </div>

            <div className="text-sm text-gray-600">
              Total completed quizzes:{" "}
              <strong>{analytics.completed_quizzes}</strong>
            </div>
          </div>
        )}
      </section>

      {/* Score history chart */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <TrendingUp className="text-violet-600" size={22} />
          <div>
            <h2 className="font-bold text-gray-900">
              Quiz score history
            </h2>
            <p className="text-sm text-gray-500">
              How your scores have changed over time.
            </p>
          </div>
        </div>

        {!analytics?.score_history.length ? (
          <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            Your score history will appear here after your first quiz.
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex h-48 items-end gap-3 border-b border-gray-200 px-2 pb-2">
              {analytics.score_history.map((item, index) => {
                const score = Math.max(
                  0,
                  Math.min(100, item.score)
                );

                return (
                  <div
                    key={`${item.quiz_id}-${item.submitted_at}-${index}`}
                    className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                    title={`${item.quiz_title}: ${Math.round(score)}%`}
                  >
                    <span className="text-xs font-semibold text-gray-600">
                      {Math.round(score)}%
                    </span>

                    <div
                      className="w-full max-w-12 rounded-t-md bg-violet-500 transition-all"
                      style={{
                        height: `${Math.max(score, 2)}%`,
                      }}
                    />
                  </div>
                );
              })}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {analytics.score_history.map((item, index) => (
                <div
                  key={`${item.quiz_id}-${item.submitted_at}-label-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-800">
                      {item.quiz_title}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(item.submitted_at)}
                    </p>
                  </div>

                  <span className="shrink-0 font-bold text-violet-700">
                    {Math.round(item.score)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Topic performance */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="font-bold text-gray-900">
            Performance by topic
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            See which topics you understand and which need more revision.
          </p>
        </div>

        {!analytics?.topic_performance.length ? (
          <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            Topic performance will appear after you complete quizzes.
          </p>
        ) : (
          <div className="space-y-5">
            {analytics.topic_performance.map((topic) => (
              <div key={topic.topic}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-800">
                    {topic.topic}
                  </span>

                  <span
                    className={`text-sm font-bold ${scoreColor(
                      topic.accuracy
                    )}`}
                  >
                    {Math.round(topic.accuracy)}%
                  </span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${
                      topic.accuracy >= 80
                        ? "bg-green-500"
                        : topic.accuracy >= 70
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(100, topic.accuracy)
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  {topic.correct_answers} correct out of{" "}
                  {topic.total_questions} answers
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Strengths and weaknesses */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-green-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={22} />
            <h2 className="font-bold text-gray-900">
              Your strengths
            </h2>
          </div>

          {!analytics?.strengths.length ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              No strengths identified yet. Complete some quizzes to
              discover your strongest topics.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.strengths.map((topic) => (
                <div
                  key={topic.topic}
                  className="rounded-lg bg-green-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-800">
                      {topic.topic}
                    </span>
                    <span className="font-bold text-green-700">
                      {Math.round(topic.accuracy)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {topic.correct_answers} correct answers
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingDown className="text-red-600" size={22} />
            <h2 className="font-bold text-gray-900">
              Topics to improve
            </h2>
          </div>

          {!analytics?.weaknesses.length ? (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
              No weak topics identified yet. Your results will help
              identify areas that need revision.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.weaknesses.map((topic) => (
                <div
                  key={topic.topic}
                  className="rounded-lg bg-red-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-gray-800">
                      {topic.topic}
                    </span>
                    <span className="font-bold text-red-700">
                      {Math.round(topic.accuracy)}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {topic.correct_answers} correct answers out of{" "}
                    {topic.total_questions}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Personalized recommendations */}
      <section className="rounded-2xl border border-violet-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <Lightbulb size={22} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">
              Personalized study recommendations
            </h2>
            <p className="text-sm text-gray-500">
              Suggested revision based on your quiz performance.
            </p>
          </div>
        </div>

        {!analytics?.recommendations.length ? (
          <div className="rounded-xl bg-gray-50 p-6 text-center">
            <CheckCircle2
              size={30}
              className="mx-auto mb-3 text-gray-400"
            />
            <p className="font-semibold text-gray-700">
              No recommendations yet
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Once you complete quizzes, we'll use your results to
              identify topics that need more attention.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {analytics.recommendations.map((recommendation, index) => (
              <div
                key={`${recommendation.topic}-${recommendation.quiz_id}-${index}`}
                className="rounded-xl border border-gray-200 p-5"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle
                    size={18}
                    className="text-amber-600"
                  />
                  <h3 className="font-semibold text-gray-900">
                    Revise: {recommendation.topic}
                  </h3>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-gray-600">
                  {recommendation.message}
                </p>

                <div className="mt-4 flex items-start gap-2 text-xs text-gray-500">
                  <FileText size={15} className="mt-0.5 shrink-0" />
                  <span>{recommendation.document_name}</span>
                </div>

                <p className="mt-2 text-xs font-semibold text-red-600">
                  Topic accuracy: {Math.round(recommendation.accuracy)}%
                </p>

                <a
                  href="/quizzes"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  <ClipboardCheck size={16} />
                  Practise with quizzes
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quiz history */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-gray-900">
          Quiz history
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          A record of your generated quizzes and results.
        </p>

        {!analytics?.quiz_history.length ? (
          <p className="mt-5 rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-500">
            Your quiz history will appear here.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-400">
                  <th className="px-3 py-3">Quiz</th>
                  <th className="px-3 py-3">Attempts</th>
                  <th className="px-3 py-3">Latest score</th>
                  <th className="px-3 py-3">Best score</th>
                  <th className="px-3 py-3">Last attempted</th>
                </tr>
              </thead>

              <tbody>
                {analytics.quiz_history.map((quiz) => (
                  <tr
                    key={quiz.quiz_id}
                    className="border-b border-gray-100"
                  >
                    <td className="px-3 py-4">
                      <p className="font-semibold text-gray-800">
                        {quiz.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {quiz.document_name}
                      </p>
                    </td>

                    <td className="px-3 py-4">
                      {quiz.attempt_count}
                    </td>

                    <td className="px-3 py-4 font-semibold">
                      {quiz.latest_score === null
                        ? "Not attempted"
                        : `${Math.round(quiz.latest_score)}%`}
                    </td>

                    <td className="px-3 py-4 font-semibold text-green-700">
                      {quiz.best_score === null
                        ? "—"
                        : `${Math.round(quiz.best_score)}%`}
                    </td>

                    <td className="px-3 py-4 text-gray-500">
                      {formatDate(quiz.last_attempt_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-3 text-violet-700">
            <Lock size={22} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">
              Change password
            </h2>
            <p className="text-sm text-gray-500">
              Update your account password securely.
            </p>
          </div>
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="max-w-xl space-y-4"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Current password
            </label>
            <input
              type="password"
              required
              minLength={1}
              value={currentPassword}
              onChange={(event) =>
                setCurrentPassword(event.target.value)
              }
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="Enter your current password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(event) =>
                setNewPassword(event.target.value)
              }
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="At least 8 characters"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Confirm new password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              autoComplete="new-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="Enter your new password again"
            />
          </div>

          {passwordError && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {passwordError}
            </p>
          )}

          {passwordMessage && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {passwordMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={passwordMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {passwordMutation.isPending && (
              <Loader2 size={17} className="animate-spin" />
            )}
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}