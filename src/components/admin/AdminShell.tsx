"use client";

import { AdminLoginModal } from "@/components/admin/AdminLoginModal";
import { BackOfficeNav } from "@/components/admin/BackOfficeNav";
import { useAdminAuth } from "@/context/AdminAuthProvider";
import type { ReactNode } from "react";

function AdminShellInner({ children }: { children: ReactNode }) {
  const { hydrated, isAuthed, login, logout } = useAdminAuth();

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!isAuthed) {
    return (
      <div className="relative min-h-[100dvh] bg-zinc-100">
        <AdminLoginModal onLogin={login} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-zinc-100">
      <BackOfficeNav onLogout={logout} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return <AdminShellInner>{children}</AdminShellInner>;
}
