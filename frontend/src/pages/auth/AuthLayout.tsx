
import { GraduationCap, BookOpen, Brain, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 p-2 rounded-xl">
            <GraduationCap size={25} />
          </div>
          <span className="text-xl font-bold">StudyAssistant</span>
        </div>

        <div className="max-w-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-violet-200 mb-7">
            <Sparkles size={16} />
            Your personal AI study companion
          </div>

          <h1 className="text-5xl font-bold leading-tight">
            Study smarter.
            <span className="block text-violet-400">
              Learn better.
            </span>
          </h1>

          <p className="text-slate-300 mt-6 text-lg leading-8">
            Organize your academic materials, ask questions about
            your documents, and generate personalized study resources
            using AI.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-10">
            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <BookOpen className="text-violet-400 mb-3" />
              <p className="font-semibold">Smart Documents</p>
              <p className="text-sm text-slate-400 mt-1">
                Keep your learning materials organized.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-5">
              <Brain className="text-violet-400 mb-3" />
              <p className="font-semibold">AI-Powered Learning</p>
              <p className="text-sm text-slate-400 mt-1">
                Generate summaries, quizzes and flashcards.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-500">
          AI-Powered Academic Study Assistant
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <GraduationCap className="text-violet-600" size={28} />
            <span className="text-xl font-bold text-slate-900">
              StudyAssistant
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900">
              {title}
            </h2>
            <p className="text-slate-500 mt-2">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
