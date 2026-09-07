/**
 * Centralized API client for Gym Management System
 */

const TOKEN_KEY = 'gym_auth_token';
const USER_KEY = 'gym_auth_user';
const TARGET_GYM_KEY = 'gym_target_id';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || 'gym_admin_secret_session_active';
}

export function getTargetGymId(): number | null {
  const raw = localStorage.getItem(TARGET_GYM_KEY);
  return raw ? Number(raw) : null;
}

export function setTargetGymId(id: number | null) {
  if (id === null) {
    localStorage.removeItem(TARGET_GYM_KEY);
  } else {
    localStorage.setItem(TARGET_GYM_KEY, String(id));
  }
}

export function setAuthSession(token: string, user: any) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TARGET_GYM_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const targetGymId = getTargetGymId();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    headers.set('x-admin-token', token);
  }

  if (targetGymId) {
    headers.set('x-target-gym-id', String(targetGymId));
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      errMsg = errorJson.error || errorJson.message || errMsg;
    } catch (e) {}

    if (response.status === 401) {
      // Clear expired or invalid session token so user can re-authenticate
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new CustomEvent('gym_auth_expired'));
    }

    throw new Error(errMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (credentials: { username?: string; password?: string; passkey?: string }) =>
    request<{ success: boolean; token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getCurrentUser: () => request<{ user: any }>('/api/auth/me'),

  updateProfile: (data: { name?: string; email?: string; avatar?: string; password?: string }) =>
    request<{ success: boolean; message: string; user: any }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getAllBusinesses: () => request<any[]>('/api/businesses'),

  // Dashboard
  getDashboard: () => request<any>('/api/dashboard'),

  // Members
  getMembers: (search?: string, filter?: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter) params.set('filter', filter);
    return request<any[]>(`/api/members?${params.toString()}`);
  },

  getMember: (id: number) => request<any>(`/api/members/${id}`),

  addMember: (data: any) =>
    request<any>('/api/members', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editMember: (id: number, data: any) =>
    request<any>(`/api/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMember: (id: number) =>
    request<any>(`/api/members/${id}`, {
      method: 'DELETE',
    }),

  archiveMember: (id: number) =>
    request<any>(`/api/members/${id}/archive`, {
      method: 'POST',
    }),

  reactivateMember: (id: number) =>
    request<any>(`/api/members/${id}/reactivate`, {
      method: 'POST',
    }),

  renewMembership: (id: number, data: any) =>
    request<any>(`/api/members/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Attendance
  scanAttendance: (barcode: string) =>
    request<any>('/api/attendance/scan', {
      method: 'POST',
      body: JSON.stringify({ barcode }),
    }),

  getTodayAttendance: () => request<any[]>('/api/attendance/today'),

  // POS Products & Inventory
  getProducts: (params?: { category?: string; search?: string; lowStock?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.lowStock) q.set('lowStock', 'true');
    return request<any[]>(`/api/products?${q.toString()}`);
  },

  addProduct: (data: any) =>
    request<any>('/api/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  editProduct: (id: number, data: any) =>
    request<any>(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProduct: (id: number) =>
    request<any>(`/api/products/${id}`, {
      method: 'DELETE',
    }),

  adjustProductStock: (id: number, data: { quantityChange: number; changeType?: string; notes?: string }) =>
    request<any>(`/api/products/${id}/stock`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // POS Sales
  getSales: (params?: { startDate?: string; endDate?: string; paymentMethod?: string; status?: string; search?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.paymentMethod) q.set('paymentMethod', params.paymentMethod);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.limit) q.set('limit', String(params.limit));
    return request<any[]>(`/api/sales?${q.toString()}`);
  },

  createSale: (data: any) =>
    request<any>('/api/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  refundSale: (id: number, reason?: string) =>
    request<any>(`/api/sales/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Payments Ledger
  getPayments: (params?: { startDate?: string; endDate?: string; paymentMethod?: string; package?: string }) => {
    const q = new URLSearchParams();
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    if (params?.paymentMethod) q.set('paymentMethod', params.paymentMethod);
    if (params?.package) q.set('package', params.package);
    return request<{ items: any[]; totalAmount: number }>(`/api/payments?${q.toString()}`);
  },

  // Reports
  getReports: (params?: { type?: string; startDate?: string; endDate?: string }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    return request<any>(`/api/reports?${q.toString()}`);
  },

  // SMS
  getSmsLogs: () => request<any[]>('/api/sms/logs'),

  sendTestSms: (phone: string, message: string) =>
    request<any>('/api/sms/test', {
      method: 'POST',
      body: JSON.stringify({ phone, message }),
    }),

  // Settings & White-Label Business Config
  getSettings: () => request<Record<string, string>>('/api/settings'),

  getPublicGymInfo: () =>
    request<{
      gymName: string;
      logo: string | null;
      phone: string | null;
      address: string | null;
      email: string | null;
      currency: string;
      description: string | null;
      receiptFooter: string | null;
    }>('/api/business/public'),

  updateSettings: (settingsMap: Record<string, string>) =>
    request<any>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settingsMap),
    }),

  // Staff Management
  getStaff: () => request<any[]>('/api/staff'),

  createStaff: (data: any) =>
    request<any>('/api/staff', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Cron
  triggerDailyCron: () =>
    request<any>('/api/cron/notifications', {
      method: 'POST',
    }),

  // Super Admin
  getSuperAdminDashboard: () => request<any>('/api/superadmin/dashboard'),
  getSuperAdminGyms: () => request<any[]>('/api/superadmin/gyms'),
  createSuperAdminGym: (data: any) =>
    request<any>('/api/superadmin/gyms', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  toggleSuperAdminGymStatus: (id: number, status: 'active' | 'inactive') =>
    request<any>(`/api/superadmin/gyms/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  getSuperAdminUsers: () => request<any[]>('/api/superadmin/users'),
  createSuperAdminUser: (data: any) =>
    request<any>('/api/superadmin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSuperAdminUser: (id: number, data: any) =>
    request<any>(`/api/superadmin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
