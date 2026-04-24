// ─── User ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
}

// ─── Category ────────────────────────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
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
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
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
