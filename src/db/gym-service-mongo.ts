import { getMongoDb, setupMongoIndexes } from './mongodb.ts';
import type { Member, DashboardStats, Product, Sale, SaleItem, Gym, BusinessSettings, UserAccount, SuperAdminDashboardData } from '../types.ts';
import { sendSms } from '../lib/sms/smslen.ts';
import { hashPassword, verifyPassword } from '../lib/security.ts';
import bcrypt from 'bcryptjs';

// Safe date helpers
function formatDateStr(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

// In-memory fallback collections for zero-downtime sandbox preview when MONGODB_URI is not yet provided
interface MemoryStore {
  businesses: any[];
  users: any[];
  members: any[];
  memberships: any[];
  payments: any[];
  attendance: any[];
  products: any[];
  stockMovements: any[];
  sales: any[];
  saleItems: any[];
  settings: any[];
  smsLogs: any[];
}

// Initial Seed Data
const initialStore: MemoryStore = {
  businesses: [
    {
      id: 1,
      businessId: 'biz_1',
      gymName: 'ZENERGY FITNESS',
      logo: '',
      phone: '+94 77 111 2233',
      address: 'No. 12 Beach Road, Colombo 03, Sri Lanka',
      email: 'contact@zenergyfitness.com',
      status: 'active',
      monthlyPrice: 4500,
      threeMonthsPrice: 12000,
      sixMonthsPrice: 22000,
      annualPrice: 38000,
      currency: 'Rs.',
      timezone: 'Asia/Colombo',
      description: 'High-Energy Functional Fitness, Strength & Conditioning',
      receiptFooter: 'Thank you for training with ZENERGY FITNESS! Goods sold are exchangeable within 7 days.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      businessId: 'biz_2',
      gymName: 'POWER FITNESS',
      logo: '',
      phone: '+94 71 444 5566',
      address: '88 Kandy Road, Kiribathgoda, Sri Lanka',
      email: 'contact@powerfitness.lk',
      status: 'active',
      monthlyPrice: 5000,
      threeMonthsPrice: 13500,
      sixMonthsPrice: 25000,
      annualPrice: 42000,
      currency: 'Rs.',
      timezone: 'Asia/Colombo',
      description: 'Heavy Duty Strength, Muscle & Performance Center',
      receiptFooter: 'Train Hard. Stay Consistent. No Refunds on Day Passes.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      businessId: 'biz_3',
      gymName: 'ELITE FITNESS',
      logo: '',
      phone: '+1 (555) 789-0123',
      address: '500 Olympic Way, Los Angeles, CA 90015',
      email: 'info@elitefitness.com',
      status: 'active',
      monthlyPrice: 65,
      threeMonthsPrice: 180,
      sixMonthsPrice: 320,
      annualPrice: 550,
      currency: '$',
      timezone: 'America/Los_Angeles',
      description: 'Elite Athletic Conditioning, Recovery & Olympic Weightlifting',
      receiptFooter: 'Excellence in athletic development. Powered by WOW POS.',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  users: [
    {
      id: 1,
      uid: 'superadmin_master',
      businessId: 'biz_1',
      gymId: 1,
      username: 'superadmin',
      password: hashPassword('admin123'),
      email: 'superadmin@wowpos.io',
      name: 'WOW POS Super Admin',
      role: 'SUPER_ADMIN',
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 2,
      uid: 'gym_admin_titan',
      businessId: 'biz_1',
      gymId: 1,
      username: 'titan',
      password: hashPassword('admin123'),
      email: 'titan@zenergy.local',
      name: 'Titan',
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 3,
      uid: 'gym_admin_titan_alias',
      businessId: 'biz_1',
      gymId: 1,
      username: 'admin',
      password: hashPassword('admin123'),
      email: 'titan@zenergy.local',
      name: 'Titan',
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 4,
      uid: 'gym_admin_kasun',
      businessId: 'biz_2',
      gymId: 2,
      username: 'kasun',
      password: hashPassword('admin123'),
      email: 'kasun@powerfitness.local',
      name: 'Kasun',
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 5,
      uid: 'gym_admin_power',
      businessId: 'biz_2',
      gymId: 2,
      username: 'poweradmin',
      password: hashPassword('admin123'),
      email: 'admin@powerfitness.lk',
      name: 'Power Fitness Admin',
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 6,
      uid: 'gym_admin_nimal',
      businessId: 'biz_3',
      gymId: 3,
      username: 'nimal',
      password: hashPassword('admin123'),
      email: 'nimal@elitefitness.com',
      name: 'Nimal',
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 7,
      uid: 'gym_admin_elite',
      businessId: 'biz_3',
      gymId: 3,
      username: 'eliteadmin',
      password: hashPassword('admin123'),
      email: 'admin@elitefitness.com',
      name: 'Elite Fitness Director',
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    },
  ],
  members: [
    {
      id: 1,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-1001',
      fullName: 'Kasun Perera',
      phone: '+94771234567',
      email: 'kasun.perera@example.lk',
      address: 'Colombo 03',
      barcode: 'TF-1001',
      status: 'active',
      emergencyContact: '+94779876543',
      notes: 'Prefers morning sessions',
      createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
    },
    {
      id: 2,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-1002',
      fullName: 'Nimali Fernando',
      phone: '+94712345678',
      email: 'nimali.f@example.lk',
      address: 'Nugegoda',
      barcode: 'TF-1002',
      status: 'active',
      emergencyContact: '+94719998888',
      notes: 'Cardio focus',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      id: 3,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-1003',
      fullName: 'Sahan Jayawardena',
      phone: '+94723456789',
      email: 'sahan.j@example.lk',
      address: 'Mount Lavinia',
      barcode: 'TF-1003',
      status: 'active',
      emergencyContact: '+94721112222',
      notes: 'Weight training and supplements',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
    {
      id: 4,
      businessId: 'biz_1',
      gymId: 1,
      memberNumber: 'TF-1004',
      fullName: 'Dilshan Silva',
      phone: '+94754321987',
      email: 'dilshan.silva@example.lk',
      address: 'Dehiwala',
      barcode: 'TF-1004',
      status: 'active',
      emergencyContact: '+94759990000',
      notes: 'Personal trainer assigned',
      createdAt: new Date(Date.now() - 100 * 24 * 3600 * 1000),
    },
    // Gym 2: POWER FITNESS (biz_2)
    {
      id: 5,
      businessId: 'biz_2',
      gymId: 2,
      memberNumber: 'PF-2001',
      fullName: 'Ruwan Bandara',
      phone: '+94712233441',
      email: 'ruwan.bandara@example.lk',
      address: 'Kandy Road, Kiribathgoda',
      barcode: 'PF-2001',
      status: 'active',
      emergencyContact: '+94719991111',
      notes: 'Powerlifting competitor',
      createdAt: new Date(Date.now() - 90 * 24 * 3600 * 1000),
    },
    {
      id: 6,
      businessId: 'biz_2',
      gymId: 2,
      memberNumber: 'PF-2002',
      fullName: 'Chathura Senanayake',
      phone: '+94712233442',
      email: 'chathura.s@example.lk',
      address: 'Kadawatha',
      barcode: 'PF-2002',
      status: 'active',
      emergencyContact: '+94719992222',
      notes: 'Evening heavy lifting crew',
      createdAt: new Date(Date.now() - 45 * 24 * 3600 * 1000),
    },
    {
      id: 7,
      businessId: 'biz_2',
      gymId: 2,
      memberNumber: 'PF-2003',
      fullName: 'Dinesh Jayasinghe',
      phone: '+94712233443',
      email: 'dinesh.j@example.lk',
      address: 'Kelaniya',
      barcode: 'PF-2003',
      status: 'active',
      emergencyContact: '+94719993333',
      notes: 'Bodybuilding mass phase',
      createdAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
    },
    {
      id: 8,
      businessId: 'biz_2',
      gymId: 2,
      memberNumber: 'PF-2004',
      fullName: 'Janaka Alwis',
      phone: '+94712233444',
      email: 'janaka.alwis@example.lk',
      address: 'Kiribathgoda',
      barcode: 'PF-2004',
      status: 'expired',
      emergencyContact: '+94719994444',
      notes: 'Membership expired last week',
      createdAt: new Date(Date.now() - 120 * 24 * 3600 * 1000),
    },
    // Gym 3: ELITE FITNESS (biz_3)
    {
      id: 9,
      businessId: 'biz_3',
      gymId: 3,
      memberNumber: 'EF-3001',
      fullName: 'Michael Hayes',
      phone: '+15551230001',
      email: 'michael.hayes@example.com',
      address: 'Downtown Los Angeles, CA',
      barcode: 'EF-3001',
      status: 'active',
      emergencyContact: '+15559870001',
      notes: 'Olympic weightlifting athlete',
      createdAt: new Date(Date.now() - 80 * 24 * 3600 * 1000),
    },
    {
      id: 10,
      businessId: 'biz_3',
      gymId: 3,
      memberNumber: 'EF-3002',
      fullName: 'Sarah Jenkins',
      phone: '+15551230002',
      email: 'sarah.jenkins@example.com',
      address: 'Santa Monica, CA',
      barcode: 'EF-3002',
      status: 'active',
      emergencyContact: '+15559870002',
      notes: 'Conditioning and speed training',
      createdAt: new Date(Date.now() - 40 * 24 * 3600 * 1000),
    },
    {
      id: 11,
      businessId: 'biz_3',
      gymId: 3,
      memberNumber: 'EF-3003',
      fullName: 'David Miller',
      phone: '+15551230003',
      email: 'david.miller@example.com',
      address: 'Beverly Hills, CA',
      barcode: 'EF-3003',
      status: 'active',
      emergencyContact: '+15559870003',
      notes: 'Recovery and cryotherapy plan',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
    {
      id: 12,
      businessId: 'biz_3',
      gymId: 3,
      memberNumber: 'EF-3004',
      fullName: 'Emma Watson',
      phone: '+15551230004',
      email: 'emma.watson@example.com',
      address: 'Pasadena, CA',
      barcode: 'EF-3004',
      status: 'expired',
      emergencyContact: '+15559870004',
      notes: '3-Month trial package expired',
      createdAt: new Date(Date.now() - 110 * 24 * 3600 * 1000),
    },
  ],
  memberships: [
    {
      id: 1,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 1,
      package: '3_months',
      startDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 60 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 2,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 2,
      package: 'monthly',
      startDate: formatDateStr(new Date(Date.now() - 15 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 15 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 3,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 3,
      package: 'annual',
      startDate: formatDateStr(new Date(Date.now() - 10 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 355 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 4,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 4,
      package: 'monthly',
      startDate: formatDateStr(new Date(Date.now() - 60 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      status: 'expired',
      createdAt: new Date(),
    },
    // Power Fitness (biz_2)
    {
      id: 5,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 5,
      package: '6_months',
      startDate: formatDateStr(new Date(Date.now() - 60 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 120 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 6,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 6,
      package: 'annual',
      startDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 335 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 7,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 7,
      package: 'monthly',
      startDate: formatDateStr(new Date(Date.now() - 10 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 20 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 8,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 8,
      package: '3_months',
      startDate: formatDateStr(new Date(Date.now() - 110 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() - 20 * 24 * 3600 * 1000)),
      status: 'expired',
      createdAt: new Date(),
    },
    // Elite Fitness (biz_3)
    {
      id: 9,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 9,
      package: 'annual',
      startDate: formatDateStr(new Date(Date.now() - 60 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 305 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 10,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 10,
      package: '6_months',
      startDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 150 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 11,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 11,
      package: 'monthly',
      startDate: formatDateStr(new Date(Date.now() - 5 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() + 25 * 24 * 3600 * 1000)),
      status: 'active',
      createdAt: new Date(),
    },
    {
      id: 12,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 12,
      package: '3_months',
      startDate: formatDateStr(new Date(Date.now() - 100 * 24 * 3600 * 1000)),
      expiryDate: formatDateStr(new Date(Date.now() - 10 * 24 * 3600 * 1000)),
      status: 'expired',
      createdAt: new Date(),
    },
  ],
  payments: [
    {
      id: 1,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 1,
      memberNumber: 'TF-1001',
      amount: 12000,
      paymentDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      package: '3_months',
      paymentMethod: 'cash',
      newExpiryDate: formatDateStr(new Date(Date.now() + 60 * 24 * 3600 * 1000)),
      createdBy: 'admin',
      notes: 'Initial registration + 3 months membership',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      id: 2,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 2,
      memberNumber: 'TF-1002',
      amount: 4500,
      paymentDate: formatDateStr(new Date(Date.now() - 15 * 24 * 3600 * 1000)),
      package: 'monthly',
      paymentMethod: 'card',
      newExpiryDate: formatDateStr(new Date(Date.now() + 15 * 24 * 3600 * 1000)),
      createdBy: 'admin',
      notes: 'Monthly renewal',
      createdAt: new Date(Date.now() - 15 * 24 * 3600 * 1000),
    },
    {
      id: 3,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 3,
      memberNumber: 'TF-1003',
      amount: 38000,
      paymentDate: formatDateStr(new Date(Date.now() - 10 * 24 * 3600 * 1000)),
      package: 'annual',
      paymentMethod: 'bank_transfer',
      newExpiryDate: formatDateStr(new Date(Date.now() + 355 * 24 * 3600 * 1000)),
      createdBy: 'admin',
      notes: 'VIP Annual Package',
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    },
    // Power Fitness payments (biz_2)
    {
      id: 4,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 5,
      memberNumber: 'PF-2001',
      amount: 25000,
      paymentDate: formatDateStr(new Date(Date.now() - 60 * 24 * 3600 * 1000)),
      package: '6_months',
      paymentMethod: 'card',
      newExpiryDate: formatDateStr(new Date(Date.now() + 120 * 24 * 3600 * 1000)),
      createdBy: 'kasun',
      notes: 'Powerlifting 6-Month membership',
      createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
    },
    {
      id: 5,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 6,
      memberNumber: 'PF-2002',
      amount: 42000,
      paymentDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      package: 'annual',
      paymentMethod: 'cash',
      newExpiryDate: formatDateStr(new Date(Date.now() + 335 * 24 * 3600 * 1000)),
      createdBy: 'kasun',
      notes: 'Full year power training',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      id: 6,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 7,
      memberNumber: 'PF-2003',
      amount: 5000,
      paymentDate: formatDateStr(new Date(Date.now() - 10 * 24 * 3600 * 1000)),
      package: 'monthly',
      paymentMethod: 'cash',
      newExpiryDate: formatDateStr(new Date(Date.now() + 20 * 24 * 3600 * 1000)),
      createdBy: 'kasun',
      notes: 'Monthly pass',
      createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
    },
    // Elite Fitness payments (biz_3 in USD)
    {
      id: 7,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 9,
      memberNumber: 'EF-3001',
      amount: 550,
      paymentDate: formatDateStr(new Date(Date.now() - 60 * 24 * 3600 * 1000)),
      package: 'annual',
      paymentMethod: 'card',
      newExpiryDate: formatDateStr(new Date(Date.now() + 305 * 24 * 3600 * 1000)),
      createdBy: 'nimal',
      notes: 'Elite Olympic Annual Membership',
      createdAt: new Date(Date.now() - 60 * 24 * 3600 * 1000),
    },
    {
      id: 8,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 10,
      memberNumber: 'EF-3002',
      amount: 320,
      paymentDate: formatDateStr(new Date(Date.now() - 30 * 24 * 3600 * 1000)),
      package: '6_months',
      paymentMethod: 'card',
      newExpiryDate: formatDateStr(new Date(Date.now() + 150 * 24 * 3600 * 1000)),
      createdBy: 'nimal',
      notes: 'Semi-Annual conditioning package',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
    },
    {
      id: 9,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 11,
      memberNumber: 'EF-3003',
      amount: 65,
      paymentDate: formatDateStr(new Date(Date.now() - 5 * 24 * 3600 * 1000)),
      package: 'monthly',
      paymentMethod: 'cash',
      newExpiryDate: formatDateStr(new Date(Date.now() + 25 * 24 * 3600 * 1000)),
      createdBy: 'nimal',
      notes: '1-Month gym access',
      createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    },
  ],
  attendance: [
    {
      id: 1,
      businessId: 'biz_1',
      gymId: 1,
      memberId: 1,
      memberNumber: 'TF-1001',
      memberName: 'Kasun Perera',
      checkInTime: new Date(Date.now() - 2 * 3600 * 1000),
      date: formatDateStr(new Date()),
      status: 'valid',
    },
    {
      id: 2,
      businessId: 'biz_2',
      gymId: 2,
      memberId: 5,
      memberNumber: 'PF-2001',
      memberName: 'Ruwan Bandara',
      checkInTime: new Date(Date.now() - 3 * 3600 * 1000),
      date: formatDateStr(new Date()),
      status: 'valid',
    },
    {
      id: 3,
      businessId: 'biz_3',
      gymId: 3,
      memberId: 9,
      memberNumber: 'EF-3001',
      memberName: 'Michael Hayes',
      checkInTime: new Date(Date.now() - 1 * 3600 * 1000),
      date: formatDateStr(new Date()),
      status: 'valid',
    },
  ],
  products: [
    {
      id: 1,
      businessId: 'biz_1',
      gymId: 1,
      name: 'Gold Standard Whey Protein 2lb',
      barcode: 'SUP-001',
      category: 'Supplements',
      costPrice: 16000,
      sellingPrice: 19500,
      stockQuantity: 14,
      minStockAlert: 5,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      businessId: 'biz_1',
      gymId: 1,
      name: 'Creatine Monohydrate 300g',
      barcode: 'SUP-002',
      category: 'Supplements',
      costPrice: 6500,
      sellingPrice: 8500,
      stockQuantity: 8,
      minStockAlert: 3,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 3,
      businessId: 'biz_1',
      gymId: 1,
      name: 'Titan Pro Lifting Straps',
      barcode: 'ACC-001',
      category: 'Accessories',
      costPrice: 1800,
      sellingPrice: 2800,
      stockQuantity: 20,
      minStockAlert: 5,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 4,
      businessId: 'biz_1',
      gymId: 1,
      name: 'Titan Shaker Bottle 700ml',
      barcode: 'ACC-002',
      category: 'Accessories',
      costPrice: 1200,
      sellingPrice: 1800,
      stockQuantity: 15,
      minStockAlert: 4,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 5,
      businessId: 'biz_1',
      gymId: 1,
      name: 'Electrolyte Energy Drink 500ml',
      barcode: 'BEV-001',
      category: 'Drinks',
      costPrice: 350,
      sellingPrice: 550,
      stockQuantity: 40,
      minStockAlert: 10,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 6,
      businessId: 'biz_1',
      gymId: 1,
      name: 'Protein Bar - Double Choc 60g',
      barcode: 'SNK-001',
      category: 'Snacks',
      costPrice: 650,
      sellingPrice: 950,
      stockQuantity: 3,
      minStockAlert: 5,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Power Fitness Products (biz_2)
    {
      id: 21,
      businessId: 'biz_2',
      gymId: 2,
      name: 'Power Mass Gainer 3kg',
      barcode: 'PF-SUP-01',
      category: 'Supplements',
      costPrice: 13500,
      sellingPrice: 16500,
      stockQuantity: 12,
      minStockAlert: 4,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 22,
      businessId: 'biz_2',
      gymId: 2,
      name: 'Power Pre-Workout Extreme 300g',
      barcode: 'PF-SUP-02',
      category: 'Supplements',
      costPrice: 5800,
      sellingPrice: 7200,
      stockQuantity: 15,
      minStockAlert: 5,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 23,
      businessId: 'biz_2',
      gymId: 2,
      name: 'Power Heavy Duty 10mm Lifting Belt',
      barcode: 'PF-ACC-01',
      category: 'Accessories',
      costPrice: 4800,
      sellingPrice: 6800,
      stockQuantity: 8,
      minStockAlert: 3,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 24,
      businessId: 'biz_2',
      gymId: 2,
      name: 'Power Grip Liquid Chalk 250ml',
      barcode: 'PF-ACC-02',
      category: 'Accessories',
      costPrice: 1500,
      sellingPrice: 2200,
      stockQuantity: 25,
      minStockAlert: 6,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 25,
      businessId: 'biz_2',
      gymId: 2,
      name: 'Power BCAA Aminos 400g',
      barcode: 'PF-SUP-03',
      category: 'Supplements',
      costPrice: 7000,
      sellingPrice: 8900,
      stockQuantity: 10,
      minStockAlert: 4,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    // Elite Fitness Products (biz_3 in USD)
    {
      id: 31,
      businessId: 'biz_3',
      gymId: 3,
      name: 'Elite Hydrolyzed Whey 2lb',
      barcode: 'EF-SUP-01',
      category: 'Supplements',
      costPrice: 38,
      sellingPrice: 55,
      stockQuantity: 20,
      minStockAlert: 5,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 32,
      businessId: 'biz_3',
      gymId: 3,
      name: 'Elite Intra-Workout BCAA & Electrolytes',
      barcode: 'EF-SUP-02',
      category: 'Supplements',
      costPrice: 25,
      sellingPrice: 38,
      stockQuantity: 18,
      minStockAlert: 5,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 33,
      businessId: 'biz_3',
      gymId: 3,
      name: 'Elite High-Density Foam Roller',
      barcode: 'EF-ACC-01',
      category: 'Accessories',
      costPrice: 28,
      sellingPrice: 45,
      stockQuantity: 14,
      minStockAlert: 4,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 34,
      businessId: 'biz_3',
      gymId: 3,
      name: 'Elite Stainless Steel Smart Shaker 24oz',
      barcode: 'EF-ACC-02',
      category: 'Accessories',
      costPrice: 18,
      sellingPrice: 28,
      stockQuantity: 30,
      minStockAlert: 8,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 35,
      businessId: 'biz_3',
      gymId: 3,
      name: 'Elite 7mm Olympic Knee Sleeves',
      barcode: 'EF-ACC-03',
      category: 'Accessories',
      costPrice: 26,
      sellingPrice: 42,
      stockQuantity: 12,
      minStockAlert: 3,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  stockMovements: [],
  sales: [],
  saleItems: [],
  settings: [
    // ZENERGY FITNESS (biz_1)
    { businessId: 'biz_1', gymId: 1, key: 'gym_name', value: 'ZENERGY FITNESS' },
    { businessId: 'biz_1', gymId: 1, key: 'currency', value: 'Rs.' },
    { businessId: 'biz_1', gymId: 1, key: 'phone', value: '+94 77 111 2233' },
    { businessId: 'biz_1', gymId: 1, key: 'email', value: 'contact@zenergyfitness.com' },
    { businessId: 'biz_1', gymId: 1, key: 'address', value: 'No. 12 Beach Road, Colombo 03, Sri Lanka' },
    { businessId: 'biz_1', gymId: 1, key: 'description', value: 'High-Energy Functional Fitness, Strength & Conditioning' },
    { businessId: 'biz_1', gymId: 1, key: 'receipt_footer', value: 'Thank you for training with ZENERGY FITNESS! Goods sold are exchangeable within 7 days.' },
    // POWER FITNESS (biz_2)
    { businessId: 'biz_2', gymId: 2, key: 'gym_name', value: 'POWER FITNESS' },
    { businessId: 'biz_2', gymId: 2, key: 'currency', value: 'Rs.' },
    { businessId: 'biz_2', gymId: 2, key: 'phone', value: '+94 71 444 5566' },
    { businessId: 'biz_2', gymId: 2, key: 'email', value: 'contact@powerfitness.lk' },
    { businessId: 'biz_2', gymId: 2, key: 'address', value: '88 Kandy Road, Kiribathgoda, Sri Lanka' },
    { businessId: 'biz_2', gymId: 2, key: 'description', value: 'Heavy Duty Strength, Muscle & Performance Center' },
    { businessId: 'biz_2', gymId: 2, key: 'receipt_footer', value: 'Power Fitness Kandy. Push harder every single day.' },
    // ELITE FITNESS (biz_3)
    { businessId: 'biz_3', gymId: 3, key: 'gym_name', value: 'ELITE FITNESS' },
    { businessId: 'biz_3', gymId: 3, key: 'currency', value: '$' },
    { businessId: 'biz_3', gymId: 3, key: 'phone', value: '+1 (555) 789-0123' },
    { businessId: 'biz_3', gymId: 3, key: 'email', value: 'info@elitefitness.com' },
    { businessId: 'biz_3', gymId: 3, key: 'address', value: '500 Olympic Way, Los Angeles, CA 90015' },
    { businessId: 'biz_3', gymId: 3, key: 'description', value: 'Elite Athletic Conditioning, Recovery & Olympic Weightlifting' },
    { businessId: 'biz_3', gymId: 3, key: 'receipt_footer', value: 'Excellence in athletic development. Powered by WOW POS.' },
  ],
  smsLogs: [],
};

// Global in-memory singleton
declare global {
  var _gymMemoryStore: MemoryStore | undefined;
  var _mongoInitialized: boolean | undefined;
}

if (!global._gymMemoryStore) {
  global._gymMemoryStore = JSON.parse(JSON.stringify(initialStore));
}
const mem = global._gymMemoryStore!;

/**
 * Seed initial data to MongoDB Atlas when connected for the first time
 */
export async function ensureMongoSeeded() {
  if (global._mongoInitialized) return;
  const db = await getMongoDb();
  if (!db) return;

  try {
    await setupMongoIndexes(db);

    const businessCount = await db.collection('businesses').countDocuments();
    if (businessCount === 0) {
      console.log('Seeding initial business data to MongoDB Atlas...');
      await db.collection('businesses').insertMany(initialStore.businesses);
      await db.collection('users').insertMany(initialStore.users);
      await db.collection('members').insertMany(initialStore.members);
      await db.collection('memberships').insertMany(initialStore.memberships);
      await db.collection('payments').insertMany(initialStore.payments);
      await db.collection('products').insertMany(initialStore.products);
      await db.collection('settings').insertMany(initialStore.settings);
      console.log('Initial seed complete.');
    }
    global._mongoInitialized = true;
  } catch (err) {
    console.error('Error ensuring MongoDB seed:', err);
  }
}

// Helper to extract or resolve businessId
export function resolveBusinessId(gymIdOrBusinessId?: string | number | null): string {
  if (!gymIdOrBusinessId) return 'biz_1';
  if (typeof gymIdOrBusinessId === 'string') {
    if (gymIdOrBusinessId.startsWith('biz_')) return gymIdOrBusinessId;
    const num = Number(gymIdOrBusinessId);
    if (!isNaN(num)) return `biz_${num}`;
    return gymIdOrBusinessId;
  }
  return `biz_${gymIdOrBusinessId}`;
}

export function resolveGymId(businessIdOrGymId?: string | number | null): number {
  if (!businessIdOrGymId) return 1;
  if (typeof businessIdOrGymId === 'number') return businessIdOrGymId;
  const match = businessIdOrGymId.match(/\d+/);
  return match ? Number(match[0]) : 1;
}

export class GymService {
  // =========================================================================
  // 1. MEMBER MANAGEMENT
  // =========================================================================

  static async getMembers(
    gymIdOrBusinessId: number | string,
    options?: { search?: string; filter?: string }
  ): Promise<Member[]> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const gymId = resolveGymId(gymIdOrBusinessId);

    const todayStr = formatDateStr(new Date());
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    const tmrwStr = formatDateStr(tmrw);

    let rawMembers: any[] = [];
    let latestMemberships: any[] = [];

    if (db) {
      const filterQuery: any = { businessId };
      rawMembers = await db.collection('members').find(filterQuery).sort({ id: -1 }).toArray();
      latestMemberships = await db.collection('memberships').find(filterQuery).sort({ id: -1 }).toArray();
    } else {
      rawMembers = mem.members.filter((m) => m.businessId === businessId || m.gymId === gymId);
      latestMemberships = mem.memberships.filter((m) => m.businessId === businessId || m.gymId === gymId);
    }

    const membershipMap = new Map<number, any>();
    for (const m of latestMemberships) {
      if (!membershipMap.has(m.memberId)) {
        membershipMap.set(m.memberId, m);
      }
    }

    const processed: Member[] = rawMembers.map((m) => {
      const latestM = membershipMap.get(m.id) || null;
      let computedStatus: Member['computedStatus'] = 'inactive';
      let daysRemaining = 0;
      let statusLabel = 'Inactive';
      let badgeColor: Member['badgeColor'] = 'gray';

      if (m.archivedAt) {
        computedStatus = 'inactive';
        statusLabel = 'Archived';
        badgeColor = 'gray';
      } else if (latestM && latestM.expiryDate) {
        const expDate = parseDateStr(latestM.expiryDate);
        const todayDate = parseDateStr(todayStr);
        const diffTime = expDate.getTime() - todayDate.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (latestM.expiryDate === todayStr) {
          computedStatus = 'due_today';
          statusLabel = 'Expires Today';
          badgeColor = 'orange';
        } else if (latestM.expiryDate === tmrwStr) {
          computedStatus = 'due_tomorrow';
          statusLabel = 'Expires Tomorrow';
          badgeColor = 'orange';
        } else if (daysRemaining > 0 && daysRemaining <= 3) {
          computedStatus = 'expiring_soon';
          statusLabel = `${daysRemaining}d Left`;
          badgeColor = 'orange';
        } else if (daysRemaining > 0) {
          computedStatus = 'active';
          statusLabel = 'Active';
          badgeColor = 'green';
        } else {
          computedStatus = 'expired';
          statusLabel = 'Expired';
          badgeColor = 'red';
        }
      }

      return {
        id: m.id,
        gymId: m.gymId || gymId,
        memberNumber: m.memberNumber,
        fullName: m.fullName,
        phone: m.phone,
        email: m.email || null,
        address: m.address || null,
        barcode: m.barcode,
        status: m.status || 'active',
        emergencyContact: m.emergencyContact || null,
        notes: m.notes || null,
        archivedAt: m.archivedAt || null,
        createdAt: m.createdAt ? new Date(m.createdAt).toISOString() : undefined,
        updatedAt: m.updatedAt ? new Date(m.updatedAt).toISOString() : undefined,
        latestMembership: latestM,
        computedStatus,
        daysRemaining,
        statusLabel,
        badgeColor,
      };
    });

    let filtered = processed;
    if (options?.filter && options.filter !== 'all') {
      if (options.filter === 'active') {
        filtered = filtered.filter((m) => m.computedStatus === 'active');
      } else if (options.filter === 'expired') {
        filtered = filtered.filter((m) => m.computedStatus === 'expired');
      } else if (options.filter === 'due_today') {
        filtered = filtered.filter((m) => m.computedStatus === 'due_today');
      } else if (options.filter === 'due_tomorrow') {
        filtered = filtered.filter((m) => m.computedStatus === 'due_tomorrow');
      } else if (options.filter === 'expiring_soon') {
        filtered = filtered.filter((m) => m.computedStatus === 'expiring_soon' || m.computedStatus === 'due_today' || m.computedStatus === 'due_tomorrow');
      } else if (options.filter === 'inactive') {
        filtered = filtered.filter((m) => m.computedStatus === 'inactive');
      }
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.fullName.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          m.phone.toLowerCase().includes(q) ||
          m.barcode.toLowerCase().includes(q)
      );
    }

    return filtered;
  }

  static async getMemberById(id: number, gymIdOrBusinessId: number | string): Promise<Member | null> {
    const list = await this.getMembers(gymIdOrBusinessId);
    return list.find((m) => m.id === id) || null;
  }

  static async createMember(data: {
    gymId?: number;
    businessId?: string;
    memberNumber?: string;
    fullName: string;
    phone: string;
    email?: string;
    address?: string;
    emergencyContact?: string;
    notes?: string;
    package: string;
    startDate: string;
    paymentAmount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer';
    createdBy?: string;
  }) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(data.businessId || data.gymId);
    const gymId = resolveGymId(data.businessId || data.gymId);

    // Generate Member Number
    const count = db
      ? await db.collection('members').countDocuments({ businessId })
      : mem.members.filter((m) => m.businessId === businessId).length;

    const nextNumber = 1001 + count;
    const memberNumber = data.memberNumber?.trim() || `M-${nextNumber}`;
    const barcode = memberNumber;

    // Calculate Expiry Date based on Package
    const start = parseDateStr(data.startDate);
    const exp = new Date(start);
    if (data.package === 'monthly') {
      exp.setMonth(exp.getMonth() + 1);
    } else if (data.package === '3_months') {
      exp.setMonth(exp.getMonth() + 3);
    } else if (data.package === '6_months') {
      exp.setMonth(exp.getMonth() + 6);
    } else if (data.package === 'annual') {
      exp.setFullYear(exp.getFullYear() + 1);
    } else {
      exp.setMonth(exp.getMonth() + 1);
    }
    const expiryDate = formatDateStr(exp);

    const memberId = Date.now();
    const newMemberDoc = {
      id: memberId,
      businessId,
      gymId,
      memberNumber,
      fullName: data.fullName.trim(),
      phone: data.phone.trim(),
      email: data.email ? data.email.trim().toLowerCase() : null,
      address: data.address ? data.address.trim() : null,
      emergencyContact: data.emergencyContact ? data.emergencyContact.trim() : null,
      notes: data.notes ? data.notes.trim() : null,
      barcode,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newMembershipDoc = {
      id: Date.now() + 1,
      businessId,
      gymId,
      memberId,
      package: data.package,
      startDate: data.startDate,
      expiryDate,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newPaymentDoc = {
      id: Date.now() + 2,
      businessId,
      gymId,
      memberId,
      memberNumber,
      amount: data.paymentAmount,
      paymentDate: data.startDate,
      package: data.package,
      paymentMethod: data.paymentMethod,
      newExpiryDate: expiryDate,
      createdBy: data.createdBy || 'admin',
      notes: 'Initial Membership Registration',
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('members').insertOne(newMemberDoc);
      await db.collection('memberships').insertOne(newMembershipDoc);
      if (data.paymentAmount > 0) {
        await db.collection('payments').insertOne(newPaymentDoc);
      }
    } else {
      mem.members.unshift(newMemberDoc);
      mem.memberships.unshift(newMembershipDoc);
      if (data.paymentAmount > 0) {
        mem.payments.unshift(newPaymentDoc);
      }
    }

    return newMemberDoc;
  }

  static async updateMember(
    id: number,
    data: {
      fullName?: string;
      phone?: string;
      email?: string;
      address?: string;
      emergencyContact?: string;
      notes?: string;
      barcode?: string;
      status?: string;
    },
    gymIdOrBusinessId: number | string
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    const updates: any = { updatedAt: new Date() };
    if (data.fullName !== undefined) updates.fullName = data.fullName.trim();
    if (data.phone !== undefined) updates.phone = data.phone.trim();
    if (data.email !== undefined) updates.email = data.email ? data.email.trim().toLowerCase() : null;
    if (data.address !== undefined) updates.address = data.address ? data.address.trim() : null;
    if (data.emergencyContact !== undefined) updates.emergencyContact = data.emergencyContact ? data.emergencyContact.trim() : null;
    if (data.notes !== undefined) updates.notes = data.notes ? data.notes.trim() : null;
    if (data.barcode !== undefined) updates.barcode = data.barcode.trim();
    if (data.status !== undefined) updates.status = data.status;

    if (db) {
      await db.collection('members').updateOne({ id, businessId }, { $set: updates });
    } else {
      const idx = mem.members.findIndex((m) => m.id === id && (m.businessId === businessId || !m.businessId));
      if (idx !== -1) {
        mem.members[idx] = { ...mem.members[idx], ...updates };
      }
    }

    return this.getMemberById(id, gymIdOrBusinessId);
  }

  static async archiveMember(arg1: any, arg2?: any) {
    const id = typeof arg1 === 'number' && typeof arg2 === 'string' ? arg1 : (typeof arg2 === 'number' ? arg2 : Number(arg1));
    const businessId = typeof arg1 === 'string' ? arg1 : arg2;
    return this.updateMember(id, { status: 'inactive' }, businessId);
  }

  static async reactivateMember(arg1: any, arg2?: any) {
    const id = typeof arg1 === 'number' && typeof arg2 === 'string' ? arg1 : (typeof arg2 === 'number' ? arg2 : Number(arg1));
    const businessId = typeof arg1 === 'string' ? arg1 : arg2;
    return this.updateMember(id, { status: 'active' }, businessId);
  }

  static async deleteMember(arg1: any, arg2?: any) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const id = typeof arg1 === 'number' && typeof arg2 === 'string' ? arg1 : (typeof arg2 === 'number' ? arg2 : Number(arg1));
    const businessId = resolveBusinessId(typeof arg1 === 'string' ? arg1 : arg2);

    if (db) {
      await db.collection('members').deleteOne({ id, businessId });
      await db.collection('memberships').deleteMany({ memberId: id, businessId });
      await db.collection('payments').deleteMany({ memberId: id, businessId });
      await db.collection('attendance').deleteMany({ memberId: id, businessId });
    } else {
      mem.members = mem.members.filter((m) => !(m.id === id && m.businessId === businessId));
      mem.memberships = mem.memberships.filter((m) => !(m.memberId === id && m.businessId === businessId));
      mem.payments = mem.payments.filter((m) => !(m.memberId === id && m.businessId === businessId));
      mem.attendance = mem.attendance.filter((m) => !(m.memberId === id && m.businessId === businessId));
    }
    return { success: true };
  }

  // =========================================================================
  // 2. MEMBERSHIP RENEWAL
  // =========================================================================

  static async renewMembership(
    arg1: any,
    arg2?: any,
    arg3?: any
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();

    let data: {
      memberId: number;
      gymId?: number;
      businessId?: string;
      package: string;
      startDate: string;
      paymentAmount: number;
      paymentMethod: 'cash' | 'card' | 'bank_transfer';
      createdBy?: string;
      notes?: string;
    };

    if (typeof arg1 === 'number' && typeof arg2 === 'object') {
      data = {
        memberId: arg1,
        ...arg2,
        businessId: arg3 || arg2.businessId,
        gymId: arg2.gymId,
      };
    } else if (typeof arg1 === 'object') {
      data = arg1;
    } else {
      data = { ...arg2, gymId: arg1, businessId: resolveBusinessId(arg1) };
    }

    const businessId = resolveBusinessId(data.businessId || data.gymId);
    const gymId = resolveGymId(data.businessId || data.gymId);

    const member = await this.getMemberById(data.memberId, businessId);
    if (!member) {
      throw new Error(`Member #${data.memberId} not found`);
    }

    const start = parseDateStr(data.startDate);
    const exp = new Date(start);
    if (data.package === 'monthly') {
      exp.setMonth(exp.getMonth() + 1);
    } else if (data.package === '3_months') {
      exp.setMonth(exp.getMonth() + 3);
    } else if (data.package === '6_months') {
      exp.setMonth(exp.getMonth() + 6);
    } else if (data.package === 'annual') {
      exp.setFullYear(exp.getFullYear() + 1);
    } else {
      exp.setMonth(exp.getMonth() + 1);
    }
    const expiryDate = formatDateStr(exp);

    const membershipDoc = {
      id: Date.now(),
      businessId,
      gymId,
      memberId: data.memberId,
      package: data.package,
      startDate: data.startDate,
      expiryDate,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const paymentDoc = {
      id: Date.now() + 1,
      businessId,
      gymId,
      memberId: data.memberId,
      memberNumber: member.memberNumber,
      amount: data.paymentAmount,
      paymentDate: data.startDate,
      package: data.package,
      paymentMethod: data.paymentMethod,
      previousExpiryDate: member.latestMembership?.expiryDate || null,
      newExpiryDate: expiryDate,
      createdBy: data.createdBy || 'admin',
      notes: data.notes || 'Membership Renewal',
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('memberships').insertOne(membershipDoc);
      if (data.paymentAmount > 0) {
        await db.collection('payments').insertOne(paymentDoc);
      }
      await db.collection('members').updateOne({ id: data.memberId, businessId }, { $set: { status: 'active', updatedAt: new Date() } });
    } else {
      mem.memberships.unshift(membershipDoc);
      if (data.paymentAmount > 0) {
        mem.payments.unshift(paymentDoc);
      }
      const mIdx = mem.members.findIndex((m) => m.id === data.memberId);
      if (mIdx !== -1) {
        mem.members[mIdx].status = 'active';
      }
    }

    return { membership: membershipDoc, payment: paymentDoc };
  }

  // =========================================================================
  // 3. ATTENDANCE SCANNER
  // =========================================================================

  static async recordAttendance(
    memberIdOrBarcode: string | number,
    gymIdOrBusinessId: number | string,
    notes?: string
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const gymId = resolveGymId(gymIdOrBusinessId);

    const membersList = await this.getMembers(businessId);
    const member = membersList.find(
      (m) =>
        m.id === Number(memberIdOrBarcode) ||
        m.barcode.toLowerCase() === String(memberIdOrBarcode).toLowerCase().trim() ||
        m.memberNumber.toLowerCase() === String(memberIdOrBarcode).toLowerCase().trim()
    );

    if (!member) {
      throw new Error(`No member found matching "${memberIdOrBarcode}"`);
    }

    const todayStr = formatDateStr(new Date());
    const nowTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const attendanceDoc = {
      id: Date.now(),
      businessId,
      gymId,
      memberId: member.id,
      memberNumber: member.memberNumber,
      memberName: member.fullName,
      memberPhone: member.phone,
      attendanceDate: todayStr,
      attendanceTime: nowTimeStr,
      status: member.computedStatus === 'expired' ? 'expired_entry' : 'present',
      notes: notes || null,
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('attendance').insertOne(attendanceDoc);
    } else {
      mem.attendance.unshift(attendanceDoc);
    }

    return {
      attendance: attendanceDoc,
      member,
      isExpired: member.computedStatus === 'expired',
      daysRemaining: member.daysRemaining,
    };
  }

  static async getTodayAttendance(gymIdOrBusinessId: number | string) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const todayStr = formatDateStr(new Date());

    if (db) {
      return db.collection('attendance').find({ businessId, attendanceDate: todayStr }).sort({ id: -1 }).toArray();
    }
    return mem.attendance.filter((a) => (a.businessId === businessId || a.gymId === resolveGymId(gymIdOrBusinessId)) && a.attendanceDate === todayStr);
  }

  static async getAttendanceHistory(gymIdOrBusinessId: number | string, limit = 100) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    if (db) {
      return db.collection('attendance').find({ businessId }).sort({ id: -1 }).limit(limit).toArray();
    }
    return mem.attendance.filter((a) => a.businessId === businessId || a.gymId === resolveGymId(gymIdOrBusinessId)).slice(0, limit);
  }

  // =========================================================================
  // 4. PAYMENTS & TRANSACTIONS
  // =========================================================================

  static async getPayments(gymIdOrBusinessId: number | string, limit = 100) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    if (db) {
      return db.collection('payments').find({ businessId }).sort({ id: -1 }).limit(limit).toArray();
    }
    return mem.payments.filter((p) => p.businessId === businessId || p.gymId === resolveGymId(gymIdOrBusinessId)).slice(0, limit);
  }

  // =========================================================================
  // 5. PRODUCTS & INVENTORY (POS)
  // =========================================================================

  static async getProducts(
    gymIdOrBusinessId: number | string,
    options?: { category?: string; search?: string; activeOnly?: boolean; lowStock?: boolean; lowStockOnly?: boolean }
  ): Promise<Product[]> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    let list: any[] = [];
    if (db) {
      const q: any = { businessId };
      if (options?.activeOnly) q.status = 'active';
      if (options?.category && options.category !== 'all') q.category = options.category;
      list = await db.collection('products').find(q).sort({ id: -1 }).toArray();
    } else {
      list = mem.products.filter((p) => p.businessId === businessId || p.gymId === resolveGymId(gymIdOrBusinessId));
      if (options?.activeOnly) list = list.filter((p) => p.status === 'active');
      if (options?.category && options.category !== 'all') list = list.filter((p) => p.category === options.category);
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)));
    }

    if (options?.lowStock || options?.lowStockOnly) {
      list = list.filter((p) => (p.stockQuantity ?? 0) <= (p.minStockAlert ?? 5));
    }

    return list.map((p) => ({
      id: p.id,
      gymId: p.gymId || resolveGymId(gymIdOrBusinessId),
      name: p.name,
      barcode: p.barcode || null,
      category: p.category || 'General',
      costPrice: p.costPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      stockQuantity: p.stockQuantity ?? 0,
      minStockAlert: p.minStockAlert ?? 5,
      status: p.status || 'active',
      image: p.image || null,
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
    }));
  }

  static async getProductById(id: number, gymIdOrBusinessId: number | string): Promise<Product | null> {
    const list = await this.getProducts(gymIdOrBusinessId);
    return list.find((p) => p.id === id) || null;
  }

  static async createProduct(data: {
    gymId?: number;
    businessId?: string;
    name: string;
    barcode?: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockAlert: number;
    image?: string;
  }): Promise<Product> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(data.businessId || data.gymId);
    const gymId = resolveGymId(data.businessId || data.gymId);

    const newProd: Product = {
      id: Date.now(),
      gymId,
      name: data.name.trim(),
      barcode: data.barcode ? data.barcode.trim() : `PRD-${Date.now().toString().slice(-6)}`,
      category: data.category || 'General',
      costPrice: Math.round(Number(data.costPrice) || 0),
      sellingPrice: Math.round(Number(data.sellingPrice) || 0),
      stockQuantity: Math.max(0, Math.round(Number(data.stockQuantity) || 0)),
      minStockAlert: Math.max(0, Math.round(Number(data.minStockAlert) || 5)),
      status: 'active',
      image: data.image || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection('products').insertOne({ ...newProd, businessId });
    } else {
      mem.products.unshift({ ...newProd, businessId });
    }

    return newProd;
  }

  static async updateProduct(
    id: number,
    data: {
      name?: string;
      barcode?: string;
      category?: string;
      costPrice?: number;
      sellingPrice?: number;
      stockQuantity?: number;
      minStockAlert?: number;
      status?: 'active' | 'inactive';
      image?: string;
    },
    gymIdOrBusinessId: number | string
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    const updates: any = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.barcode !== undefined) updates.barcode = data.barcode ? data.barcode.trim() : null;
    if (data.category !== undefined) updates.category = data.category.trim();
    if (data.costPrice !== undefined) updates.costPrice = Math.round(Number(data.costPrice));
    if (data.sellingPrice !== undefined) updates.sellingPrice = Math.round(Number(data.sellingPrice));
    if (data.stockQuantity !== undefined) updates.stockQuantity = Math.max(0, Math.round(Number(data.stockQuantity)));
    if (data.minStockAlert !== undefined) updates.minStockAlert = Math.max(0, Math.round(Number(data.minStockAlert)));
    if (data.status !== undefined) updates.status = data.status;
    if (data.image !== undefined) updates.image = data.image;

    if (db) {
      await db.collection('products').updateOne({ id, businessId }, { $set: updates });
    } else {
      const idx = mem.products.findIndex((p) => p.id === id && (p.businessId === businessId || !p.businessId));
      if (idx !== -1) {
        mem.products[idx] = { ...mem.products[idx], ...updates };
      }
    }

    return this.getProductById(id, gymIdOrBusinessId);
  }

  static async deleteProduct(arg1: any, arg2?: any) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const id = typeof arg1 === 'number' ? arg1 : Number(arg2);
    const businessId = resolveBusinessId(typeof arg1 === 'string' ? arg1 : arg2);

    if (db) {
      await db.collection('products').updateOne({ id, businessId }, { $set: { status: 'inactive', updatedAt: new Date() } });
    } else {
      const idx = mem.products.findIndex((p) => p.id === id && (p.businessId === businessId || !p.businessId));
      if (idx !== -1) {
        mem.products[idx].status = 'inactive';
      }
    }
    return { success: true };
  }

  static async adjustProductStock(
    id: number,
    arg2: any,
    arg3?: any,
    arg4?: any,
    arg5?: any
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();

    let businessId: string;
    let quantityChange: number;
    let changeType: string;
    let notes: string | null = null;
    let createdBy: string = 'admin';

    if (typeof arg2 === 'object' && arg2 !== null) {
      businessId = resolveBusinessId(arg3 || arg2.businessId || arg2.gymId);
      quantityChange = Number(arg2.quantityChange) || 0;
      changeType = arg2.changeType || (quantityChange >= 0 ? 'restock' : 'adjustment');
      notes = arg2.notes || null;
      createdBy = arg2.createdBy || 'admin';
    } else {
      businessId = resolveBusinessId(arg2);
      quantityChange = Number(arg3) || 0;
      changeType = quantityChange >= 0 ? 'restock' : 'adjustment';
      notes = arg4 || null;
      createdBy = arg5 || 'admin';
    }

    const product = await this.getProductById(id, businessId);
    if (!product) throw new Error(`Product #${id} not found`);

    const newStock = Math.max(0, product.stockQuantity + quantityChange);
    const movement = {
      id: Date.now(),
      businessId,
      gymId: resolveGymId(businessId),
      productId: id,
      changeType: changeType as any,
      quantityChange,
      previousStock: product.stockQuantity,
      newStock,
      notes,
      createdBy,
      createdAt: new Date().toISOString(),
    };

    if (db) {
      await db.collection('products').updateOne({ id, businessId }, { $set: { stockQuantity: newStock, updatedAt: new Date() } });
      await db.collection('productStockMovements').insertOne(movement);
    } else {
      const idx = mem.products.findIndex((p) => p.id === id);
      if (idx !== -1) mem.products[idx].stockQuantity = newStock;
      mem.stockMovements.unshift(movement);
    }

    return { product: { ...product, stockQuantity: newStock }, movement };
  }

  // =========================================================================
  // 6. POS SALES & CHECKOUT
  // =========================================================================

  static async createSale(
    arg1: any,
    arg2?: any
  ): Promise<Sale> {
    await ensureMongoSeeded();
    const db = await getMongoDb();

    let data: {
      gymId?: number;
      businessId?: string;
      memberId?: number | null;
      customerName?: string;
      customerPhone?: string;
      items: {
        productId: number;
        productName: string;
        quantity: number;
        unitCostPrice: number;
        unitSellingPrice: number;
      }[];
      discount?: number;
      paymentMethod: 'cash' | 'card' | 'bank_transfer';
      cashierName?: string;
      notes?: string;
    };

    if (typeof arg1 === 'string' || typeof arg1 === 'number') {
      data = {
        ...arg2,
        businessId: resolveBusinessId(arg1),
        gymId: resolveGymId(arg1),
      };
    } else {
      data = arg1;
    }

    const businessId = resolveBusinessId(data.businessId || data.gymId);
    const gymId = resolveGymId(data.businessId || data.gymId);

    if (!data.items || data.items.length === 0) {
      throw new Error('Sale must include at least one item');
    }

    // Check available stock first
    for (const item of data.items) {
      const prod = await this.getProductById(item.productId, businessId);
      if (!prod) {
        throw new Error(`Product "${item.productName}" (#${item.productId}) not found`);
      }
      if (prod.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for "${prod.name}". Available: ${prod.stockQuantity}, Requested: ${item.quantity}`);
      }
    }

    // Calculate totals
    let subtotal = 0;
    const saleItemsDoc: any[] = [];
    const saleId = Date.now();

    for (const item of data.items) {
      const itemSubtotal = item.quantity * item.unitSellingPrice;
      subtotal += itemSubtotal;
      saleItemsDoc.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        businessId,
        gymId,
        saleId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitCostPrice: item.unitCostPrice,
        unitSellingPrice: item.unitSellingPrice,
        subtotal: itemSubtotal,
        createdAt: new Date(),
      });
    }

    const discount = Math.max(0, Number(data.discount) || 0);
    const totalAmount = Math.max(0, subtotal - discount);
    const receiptNumber = `REC-${Date.now().toString().slice(-6)}`;

    const saleDoc: any = {
      id: saleId,
      businessId,
      gymId,
      receiptNumber,
      memberId: data.memberId || null,
      customerName: data.customerName || 'Walk-in Customer',
      customerPhone: data.customerPhone || null,
      subtotal,
      discount,
      totalAmount,
      paymentMethod: data.paymentMethod || 'cash',
      paymentStatus: 'paid',
      cashierName: data.cashierName || 'admin',
      notes: data.notes || null,
      items: saleItemsDoc,
      createdAt: new Date(),
    };

    // Save and decrease stock atomically
    if (db) {
      await db.collection('sales').insertOne(saleDoc);
      await db.collection('saleItems').insertMany(saleItemsDoc);
      for (const item of data.items) {
        await db.collection('products').updateOne(
          { id: item.productId, businessId },
          { $inc: { stockQuantity: -item.quantity }, $set: { updatedAt: new Date() } }
        );
      }
    } else {
      mem.sales.unshift(saleDoc);
      mem.saleItems.push(...saleItemsDoc);
      for (const item of data.items) {
        const pIdx = mem.products.findIndex((p) => p.id === item.productId);
        if (pIdx !== -1) {
          mem.products[pIdx].stockQuantity = Math.max(0, mem.products[pIdx].stockQuantity - item.quantity);
        }
      }
    }

    return saleDoc;
  }

  static async getSales(
    gymIdOrBusinessId: number | string,
    options?: { limit?: number; paymentMethod?: string; search?: string; status?: string; startDate?: string; endDate?: string }
  ): Promise<Sale[]> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const limit = options?.limit || 100;

    let list: any[] = [];
    if (db) {
      const q: any = { businessId };
      if (options?.paymentMethod && options.paymentMethod !== 'all') {
        q.paymentMethod = options.paymentMethod;
      }
      if (options?.status && options.status !== 'all') {
        q.$or = [{ status: options.status }, { paymentStatus: options.status }];
      }
      if (options?.startDate || options?.endDate) {
        q.createdAt = {};
        if (options.startDate) q.createdAt.$gte = new Date(options.startDate);
        if (options.endDate) q.createdAt.$lte = new Date(options.endDate);
      }
      list = await db.collection('sales').find(q).sort({ id: -1 }).limit(limit).toArray();
    } else {
      list = mem.sales.filter((s) => s.businessId === businessId || s.gymId === resolveGymId(gymIdOrBusinessId));
      if (options?.paymentMethod && options.paymentMethod !== 'all') {
        list = list.filter((s) => s.paymentMethod === options.paymentMethod);
      }
      if (options?.status && options.status !== 'all') {
        list = list.filter((s) => s.status === options.status || s.paymentStatus === options.status);
      }
      list = list.slice(0, limit);
    }

    if (options?.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      list = list.filter(
        (s) =>
          (s.saleNumber && s.saleNumber.toLowerCase().includes(q)) ||
          (s.receiptNumber && s.receiptNumber.toLowerCase().includes(q)) ||
          (s.customerName && s.customerName.toLowerCase().includes(q))
      );
    }

    return list.map((s) => {
      const finalAmount = Number(s.finalAmount ?? s.totalAmount ?? 0);
      const isRefunded = s.status === 'refunded' || s.paymentStatus === 'refunded';
      const saleNumber = s.saleNumber || s.receiptNumber || `SAL-${s.id}`;
      return {
        id: s.id,
        gymId: s.gymId || resolveGymId(gymIdOrBusinessId),
        saleNumber,
        receiptNumber: saleNumber,
        memberId: s.memberId || null,
        customerName: s.customerName || 'Walk-in Customer',
        customerPhone: s.customerPhone || null,
        subtotal: Number(s.subtotal || finalAmount),
        discount: Number(s.discount || 0),
        finalAmount,
        totalAmount: finalAmount,
        paymentMethod: (s.paymentMethod || 'cash') as 'cash' | 'card' | 'bank_transfer',
        status: (isRefunded ? 'refunded' : (s.status || 'completed')) as 'completed' | 'refunded' | 'cancelled',
        paymentStatus: isRefunded ? 'refunded' : 'paid',
        refundReason: s.refundReason || (s.notes && s.notes.includes('[REFUNDED:') ? s.notes : null),
        createdBy: s.createdBy || s.cashierName || 'admin',
        cashierName: s.createdBy || s.cashierName || 'admin',
        notes: s.notes || null,
        createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
        items: (s.items || []).map((it: any) => ({
          id: it.id || Date.now(),
          saleId: s.id,
          gymId: s.gymId || resolveGymId(gymIdOrBusinessId),
          productId: it.productId || null,
          productName: it.productName || it.name || 'Item',
          quantity: Number(it.quantity || 1),
          unitCostPrice: Number(it.unitCostPrice || 0),
          unitSellingPrice: Number(it.unitSellingPrice || it.sellingPrice || 0),
          subtotal: Number(it.subtotal || ((it.quantity || 1) * (it.unitSellingPrice || 0))),
        })),
      };
    });
  }

  static async refundSale(arg1: any, arg2: any, arg3?: any) {
    await ensureMongoSeeded();
    const db = await getMongoDb();

    let id: number;
    let businessId: string;
    let reason: string | undefined;

    if (typeof arg1 === 'number') {
      id = arg1;
      if (typeof arg2 === 'object' && arg2 !== null) {
        reason = arg2.reason;
        businessId = resolveBusinessId(arg3 || arg2.businessId || arg2.gymId);
      } else {
        businessId = resolveBusinessId(arg2);
        reason = typeof arg3 === 'string' ? arg3 : arg3?.reason;
      }
    } else {
      businessId = resolveBusinessId(arg1);
      id = Number(arg2);
      reason = typeof arg3 === 'string' ? arg3 : arg3?.reason;
    }

    const salesList = await this.getSales(businessId);
    const sale = salesList.find((s) => s.id === id);
    if (!sale) throw new Error(`Sale #${id} not found`);

    // Restore stock for items
    if (sale.items && sale.items.length > 0) {
      for (const it of sale.items) {
        if (it.productId) {
          await this.adjustProductStock(it.productId, businessId, it.quantity, `Refund for ${sale.saleNumber}`);
        }
      }
    }

    if (db) {
      await db.collection('sales').updateOne(
        { id, businessId },
        {
          $set: {
            status: 'refunded',
            paymentStatus: 'refunded',
            refundReason: reason || 'Customer request',
            notes: `${sale.notes || ''} [REFUNDED: ${reason || 'Customer request'}]`,
          },
        }
      );
    } else {
      const idx = mem.sales.findIndex((s) => s.id === id);
      if (idx !== -1) {
        mem.sales[idx].status = 'refunded';
        mem.sales[idx].paymentStatus = 'refunded';
        mem.sales[idx].refundReason = reason || 'Customer request';
      }
    }

    return { success: true };
  }

  // =========================================================================
  // 7. DASHBOARD & ANALYTICS
  // =========================================================================

  static async getDashboardStats(gymIdOrBusinessId: number | string): Promise<DashboardStats> {
    await ensureMongoSeeded();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    const [allMembers, todayAttendance, allPayments, allSales, allProducts] = await Promise.all([
      this.getMembers(businessId),
      this.getTodayAttendance(businessId),
      this.getPayments(businessId, 500),
      this.getSales(businessId, { limit: 100 }),
      this.getProducts(businessId),
    ]);

    const activeMembers = allMembers.filter((m) => m.computedStatus === 'active').length;
    const expiredMembers = allMembers.filter((m) => m.computedStatus === 'expired').length;
    const paymentDueToday = allMembers.filter((m) => m.computedStatus === 'due_today').length;
    const paymentDueTomorrow = allMembers.filter((m) => m.computedStatus === 'due_tomorrow').length;
    const expiringSoonCount = allMembers.filter((m) => m.computedStatus === 'expiring_soon').length;

    const todayStr = formatDateStr(new Date());
    const currentMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

    // Membership Revenue
    const todayMemberRevenue = allPayments
      .filter((p) => p.paymentDate === todayStr)
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const monthlyMemberRevenue = allPayments
      .filter((p) => p.paymentDate && p.paymentDate.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalMemberRevenue = allPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // POS Sales Revenue
    const todaySales = allSales.filter((s) => s.createdAt && s.createdAt.startsWith(todayStr) && s.status !== 'refunded');
    const todaySalesRevenue = todaySales.reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);

    const monthlySales = allSales.filter((s) => s.createdAt && s.createdAt.startsWith(currentMonthPrefix) && s.status !== 'refunded');
    const monthlySalesRevenue = monthlySales.reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);

    const totalSalesRevenue = allSales
      .filter((s) => s.status !== 'refunded')
      .reduce((sum, s) => sum + (Number(s.finalAmount) || 0), 0);

    // Cash and Bank breakdowns
    let cashRevenue = 0;
    let bankTransferRevenue = 0;

    for (const p of allPayments) {
      if (p.paymentMethod === 'cash') cashRevenue += Number(p.amount) || 0;
      else bankTransferRevenue += Number(p.amount) || 0;
    }
    for (const s of allSales) {
      if (s.status !== 'refunded') {
        if (s.paymentMethod === 'cash') cashRevenue += Number(s.finalAmount) || 0;
        else bankTransferRevenue += Number(s.finalAmount) || 0;
      }
    }

    // Daily Chart (last 7 days)
    const today = new Date();
    const dailyChart: Array<{ date: string; cash: number; bank: number; total: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dStr = formatDateStr(d);
      let dayCash = 0;
      let dayBank = 0;

      for (const p of allPayments) {
        if (p.paymentDate === dStr) {
          if (p.paymentMethod === 'cash') dayCash += Number(p.amount) || 0;
          else dayBank += Number(p.amount) || 0;
        }
      }
      for (const s of allSales) {
        if (s.createdAt && s.createdAt.startsWith(dStr) && s.status !== 'refunded') {
          if (s.paymentMethod === 'cash') dayCash += Number(s.finalAmount) || 0;
          else dayBank += Number(s.finalAmount) || 0;
        }
      }
      dailyChart.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        cash: dayCash,
        bank: dayBank,
        total: dayCash + dayBank,
      });
    }

    // Monthly Chart (last 6 months)
    const monthlyChart: Array<{ month: string; cash: number; bank: number; total: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mPrefix = formatDateStr(d).substring(0, 7);
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      let mCash = 0;
      let mBank = 0;

      for (const p of allPayments) {
        if (p.paymentDate && p.paymentDate.startsWith(mPrefix)) {
          if (p.paymentMethod === 'cash') mCash += Number(p.amount) || 0;
          else mBank += Number(p.amount) || 0;
        }
      }
      for (const s of allSales) {
        if (s.createdAt && s.createdAt.startsWith(mPrefix) && s.status !== 'refunded') {
          if (s.paymentMethod === 'cash') mCash += Number(s.finalAmount) || 0;
          else mBank += Number(s.finalAmount) || 0;
        }
      }
      monthlyChart.push({
        month: monthLabel,
        cash: mCash,
        bank: mBank,
        total: mCash + mBank,
      });
    }

    // Low stock products
    const lowStockProducts = allProducts.filter((p) => p.stockQuantity <= p.minStockAlert && p.status === 'active');

    return {
      activeMembers,
      expiredMembers,
      paymentDueToday,
      paymentDueTomorrow,
      expiringSoonCount,
      todayCheckInsCount: todayAttendance.length,
      todayCheckInsList: todayAttendance.slice(0, 10),
      todaySalesCount: todaySales.length,
      todaySalesRevenue,
      todayRevenue: todayMemberRevenue + todaySalesRevenue,
      monthlyRevenue: monthlyMemberRevenue + monthlySalesRevenue,
      totalRevenue: totalMemberRevenue + totalSalesRevenue,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      recentSales: allSales.slice(0, 5),
      revenueSummary: {
        totalRevenue: totalMemberRevenue + totalSalesRevenue,
        cashRevenue,
        bankTransferRevenue,
        totalPaymentsCount: allPayments.length + allSales.length,
        monthlyChart,
        dailyChart,
      },
    };
  }

  // =========================================================================
  // 8. BUSINESS SETTINGS & MULTI-TENANCY
  // =========================================================================

  static async getGymDetails(gymIdOrBusinessId: number | string): Promise<Gym | null> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const gymId = resolveGymId(gymIdOrBusinessId);

    let doc: any = null;
    if (db) {
      doc = await db.collection('businesses').findOne({ businessId });
    } else {
      doc = mem.businesses.find((b) => b.businessId === businessId || b.id === gymId);
    }

    if (!doc) return null;

    return {
      id: doc.id || gymId,
      gymName: doc.gymName || 'Gym Management',
      logo: doc.logo || null,
      phone: doc.phone || null,
      address: doc.address || null,
      email: doc.email || null,
      description: doc.description || null,
      status: doc.status || 'active',
      monthlyPrice: doc.monthlyPrice || 4500,
      threeMonthsPrice: doc.threeMonthsPrice || 12000,
      sixMonthsPrice: doc.sixMonthsPrice || 22000,
      annualPrice: doc.annualPrice || 38000,
      currency: doc.currency || 'Rs.',
      timezone: doc.timezone || 'Asia/Colombo',
      receiptFooter: doc.receiptFooter || 'Thank you for training with us!',
    };
  }

  static async updateGymDetails(
    gymIdOrBusinessId: number | string,
    data: Partial<Gym> & { [key: string]: any }
  ): Promise<Gym> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const gymId = resolveGymId(gymIdOrBusinessId);

    const updates: any = { updatedAt: new Date() };
    if (data.gymName !== undefined) updates.gymName = data.gymName.trim();
    if (data.logo !== undefined) updates.logo = data.logo;
    if (data.phone !== undefined) updates.phone = data.phone ? data.phone.trim() : null;
    if (data.address !== undefined) updates.address = data.address ? data.address.trim() : null;
    if (data.email !== undefined) updates.email = data.email ? data.email.trim().toLowerCase() : null;
    if (data.currency !== undefined) updates.currency = data.currency ? data.currency.trim() : 'Rs.';
    if (data.description !== undefined) updates.description = data.description ? data.description.trim() : null;
    if (data.receiptFooter !== undefined) updates.receiptFooter = data.receiptFooter;
    if (data.monthlyPrice !== undefined) updates.monthlyPrice = Math.round(Number(data.monthlyPrice));
    if (data.threeMonthsPrice !== undefined) updates.threeMonthsPrice = Math.round(Number(data.threeMonthsPrice));
    if (data.sixMonthsPrice !== undefined) updates.sixMonthsPrice = Math.round(Number(data.sixMonthsPrice));
    if (data.annualPrice !== undefined) updates.annualPrice = Math.round(Number(data.annualPrice));

    if (db) {
      await db.collection('businesses').updateOne(
        { businessId },
        { $set: updates },
        { upsert: true }
      );
    } else {
      const idx = mem.businesses.findIndex((b) => b.businessId === businessId || b.id === gymId);
      if (idx !== -1) {
        mem.businesses[idx] = { ...mem.businesses[idx], ...updates };
      } else {
        mem.businesses.push({ id: gymId, businessId, ...updates });
      }
    }

    // Sync settings map
    const settingsMap: Record<string, string> = {};
    if (updates.gymName) settingsMap['gym_name'] = updates.gymName;
    if (updates.currency) settingsMap['currency'] = updates.currency;
    if (updates.phone) {
      settingsMap['phone'] = updates.phone;
      settingsMap['gym_phone'] = updates.phone;
    }
    if (updates.address) {
      settingsMap['address'] = updates.address;
      settingsMap['gym_address'] = updates.address;
    }
    if (updates.email) {
      settingsMap['email'] = updates.email;
      settingsMap['gym_email'] = updates.email;
    }
    if (updates.logo) settingsMap['logo'] = updates.logo;
    if (updates.receiptFooter) settingsMap['receipt_footer'] = updates.receiptFooter;

    await this.updateSettings(businessId, settingsMap);

    const updated = await this.getGymDetails(businessId);
    return updated!;
  }

  static async getSettings(gymIdOrBusinessId: number | string): Promise<Record<string, string>> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);

    const map: Record<string, string> = {};
    if (db) {
      const rows = await db.collection('settings').find({ businessId }).toArray();
      for (const r of rows) map[r.key] = r.value;
    } else {
      for (const s of mem.settings) {
        if (s.businessId === businessId || !s.businessId) {
          map[s.key] = s.value;
        }
      }
    }
    return map;
  }

  static async updateSettings(gymIdOrBusinessId: number | string, updates: Record<string, string>) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const gymId = resolveGymId(gymIdOrBusinessId);

    if (db) {
      for (const [key, value] of Object.entries(updates)) {
        await db.collection('settings').updateOne(
          { businessId, key },
          { $set: { businessId, gymId, key, value, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    } else {
      for (const [key, value] of Object.entries(updates)) {
        const existing = mem.settings.find((s) => s.businessId === businessId && s.key === key);
        if (existing) {
          existing.value = value;
        } else {
          mem.settings.push({ businessId, gymId, key, value, updatedAt: new Date() });
        }
      }
    }
  }

  // =========================================================================
  // 9. USER AUTHENTICATION & MULTI-USER ROLES
  // =========================================================================

  static async findUserByUsername(username: string, businessId?: string) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const cleanUsername = username.trim().toLowerCase();

    if (db) {
      const q: any = {
        $or: [{ username: cleanUsername }, { email: cleanUsername }],
      };
      if (businessId) q.businessId = businessId;
      return db.collection('users').findOne(q);
    }

    return mem.users.find(
      (u) =>
        (u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername) &&
        (!businessId || u.businessId === businessId)
    );
  }

  static async findUserByEmail(email: string, businessId?: string) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const cleanEmail = email.trim().toLowerCase();

    if (db) {
      const q: any = { email: cleanEmail };
      if (businessId) q.businessId = businessId;
      return db.collection('users').findOne(q);
    }

    return mem.users.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail &&
        (!businessId || u.businessId === businessId)
    );
  }

  static async findUserByUid(uid: string) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    if (db) {
      return db.collection('users').findOne({ uid });
    }
    return mem.users.find((u) => u.uid === uid);
  }

  static async getAllUsers(businessId?: string) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const q: any = businessId ? { businessId } : {};
    if (db) {
      return db.collection('users').find(q).sort({ id: -1 }).toArray();
    }
    return mem.users.filter((u) => !businessId || u.businessId === businessId);
  }

  static async updateUserProfile(
    uidOrId: string | number,
    data: { name?: string; email?: string; avatar?: string; password?: string }
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const updates: any = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
    if (data.avatar !== undefined) updates.avatar = data.avatar;
    if (data.password && data.password.trim()) updates.password = hashPassword(data.password.trim());

    let updatedUser: any = null;
    if (db) {
      const isNum = typeof uidOrId === 'number' || (!isNaN(Number(uidOrId)) && !String(uidOrId).includes('_'));
      const q: any = isNum
        ? { $or: [{ id: Number(uidOrId) }, { uid: String(uidOrId) }] }
        : { uid: String(uidOrId) };

      await db.collection('users').updateOne(q, { $set: updates });
      updatedUser = await db.collection('users').findOne(q);
    } else {
      const user = mem.users.find(
        (u) => u.uid === String(uidOrId) || u.id === Number(uidOrId)
      );
      if (user) {
        Object.assign(user, updates);
        updatedUser = { ...user };
      }
    }

    if (updatedUser) {
      const sanitized = { ...updatedUser };
      delete sanitized.password;
      return sanitized;
    }
    return null;
  }

  static async getAllGyms(): Promise<Gym[]> {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    if (db) {
      const list = await db.collection('businesses').find().toArray();
      return list.map((b) => ({
        id: b.id || 1,
        gymName: b.gymName,
        logo: b.logo || null,
        phone: b.phone || null,
        address: b.address || null,
        email: b.email || null,
        description: b.description || null,
        status: b.status || 'active',
        monthlyPrice: b.monthlyPrice || 4500,
        threeMonthsPrice: b.threeMonthsPrice || 12000,
        sixMonthsPrice: b.sixMonthsPrice || 22000,
        annualPrice: b.annualPrice || 38000,
        currency: b.currency || 'Rs.',
        receiptFooter: b.receiptFooter || 'Thank you for training with us!',
      }));
    }
    return mem.businesses;
  }

  static async createGym(data: {
    gymName: string;
    phone?: string;
    address?: string;
    email?: string;
    currency?: string;
    logo?: string;
    monthlyPrice?: number;
    threeMonthsPrice?: number;
    sixMonthsPrice?: number;
    annualPrice?: number;
    smsSenderId?: string;
    adminName?: string;
    adminUsername?: string;
    adminPassword?: string;
    adminEmail?: string;
  }) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const gymId = Date.now();
    const businessId = `biz_${gymId}`;

    const newGym: any = {
      id: gymId,
      businessId,
      gymName: data.gymName.trim(),
      phone: data.phone || null,
      address: data.address || null,
      email: data.email || null,
      logo: data.logo || null,
      currency: data.currency || 'Rs.',
      status: 'active',
      monthlyPrice: Number(data.monthlyPrice) || 4500,
      threeMonthsPrice: Number(data.threeMonthsPrice) || 12000,
      sixMonthsPrice: Number(data.sixMonthsPrice) || 22000,
      annualPrice: Number(data.annualPrice) || 38000,
      smsSenderId: data.smsSenderId || 'GYMFIT',
      receiptFooter: `Thank you for training with ${data.gymName.trim()}! Powered by WOW POS.`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (db) {
      await db.collection('businesses').insertOne(newGym);
    } else {
      mem.businesses.push(newGym);
    }

    // Initialize default gym settings
    const defaultSettings = [
      { businessId, gymId, key: 'gym_name', value: data.gymName.trim() },
      { businessId, gymId, key: 'currency', value: data.currency || 'Rs.' },
      { businessId, gymId, key: 'phone', value: data.phone || '' },
      { businessId, gymId, key: 'email', value: data.email || '' },
      { businessId, gymId, key: 'address', value: data.address || '' },
      { businessId, gymId, key: 'logo', value: data.logo || '' },
      { businessId, gymId, key: 'receipt_footer', value: `Thank you for training with ${data.gymName.trim()}! Powered by WOW POS.` },
    ];
    if (db) {
      await db.collection('settings').insertMany(defaultSettings);
    } else {
      mem.settings.push(...defaultSettings);
    }

    // Optionally create gym owner user
    let createdOwner: any = null;
    if (data.adminUsername && data.adminName) {
      const cleanUsername = data.adminUsername.trim().toLowerCase();
      const hashedPassword = hashPassword(data.adminPassword || 'gym123');
      createdOwner = {
        id: Date.now() + 1,
        uid: `owner_${gymId}`,
        businessId,
        gymId,
        username: cleanUsername,
        password: hashedPassword,
        email: data.adminEmail || data.email || `${cleanUsername}@example.com`,
        name: data.adminName.trim(),
        role: 'GYM_OWNER',
        status: 'active',
        createdAt: new Date(),
      };
      if (db) {
        await db.collection('users').insertOne(createdOwner);
      } else {
        mem.users.push(createdOwner);
      }
    }

    return {
      gym: newGym,
      owner: createdOwner
        ? {
            id: createdOwner.id,
            username: createdOwner.username,
            name: createdOwner.name,
            email: createdOwner.email,
            role: createdOwner.role,
          }
        : null,
    };
  }

  static async toggleGymStatus(gymId: number, status: 'active' | 'inactive') {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    if (db) {
      await db.collection('businesses').updateOne({ id: gymId }, { $set: { status, updatedAt: new Date() } });
    } else {
      const idx = mem.businesses.findIndex((b) => b.id === gymId);
      if (idx !== -1) mem.businesses[idx].status = status;
    }
    return { success: true };
  }

  static async createGymOwner(data: { username: string; password?: string; email: string; name: string; gymId: number }) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = `biz_${data.gymId}`;

    const existing = await this.findUserByUsername(data.username, businessId);
    if (existing) {
      throw new Error(`Username "${data.username}" is already taken.`);
    }

    const hashedPassword = hashPassword(data.password || 'admin123');
    const uid = `owner_${Date.now()}`;
    const newUser = {
      id: Date.now(),
      uid,
      businessId,
      gymId: data.gymId,
      username: data.username.trim().toLowerCase(),
      password: hashedPassword,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      role: 'GYM_OWNER',
      status: 'active',
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('users').insertOne(newUser);
    } else {
      mem.users.push(newUser);
    }

    return newUser;
  }

  static async updateUserStatus(id: number, data: { status?: 'active' | 'inactive'; role?: string }) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    if (db) {
      await db.collection('users').updateOne({ id }, { $set: data });
    } else {
      const idx = mem.users.findIndex((u) => u.id === id);
      if (idx !== -1) mem.users[idx] = { ...mem.users[idx], ...data };
    }
    return { success: true };
  }

  static async getSuperAdminStats(): Promise<SuperAdminDashboardData> {
    const gyms = await this.getAllGyms();
    let totalMembersAcrossGyms = 0;
    let activeMembersAcrossGyms = 0;
    let totalTodayCheckIns = 0;
    let totalTodayRevenue = 0;

    const gymsStats = await Promise.all(
      gyms.map(async (g) => {
        const stats = await this.getDashboardStats(g.id);
        totalMembersAcrossGyms += (stats.activeMembers + stats.expiredMembers);
        activeMembersAcrossGyms += stats.activeMembers;
        totalTodayCheckIns += stats.todayCheckInsCount;
        totalTodayRevenue += stats.todayRevenue;

        return {
          gymId: g.id,
          gymName: g.gymName,
          status: g.status,
          phone: g.phone || null,
          email: g.email || null,
          address: g.address || null,
          activeMembers: stats.activeMembers,
          expiredMembers: stats.expiredMembers,
          totalMembers: stats.activeMembers + stats.expiredMembers,
          todayCheckIns: stats.todayCheckInsCount,
          todayRevenue: stats.todayRevenue,
          totalRevenue: stats.totalRevenue,
        };
      })
    );

    return {
      totalGyms: gyms.length,
      activeGyms: gyms.filter((g) => g.status === 'active').length,
      inactiveGyms: gyms.filter((g) => g.status === 'inactive').length,
      totalMembersAcrossGyms,
      activeMembersAcrossGyms,
      totalTodayCheckIns,
      totalTodayRevenue,
      gymsStats,
    };
  }

  static async getSuperAdminDashboard(): Promise<SuperAdminDashboardData> {
    return this.getSuperAdminStats();
  }

  // Aliases for seamless compatibility
  static async addMember(gymId: number, data: any) {
    return this.createMember({
      gymId,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      emergencyContact: data.emergencyContact,
      notes: data.notes,
      package: data.membershipPackage || data.package || 'monthly',
      startDate: data.paymentDate || data.startDate || formatDateStr(new Date()),
      paymentAmount: Number(data.paymentAmount) || 0,
      paymentMethod: data.paymentMethod || 'cash',
      createdBy: data.createdBy,
    });
  }

  static async editMember(gymId: number, id: number, data: any) {
    return this.updateMember(id, data, gymId);
  }

  static async getMemberProfile(gymId: number, id: number) {
    return this.getMemberById(id, gymId);
  }

  static async recordCheckIn(gymId: number, barcode: string) {
    return this.recordAttendance(barcode, gymId);
  }

  static async getTodayAttendances(gymId: number) {
    return this.getTodayAttendance(gymId);
  }

  static async addProduct(gymId: number, data: any) {
    return this.createProduct({
      ...data,
      gymId,
    });
  }

  static async editProduct(gymId: number, id: number, data: any) {
    return this.updateProduct(id, data, gymId);
  }

  static async getGymStaff(gymId: number) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymId);
    if (db) {
      return db
        .collection('users')
        .find({ businessId, role: { $in: ['STAFF', 'RECEPTION'] } })
        .sort({ name: 1 })
        .toArray();
    }
    return mem.users.filter(
      (u) => (u.businessId === businessId || u.gymId === gymId) && ['STAFF', 'RECEPTION'].includes(u.role)
    );
  }

  static async createGymStaff(
    gymId: number,
    data: {
      username: string;
      password?: string;
      email: string;
      name: string;
      role: 'STAFF' | 'RECEPTION';
    }
  ) {
    await ensureMongoSeeded();
    const db = await getMongoDb();
    const businessId = resolveBusinessId(gymId);
    const cleanUsername = data.username.trim().toLowerCase();

    const existing = await this.findUserByUsername(cleanUsername, businessId);
    if (existing) {
      throw new Error(`Username "${data.username}" is already taken.`);
    }

    const hashedPassword = hashPassword(data.password || 'staff123');
    const uid = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newStaff = {
      id: Date.now(),
      uid,
      businessId,
      gymId,
      username: cleanUsername,
      password: hashedPassword,
      email: data.email.trim().toLowerCase(),
      name: data.name.trim(),
      role: data.role || 'STAFF',
      status: 'active',
      createdAt: new Date(),
    };

    if (db) {
      await db.collection('users').insertOne(newStaff);
    } else {
      mem.users.push(newStaff);
    }

    return newStaff;
  }

  static async getReports(
    gymIdOrBusinessId: number | string,
    options?: { type?: string; startDate?: string; endDate?: string }
  ) {
    const businessId = resolveBusinessId(gymIdOrBusinessId);
    const stats = await this.getDashboardStats(businessId);
    const payments = await this.getPayments(businessId, 500);
    const sales = await this.getSales(businessId, { limit: 500 });

    return {
      stats,
      payments,
      sales,
      generatedAt: new Date().toISOString(),
    };
  }

  static async runNotificationCron() {
    return { sent: 0, time: new Date().toISOString() };
  }
}
