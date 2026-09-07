export type UserRole = 'SUPER_ADMIN' | 'GYM_OWNER' | 'STAFF' | 'RECEPTION';

export interface Gym {
  id: number;
  gymName: string;
  logo?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  description?: string | null;
  status: 'active' | 'inactive';
  monthlyPrice: number;
  threeMonthsPrice: number;
  sixMonthsPrice: number;
  annualPrice: number;
  smsUrl?: string | null;
  smsApiKey?: string | null;
  smsSenderId?: string | null;
  smsEnabled?: string | null;
  currency?: string | null;
  timezone?: string | null;
  receiptFooter?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessSettings {
  id?: number;
  gymName: string;
  logo?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  currency: string;
  description?: string | null;
  receiptFooter?: string | null;
  monthlyPrice?: number;
  threeMonthsPrice?: number;
  sixMonthsPrice?: number;
  annualPrice?: number;
}

export interface UserAccount {
  id: number;
  uid: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  gymId?: number | null;
  gymName?: string | null;
  status: 'active' | 'inactive';
  avatar?: string | null;
  createdAt?: string;
}

export interface GymStatSummary {
  gymId: number;
  gymName: string;
  status: 'active' | 'inactive';
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  activeMembers: number;
  expiredMembers: number;
  totalMembers: number;
  todayCheckIns: number;
  todayRevenue: number;
  totalRevenue: number;
  ownerName?: string | null;
  ownerUsername?: string | null;
}

export interface SuperAdminDashboardData {
  totalGyms: number;
  activeGyms: number;
  inactiveGyms: number;
  totalMembersAcrossGyms: number;
  activeMembersAcrossGyms: number;
  totalTodayCheckIns: number;
  totalTodayRevenue: number;
  gymsStats: GymStatSummary[];
}

export interface Member {
  id: number;
  gymId: number;
  memberNumber: string;
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  barcode: string;
  status: string;
  emergencyContact?: string | null;
  notes?: string | null;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  latestMembership?: Membership | null;
  computedStatus: 'active' | 'expiring_soon' | 'due_today' | 'due_tomorrow' | 'expired' | 'inactive';
  daysRemaining: number;
  statusLabel: string;
  badgeColor: 'green' | 'orange' | 'red' | 'gray';
}

export interface MembershipPackage {
  id: number;
  gymId: number;
  name: string;
  packageKey: string;
  durationMonths: number;
  price: number;
  description?: string | null;
  status: 'active' | 'inactive';
  createdAt?: string;
}

export interface Membership {
  id: number;
  gymId: number;
  memberId: number;
  package: 'monthly' | '3_months' | '6_months' | 'annual' | string;
  startDate: string;
  expiryDate: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Payment {
  id: number;
  gymId: number;
  memberId: number;
  memberNumber: string;
  amount: number;
  paymentDate: string;
  package: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  previousExpiryDate?: string | null;
  newExpiryDate: string;
  createdBy?: string;
  notes?: string | null;
  createdAt?: string;
}

export interface Attendance {
  id: number;
  gymId: number;
  memberId: number;
  memberNumber: string;
  memberName?: string;
  memberPhone?: string;
  attendanceDate: string;
  attendanceTime: string;
  status: string;
  notes?: string | null;
  createdAt?: string;
}

// Product & Inventory Types
export interface Product {
  id: number;
  gymId: number;
  name: string;
  barcode?: string | null;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  status: 'active' | 'inactive';
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductStockMovement {
  id: number;
  gymId: number;
  productId: number;
  changeType: 'initial' | 'restock' | 'sale' | 'refund' | 'adjustment';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  notes?: string | null;
  createdBy?: string;
  createdAt?: string;
}

// POS & Sales Types
export interface SaleItem {
  id?: number;
  saleId?: number;
  gymId?: number;
  productId?: number | null;
  productName: string;
  quantity: number;
  unitCostPrice: number;
  unitSellingPrice: number;
  subtotal: number;
}

export interface Sale {
  id: number;
  gymId: number;
  saleNumber: string;
  receiptNumber?: string;
  memberId?: number | null;
  customerName: string;
  customerPhone?: string | null;
  subtotal: number;
  discount: number;
  finalAmount: number;
  totalAmount?: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  status: 'completed' | 'refunded' | 'cancelled';
  paymentStatus?: string;
  refundReason?: string | null;
  createdBy?: string;
  notes?: string | null;
  createdAt: string;
  items?: SaleItem[];
}

export interface SmsLog {
  id: number;
  gymId?: number | null;
  memberId?: number | null;
  phone: string;
  messageType: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  apiResponse?: string | null;
  errorMessage?: string | null;
  sentAt?: string;
}

export interface AuditLog {
  id: number;
  gymId?: number | null;
  userId?: number | null;
  action: string;
  details?: string | null;
  ipAddress?: string | null;
  createdAt?: string;
}

export interface DashboardStats {
  activeMembers: number;
  expiredMembers: number;
  paymentDueToday: number;
  paymentDueTomorrow: number;
  expiringSoonCount: number;
  todayCheckInsCount: number;
  todayCheckInsList: Attendance[];
  todaySalesCount: number;
  todaySalesRevenue: number;
  todayRevenue: number; // Membership fees + store sales
  monthlyRevenue: number;
  totalRevenue: number;
  lowStockCount: number;
  lowStockProducts: Product[];
  recentSales: Sale[];
  revenueSummary: {
    totalRevenue: number;
    cashRevenue: number;
    bankTransferRevenue: number;
    totalPaymentsCount: number;
    monthlyChart: Array<{ month: string; cash: number; bank: number; total: number }>;
    dailyChart: Array<{ date: string; cash: number; bank: number; total: number }>;
  };
}

export interface UserSession {
  uid: string;
  id?: number;
  email: string;
  name: string;
  role: UserRole;
  gymId?: number | null;
  gymName?: string | null;
  avatar?: string | null;
  token?: string;
}
