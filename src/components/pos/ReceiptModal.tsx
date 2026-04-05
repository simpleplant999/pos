"use client";

import { formatPhp } from "@/lib/pos/money";
import type { SaleRecord } from "@/types/pos";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  gcash: "GCash",
  maya: "Maya",
};

type Props = {
  sale: SaleRecord | null;
  onClose: () => void;
};

export function ReceiptModal({ sale, onClose }: Props) {
  if (!sale) return null;
  const date = new Date(sale.at);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="receipt-title" className="text-center text-lg font-bold text-zinc-900">
          Receipt preview
        </h2>
        <p className="mt-1 text-center text-xs text-zinc-500">
          TouchServe · sample receipt (not BIR OR)
        </p>
        <p className="mt-2 text-center text-sm text-zinc-600">
          {date.toLocaleString("en-PH")}
        </p>
        <p className="text-center font-mono text-xs text-zinc-400">{sale.id.slice(0, 8)}</p>

        <ul className="mt-4 space-y-2 border-t border-dashed border-zinc-300 pt-4">
          {sale.lines.map((l) => (
            <li key={l.id} className="flex justify-between text-sm">
              <span className="text-zinc-700">
                {l.qty}× {l.name}
              </span>
              <span className="font-medium">{formatPhp(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-dashed border-zinc-300 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPhp(sale.subtotal)}</dd>
          </div>
          {sale.discountAmount > 0 ? (
            <div className="flex justify-between text-red-600">
              <dt>Discount</dt>
              <dd>−{formatPhp(sale.discountAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Net</dt>
            <dd>{formatPhp(sale.netBeforeCharges)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>VAT</dt>
            <dd>{formatPhp(sale.vatAmount)}</dd>
          </div>
          {sale.serviceAmount > 0 ? (
            <div className="flex justify-between">
              <dt>Service</dt>
              <dd>{formatPhp(sale.serviceAmount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPhp(sale.total)}</dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-dashed border-zinc-300 pt-4 text-sm">
          <p className="font-semibold text-zinc-700">Payments</p>
          <ul className="mt-1 space-y-1">
            {Object.entries(sale.payments).map(([k, v]) =>
              v && v > 0 ? (
                <li key={k} className="flex justify-between">
                  <span>{PAYMENT_LABELS[k] ?? k}</span>
                  <span>{formatPhp(v)}</span>
                </li>
              ) : null,
            )}
          </ul>
          {sale.changeDue > 0 ? (
            <p className="mt-2 font-semibold text-emerald-700">
              Change: {formatPhp(sale.changeDue)}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          className="mt-6 min-h-12 w-full rounded-xl bg-zinc-900 font-semibold text-white"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
