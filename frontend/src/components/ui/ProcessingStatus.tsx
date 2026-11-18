import { CheckCircle2, Clock3, LoaderCircle, XCircle } from "lucide-react";

interface ProcessingStatusProps {
  status: string;
}

export default function ProcessingStatus({
  status,
}: ProcessingStatusProps) {
  const normalized = status.toUpperCase();

  const configurations: Record<
    string,
    { label: string; style: string; icon: typeof CheckCircle2 }
  > = {
    COMPLETED: {
      label: "Completed",
      style: "bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
    },
    PROCESSING: {
      label: "Processing",
      style: "bg-blue-50 text-blue-700",
      icon: LoaderCircle,
    },
    PENDING: {
      label: "Pending",
      style: "bg-amber-50 text-amber-700",
      icon: Clock3,
    },
    FAILED: {
      label: "Failed",
      style: "bg-red-50 text-red-700",
      icon: XCircle,
    },
  };

  const config = configurations[normalized] ?? {
    label: status,
    style: "bg-slate-100 text-slate-600",
    icon: Clock3,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${config.style}`}
    >
      <Icon
        size={13}
        className={normalized === "PROCESSING" ? "animate-spin" : ""}
      />
      {config.label}
    </span>
  );
}
