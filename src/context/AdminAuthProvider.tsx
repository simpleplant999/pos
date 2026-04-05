"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "touchserve-admin-session";
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

type AdminAuthContextValue = {
  hydrated: boolean;
  isAuthed: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1") {
        setIsAuthed(true);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  const login = useCallback((username: string, password: string) => {
    const u = username.trim();
    const p = password;
    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setIsAuthed(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setIsAuthed(false);
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      hydrated,
      isAuthed: hydrated && isAuthed,
      login,
      logout,
    }),
    [hydrated, isAuthed, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
