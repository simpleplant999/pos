"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthProvider";
import { usePos } from "@/context/PosProvider";
import { formatPhp } from "@/lib/pos/money";
import { TouchServeLogo } from "@/components/branding/TouchServeLogo";
import { CartAndCheckout } from "./CartAndCheckout";
import { ProductCatalog } from "./ProductCatalog";

export function PosShell() {
  const { isAuthed, logout } = useAdminAuth();
  const { applyBarcode, heldOrders, resumeOrder, deleteHeldOrder } = usePos();
  const [barcode, setBarcode] = useState("");
  const [heldOpen, setHeldOpen] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onBarcodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = applyBarcode(barcode);
    setBarcode("");
    setScanFlash(ok);
    window.setTimeout(() => setScanFlash(false), 400);
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-zinc-100">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-3 py-2">
        <div className="mr-2 shrink-0 py-0.5">
          <TouchServeLogo />
        </div>
        <form onSubmit={onBarcodeSubmit} className="flex min-w-[200px] flex-1 items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Barcode (try 4800123456789)"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className={`min-h-11 min-w-0 flex-1 rounded-xl border bg-white px-3 text-base text-zinc-900 transition-colors ${
              scanFlash
                ? "border-emerald-500 bg-emerald-50"
                : "border-zinc-200"
            }`}
          />
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
          >
            Scan
          </button>
        </form>
        <button
          type="button"
          className="relative min-h-11 rounded-xl border border-zinc-200 px-4 text-sm font-semibold"
          onClick={() => setHeldOpen(true)}
        >
          Held
          {heldOrders.length > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold text-white">
              {heldOrders.length}
            </span>
          ) : null}
        </button>
        <nav className="flex flex-wrap gap-2" aria-label="Back office">
          {!isAuthed ? (
            <Link
              href="/admin/products"
              className="flex min-h-11 items-center rounded-xl bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Admin
            </Link>
          ) : null}
          {isAuthed ? (
            <>
              <Link
                href="/admin/products"
                className="flex min-h-11 items-center rounded-xl bg-zinc-100 px-3 text-sm font-semibold text-zinc-900"
              >
                Products
              </Link>
              <Link
                href="/admin/categories"
                className="flex min-h-11 items-center rounded-xl bg-zinc-100 px-3 text-sm font-semibold text-zinc-900"
              >
                Categories
              </Link>
              <Link
                href="/admin/reports"
                className="flex min-h-11 items-center rounded-xl bg-zinc-100 px-3 text-sm font-semibold text-zinc-900"
              >
                Reports
              </Link>
              <button
                type="button"
                onClick={logout}
                className="min-h-11 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Sign out
              </button>
            </>
          ) : null}
        </nav>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="flex min-h-0 min-w-0 flex-1 flex-col p-3">
          <ProductCatalog />
        </main>
        <CartAndCheckout />
      </div>

      {heldOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h3 className="text-lg font-semibold">Held orders</h3>
              <button
                type="button"
                className="rounded-lg px-3 py-1 text-sm font-medium text-zinc-600"
                onClick={() => setHeldOpen(false)}
              >
                Close
              </button>
            </div>
            <ul className="max-h-[60vh] overflow-y-auto p-3">
              {heldOrders.length === 0 ? (
                <li className="py-8 text-center text-zinc-500">No held orders.</li>
              ) : (
                heldOrders.map((h) => (
                  <li
                    key={h.id}
                    className="mb-2 flex flex-col gap-2 rounded-xl border border-zinc-200 p-3"
                  >
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold">{h.label}</p>
                        <p className="text-xs text-zinc-500">
                          {h.lines.length} items ·{" "}
                          {formatPhp(h.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0))} subtotal
                        </p>
                        {h.note ? <p className="mt-1 text-sm text-zinc-600">{h.note}</p> : null}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="min-h-11 flex-1 rounded-xl bg-emerald-600 font-semibold text-white"
                        onClick={() => {
                          resumeOrder(h.id);
                          setHeldOpen(false);
                        }}
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-600"
                        onClick={() => deleteHeldOrder(h.id)}
                      >
                        Discard
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
