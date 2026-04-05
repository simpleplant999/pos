"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "POS" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/reports", label: "Reports" },
] as const;

export function BackOfficeNav() {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
      <h1 className="mr-2 text-xl font-bold tracking-tight text-zinc-900">TouchServe</h1>
      {/* Same flex spacer pattern as register barcode row — pushes nav to the right on wide screens */}
      <div className="min-h-11 min-w-[200px] flex-1" aria-hidden />
      <nav className="flex flex-wrap gap-2" aria-label="Back office">
        {links.map(({ href, label }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors ${
                active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
