"use client";

import { useMemo, useState } from "react";
import { usePos } from "@/context/PosProvider";
import { downloadCsv } from "@/lib/csv";
import {
  normalizeRange,
  timestampInRange,
  todayYmd,
} from "@/lib/dateRange";
import { formatPhp } from "@/lib/pos/money";

const PREVIEW_MAX = 75;

const SALES_HEADERS = [
  "Sale reference",
  "Date & time",
  "Subtotal (₱)",
  "Discount (₱)",
  "Net sales (₱)",
  "VAT (₱)",
  "Service charge (₱)",
  "Total (₱)",
  "Paid — Cash (₱)",
  "Paid — Card (₱)",
  "Paid — GCash (₱)",
  "Paid — Maya (₱)",
  "Change given (₱)",
] as const;

const LINE_HEADERS = [
  "Sale reference",
  "Sale date & time",
  "Item / description",
  "Quantity",
  "Unit price (₱)",
  "Line total (₱)",
] as const;

const INVENTORY_HEADERS = [
  "SKU",
  "Product name",
  "Category",
  "Unit price ex-VAT (₱)",
  "Stock on hand",
  "Barcode",
  "Number of variants",
] as const;

const LEDGER_HEADERS = [
  "Record ID",
  "Date & time",
  "Sale reference",
  "Product ID",
  "Item (as sold)",
  "Quantity change",
  "Stock balance after",
] as const;

type TabId = "sales" | "lines" | "inventory" | "movements";

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "sales", label: "Sales (summary)", short: "Sales" },
  { id: "lines", label: "Sale lines", short: "Lines" },
  { id: "inventory", label: "Inventory", short: "Stock" },
  { id: "movements", label: "Stock movements", short: "Moves" },
];

export default function AdminReportsPage() {
  const { sales, products, categories, stockLedger } = usePos();
  const [startDate, setStartDate] = useState(todayYmd);
  const [endDate, setEndDate] = useState(todayYmd);
  const [activeTab, setActiveTab] = useState<TabId>("sales");

  const { startMs, endMs, start, end } = useMemo(
    () => normalizeRange(startDate, endDate),
    [startDate, endDate],
  );

  const filteredSales = useMemo(
    () => sales.filter((s) => timestampInRange(s.at, startMs, endMs)),
    [sales, startMs, endMs],
  );

  const filteredLedger = useMemo(
    () => stockLedger.filter((e) => timestampInRange(e.at, startMs, endMs)),
    [stockLedger, startMs, endMs],
  );

  const summary = useMemo(() => {
    const totalRevenue = filteredSales.reduce((acc, x) => acc + x.total, 0);
    const byPayment: Record<string, number> = {};
    for (const sale of filteredSales) {
      for (const [k, v] of Object.entries(sale.payments)) {
        if (v && v > 0) byPayment[k] = (byPayment[k] ?? 0) + v;
      }
    }
    const productQty: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of filteredSales) {
      for (const line of sale.lines) {
        const key = `${line.productId}:${line.variantId ?? ""}`;
        if (!productQty[key]) {
          productQty[key] = { name: line.name, qty: 0, revenue: 0 };
        }
        productQty[key].qty += line.qty;
        productQty[key].revenue += line.qty * line.unitPrice;
      }
    }
    const topProducts = Object.values(productQty)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
    const lowStock = products.filter((p) => p.stock <= 10).sort((a, b) => a.stock - b.stock);
    return {
      totalRevenue,
      byPayment,
      topProducts,
      count: filteredSales.length,
      lowStock,
    };
  }, [filteredSales, products]);

  const paymentLabels: Record<string, string> = {
    cash: "Cash",
    card: "Card",
    gcash: "GCash",
    maya: "Maya",
  };

  const rangeLabel =
    start === end
      ? new Date(start + "T12:00:00").toLocaleDateString("en-PH", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : `${new Date(start + "T12:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${new Date(end + "T12:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;

  const salesRows = useMemo(
    () =>
      filteredSales.map((s) => [
        s.id,
        new Date(s.at).toLocaleString("en-PH"),
        s.subtotal,
        s.discountAmount,
        s.netBeforeCharges,
        s.vatAmount,
        s.serviceAmount,
        s.total,
        s.payments.cash ?? 0,
        s.payments.card ?? 0,
        s.payments.gcash ?? 0,
        s.payments.maya ?? 0,
        s.changeDue,
      ]),
    [filteredSales],
  );

  const lineRows = useMemo(() => {
    const rows: (string | number)[][] = [];
    for (const s of filteredSales) {
      const d = new Date(s.at).toLocaleString("en-PH");
      for (const l of s.lines) {
        rows.push([s.id, d, l.name, l.qty, l.unitPrice, l.qty * l.unitPrice]);
      }
    }
    return rows;
  }, [filteredSales]);

  const inventoryRows = useMemo(
    () =>
      products.map((p) => {
        const cat = categories.find((c) => c.id === p.categoryId)?.name ?? "";
        return [
          p.sku ?? "—",
          p.name,
          cat,
          p.price,
          p.stock,
          p.barcode ?? "—",
          p.variants?.length ?? 0,
        ];
      }),
    [products, categories],
  );

  const ledgerRows = useMemo(
    () =>
      filteredLedger.map((e) => [
        e.id,
        new Date(e.at).toLocaleString("en-PH"),
        e.saleId,
        e.productId,
        e.productName,
        e.qtyDelta,
        e.stockAfter,
      ]),
    [filteredLedger],
  );

  function exportSalesCsv() {
    const rows: (string | number)[][] = [[...SALES_HEADERS]];
    for (const s of filteredSales) {
      rows.push([
        s.id,
        new Date(s.at).toISOString(),
        s.subtotal,
        s.discountAmount,
        s.netBeforeCharges,
        s.vatAmount,
        s.serviceAmount,
        s.total,
        s.payments.cash ?? 0,
        s.payments.card ?? 0,
        s.payments.gcash ?? 0,
        s.payments.maya ?? 0,
        s.changeDue,
      ]);
    }
    downloadCsv(`pos-sales_${start}_${end}_${dateStamp()}.csv`, rows);
  }

  function exportSaleLinesCsv() {
    const rows: (string | number)[][] = [[...LINE_HEADERS]];
    for (const s of filteredSales) {
      const d = new Date(s.at).toISOString();
      for (const l of s.lines) {
        rows.push([s.id, d, l.name, l.qty, l.unitPrice, l.qty * l.unitPrice]);
      }
    }
    downloadCsv(`pos-sale-lines_${start}_${end}_${dateStamp()}.csv`, rows);
  }

  function exportInventoryCsv() {
    const rows: (string | number)[][] = [[...INVENTORY_HEADERS]];
    for (const p of products) {
      const cat = categories.find((c) => c.id === p.categoryId)?.name ?? "";
      rows.push([
        p.sku ?? "",
        p.name,
        cat,
        p.price,
        p.stock,
        p.barcode ?? "",
        p.variants?.length ?? 0,
      ]);
    }
    downloadCsv(`pos-inventory_${dateStamp()}.csv`, rows);
  }

  function exportStockLedgerCsv() {
    const rows: (string | number)[][] = [[...LEDGER_HEADERS]];
    for (const e of filteredLedger) {
      rows.push([
        e.id,
        new Date(e.at).toISOString(),
        e.saleId,
        e.productId,
        e.productName,
        e.qtyDelta,
        e.stockAfter,
      ]);
    }
    downloadCsv(`pos-stock-movements_${start}_${end}_${dateStamp()}.csv`, rows);
  }

  function exportActiveTab() {
    switch (activeTab) {
      case "sales":
        exportSalesCsv();
        break;
      case "lines":
        exportSaleLinesCsv();
        break;
      case "inventory":
        exportInventoryCsv();
        break;
      case "movements":
        exportStockLedgerCsv();
        break;
    }
  }

  const tabMeta: Record<
    TabId,
    { title: string; description: string; count: number; rangeNote: string }
  > = {
    sales: {
      title: "Sales (summary)",
      description:
        "One row per completed sale in the selected range: amounts, tax, and split tender.",
      count: filteredSales.length,
      rangeNote: "Filtered by date range above.",
    },
    lines: {
      title: "Sale lines",
      description: "Each line item sold in the range, with sale reference and pricing.",
      count: lineRows.length,
      rangeNote: "Filtered by date range above.",
    },
    inventory: {
      title: "Inventory snapshot",
      description: "Current products, stock on hand, and categories (not filtered by date).",
      count: products.length,
      rangeNote: "Always shows live catalog — date range does not apply.",
    },
    movements: {
      title: "Stock movements",
      description: "Stock deducted per sale line in the selected range.",
      count: filteredLedger.length,
      rangeNote: "Filtered by date range above.",
    },
  };

  const meta = tabMeta[activeTab];

  return (
    <div>
      <main className="mx-auto max-w-5xl space-y-6 p-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Session data only (resets on reload). Preview tables show up to {PREVIEW_MAX} rows.
          </p>
        </div>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Date range</h2>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label className="text-sm">
              <span className="text-zinc-500">Start</span>
              <input
                type="date"
                className="mt-1 block min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="text-zinc-500">End</span>
              <input
                type="date"
                className="mt-1 block min-h-11 rounded-xl border border-zinc-200 bg-white px-3"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
            <p className="text-sm text-zinc-600">
              Showing: <span className="font-medium text-zinc-900">{rangeLabel}</span>
            </p>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Revenue (range)</p>
            <p className="text-2xl font-bold text-emerald-700">{formatPhp(summary.totalRevenue)}</p>
            <p className="text-xs text-zinc-500">{summary.count} transactions</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Range</p>
            <p className="text-base font-semibold leading-snug text-zinc-900">{rangeLabel}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-sm text-zinc-500">Low stock (≤10)</p>
            <p className="text-2xl font-bold text-amber-700">{summary.lowStock.length}</p>
            <p className="text-xs text-zinc-500">SKUs · current levels</p>
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div
            className="flex flex-wrap gap-1 border-b border-zinc-200 bg-zinc-50 p-2"
            role="tablist"
            aria-label="Report data"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors ${
                  activeTab === t.id
                    ? "bg-zinc-900 text-white"
                    : "bg-white text-zinc-800 ring-1 ring-zinc-200 hover:bg-zinc-100"
                }`}
                onClick={() => setActiveTab(t.id)}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.short}</span>
              </button>
            ))}
          </div>

          <div className="p-4" role="tabpanel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">{meta.title}</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-600">{meta.description}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700">{meta.count}</span> rows ·{" "}
                  {meta.rangeNote}
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 min-h-11 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                onClick={exportActiveTab}
              >
                Export CSV
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-200">
              {activeTab === "sales" ? (
                <PreviewTable
                  headers={[...SALES_HEADERS]}
                  rows={salesRows}
                  moneyCols={[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                />
              ) : null}
              {activeTab === "lines" ? (
                <PreviewTable
                  headers={[...LINE_HEADERS]}
                  rows={lineRows}
                  moneyCols={[4, 5]}
                />
              ) : null}
              {activeTab === "inventory" ? (
                <PreviewTable
                  headers={[...INVENTORY_HEADERS]}
                  rows={inventoryRows}
                  moneyCols={[3]}
                />
              ) : null}
              {activeTab === "movements" ? (
                <PreviewTable headers={[...LEDGER_HEADERS]} rows={ledgerRows} moneyCols={[]} />
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Low stock</h2>
          <ul className="mt-3 space-y-2">
            {summary.lowStock.length === 0 ? (
              <li className="text-sm text-zinc-500">Nothing at or below 10 units.</li>
            ) : (
              summary.lowStock.map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span className="font-semibold text-amber-800">{p.stock} left</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Revenue by payment method</h2>
          <p className="mt-1 text-xs text-zinc-500">Within selected date range</p>
          <ul className="mt-3 space-y-2">
            {Object.keys(summary.byPayment).length === 0 ? (
              <li className="text-sm text-zinc-500">No sales in this range.</li>
            ) : (
              Object.entries(summary.byPayment).map(([k, v]) => (
                <li key={k} className="flex justify-between text-sm">
                  <span>{paymentLabels[k] ?? k}</span>
                  <span className="font-semibold">{formatPhp(v)}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Top sellers (by line revenue)</h2>
          <p className="mt-1 text-xs text-zinc-500">Within selected date range</p>
          <ul className="mt-3 space-y-2">
            {summary.topProducts.length === 0 ? (
              <li className="text-sm text-zinc-500">No sales in this range.</li>
            ) : (
              summary.topProducts.map((row, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>
                    {row.name} <span className="text-zinc-400">×{row.qty}</span>
                  </span>
                  <span className="font-semibold">{formatPhp(row.revenue)}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}

function PreviewTable({
  headers,
  rows,
  moneyCols,
}: {
  headers: string[];
  rows: (string | number)[][];
  moneyCols: number[];
}) {
  const moneySet = new Set(moneyCols);
  const shown = rows.slice(0, PREVIEW_MAX);
  const hidden = rows.length - shown.length;

  if (rows.length === 0) {
    return (
      <div className="bg-zinc-50 px-4 py-12 text-center text-sm text-zinc-500">No rows to show.</div>
    );
  }

  return (
    <>
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-100">
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold text-zinc-800">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, ri) => (
            <tr key={ri} className="border-b border-zinc-100 odd:bg-white even:bg-zinc-50/80">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`max-w-[14rem] truncate px-3 py-1.5 text-zinc-800 ${
                    moneySet.has(ci) ? "whitespace-nowrap tabular-nums" : ""
                  }`}
                  title={String(cell)}
                >
                  {moneySet.has(ci) && typeof cell === "number"
                    ? formatPhp(cell)
                    : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hidden > 0 ? (
        <div className="border-t border-zinc-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
          Showing first {shown.length} of {rows.length} rows. Export CSV for the full set.
        </div>
      ) : null}
    </>
  );
}

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
