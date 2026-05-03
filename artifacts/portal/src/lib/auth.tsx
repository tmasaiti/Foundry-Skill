import { createContext, useContext, useState, ReactNode } from "react";
import { MOCK_TENANT } from "./mockData";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "billing" | "viewer";
  tenant_id: string;
  tenant_name: string;
  avatar_initials: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  token: string;
}

const DEMO_USER: AuthUser = {
  id: "adm_01h9own2p3q4r5s6t7u8v",
  email: "sarah@acme.com",
  name: "Sarah Chen",
  role: "owner",
  tenant_id: MOCK_TENANT.id,
  tenant_name: MOCK_TENANT.name,
  avatar_initials: "SC",
};

const DEMO_TOKEN = "Bearer demo-token-foundry-iam";

const STORAGE_KEY = "foundry_iam_demo_session";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    // Auto-seed the demo session on first load so the portal is always navigable
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER));
    return DEMO_USER;
  });
  const [token, setToken] = useState<string>(DEMO_TOKEN);

  const login = async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 600));
    if (email === "demo@foundry-iam.dev" || email.includes("@")) {
      const u = { ...DEMO_USER, email };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      setUser(u);
      setToken(DEMO_TOKEN);
    } else {
      throw new Error("Invalid credentials");
    }
  };

  const logout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setToken("");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
