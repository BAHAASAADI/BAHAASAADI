export type ProductStatus = "available" | "reserved" | "sold";
export type DeviceCondition = "like_new" | "excellent" | "good" | "fair" | "damaged";
export type PartsStatus = "original" | "replaced" | "unknown";
export type EnquiryStatus = "new" | "contacted" | "negotiating" | "accepted" | "rejected" | "completed";
export type RequestKind = "reserve" | "question" | "contact";
export type RequestStatus = "new" | "handled" | "closed";
export type AdminRole = "owner" | "manager" | "staff";
export type DeductionType = "percent" | "fixed";
export type PurchaseSource = "customer" | "supplier" | "trade_in";

export const CONDITIONS: DeviceCondition[] = ["like_new", "excellent", "good", "fair", "damaged"];
export const ENQUIRY_STATUSES: EnquiryStatus[] = ["new", "contacted", "negotiating", "accepted", "rejected", "completed"];
export const FUNCTION_KEYS = [
  "face_id",
  "cameras",
  "screen",
  "touchscreen",
  "speakers",
  "microphone",
  "charging",
  "buttons",
] as const;
export const PART_KEYS = ["screen", "battery", "cameras", "other"] as const;
export type FunctionKey = (typeof FUNCTION_KEYS)[number];
export type PartKey = (typeof PART_KEYS)[number];

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  round_to: number;
  rate: number;
  is_active: boolean;
  confirmed_at: string | null;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  whatsapp: string | null;
  opening_hours: string | null;
  maps_url: string | null;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface SiteSettings {
  main_currency: string;
  primary_shop_id: string | null;
  whatsapp_number: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  trade_in_min_offer: number;
  updated_at: string;
}

export interface IphoneModel {
  id: string;
  slug: string;
  name: string;
  release_year: number | null;
  sort_order: number;
  storages: number[];
  colors: string[];
  is_active: boolean;
  display_inches: number | null;
  chip: string | null;
  biometrics: "Face ID" | "Touch ID" | null;
  connector: "Lightning" | "USB-C" | null;
  has_5g: boolean | null;
}

export interface ProductPhoto {
  id: string;
  product_id: string;
  path: string;
  sort_order: number;
}

export interface Product {
  id: string;
  inventory_id: string;
  model_id: string;
  storage_gb: number;
  color: string;
  battery_health: number | null;
  condition: DeviceCondition;
  parts_status: PartsStatus;
  replaced_parts: string | null;
  description: string | null;
  price: number;
  offer_price: number | null;
  currency: string;
  status: ProductStatus;
  shop_id: string;
  is_featured: boolean;
  is_published: boolean;
  price_updated_at: string;
  reserved_at: string | null;
  sold_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithRelations extends Product {
  model: Pick<IphoneModel, "id" | "name" | "slug" | "sort_order" | "display_inches" | "chip" | "biometrics" | "connector" | "has_5g"> | null;
  shop: Pick<Shop, "id" | "name" | "city" | "whatsapp" | "phone" | "currency" | "maps_url"> | null;
  photos: ProductPhoto[];
}

export interface BuyPrice {
  id: string;
  model_id: string;
  storage_gb: number;
  base_price: number;
  price_excellent: number | null;
  price_good: number | null;
  price_fair: number | null;
  price_damaged: number | null;
  is_active: boolean;
  updated_at: string;
}

export interface TradeInRule {
  key: string;
  category: "condition" | "defect" | "part";
  label: string;
  deduction_type: DeductionType;
  value: number;
  sort_order: number;
  updated_at: string;
}

export interface BatteryBand {
  id: string;
  min_pct: number;
  max_pct: number;
  deduction_type: DeductionType;
  value: number;
  updated_at: string;
}

export interface EstimateDeduction {
  key: string;
  category: "condition" | "battery" | "defect" | "part";
  amount: number;
  band?: string;
}

export interface EstimateResult {
  available: boolean;
  currency: string;
  model_name: string;
  storage_gb: number;
  base_price?: number;
  deductions?: EstimateDeduction[];
  total_deductions?: number;
  estimate?: number;
  inspection_required?: boolean;
  prices_updated_at?: string;
}

export interface Review {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  shop_id: string | null;
  source: string | null;
  review_date: string | null;
  is_published: boolean;
  sort_order: number;
}

export interface Faq {
  id: string;
  locale: string;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
}

export interface ContentPage {
  slug: "privacy" | "terms" | "trade-in-conditions";
  locale: string;
  title: string;
  body: string;
  updated_at: string;
}

export interface TradeInEnquiry {
  id: string;
  reference: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  model_id: string | null;
  model_name: string;
  storage_gb: number;
  condition: DeviceCondition;
  battery_health: number | null;
  answers: {
    functional?: Partial<Record<FunctionKey, boolean>>;
    water_damage?: boolean;
    parts?: Partial<Record<PartKey, PartsStatus>>;
  };
  other_defects: string | null;
  other_replaced: string | null;
  estimated_offer: number | null;
  currency: string;
  breakdown: EstimateResult;
  final_offer: number | null;
  final_currency: string | null;
  preferred_shop_id: string | null;
  status: EnquiryStatus;
  admin_notes: string | null;
  locale: string | null;
  status_changed_at: string;
  created_at: string;
  updated_at: string;
}
