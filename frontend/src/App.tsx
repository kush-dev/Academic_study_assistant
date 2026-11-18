import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import DocumentsPage from "./pages/documents/DocumentsPage";
import SummariesPage from "./pages/summaries/SummariesPage";
import QuizzesPage from "./pages/quizzes/QuizzesPage";
import FlashcardsPage from "./pages/flashcards/FlashcardsPage";
import ChatPage from "./pages/chat/ChatPage";
import ProfilePage from "./pages/settings/ProfilePage";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected application */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route path="/dashboard" element={<DashboardPage />} />

          <Route path="/documents" element={<DocumentsPage />} />

          <Route path="/chat" element={<ChatPage />} />

          <Route path="/summaries" element={<SummariesPage />} />

          <Route path="/quizzes" element={<QuizzesPage />} />

          <Route path="/flashcards" element={<FlashcardsPage />} />

          <Route path="/profile" element={<ProfilePage />} />

          {/* Redirect the old Settings route */}
          <Route
            path="/settings"
            element={<Navigate to="/profile" replace />}
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}