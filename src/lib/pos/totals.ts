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

/** Split a VAT-inclusive amount into net (ex-VAT) and VAT portion. */
export function splitGrossToNetVat(gross: number, vatRate: number): { net: number; vat: number } {
  if (vatRate <= 0) return { net: round2(gross), vat: 0 };
  const net = round2(gross / (1 + vatRate));
  const vat = round2(gross - net);
  return { net, vat };
}

export function computeTotals(
  lines: CartLine[],
  discount: DiscountState,
  options: { vatRate: number; serviceEnabled: boolean; serviceRate: number },
): TotalsBreakdown {
  const grossSubtotal = subtotalOf(lines);
  const disc = discountAmount(grossSubtotal, discount);
  const afterDiscountGross = round2(Math.max(0, grossSubtotal - disc));
  const { net: netBeforeCharges, vat: vatAmount } = splitGrossToNetVat(
    afterDiscountGross,
    options.vatRate,
  );
  const serviceAmount = options.serviceEnabled
    ? round2(netBeforeCharges * options.serviceRate)
    : 0;
  const total = round2(afterDiscountGross + serviceAmount);
  return {
    subtotal: round2(grossSubtotal),
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
