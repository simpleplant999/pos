"use client";

import { useState } from "react";
import { usePos } from "@/context/PosProvider";
import { formatPhp } from "@/lib/pos/money";
import { splitGrossToNetVat } from "@/lib/pos/totals";
import type { Product, ProductVariant } from "@/types/pos";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; productId: string };

function emptyVariants(): ProductVariant[] {
  return [];
}

function PriceVatHint({ price, vatRate }: { price: number; vatRate: number }) {
  const n = Number(price);
  if (Number.isNaN(n) || n <= 0) return null;
  const { vat } = splitGrossToNetVat(n, vatRate);
  const pct = Math.round(vatRate * 100);
  return (
    <p className="mt-1 text-xs leading-snug text-zinc-500">
      Included VAT ({pct}%): {formatPhp(vat)}
    </p>
  );
}

export default function AdminProductsPage() {
  const { products, setProducts, categories, removeProduct, vatRate } = usePos();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [draft, setDraft] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  function openCreate() {
    const cat = categories[0];
    if (!cat) return;
    setDraft({
      id: "",
      name: "",
      categoryId: cat.id,
      price: 0,
      stock: 0,
      sku: "",
      barcode: "",
      imageUrl: "",
      variants: emptyVariants(),
    });
    setModal({ open: true, mode: "create" });
  }

  function openEdit(p: Product) {
    setDraft({
      ...p,
      variants: p.variants?.map((v) => ({ ...v })) ?? emptyVariants(),
    });
    setModal({ open: true, mode: "edit", productId: p.id });
  }

  function closeModal() {
    setModal({ open: false });
    setDraft(null);
  }

  function saveProduct() {
    if (!draft || !draft.name.trim()) return;
    const price = Number(draft.price);
    const stock = Number(draft.stock);
    if (Number.isNaN(price) || price < 0) return;
    if (Number.isNaN(stock) || stock < 0) return;

    const variants =
      draft.variants && draft.variants.length > 0
        ? draft.variants.map((v) => ({
            id: v.id || newId(),
            name: v.name.trim() || "Option",
            priceDelta: Number(v.priceDelta) || 0,
          }))
        : undefined;

    if (modal.open && modal.mode === "create") {
      const id = newId();
      setProducts((list) => [
        ...list,
        {
          id,
          name: draft.name.trim(),
          categoryId: draft.categoryId,
          price,
          stock,
          sku: draft.sku?.trim() || undefined,
          barcode: draft.barcode?.trim() || undefined,
          imageUrl: draft.imageUrl?.trim() || undefined,
          variants,
        },
      ]);
    } else if (modal.open && modal.mode === "edit") {
      const pid = modal.productId;
      setProducts((list) =>
        list.map((p) =>
          p.id === pid
            ? {
                ...p,
                name: draft.name.trim(),
                categoryId: draft.categoryId,
                price,
                stock,
                sku: draft.sku?.trim() || undefined,
                barcode: draft.barcode?.trim() || undefined,
                imageUrl: draft.imageUrl?.trim() || undefined,
                variants,
              }
            : p,
        ),
      );
    }
    closeModal();
  }

  function addVariantRow() {
    if (!draft) return;
    setDraft({
      ...draft,
      variants: [...(draft.variants ?? []), { id: newId(), name: "", priceDelta: 0 }],
    });
  }

  function updateVariant(i: number, patch: Partial<ProductVariant>) {
    if (!draft?.variants) return;
    const next = draft.variants.map((v, j) => (j === i ? { ...v, ...patch } : v));
    setDraft({ ...draft, variants: next });
  }

  function removeVariant(i: number) {
    if (!draft?.variants) return;
    setDraft({ ...draft, variants: draft.variants.filter((_, j) => j !== i) });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    removeProduct(deleteTarget.id);
    if (modal.open && modal.mode === "edit" && modal.productId === deleteTarget.id) {
      closeModal();
    }
    setDeleteTarget(null);
  }

  return (
    <>
      <main className="mx-auto max-w-4xl p-4">
        <h1 className="text-xl font-bold text-zinc-900">Products</h1>
        <p className="mb-4 mt-1 text-sm text-zinc-600">
          Catalog is in memory until you add a backend (resets on full page reload). Adding a product
          opens a form—nothing is saved to the list until you tap Save.
        </p>
        <button
          type="button"
          className="mb-4 min-h-11 rounded-xl bg-emerald-600 px-4 font-semibold text-white"
          onClick={openCreate}
        >
          Add product
        </button>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="p-3 font-semibold">Name</th>
                <th className="p-3 font-semibold">Category</th>
                <th className="p-3 font-semibold">Price</th>
                <th className="p-3 font-semibold">Stock</th>
                <th className="p-3 font-semibold">Variants</th>
                <th className="p-3 font-semibold">SKU / Barcode</th>
                <th className="p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-zinc-100">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-zinc-600">
                    {categories.find((c) => c.id === p.categoryId)?.name ?? p.categoryId}
                  </td>
                  <td className="p-3">{formatPhp(p.price)}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3 text-zinc-600">
                    {!p.variants?.length
                      ? "—"
                      : p.variants.length === 1
                        ? p.variants[0].name
                        : `${p.variants.length} options`}
                  </td>
                  <td className="p-3 text-xs text-zinc-500">
                    {p.sku ?? "—"} / {p.barcode ?? "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold"
                        onClick={() => openEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600"
                        onClick={() => setDeleteTarget(p)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {modal.open && draft ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:max-w-xl">
            <h2 className="text-lg font-semibold">
              {modal.mode === "create" ? "New product" : "Edit product"}
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm">
                <span className="text-zinc-500">Name</span>
                <input
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">Category</span>
                <select
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  value={draft.categoryId}
                  onChange={(e) => setDraft((d) => (d ? { ...d, categoryId: e.target.value } : d))}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">Price (VAT-inclusive)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  value={draft.price}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, price: Number(e.target.value) } : d))
                  }
                />
                <PriceVatHint price={draft.price} vatRate={vatRate} />
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">Stock on hand</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  value={draft.stock}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, stock: Number(e.target.value) } : d))
                  }
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">SKU</span>
                <input
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  value={draft.sku ?? ""}
                  onChange={(e) => setDraft((d) => (d ? { ...d, sku: e.target.value } : d))}
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">Barcode</span>
                <input
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  value={draft.barcode ?? ""}
                  onChange={(e) => setDraft((d) => (d ? { ...d, barcode: e.target.value } : d))}
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">Image URL (optional)</span>
                <input
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                  placeholder="https://…"
                  value={draft.imageUrl ?? ""}
                  onChange={(e) => setDraft((d) => (d ? { ...d, imageUrl: e.target.value } : d))}
                />
              </label>

              <div className="rounded-xl border border-zinc-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Variants (e.g. Hot / Iced)
                  </p>
                  <button
                    type="button"
                    className="rounded-lg bg-zinc-100 px-2 py-1 text-xs font-semibold"
                    onClick={addVariantRow}
                  >
                    + Add variant
                  </button>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Leave empty for a single SKU. Two or more rows show a picker on the register.
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {(draft.variants ?? []).map((v, i) => (
                    <li key={v.id || i} className="flex flex-wrap items-end gap-2 rounded-lg bg-zinc-50 p-2">
                      <label className="min-w-[120px] flex-1 text-xs">
                        <span className="text-zinc-500">Label</span>
                        <input
                          className="mt-0.5 w-full min-h-9 rounded-lg border border-zinc-200 bg-white px-2"
                          placeholder="Hot"
                          value={v.name}
                          onChange={(e) => updateVariant(i, { name: e.target.value })}
                        />
                      </label>
                      <label className="w-28 text-xs">
                        <span className="text-zinc-500">+₱ vs base</span>
                        <input
                          type="number"
                          step="0.01"
                          className="mt-0.5 w-full min-h-9 rounded-lg border border-zinc-200 bg-white px-2"
                          value={v.priceDelta}
                          onChange={(e) =>
                            updateVariant(i, { priceDelta: Number(e.target.value) || 0 })
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="min-h-9 rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-600"
                        onClick={() => removeVariant(i)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-zinc-200 font-semibold"
                onClick={closeModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-h-12 flex-1 rounded-xl bg-emerald-600 font-semibold text-white"
                onClick={saveProduct}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-zinc-900">Delete product?</h2>
            <p className="mt-2 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">{deleteTarget.name}</span> will be removed
              from the catalog. Lines for this item are removed from the register cart and from held
              orders (empty holds are discarded). This session only — not reversible after reload.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl bg-zinc-200 text-sm font-semibold"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-xl bg-red-600 text-sm font-semibold text-white"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
