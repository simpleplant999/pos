"use client";

import Link from "next/link";
import { useId, useState } from "react";

type Props = {
  onLogin: (username: string, password: string) => boolean;
};

export function AdminLoginModal({ onLogin }: Props) {
  const titleId = useId();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const ok = onLogin(username, password);
    if (!ok) {
      setError("Invalid username or password.");
      setPassword("");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-zinc-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            aria-label="Back to POS"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            POS
          </Link>
        </div>
        <h2 id={titleId} className="text-lg font-bold text-zinc-900">
          Admin sign in
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Enter back office credentials to manage products, categories, and reports.
        </p>

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="text-zinc-500">Username</span>
            <input
              type="text"
              name="username"
              autoComplete="username"
              className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 px-3 text-zinc-900"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="text-zinc-500">Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 px-3 text-zinc-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            className="w-full min-h-11 rounded-xl bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
