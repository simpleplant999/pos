"use client";

import { useState } from "react";
import { usePos } from "@/context/PosProvider";
import { CATEGORY_COLOR_OPTIONS } from "@/data/categoryPresets";
import type { Category } from "@/types/pos";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `cat-${Date.now()}`;
}

type ModalState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; categoryId: string };

type Draft = { name: string; color: string };

export default function AdminCategoriesPage() {
  const { categories, setCategories, products } = usePos();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [draft, setDraft] = useState<Draft>({
    name: "",
    color: CATEGORY_COLOR_OPTIONS[0].value,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  function openCreate() {
    setFormError(null);
    setDraft({ name: "", color: CATEGORY_COLOR_OPTIONS[0].value });
    setModal({ open: true, mode: "create" });
  }

  function openEdit(c: Category) {
    setFormError(null);
    setDeleteError((e) => (e?.id === c.id ? null : e));
    setDraft({ name: c.name, color: c.color });
    setModal({ open: true, mode: "edit", categoryId: c.id });
  }

  function closeModal() {
    setModal({ open: false });
    setFormError(null);
  }

  function saveCategory() {
    setFormError(null);
    const n = draft.name.trim();
    if (!n) {
      setFormError("Enter a name.");
      return;
    }
    if (modal.open && modal.mode === "create") {
      if (categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
        setFormError("That name already exists.");
        return;
      }
      setCategories((list) => [...list, { id: newId(), name: n, color: draft.color }]);
      closeModal();
      return;
    }
    if (modal.open && modal.mode === "edit") {
      const id = modal.categoryId;
      if (categories.some((c) => c.id !== id && c.name.toLowerCase() === n.toLowerCase())) {
        setFormError("That name already exists.");
        return;
      }
      setCategories((list) =>
        list.map((c) => (c.id === id ? { ...c, name: n, color: draft.color } : c)),
      );
      closeModal();
    }
  }

  function removeCategory(id: string) {
    const used = products.some((p) => p.categoryId === id);
    if (used) {
      setDeleteError({
        id,
        message: "Reassign or delete products in this category first.",
      });
      return;
    }
    if (categories.length <= 1) {
      setDeleteError({ id, message: "Keep at least one category." });
      return;
    }
    setCategories((list) => list.filter((c) => c.id !== id));
    setDeleteError(null);
  }

  function getColorLabel(value: string): string {
    return CATEGORY_COLOR_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  return (
    <>
      <main className="mx-auto max-w-3xl space-y-6 p-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Categories</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Categories drive the register filter chips and product assignments. You cannot delete a category
            while any product still uses it.
          </p>
        </div>

        <button
          type="button"
          className="min-h-11 rounded-xl bg-emerald-600 px-4 font-semibold text-white"
          onClick={openCreate}
        >
          Add category
        </button>

        <ul className="space-y-2">
          {categories.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              colorLabelText={getColorLabel(c.color)}
              deleteMessage={deleteError?.id === c.id ? deleteError.message : null}
              onEdit={() => openEdit(c)}
              onDelete={() => removeCategory(c.id)}
            />
          ))}
        </ul>
      </main>

      {modal.open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:max-w-md">
            <h2 className="text-lg font-semibold text-zinc-900">
              {modal.mode === "create" ? "New category" : "Edit category"}
            </h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm">
                <span className="text-zinc-500">Name</span>
                <input
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 px-3"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Merienda"
                />
              </label>
              <label className="text-sm">
                <span className="text-zinc-500">Color</span>
                <select
                  className="mt-1 w-full min-h-11 rounded-xl border border-zinc-200 px-3"
                  value={draft.color}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                >
                  {CATEGORY_COLOR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {formError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
                  onClick={saveCategory}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="min-h-11 flex-1 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-800"
                  onClick={closeModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CategoryRow({
  category,
  colorLabelText,
  deleteMessage,
  onEdit,
  onDelete,
}: {
  category: Category;
  colorLabelText: string;
  deleteMessage: string | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${category.color}`}
        >
          {(category.name.trim() || "?").slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-zinc-900">{category.name}</p>
          <p className="text-sm text-zinc-500">{colorLabelText}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-10 rounded-lg bg-zinc-100 px-3 text-sm font-semibold text-zinc-900"
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600"
            onClick={onDelete}
          >
            Delete
          </button>
        </div>
      </div>
      {deleteMessage ? (
        <p className="mt-3 border-t border-zinc-100 pt-3 text-sm text-red-600" role="alert">
          {deleteMessage}
        </p>
      ) : null}
    </li>
  );
}
