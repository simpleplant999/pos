"use client";

import type { Product } from "@/types/pos";
import { formatPhp } from "@/lib/pos/money";

type Props = {
  product: Product;
  open: boolean;
  onClose: () => void;
  onPick: (variantId: string) => void;
};

export function VariantDialog({ product, open, onClose, onPick }: Props) {
  if (!open || !product.variants?.length) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="variant-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="variant-title" className="text-lg font-semibold text-zinc-900">
          {product.name}
        </h2>
        <p className="mt-1 text-sm text-zinc-500">Choose a variant</p>
        <div className="mt-4 flex flex-col gap-2">
          {product.variants.map((v) => {
            const price = product.price + v.priceDelta;
            return (
              <button
                key={v.id}
                type="button"
                className="flex min-h-14 items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-base font-medium text-zinc-900 active:bg-zinc-100"
                onClick={() => {
                  onPick(v.id);
                  onClose();
                }}
              >
                <span>{v.name}</span>
                <span className="text-zinc-600">{formatPhp(price)}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="mt-4 w-full min-h-12 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-700"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
