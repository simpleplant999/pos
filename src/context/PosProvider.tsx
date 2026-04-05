"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SERVICE_PCT,
  SAMPLE_CATEGORIES,
  SAMPLE_PRODUCTS,
  VAT_RATE,
} from "@/data/sampleData";
import { computeTotals, sumPayments } from "@/lib/pos/totals";
import type {
  CartLine,
  Category,
  DiscountState,
  HeldOrder,
  PaymentSplit,
  Product,
  SaleRecord,
  StockLedgerEntry,
} from "@/types/pos";

type PosContextValue = {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categoryId: string | null;
  setCategoryId: (id: string | null) => void;
  search: string;
  setSearch: (q: string) => void;
  cartLines: CartLine[];
  addProduct: (product: Product, variantId?: string) => void;
  setLineQty: (lineId: string, qty: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
  discount: DiscountState;
  setDiscount: (d: DiscountState) => void;
  serviceEnabled: boolean;
  setServiceEnabled: (v: boolean) => void;
  serviceRate: number;
  vatRate: number;
  totals: ReturnType<typeof computeTotals>;
  heldOrders: HeldOrder[];
  holdCurrentOrder: (label: string, note?: string) => void;
  resumeOrder: (id: string) => void;
  deleteHeldOrder: (id: string) => void;
  paymentDraft: PaymentSplit;
  setPaymentDraft: React.Dispatch<React.SetStateAction<PaymentSplit>>;
  completeSale: () => { ok: true; sale: SaleRecord } | { ok: false; reason: string };
  sales: SaleRecord[];
  lastSale: SaleRecord | null;
  clearLastSale: () => void;
  applyBarcode: (code: string) => boolean;
  stockLedger: StockLedgerEntry[];
  cartNotice: string | null;
  clearCartNotice: () => void;
};

const PosContext = createContext<PosContextValue | null>(null);

function lineId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `ln-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function unitPriceFor(product: Product, variantId?: string): number {
  if (!product.variants?.length || !variantId) return product.price;
  const v = product.variants.find((x) => x.id === variantId);
  return product.price + (v?.priceDelta ?? 0);
}

function displayName(product: Product, variantId?: string): string {
  if (!product.variants?.length || !variantId) return product.name;
  const v = product.variants.find((x) => x.id === variantId);
  return v ? `${product.name} (${v.name})` : product.name;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function PosProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(() =>
    SAMPLE_CATEGORIES.map((c) => ({ ...c })),
  );
  const [products, setProducts] = useState<Product[]>(() =>
    SAMPLE_PRODUCTS.map((p) => ({ ...p, variants: p.variants?.map((v) => ({ ...v })) })),
  );
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState<DiscountState>({ kind: "none" });
  const [serviceEnabled, setServiceEnabled] = useState(false);
  const [serviceRate] = useState(DEFAULT_SERVICE_PCT);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>([]);
  const [paymentDraft, setPaymentDraft] = useState<PaymentSplit>({});
  const [sales, setSales] = useState<SaleRecord[]>(() => []);
  const [lastSale, setLastSale] = useState<SaleRecord | null>(null);
  const [stockLedger, setStockLedger] = useState<StockLedgerEntry[]>([]);
  const [cartNotice, setCartNotice] = useState<string | null>(null);

  const clearCartNotice = useCallback(() => setCartNotice(null), []);

  const totals = useMemo(
    () =>
      computeTotals(cartLines, discount, {
        vatRate: VAT_RATE,
        serviceEnabled,
        serviceRate,
      }),
    [cartLines, discount, serviceEnabled, serviceRate],
  );

  const addProduct = useCallback((product: Product, variantId?: string) => {
    setCartNotice(null);
    setCartLines((prev) => {
      const same = prev.find(
        (l) => l.productId === product.id && l.variantId === variantId,
      );
      const nextQty = (same?.qty ?? 0) + 1;
      if (nextQty > product.stock) {
        queueMicrotask(() =>
          setCartNotice(
            `Not enough stock for ${product.name}. On hand: ${product.stock}.`,
          ),
        );
        return prev;
      }
      const price = unitPriceFor(product, variantId);
      const name = displayName(product, variantId);
      if (same) {
        return prev.map((l) =>
          l.id === same.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          id: lineId(),
          productId: product.id,
          variantId,
          name,
          unitPrice: price,
          qty: 1,
        },
      ];
    });
  }, []);

  const setLineQty = useCallback(
    (id: string, qty: number) => {
      const q = Math.floor(qty);
      setCartNotice(null);
      setCartLines((prev) => {
        const line = prev.find((l) => l.id === id);
        if (!line) return prev;
        if (q <= 0) return prev.filter((l) => l.id !== id);
        const p = products.find((x) => x.id === line.productId);
        if (p && q > p.stock) {
          queueMicrotask(() =>
            setCartNotice(`Max ${p.stock} in stock for ${p.name}.`),
          );
          return prev;
        }
        return prev.map((l) => (l.id === id ? { ...l, qty: q } : l));
      });
    },
    [products],
  );

  const removeLine = useCallback((lineId: string) => {
    setCartLines((prev) => prev.filter((l) => l.id !== lineId));
  }, []);

  const clearCart = useCallback(() => {
    setCartLines([]);
    setDiscount({ kind: "none" });
    setPaymentDraft({});
    setCartNotice(null);
  }, []);

  const holdCurrentOrder = useCallback(
    (label: string, note?: string) => {
      if (cartLines.length === 0) return;
      const ho: HeldOrder = {
        id: lineId(),
        label: label.trim() || `Hold #${heldOrders.length + 1}`,
        createdAt: Date.now(),
        lines: cartLines.map((l) => ({ ...l })),
        discount: { ...discount },
        note,
      };
      setHeldOrders((h) => [...h, ho]);
      clearCart();
    },
    [cartLines, discount, heldOrders.length, clearCart],
  );

  const resumeOrder = useCallback(
    (id: string) => {
      const h = heldOrders.find((x) => x.id === id);
      if (!h) return;
      setCartLines(h.lines.map((l) => ({ ...l, id: lineId() })));
      setDiscount(h.discount);
      setHeldOrders((list) => list.filter((x) => x.id !== id));
    },
    [heldOrders],
  );

  const deleteHeldOrder = useCallback((id: string) => {
    setHeldOrders((list) => list.filter((x) => x.id !== id));
  }, []);

  const completeSale = useCallback((): { ok: true; sale: SaleRecord } | { ok: false; reason: string } => {
    if (cartLines.length === 0) return { ok: false, reason: "Cart is empty." };
    for (const line of cartLines) {
      const p = products.find((x) => x.id === line.productId);
      if (!p) return { ok: false, reason: "Unknown product in cart." };
      if (p.stock < line.qty) {
        return { ok: false, reason: `Insufficient stock for ${p.name} (need ${line.qty}, have ${p.stock}).` };
      }
    }
    const paid = sumPayments(paymentDraft);
    if (paid + 0.001 < totals.total) {
      return { ok: false, reason: "Payments are less than total." };
    }
    const changeDue = Math.max(0, round2(paid - totals.total));
    const saleId = lineId();
    const at = Date.now();

    const sale: SaleRecord = {
      id: saleId,
      at,
      lines: cartLines.map((l) => ({ ...l })),
      discount,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      netBeforeCharges: totals.netBeforeCharges,
      vatAmount: totals.vatAmount,
      serviceAmount: totals.serviceAmount,
      total: totals.total,
      payments: { ...paymentDraft },
      changeDue,
    };

    const nextProducts = products.map((p) => ({ ...p }));
    const ledgerLines: StockLedgerEntry[] = [];
    for (const line of cartLines) {
      const idx = nextProducts.findIndex((x) => x.id === line.productId);
      if (idx < 0) continue;
      const p = nextProducts[idx];
      const stockAfter = p.stock - line.qty;
      nextProducts[idx] = { ...p, stock: Math.max(0, stockAfter) };
      ledgerLines.push({
        id: lineId(),
        at,
        saleId,
        productId: p.id,
        productName: line.name,
        variantId: line.variantId,
        qtyDelta: -line.qty,
        stockAfter: Math.max(0, stockAfter),
      });
    }
    setProducts(nextProducts);
    setStockLedger((L) => [...ledgerLines, ...L]);

    setSales((s) => [sale, ...s]);
    setLastSale(sale);
    clearCart();
    return { ok: true, sale };
  }, [cartLines, products, paymentDraft, totals, discount, clearCart]);

  const applyBarcode = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return false;
      const p = products.find((x) => x.barcode === trimmed);
      if (!p) return false;
      if (p.variants?.length === 1) {
        addProduct(p, p.variants[0].id);
      } else if (p.variants?.length) {
        addProduct(p, p.variants[0].id);
      } else {
        addProduct(p);
      }
      return true;
    },
    [products, addProduct],
  );

  const clearLastSale = useCallback(() => setLastSale(null), []);

  const value = useMemo<PosContextValue>(
    () => ({
      categories,
      setCategories,
      products,
      setProducts,
      categoryId,
      setCategoryId,
      search,
      setSearch,
      cartLines,
      addProduct,
      setLineQty,
      removeLine,
      clearCart,
      discount,
      setDiscount,
      serviceEnabled,
      setServiceEnabled,
      serviceRate,
      vatRate: VAT_RATE,
      totals,
      heldOrders,
      holdCurrentOrder,
      resumeOrder,
      deleteHeldOrder,
      paymentDraft,
      setPaymentDraft,
      completeSale,
      sales,
      lastSale,
      clearLastSale,
      applyBarcode,
      stockLedger,
      cartNotice,
      clearCartNotice,
    }),
    [
      categories,
      products,
      categoryId,
      search,
      cartLines,
      addProduct,
      setLineQty,
      removeLine,
      clearCart,
      discount,
      serviceEnabled,
      serviceRate,
      totals,
      heldOrders,
      holdCurrentOrder,
      resumeOrder,
      deleteHeldOrder,
      paymentDraft,
      completeSale,
      sales,
      lastSale,
      clearLastSale,
      applyBarcode,
      stockLedger,
      cartNotice,
      clearCartNotice,
    ],
  );

  return <PosContext.Provider value={value}>{children}</PosContext.Provider>;
}

export function usePos(): PosContextValue {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error("usePos must be used within PosProvider");
  return ctx;
}
