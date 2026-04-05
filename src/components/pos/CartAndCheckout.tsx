"use client";

import { useMemo, useState } from "react";
import { usePos } from "@/context/PosProvider";
import { formatPhp } from "@/lib/pos/money";
import { sumPayments } from "@/lib/pos/totals";
import { ReceiptModal } from "@/components/pos/ReceiptModal";
import type { PaymentMethodId } from "@/types/pos";

const PAYMENT_LABELS: Record<PaymentMethodId, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
};

export function CartAndCheckout() {
  const pos = usePos();
  const {
    cartLines,
    setLineQty,
    removeLine,
    discount,
    setDiscount,
    serviceEnabled,
    setServiceEnabled,
    totals,
    vatRate,
    serviceRate,
    paymentDraft,
    setPaymentDraft,
    completeSale,
    lastSale,
    clearLastSale,
    cartNotice,
    clearCartNotice,
  } = pos;

  const [discountOpen, setDiscountOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [holdLabel, setHoldLabel] = useState("");
  const [holdNote, setHoldNote] = useState("");
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);
  const [confirmPayOpen, setConfirmPayOpen] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const paid = useMemo(() => sumPayments(paymentDraft), [paymentDraft]);
  const remaining = Math.max(0, round2(totals.total - paid));
  const changePreview = paid > totals.total + 0.001 ? round2(paid - totals.total) : 0;

  function setPay(id: PaymentMethodId, raw: string) {
    const n = parseFloat(raw);
    setPaymentDraft((p) => {
      const next = { ...p };
      if (!raw.trim() || Number.isNaN(n) || n <= 0) delete next[id];
      else next[id] = round2(n);
      return next;
    });
  }

  function fillRemaining(id: PaymentMethodId) {
    if (remaining <= 0) return;
    setPaymentDraft((p) => ({ ...p, [id]: round2((p[id] ?? 0) + remaining) }));
  }

  function openPaymentConfirm() {
    setCheckoutMsg(null);
    setConfirmError(null);
    setConfirmPayOpen(true);
  }

  function closePaymentConfirm() {
    setConfirmPayOpen(false);
    setConfirmError(null);
  }

  function confirmPayment() {
    setConfirmError(null);
    setCheckoutMsg(null);
    const r = completeSale();
    if (!r.ok) {
      setConfirmError(r.reason);
      return;
    }
    setConfirmPayOpen(false);
  }

  return (
    <aside className="flex w-full max-w-[19rem] shrink-0 flex-col border-l border-zinc-200 bg-zinc-50 sm:max-w-[20.5rem]">
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
        <h2 className="text-base font-bold leading-none text-zinc-900">Cart</h2>
        <span className="text-xs text-zinc-500">{cartLines.length} lines</span>
      </div>

      {cartNotice ? (
        <div className="flex items-start justify-between gap-1.5 border-b border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs leading-snug text-amber-950">
          <span>{cartNotice}</span>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 font-bold leading-none text-amber-800"
            onClick={clearCartNotice}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5">
        {cartLines.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-zinc-500">Tap products to add.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {cartLines.map((line) => (
              <li
                key={line.id}
                className="flex gap-1.5 rounded-lg border border-zinc-200 bg-white p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-zinc-900">
                    {line.name}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-none text-zinc-500">
                    {formatPhp(line.unitPrice)} ea.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold leading-none"
                      onClick={() => setLineQty(line.id, line.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-[1.25rem] text-center text-xs font-bold">{line.qty}</span>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold leading-none"
                      onClick={() => setLineQty(line.id, line.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-[10px] font-medium text-red-600"
                    onClick={() => removeLine(line.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 border-t border-zinc-200 bg-white p-2.5 sm:p-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className="min-h-9 flex-1 rounded-lg bg-zinc-200 px-2 text-xs font-semibold text-zinc-900"
            onClick={() => setDiscountOpen((v) => !v)}
          >
            Discount
          </button>
          <button
            type="button"
            className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-semibold ${
              serviceEnabled
                ? "bg-amber-500 text-white"
                : "bg-zinc-200 text-zinc-900"
            }`}
            onClick={() => setServiceEnabled(!serviceEnabled)}
          >
            Svc {Math.round(serviceRate * 100)}%
          </button>
        </div>

        {discountOpen ? (
          <div className="rounded-lg border border-zinc-200 p-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Discount</p>
            <div className="mt-1.5 flex gap-1">
              <button
                type="button"
                className={`min-h-8 flex-1 rounded-md text-xs font-semibold ${
                  discount.kind === "none"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100"
                }`}
                onClick={() => setDiscount({ kind: "none" })}
              >
                None
              </button>
              <button
                type="button"
                className={`min-h-8 flex-1 rounded-md text-xs font-semibold ${
                  discount.kind === "percent"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100"
                }`}
                onClick={() => setDiscount({ kind: "percent", value: 10 })}
              >
                %
              </button>
              <button
                type="button"
                className={`min-h-8 flex-1 rounded-md text-xs font-semibold ${
                  discount.kind === "fixed"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100"
                }`}
                onClick={() => setDiscount({ kind: "fixed", value: 50 })}
              >
                Fixed
              </button>
            </div>
            {discount.kind === "percent" ? (
              <label className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="text-zinc-600">%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="min-h-8 w-20 rounded-md border border-zinc-200 px-1.5 text-xs"
                  value={discount.value}
                  onChange={(e) =>
                    setDiscount({ kind: "percent", value: Number(e.target.value) || 0 })
                  }
                />
              </label>
            ) : null}
            {discount.kind === "fixed" ? (
              <label className="mt-1.5 flex items-center gap-2 text-xs">
                <span className="text-zinc-600">₱</span>
                <input
                  type="number"
                  min={0}
                  className="min-h-8 w-24 rounded-md border border-zinc-200 px-1.5 text-xs"
                  value={discount.value}
                  onChange={(e) =>
                    setDiscount({ kind: "fixed", value: Number(e.target.value) || 0 })
                  }
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <dl className="space-y-0.5 text-[11px] leading-tight">
          <div className="flex justify-between text-zinc-600">
            <dt>Subtotal</dt>
            <dd className="font-medium tabular-nums text-zinc-900">{formatPhp(totals.subtotal)}</dd>
          </div>
          {totals.discountAmount > 0 ? (
            <div className="flex justify-between text-red-600">
              <dt>Discount</dt>
              <dd className="tabular-nums">−{formatPhp(totals.discountAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-zinc-600">
            <dt>Net</dt>
            <dd className="tabular-nums">{formatPhp(totals.netBeforeCharges)}</dd>
          </div>
          <div className="flex justify-between text-zinc-600">
            <dt>VAT ({Math.round(vatRate * 100)}%)</dt>
            <dd className="tabular-nums">{formatPhp(totals.vatAmount)}</dd>
          </div>
          {serviceEnabled ? (
            <div className="flex justify-between text-zinc-600">
              <dt>Service</dt>
              <dd className="tabular-nums">{formatPhp(totals.serviceAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-xs font-bold leading-none">
            <dt>Total</dt>
            <dd className="tabular-nums text-emerald-700">{formatPhp(totals.total)}</dd>
          </div>
        </dl>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Payment</p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethodId[]).map((id) => (
              <div key={id} className="flex flex-col gap-0.5">
                <label className="text-[10px] text-zinc-500">{PAYMENT_LABELS[id]}</label>
                <div className="flex gap-0.5">
                  <input
                    inputMode="decimal"
                    className="min-h-9 min-w-0 flex-1 rounded-md border border-zinc-200 px-1.5 text-xs tabular-nums"
                    placeholder="0"
                    value={paymentDraft[id] ?? ""}
                    onChange={(e) => setPay(id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-md bg-zinc-100 px-1.5 text-[10px] font-semibold"
                    onClick={() => fillRemaining(id)}
                  >
                    Rest
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[11px]">
            <span className="text-zinc-500">Paid</span>
            <span className="font-semibold tabular-nums">{formatPhp(paid)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-zinc-500">Due</span>
            <span
              className={`font-semibold tabular-nums ${remaining > 0.01 ? "text-amber-600" : "text-emerald-600"}`}
            >
              {formatPhp(remaining)}
            </span>
          </div>
          {paid > totals.total + 0.001 ? (
            <div className="mt-0.5 flex justify-between text-[11px] font-semibold text-emerald-700">
              <span>Change</span>
              <span className="tabular-nums">{formatPhp(round2(paid - totals.total))}</span>
            </div>
          ) : null}
        </div>

        {checkoutMsg ? (
          <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs leading-snug text-red-700">
            {checkoutMsg}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={cartLines.length === 0}
            className="min-h-11 rounded-xl border-2 border-amber-400 text-xs font-bold text-amber-800 disabled:opacity-40"
            onClick={() => setHoldOpen(true)}
          >
            Hold
          </button>
          <button
            type="button"
            disabled={cartLines.length === 0}
            className="min-h-11 rounded-xl bg-emerald-600 text-xs font-bold text-white shadow-sm disabled:opacity-40"
            onClick={openPaymentConfirm}
          >
            Pay
          </button>
        </div>
      </div>

      {holdOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <h3 className="text-base font-semibold">Hold order</h3>
            <input
              className="mt-2 w-full min-h-10 rounded-lg border border-zinc-200 px-3 text-sm"
              placeholder="Label (e.g. Table 4)"
              value={holdLabel}
              onChange={(e) => setHoldLabel(e.target.value)}
            />
            <textarea
              className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              placeholder="Note (optional)"
              rows={2}
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="min-h-10 flex-1 rounded-lg bg-zinc-200 text-sm font-semibold"
                onClick={() => setHoldOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-h-10 flex-1 rounded-lg bg-amber-500 text-sm font-semibold text-white"
                onClick={() => {
                  pos.holdCurrentOrder(holdLabel, holdNote || undefined);
                  setHoldLabel("");
                  setHoldNote("");
                  setHoldOpen(false);
                }}
              >
                Hold
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmPayOpen ? (
        <div
          className="fixed inset-0 z-[45] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-pay-title"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-zinc-200 px-4 py-3">
              <h2 id="confirm-pay-title" className="text-base font-bold text-zinc-900">
                Confirm payment
              </h2>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">
                Check total and tender, then confirm.
              </p>
            </div>
            <div className="max-h-[40vh] overflow-y-auto px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Items</p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {cartLines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-2">
                    <span className="min-w-0 text-zinc-800">
                      <span className="font-semibold">{line.qty}×</span> {line.name}
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-zinc-900">
                      {formatPhp(line.unitPrice * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-1 border-t border-zinc-100 px-4 py-2 text-xs">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{formatPhp(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 ? (
                <div className="flex justify-between text-red-600">
                  <span>Discount</span>
                  <span>−{formatPhp(totals.discountAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-zinc-600">
                <span>Net</span>
                <span>{formatPhp(totals.netBeforeCharges)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>VAT ({Math.round(vatRate * 100)}%)</span>
                <span>{formatPhp(totals.vatAmount)}</span>
              </div>
              {serviceEnabled ? (
                <div className="flex justify-between text-zinc-600">
                  <span>Service</span>
                  <span>{formatPhp(totals.serviceAmount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between border-t border-zinc-200 pt-1.5 text-sm font-bold text-zinc-900">
                <span>Total due</span>
                <span className="tabular-nums text-emerald-700">{formatPhp(totals.total)}</span>
              </div>
            </div>
            <div className="border-t border-zinc-100 px-4 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Tender</p>
              <ul className="mt-1.5 space-y-1 text-xs">
                {(Object.keys(PAYMENT_LABELS) as PaymentMethodId[]).map((id) => {
                  const v = paymentDraft[id];
                  if (!v || v <= 0) return null;
                  return (
                    <li key={id} className="flex justify-between">
                      <span className="text-zinc-600">{PAYMENT_LABELS[id]}</span>
                      <span className="font-medium">{formatPhp(v)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-1.5 flex justify-between text-xs font-semibold">
                <span className="text-zinc-600">Total paid</span>
                <span className="tabular-nums">{formatPhp(paid)}</span>
              </div>
              {remaining > 0.01 ? (
                <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-xs leading-snug text-amber-900">
                  Still owed {formatPhp(remaining)} — add tender or Rest.
                </p>
              ) : null}
              {changePreview > 0 ? (
                <p className="mt-1.5 text-xs font-semibold text-emerald-700">
                  Change: {formatPhp(changePreview)}
                </p>
              ) : null}
            </div>
            {confirmError ? (
              <div className="px-4 pb-1.5">
                <p className="rounded-md bg-red-50 px-2 py-1.5 text-xs leading-snug text-red-700">
                  {confirmError}
                </p>
              </div>
            ) : null}
            <div className="flex gap-2 border-t border-zinc-200 p-3">
              <button
                type="button"
                className="min-h-10 flex-1 rounded-lg border border-zinc-200 text-sm font-semibold text-zinc-800"
                onClick={closePaymentConfirm}
              >
                Back
              </button>
              <button
                type="button"
                disabled={remaining > 0.01}
                className="min-h-10 flex-1 rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                onClick={confirmPayment}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ReceiptModal sale={lastSale} onClose={clearLastSale} />
    </aside>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
