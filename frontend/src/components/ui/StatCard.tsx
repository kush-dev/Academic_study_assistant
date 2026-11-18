
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBackground?: string;
}

export default function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor = "text-violet-600",
  iconBackground = "bg-violet-50",
}: StatCardProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
        </div>

        <div className={`rounded-xl p-3 ${iconBackground} ${iconColor}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-400">{description}</p>
    </div>
  );
}
