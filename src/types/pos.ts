export type Category = {
  id: string;
  name: string;
  color: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  priceDelta: number;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  /** Unit price excluding VAT (PHP) */
  price: number;
  barcode?: string;
  sku?: string;
  imageUrl?: string;
  stock: number;
  variants?: ProductVariant[];
};

export type CartLine = {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  unitPrice: number;
  qty: number;
};

export type DiscountState =
  | { kind: "none" }
  | { kind: "percent"; value: number }
  | { kind: "fixed"; value: number };

export type PaymentMethodId = "cash" | "card" | "gcash" | "maya";

export type PaymentSplit = Partial<Record<PaymentMethodId, number>>;

export type HeldOrder = {
  id: string;
  label: string;
  createdAt: number;
  lines: CartLine[];
  discount: DiscountState;
  note?: string;
};

export type SaleLineSnapshot = Omit<CartLine, "id"> & { id: string };

export type SaleRecord = {
  id: string;
  at: number;
  lines: SaleLineSnapshot[];
  discount: DiscountState;
  subtotal: number;
  discountAmount: number;
  netBeforeCharges: number;
  vatAmount: number;
  serviceAmount: number;
  total: number;
  payments: PaymentSplit;
  changeDue: number;
};

export type TotalsBreakdown = {
  subtotal: number;
  discountAmount: number;
  netBeforeCharges: number;
  vatAmount: number;
  serviceAmount: number;
  total: number;
};

export type StockLedgerEntry = {
  id: string;
  at: number;
  saleId: string;
  productId: string;
  productName: string;
  variantId?: string;
  qtyDelta: number;
  stockAfter: number;
};
