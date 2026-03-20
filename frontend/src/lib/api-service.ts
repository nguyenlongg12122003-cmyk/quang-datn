/**
 * Centralized API service — all typed API calls in one place.
 * Used by pages and stores instead of importing mock-data.
 */
import { api } from './api';

// ─── Types ──────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipping' | 'delivered' | 'cancelled' | 'returned';

export interface Category { id: string; name: string; slug: string; icon?: string; description?: string; productCount: number; image?: string; }
export interface Brand { id: string; name: string; logo?: string; }
export interface ProductImage { id: string; url: string; alt: string; }
export interface ProductReview { id: string; userId: string; userName: string; userAvatar: string; rating: number; comment: string; helpful: number; isVerifiedPurchase: boolean; createdAt: string; }
export interface WholesalePrice { minQty: number; price: number; }
export interface ProductCustomizationOption {
  key: string;
  label: string;
  inputType?: 'text' | 'image';
  placeholder?: string;
  helpText?: string;
  extraPrice?: number;
}
export interface Product {
  id: string; name: string; slug: string; sku: string;
  categoryId: string; brandId: string;
  price: number; originalPrice: number; discount: number;
  images: ProductImage[]; description: string; specifications: Record<string,string>;
  stock: number; sold: number; rating: number; reviewCount: number;
  reviews: ProductReview[]; colors: string[]; tags: string[];
  isFlashSale: boolean; flashSaleEnd?: string; flashSalePrice?: number;
  isCustomizable: boolean; customizationOptions?: Array<string | ProductCustomizationOption>;
  wholesalePrice?: WholesalePrice[];
  status: 'active' | 'inactive'; createdAt: string;
}
export type PaymentMethod = 'cod' | 'vnpay';
export type ShippingMethod = 'standard' | 'express' | 'same_day';
export interface CartItem { lineItemId?: string; productId: string; quantity: number; price?: number; product?: Product; customization?: { type: string; text: string; extraPrice?: number; inputType?: string } }
export interface Address { id: string; name: string; phone: string; street: string; ward?: string; district?: string; city: string; isDefault: boolean; }
export interface User { id: string; email: string; name: string; phone?: string; avatar?: string; role: 'admin'|'staff'|'customer'; status: 'active'|'locked'; createdAt: string; addresses?: Address[]; }
export interface OrderItem {
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity: number;
  customization?: { type: string; text: string; inputType?: string; extraPrice?: number } | null;
}
export interface Order {
  id: string; userId: string; subtotal: number; shippingFee: number; discount: number; total: number;
  status: OrderStatus; paymentMethod: string; paymentStatus: string; shippingMethod: string;
  shippingAddress: Address; voucherCode?: string; note?: string; createdAt: string;
  items: OrderItem[]; timeline: { status: string; date: string; note?: string }[];
  returnRequest?: { reason: string; status: string; createdAt: string } | null;
}
export interface Voucher { id: string; code: string; type: 'percentage'|'fixed'; value: number; minOrderValue: number; maxDiscount?: number; usageLimit: number; usedCount: number; startDate: string; endDate: string; status: 'active'|'expired'|'disabled'; description?: string; }
export interface DashboardStats { totalRevenue: number; totalOrders: number; totalProducts: number; totalCustomers: number; pendingOrders: number; lowStockProducts: number; newCustomersThisMonth: number; returnRate: number; ordersByStatus: {status:string;count:number}[]; topProducts: {name:string;sold:number;revenue:number}[]; revenueByMonth: {month:string;revenue:number;orders:number}[]; }
export interface ChatMessage { id: string; senderId: string; senderName: string; senderRole: 'admin'|'customer'; targetUserId?: string; message: string; timestamp: string; isRead: boolean; }
export interface ChatConversation { userId: string; userName: string; userAvatar?: string; lastMessage: string; lastMessageAt: string; unreadCount: number; }


// ─── Utility ─────────────────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
}

export function formatCompactMoney(value: number): string {
  const abs = Math.abs(Number(value) || 0);
  const sign = value < 0 ? '-' : '';

  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`;

  return `${sign}${abs.toFixed(0)}`;
}

export function normalizeCustomizationOptions(options?: Array<string | ProductCustomizationOption>): ProductCustomizationOption[] {
  if (!Array.isArray(options)) return [];

  const normalized: ProductCustomizationOption[] = [];
  options.forEach((option, index) => {
    if (typeof option === 'string') {
      const label = option.trim();
      if (!label) return;
      normalized.push({
        key: `custom-${index}`,
        label,
        inputType: 'text',
      });
      return;
    }

    if (!option || typeof option !== 'object') return;
    const label = String(option.label || '').trim();
    if (!label) return;

    const key = String(option.key || '').trim() || `custom-${index}`;
      const inputType = ['text', 'image'].includes(String(option.inputType || ''))
        ? (option.inputType as 'text' | 'image')
        : 'text';
    const placeholder = option.placeholder ? String(option.placeholder).trim() : undefined;
    const helpText = option.helpText ? String(option.helpText).trim() : undefined;
      const extraPrice = option.extraPrice && Number.isFinite(Number(option.extraPrice)) ? Number(option.extraPrice) : 0;

    normalized.push({
      key,
      label,
        inputType,
      placeholder,
      helpText,
        extraPrice,
    });
  });

  return normalized;
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

export const catalogApi = {
  getCategories: () => api.get<Category[]>('/catalog/categories').then(r => r.data),
  createCategory: (data: Partial<Category>) => api.post<{id:string}>('/catalog/categories', data).then(r => r.data),
  updateCategory: (id: string, data: Partial<Category>) => api.put(`/catalog/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/catalog/categories/${id}`),

  getBrands: () => api.get<Brand[]>('/catalog/brands').then(r => r.data),
  createBrand: (data: Partial<Brand>) => api.post<{id:string}>('/catalog/brands', data).then(r => r.data),
  updateBrand: (id: string, data: Partial<Brand>) => api.put(`/catalog/brands/${id}`, data),
  deleteBrand: (id: string) => api.delete(`/catalog/brands/${id}`),

  getProducts: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get<Product[]>('/catalog/products', { params }).then(r => r.data),
  getProduct: (idOrSlug: string) => api.get<Product>(`/catalog/products/${idOrSlug}`).then(r => r.data),
  getSearchSuggestions: (q: string) =>
    api.get<string[]>('/catalog/search-suggestions', { params: { q } }).then(r => r.data),
  createProduct: (data: Partial<Product>) => api.post<{id:string}>('/catalog/products', data).then(r => r.data),
  updateProduct: (id: string, data: Partial<Product>) => api.put(`/catalog/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/catalog/products/${id}`),
  updateStock: (id: string, stock: number) => api.patch(`/catalog/products/${id}/stock`, { stock }),
  getReviews: (productId: string) =>
    api.get<ProductReview[]>(`/catalog/products/${productId}/reviews`).then(r => r.data),
  submitReview: (productId: string, data: { rating: number; comment: string }) =>
    api.post(`/catalog/products/${productId}/reviews`, data).then(r => r.data),
};


// ─── Orders ──────────────────────────────────────────────────────────────────

export const orderApi = {
  getMyOrders: () => api.get<Order[]>('/orders/my-orders').then(r => r.data),
  createOrder: (data: unknown) => api.post<{id:string; paymentUrl?: string; paymentMethod?: string; paymentStatus?: string}>('/orders', data).then(r => r.data),
  cancelOrder: (id: string) => api.post(`/orders/${id}/cancel`),
  returnRequest: (id: string, reason: string) => api.post(`/orders/${id}/return-request`, { reason }),
  // Admin
  getAllOrders: (params?: { status?: string; q?: string }) =>
    api.get<Order[]>('/orders', { params }).then(r => r.data),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/orders/${id}/status`, { status, note }),
  approveReturn: (id: string, action: 'approved'|'rejected', note?: string) =>
    api.patch(`/orders/${id}/return`, { action, note }),
};

// ─── Users ───────────────────────────────────────────────────────────────────

export const userApi = {
  updateProfile: (data: { name?: string; phone?: string; avatar?: string }) =>
    api.put('/users/me', data),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/users/change-password', { oldPassword, newPassword }),
  addAddress: (data: Omit<Address,'id'>) => api.post<{id:string}>('/users/addresses', data).then(r => r.data),
  deleteAddress: (id: string) => api.delete(`/users/addresses/${id}`),
  setDefaultAddress: (id: string) => api.patch(`/users/addresses/${id}/default`),
  // Admin
  getAllUsers: (params?: { q?: string; role?: string }) =>
    api.get<User[]>('/users', { params }).then(r => r.data),
  setUserStatus: (id: string, status: 'active'|'locked') => api.patch(`/users/${id}/status`, { status }),
  setUserRole: (id: string, role: string) => api.patch(`/users/${id}/role`, { role }),
};

// ─── Vouchers ────────────────────────────────────────────────────────────────

export const voucherApi = {
  getAll: () => api.get<Voucher[]>('/vouchers').then(r => r.data),
  validate: (code: string, subtotal: number) =>
    api.post<{valid:boolean;voucher:Voucher;discount:number}>('/vouchers/validate', { code, subtotal }).then(r => r.data),
  create: (data: Partial<Voucher>) => api.post<{id:string}>('/vouchers', data).then(r => r.data),
  update: (id: string, data: Partial<Voucher>) => api.put(`/vouchers/${id}`, data),
  delete: (id: string) => api.delete(`/vouchers/${id}`),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/dashboard/stats').then(r => r.data),
  getRevenueReport: () => api.get('/dashboard/reports/revenue').then(r => r.data),
  getCustomerReport: () => api.get('/dashboard/reports/customers').then(r => r.data),
};

// ─── Chat ────────────────────────────────────────────────────────────────────

export const chatApi = {
  getConversations: () => api.get<ChatConversation[]>('/chat/conversations').then(r => r.data),
  getMessages: (userId?: string) =>
    api.get<ChatMessage[]>('/chat/messages', { params: userId ? { userId } : undefined }).then(r => r.data),
  sendMessage: (message: string, targetUserId?: string) =>
    api.post('/chat/messages', { message, targetUserId }).then(r => r.data),
  markRead: (userId?: string) => api.patch('/chat/messages/read', userId ? { userId } : undefined),
};

// ─── Wishlist ────────────────────────────────────────────────────────────────

export const wishlistApi = {
  getAll: () => api.get<Product[]>('/wishlist').then(r => r.data),
  add: (productId: string) => api.post('/wishlist', { productId }),
  remove: (productId: string) => api.delete(`/wishlist/${productId}`),
};
