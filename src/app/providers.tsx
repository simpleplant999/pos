"use client";

import { AdminAuthProvider } from "@/context/AdminAuthProvider";
import { PosProvider } from "@/context/PosProvider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PosProvider>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </PosProvider>
  );
}
