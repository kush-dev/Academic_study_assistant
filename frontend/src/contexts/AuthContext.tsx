
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import api from "../api/client";
import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from "../types/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem("access_token");

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.get<User>("/auth/me");
        setUser(response.data);
      } catch {
        localStorage.removeItem("access_token");
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (data: LoginRequest) => {
    const response = await api.post<AuthResponse>(
      "/auth/login",
      data
    );

    localStorage.setItem(
      "access_token",
      response.data.access_token
    );

    setUser(response.data.user);
  };

  const register = async (data: RegisterRequest) => {
    await api.post("/auth/register", data);

    // Authenticate after registration to establish a frontend session.
    await login({
      email: data.email,
      password: data.password,
    });
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
