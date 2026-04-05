import type { Category, Product } from "@/types/pos";

export const SAMPLE_CATEGORIES: Category[] = [
  { id: "cat-bev", name: "Beverages", color: "bg-sky-600" },
  { id: "cat-food", name: "Food", color: "bg-amber-600" },
  { id: "cat-retail", name: "Retail", color: "bg-violet-600" },
];

export const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "p-silog",
    name: "Tapsilog",
    categoryId: "cat-food",
    price: 120,
    barcode: "4800123456789",
    sku: "FD-TS-01",
    stock: 40,
    imageUrl:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=400&fit=crop",
  },
  {
    id: "p-halo",
    name: "Halo-halo Regular",
    categoryId: "cat-bev",
    price: 95,
    barcode: "4800123456796",
    sku: "BV-HH-01",
    stock: 60,
    imageUrl:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=400&fit=crop",
  },
  {
    id: "p-coffee",
    name: "Kapeng Barako",
    categoryId: "cat-bev",
    price: 65,
    barcode: "4800123456802",
    sku: "BV-KB-01",
    variants: [
      { id: "v-hot", name: "Hot", priceDelta: 0 },
      { id: "v-iced", name: "Iced", priceDelta: 10 },
    ],
    stock: 100,
    imageUrl:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop",
  },
  {
    id: "p-rice",
    name: "Extra Rice",
    categoryId: "cat-food",
    price: 25,
    barcode: "4800123456819",
    sku: "FD-ER-01",
    stock: 200,
  },
  {
    id: "p-water",
    name: "Bottled Water 500ml",
    categoryId: "cat-bev",
    price: 20,
    barcode: "4800123456826",
    sku: "BV-WT-01",
    stock: 150,
    imageUrl:
      "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=400&fit=crop",
  }
];

export const VAT_RATE = 0.12;
export const DEFAULT_SERVICE_PCT = 0.1;
