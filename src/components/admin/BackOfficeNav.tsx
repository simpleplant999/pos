"use client";

import { TouchServeLogo } from "@/components/branding/TouchServeLogo";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/reports", label: "Reports" },
] as const;

type Props = {
  onLogout?: () => void;
};

export function BackOfficeNav({ onLogout }: Props) {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
      <div className="mr-2 shrink-0 py-0.5">
        <TouchServeLogo />
      </div>
      {/* Same flex spacer pattern as register barcode row — pushes nav to the right on wide screens */}
      <div className="min-h-11 min-w-[200px] flex-1" aria-hidden />
      <nav className="flex flex-wrap items-center gap-2" aria-label="Back office">
        <Link
          href="/"
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          aria-label="Back to POS"
        >
          <span aria-hidden className="text-base leading-none">
            ←
          </span>
          <span>POS</span>
        </Link>
        {links.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
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
        {onLogout ? (
          <button
            type="button"
            onClick={onLogout}
            className="min-h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Sign out
          </button>
        ) : null}
      </nav>
    </header>
  );
}
