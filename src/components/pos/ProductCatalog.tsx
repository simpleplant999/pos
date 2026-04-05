"use client";

import { useMemo, useState } from "react";
import { usePos } from "@/context/PosProvider";
import { formatPhp } from "@/lib/pos/money";
import type { Product } from "@/types/pos";
import { VariantDialog } from "./VariantDialog";

export function ProductCatalog() {
  const {
    categories,
    products,
    categoryId,
    setCategoryId,
    search,
    setSearch,
    addProduct,
  } = usePos();
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryId && p.categoryId !== categoryId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.includes(q)
      );
    });
  }, [products, categoryId, search]);

  function onProductTap(p: Product) {
    if (p.variants && p.variants.length > 1) {
      setVariantProduct(p);
      return;
    }
    if (p.variants?.length === 1) {
      addProduct(p, p.variants[0].id);
      return;
    }
    addProduct(p);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
            categoryId === null ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-800"
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategoryId(c.id)}
            className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
              categoryId === c.id ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-800"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <input
        type="search"
        placeholder="Search name, SKU, or scan barcode…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 placeholder:text-zinc-400"
      />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid grid-cols-3 gap-2 pb-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">
          {filtered.map((p) => {
            const cat = categories.find((c) => c.id === p.categoryId);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onProductTap(p)}
                className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white text-left shadow-sm active:scale-[0.98]"
              >
                <div className="relative aspect-square w-full shrink-0 bg-zinc-100">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin may paste any URL
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center text-lg font-bold text-white sm:text-xl ${cat?.color ?? "bg-zinc-500"}`}
                    >
                      {p.name.slice(0, 1)}
                    </div>
                  )}
                  {p.variants && p.variants.length > 1 ? (
                    <span className="absolute right-0.5 top-0.5 rounded bg-black/65 px-1 py-px text-[10px] font-medium leading-none text-white">
                      {p.variants.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-1.5">
                  <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-zinc-900 sm:text-xs">
                    {p.name}
                  </span>
                  <span className="text-[11px] font-bold leading-none text-emerald-700 sm:text-xs">
                    {formatPhp(p.price)}
                    {p.variants?.length ? "+" : ""}
                  </span>
                  <span
                    className={`text-[10px] font-medium leading-none sm:text-[11px] ${p.stock <= 10 ? "text-amber-700" : "text-zinc-500"}`}
                  >
                    {p.stock} stk
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        {filtered.length === 0 ? (
          <p className="py-12 text-center text-zinc-500">No products match.</p>
        ) : null}
      </div>

      {variantProduct ? (
        <VariantDialog
          product={variantProduct}
          open
          onClose={() => setVariantProduct(null)}
          onPick={(variantId) => {
            addProduct(variantProduct, variantId);
          }}
        />
      ) : null}
    </div>
  );
}
