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
    <aside className="flex w-full max-w-md shrink-0 flex-col border-l border-zinc-200 bg-zinc-50">
      <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
        <h2 className="text-lg font-bold text-zinc-900">Cart</h2>
        <span className="text-sm text-zinc-500">{cartLines.length} lines</span>
      </div>

      {cartNotice ? (
        <div className="flex items-start justify-between gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
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

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {cartLines.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-zinc-500">Tap products to add.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cartLines.map((line) => (
              <li
                key={line.id}
                className="flex gap-2 rounded-xl border border-zinc-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight text-zinc-900">
                    {line.name}
                  </p>
                  <p className="text-sm text-zinc-500">{formatPhp(line.unitPrice)} each</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-lg font-semibold"
                      onClick={() => setLineQty(line.id, line.qty - 1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-8 text-center text-base font-semibold">{line.qty}</span>
                    <button
                      type="button"
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-lg font-semibold"
                      onClick={() => setLineQty(line.id, line.qty + 1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-600"
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

      <div className="space-y-3 border-t border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-zinc-200 px-3 text-sm font-semibold text-zinc-900"
            onClick={() => setDiscountOpen((v) => !v)}
          >
            Discount
          </button>
          <button
            type="button"
            className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-semibold ${
              serviceEnabled
                ? "bg-amber-500 text-white"
                : "bg-zinc-200 text-zinc-900"
            }`}
            onClick={() => setServiceEnabled(!serviceEnabled)}
          >
            Service {Math.round(serviceRate * 100)}%
          </button>
        </div>

        {discountOpen ? (
          <div className="rounded-xl border border-zinc-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Discount</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${
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
                className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${
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
                className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${
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
              <label className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-zinc-600">Percent</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="min-h-10 w-24 rounded-lg border border-zinc-200 px-2"
                  value={discount.value}
                  onChange={(e) =>
                    setDiscount({ kind: "percent", value: Number(e.target.value) || 0 })
                  }
                />
              </label>
            ) : null}
            {discount.kind === "fixed" ? (
              <label className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-zinc-600">Amount</span>
                <input
                  type="number"
                  min={0}
                  className="min-h-10 w-28 rounded-lg border border-zinc-200 px-2"
                  value={discount.value}
                  onChange={(e) =>
                    setDiscount({ kind: "fixed", value: Number(e.target.value) || 0 })
                  }
                />
              </label>
            ) : null}
          </div>
        ) : null}

        <dl className="space-y-1 text-sm">
          <div className="flex justify-between text-zinc-600">
            <dt>Subtotal</dt>
            <dd className="font-medium text-zinc-900">{formatPhp(totals.subtotal)}</dd>
          </div>
          {totals.discountAmount > 0 ? (
            <div className="flex justify-between text-red-600">
              <dt>Discount</dt>
              <dd>−{formatPhp(totals.discountAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-zinc-600">
            <dt>Net</dt>
            <dd>{formatPhp(totals.netBeforeCharges)}</dd>
          </div>
          <div className="flex justify-between text-zinc-600">
            <dt>VAT ({Math.round(vatRate * 100)}%)</dt>
            <dd>{formatPhp(totals.vatAmount)}</dd>
          </div>
          {serviceEnabled ? (
            <div className="flex justify-between text-zinc-600">
              <dt>Service charge</dt>
              <dd>{formatPhp(totals.serviceAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="text-emerald-700">{formatPhp(totals.total)}</dd>
          </div>
        </dl>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Split payment</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(Object.keys(PAYMENT_LABELS) as PaymentMethodId[]).map((id) => (
              <div key={id} className="flex flex-col gap-1">
                <label className="text-xs text-zinc-500">{PAYMENT_LABELS[id]}</label>
                <div className="flex gap-1">
                  <input
                    inputMode="decimal"
                    className="min-h-11 min-w-0 flex-1 rounded-lg border border-zinc-200 px-2 text-base"
                    placeholder="0"
                    value={paymentDraft[id] ?? ""}
                    onChange={(e) => setPay(id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="shrink-0 rounded-lg bg-zinc-100 px-2 text-xs font-semibold"
                    onClick={() => fillRemaining(id)}
                  >
                    Rest
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-zinc-500">Paid</span>
            <span className="font-semibold">{formatPhp(paid)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Remaining</span>
            <span className={`font-semibold ${remaining > 0.01 ? "text-amber-600" : "text-emerald-600"}`}>
              {formatPhp(remaining)}
            </span>
          </div>
          {paid > totals.total + 0.001 ? (
            <div className="mt-1 flex justify-between text-sm font-semibold text-emerald-700">
              <span>Change</span>
              <span>{formatPhp(round2(paid - totals.total))}</span>
            </div>
          ) : null}
        </div>

        {checkoutMsg ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {checkoutMsg}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={cartLines.length === 0}
            className="min-h-14 rounded-2xl border-2 border-amber-400 text-base font-bold text-amber-800 disabled:opacity-40"
            onClick={() => setHoldOpen(true)}
          >
            Hold order
          </button>
          <button
            type="button"
            disabled={cartLines.length === 0}
            className="min-h-14 rounded-2xl bg-emerald-600 text-base font-bold text-white shadow-md disabled:opacity-40"
            onClick={openPaymentConfirm}
          >
            Pay
          </button>
        </div>
      </div>

      {holdOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5">
            <h3 className="text-lg font-semibold">Hold order</h3>
            <input
              className="mt-3 w-full min-h-12 rounded-xl border border-zinc-200 px-3"
              placeholder="Label (e.g. Table 4)"
              value={holdLabel}
              onChange={(e) => setHoldLabel(e.target.value)}
            />
            <textarea
              className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2"
              placeholder="Note (optional)"
              rows={2}
              value={holdNote}
              onChange={(e) => setHoldNote(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-zinc-200 font-semibold"
                onClick={() => setHoldOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-amber-500 font-semibold text-white"
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
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 id="confirm-pay-title" className="text-lg font-bold text-zinc-900">
                Confirm payment
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Review the total and tender before completing the sale.
              </p>
            </div>
            <div className="max-h-[45vh] overflow-y-auto px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Items</p>
              <ul className="mt-2 space-y-2 text-sm">
                {cartLines.map((line) => (
                  <li key={line.id} className="flex justify-between gap-2">
                    <span className="min-w-0 text-zinc-800">
                      <span className="font-medium">{line.qty}×</span> {line.name}
                    </span>
                    <span className="shrink-0 font-medium text-zinc-900">
                      {formatPhp(line.unitPrice * line.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-2 border-t border-zinc-100 px-5 py-3 text-sm">
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
              <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-bold text-zinc-900">
                <span>Total due</span>
                <span className="text-emerald-700">{formatPhp(totals.total)}</span>
              </div>
            </div>
            <div className="border-t border-zinc-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tender</p>
              <ul className="mt-2 space-y-1.5 text-sm">
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
              <div className="mt-2 flex justify-between text-sm font-semibold">
                <span className="text-zinc-600">Total paid</span>
                <span>{formatPhp(paid)}</span>
              </div>
              {remaining > 0.01 ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Still owed: {formatPhp(remaining)} — add tender or use Rest on each method.
                </p>
              ) : null}
              {changePreview > 0 ? (
                <p className="mt-2 text-sm font-semibold text-emerald-700">
                  Change to give: {formatPhp(changePreview)}
                </p>
              ) : null}
            </div>
            {confirmError ? (
              <div className="px-5 pb-2">
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{confirmError}</p>
              </div>
            ) : null}
            <div className="flex gap-2 border-t border-zinc-200 p-4">
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl border border-zinc-200 font-semibold text-zinc-800"
                onClick={closePaymentConfirm}
              >
                Back
              </button>
              <button
                type="button"
                disabled={remaining > 0.01}
                className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
                onClick={confirmPayment}
              >
                Confirm sale
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
