
import { Menu, Search, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { user } = useAuth();

  const initials = user?.full_name
    ?.split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <div className="relative hidden w-full max-w-md sm:block">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            placeholder="Search documents, notes, quizzes..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3 sm:gap-5">
        <div className="hidden text-right sm:block">
          <p className="text-xs text-slate-400">Welcome back,</p>
          <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
            {user?.full_name}
          </p>
        </div>

        <button
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={19} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-violet-500 ring-2 ring-white" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
            {initials}
          </div>
          <ChevronDown size={15} className="hidden text-slate-400 sm:block" />
        </div>
      </div>
    </header>
  );
}
