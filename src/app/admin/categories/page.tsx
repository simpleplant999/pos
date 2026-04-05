"use client";

import { useState } from "react";
import { usePos } from "@/context/PosProvider";
import { CATEGORY_COLOR_OPTIONS } from "@/data/categoryPresets";
import type { Category } from "@/types/pos";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `cat-${Date.now()}`;
}

export default function AdminCategoriesPage() {
  const { categories, setCategories, products } = usePos();
  const [name, setName] = useState("");
  const [color, setColor] = useState(CATEGORY_COLOR_OPTIONS[0].value);
  const [error, setError] = useState<string | null>(null);

  function addCategory() {
    setError(null);
    const n = name.trim();
    if (!n) {
      setError("Enter a name.");
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
      setError("That name already exists.");
      return;
    }
    setCategories((list) => [...list, { id: newId(), name: n, color }]);
    setName("");
  }

  function removeCategory(id: string) {
    setError(null);
    const used = products.some((p) => p.categoryId === id);
    if (used) {
      setError("Reassign or delete products in this category first.");
      return;
    }
    if (categories.length <= 1) {
      setError("Keep at least one category.");
      return;
    }
    setCategories((list) => list.filter((c) => c.id !== id));
  }

  function renameCategory(id: string, newName: string) {
    setCategories((list) =>
      list.map((c) => (c.id === id ? { ...c, name: newName } : c)),
    );
  }

  function recolorCategory(id: string, newColor: string) {
    setCategories((list) =>
      list.map((c) => (c.id === id ? { ...c, color: newColor } : c)),
    );
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Categories</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Categories drive the POS filter chips and product assignments. You cannot delete a category
          while any product still uses it.
        </p>
      </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">New category</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-sm">
              <span className="text-zinc-500">Name</span>
              <input
                className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 px-3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Merienda"
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">Color</span>
              <select
                className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 px-3 sm:w-40"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                {CATEGORY_COLOR_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-emerald-600 px-4 font-semibold text-white"
              onClick={addCategory}
            >
              Add
            </button>
          </div>
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <ul className="space-y-2">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onRename={(n) => renameCategory(c.id, n)}
              onRecolor={(col) => recolorCategory(c.id, col)}
              onDelete={() => removeCategory(c.id)}
            />
          ))}
        </ul>
    </main>
  );
}

function CategoryRow({
  category,
  onRename,
  onRecolor,
  onDelete,
}: {
  category: Category;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${category.color}`}
      >
        {(category.name.trim() || "?").slice(0, 1).toUpperCase()}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="min-h-10 w-full rounded-lg border border-zinc-200 px-2 text-sm font-medium sm:max-w-xs"
          value={category.name}
          onChange={(e) => onRename(e.target.value)}
        />
        <select
          className="min-h-10 w-full rounded-lg border border-zinc-200 px-2 text-sm sm:w-36"
          value={category.color}
          onChange={(e) => onRecolor(e.target.value)}
        >
          {CATEGORY_COLOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600"
        onClick={onDelete}
      >
        Delete
      </button>
    </li>
  );
}
