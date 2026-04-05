"use client";

import { PosProvider } from "@/context/PosProvider";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <PosProvider>{children}</PosProvider>;
}
