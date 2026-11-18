import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  FolderOpen,
  MessageCircle,
  FileText,
  ClipboardCheck,
  Layers,
  UserRound,
  GraduationCap,
  X,
  LogOut,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { name: "My Documents", path: "/documents", icon: FolderOpen },
  { name: "AI Study Chat", path: "/chat", icon: MessageCircle },
  { name: "Summaries", path: "/summaries", icon: FileText },
  { name: "Quizzes", path: "/quizzes", icon: ClipboardCheck },
  { name: "Flashcards", path: "/flashcards", icon: Layers },
  { name: "Profile", path: "/profile", icon: UserRound },
];

export default function Sidebar({
  mobileOpen,
  onClose,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const initials =
    user?.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const handleLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col overflow-hidden border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Application logo */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <GraduationCap size={23} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                StudyAssistant
              </h1>

              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Academic workspace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main navigation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-7">
          <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                      isActive
                        ? "bg-violet-600 text-white shadow-md shadow-violet-200"
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                    }`
                  }
                >
                  <Icon size={19} />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User information and sign out */}
        <div className="shrink-0 border-t border-slate-100 bg-white p-4">
          <div className="flex min-w-0 items-center gap-3 px-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.full_name || "Student"}
              </p>

              <p className="truncate text-xs text-slate-400">
                {user?.email || ""}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}