import type { CartLine, DiscountState, TotalsBreakdown } from "@/types/pos";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function subtotalOf(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
}

export function discountAmount(subtotal: number, discount: DiscountState): number {
  if (discount.kind === "none") return 0;
  if (discount.kind === "percent") {
    const pct = Math.max(0, Math.min(100, discount.value));
    return round2(subtotal * (pct / 100));
  }
  return round2(Math.min(Math.max(0, discount.value), subtotal));
}

export function computeTotals(
  lines: CartLine[],
  discount: DiscountState,
  options: { vatRate: number; serviceEnabled: boolean; serviceRate: number },
): TotalsBreakdown {
  const subtotal = subtotalOf(lines);
  const disc = discountAmount(subtotal, discount);
  const netBeforeCharges = round2(Math.max(0, subtotal - disc));
  const vatAmount = round2(netBeforeCharges * options.vatRate);
  const serviceAmount = options.serviceEnabled
    ? round2(netBeforeCharges * options.serviceRate)
    : 0;
  const total = round2(netBeforeCharges + vatAmount + serviceAmount);
  return {
    subtotal: round2(subtotal),
    discountAmount: disc,
    netBeforeCharges,
    vatAmount,
    serviceAmount,
    total,
  };
}

export function sumPayments(p: Partial<Record<string, number>>): number {
  let s = 0;
  for (const v of Object.values(p)) {
    if (typeof v === "number" && !Number.isNaN(v)) s += v;
  }
  return round2(s);
}
