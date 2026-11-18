
import { Link } from "react-router-dom";
import { ArrowLeft, Construction } from "lucide-react";

interface ModulePlaceholderProps {
  title: string;
  description: string;
}

export default function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
          <Construction size={30} />
        </div>

        <h1 className="mt-6 text-2xl font-bold text-slate-900">
          {title}
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {description}
        </p>

        <p className="mt-5 text-xs font-medium text-violet-600">
          This section will be implemented in the next development stage.
        </p>

        <Link
          to="/dashboard"
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700"
        >
          <ArrowLeft size={17} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
