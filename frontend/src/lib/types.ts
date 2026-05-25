// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  phone?: string | null;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  mfaVerified?: boolean;
}

export interface UserAddress {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  zip_code: string | null;
  country: string;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  parent_id: number | null;
  depth: number;
  product_count?: number;
}

// ─── Product ─────────────────────────────────────────────────────────────────
export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
  attributes: Record<string, any>;
  image_url: string | null;
  created_at: string;
}

export interface ProductImage {
  id: number;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  image_url: string | null;
  category_id: number;
  category_name?: string;
  category_slug?: string;
  stock: number;
  rating: string;
  review_count: number;
  is_featured: boolean;
  specs: Record<string, string> | null;
  brand: string | null;
  sku: string | null;
  compare_at_price: string | null;
  weight_grams: number | null;
  meta_title: string | null;
  meta_description: string | null;
  variants?: ProductVariant[];
  gallery_images?: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Cart ────────────────────────────────────────────────────────────────────
export interface CartItem {
  id: number;
  user_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  name: string;
  slug: string;
  price: string;
  image_url: string | null;
  stock: number;
  variant_name?: string | null;
  created_at: string;
}

export interface Cart {
  items: CartItem[];
  itemCount: number;
  total: string;
}

// Guest cart item (stored in localStorage)
export interface GuestCartItem {
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  expires_at?: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────
export interface ShippingAddress {
  fullName: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode?: string;
  country: string;
}

export interface OrderItem {
  id: number;
  order_id: string;
  product_id: string;
  variant_id?: string | null;
  quantity: number;
  price_at_purchase: string;
  name?: string;
  slug?: string;
  image_url?: string | null;
  variant_name?: string | null;
}

export interface Order {
  id: string;
  user_id: string | null;
  guest_email?: string | null;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  subtotal?: string;
  tax_amount?: string;
  shipping_cost?: string;
  discount_amount?: string;
  coupon_code?: string | null;
  tracking_carrier?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  estimated_delivery_date?: string | null;
  cancelled_at?: string | null;
  total: string;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_status: string;
  delivery_slot?: string | null;
  created_at: string;
  items?: OrderItem[];
  item_count?: number;
  status_history?: Array<{ id: number; status: string; note: string | null; created_at: string }>;
  return_requests?: Array<{ id: string; reason: string; status: string; created_at: string }>;
}

// ─── API Responses ───────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any; // Allow spreading result
}

// ─── Admin Analytics ─────────────────────────────────────────────────────────
export interface MonthlyRevenue {
  month: string;
  revenue: string;
}

export interface AnalyticsSummary {
  totalRevenue: string;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalCategories: number;
  monthlyRevenue: MonthlyRevenue[];
  recentProducts: Product[];
  recentCategories: Category[];
}

// ─── Carousel ────────────────────────────────────────────────────────────────
export interface CarouselSlide {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  link_url: string | null;
  button_text: string | null;
  display_order: number;
  is_active: boolean;
}
