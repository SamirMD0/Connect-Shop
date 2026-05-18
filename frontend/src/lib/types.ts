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
  product_count?: number;
}

// ─── Product ─────────────────────────────────────────────────────────────────
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
  quantity: number;
  name: string;
  slug: string;
  price: string;
  image_url: string | null;
  stock: number;
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
  quantity: number;
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
  quantity: number;
  price_at_purchase: string;
  name?: string;
  slug?: string;
  image_url?: string | null;
}

export interface Order {
  id: string;
  user_id: string;
  status: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: string;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_status: string;
  created_at: string;
  items?: OrderItem[];
  item_count?: number;
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
