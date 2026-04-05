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

export default function AdminReportsPage() {
  const { sales, products, categories, stockLedger } = usePos();
  const [startDate, setStartDate] = useState(todayYmd);
  const [endDate, setEndDate] = useState(todayYmd);

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

  function exportSalesCsv() {
    const header = [
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
    ];
    const rows: (string | number)[][] = [header];
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
    const header = [
      "Sale reference",
      "Sale date & time",
      "Item / description",
      "Quantity",
      "Unit price (₱)",
      "Line total (₱)",
    ];
    const rows: (string | number)[][] = [header];
    for (const s of filteredSales) {
      const d = new Date(s.at).toISOString();
      for (const l of s.lines) {
        rows.push([s.id, d, l.name, l.qty, l.unitPrice, l.qty * l.unitPrice]);
      }
    }
    downloadCsv(`pos-sale-lines_${start}_${end}_${dateStamp()}.csv`, rows);
  }

  function exportInventoryCsv() {
    const header = [
      "SKU",
      "Product name",
      "Category",
      "Unit price ex-VAT (₱)",
      "Stock on hand",
      "Barcode",
      "Number of variants",
    ];
    const rows: (string | number)[][] = [header];
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
    const header = [
      "Record ID",
      "Date & time",
      "Sale reference",
      "Product ID",
      "Item (as sold)",
      "Quantity change",
      "Stock balance after",
    ];
    const rows: (string | number)[][] = [header];
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

  return (
    <div>
      <main className="mx-auto max-w-4xl space-y-6 p-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Reports</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Session data only (resets on reload). Sales exports respect the date range below.
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

        <section className="rounded-2xl border border-zinc-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-zinc-900">Export CSV</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Sales and sale lines use the selected range. Inventory is a current snapshot. Stock
            movements use the selected range.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="min-h-11 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white"
              onClick={exportSalesCsv}
            >
              Sales (summary)
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
              onClick={exportSaleLinesCsv}
            >
              Sale lines
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
              onClick={exportInventoryCsv}
            >
              Inventory / stock
            </button>
            <button
              type="button"
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-900"
              onClick={exportStockLedgerCsv}
            >
              Stock movements
            </button>
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

function dateStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}
