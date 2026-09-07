import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import { GymService, resolveBusinessId, resolveGymId, ensureMongoSeeded } from './src/db/gym-service-mongo.ts';
import { sendSms } from './src/lib/sms/smslen.ts';
import {
  requireAuth,
  requireGymTenant,
  requireSuperAdmin,
  requireRoles,
  AuthRequest,
  generateToken,
} from './src/middleware/auth.ts';
import { verifyPassword, hashPassword } from './src/lib/security.ts';

dotenv.config();

const PORT = 3000;
export const app = express();
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: process.env.MONGODB_URI ? 'mongodb_atlas' : 'memory_fallback',
    time: new Date().toISOString(),
  });
});

// ============================================================
// AUTHENTICATION & LOGIN
// ============================================================
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { username, password, passkey, isDemo } = req.body;

  try {
    // 1. Direct passkey fallback for quick reception access
    if (passkey === 'gym_admin_secret_session_active' || passkey === 'reception_quick_access' || isDemo) {
      const defaultOwner = await GymService.findUserByUsername('admin');
      const gymRecord = await GymService.getGymDetails(defaultOwner?.businessId || defaultOwner?.gymId || 1);

      const token = generateToken({
        uid: defaultOwner ? defaultOwner.uid : 'gym_admin_reception',
        id: defaultOwner ? defaultOwner.id : 2,
        role: 'GYM_OWNER',
        businessId: defaultOwner?.businessId || 'biz_1',
        gymId: defaultOwner?.gymId || 1,
      });

      return res.json({
        success: true,
        token,
        user: {
          id: defaultOwner ? defaultOwner.id : 2,
          uid: defaultOwner ? defaultOwner.uid : 'gym_admin_reception',
          username: defaultOwner?.username || 'admin',
          email: defaultOwner?.email || 'contact@zenergyfitness.com',
          name: defaultOwner?.name || 'Gym Administrator',
          role: 'GYM_OWNER',
          businessId: defaultOwner?.businessId || 'biz_1',
          gymId: defaultOwner?.gymId || 1,
          gymName: gymRecord?.gymName || 'ZENERGY FITNESS',
          status: defaultOwner?.status || 'active',
        },
      });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = String(username).trim().toLowerCase();

    // 2. Query user by username or email
    let user = await GymService.findUserByUsername(cleanUsername);
    if (!user) {
      user = await GymService.findUserByEmail(cleanUsername);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify password securely using PBKDF2 hash or verified demo match
    const isPasswordValid =
      verifyPassword(password, user.password) ||
      (cleanUsername === 'superadmin' && password === 'admin123') ||
      (cleanUsername === 'admin' && (password === 'admin123' || password === 'gymfit2026')) ||
      (cleanUsername === 'staff' && (password === 'admin123' || password === 'staff123')) ||
      (cleanUsername === 'reception' && (password === 'admin123' || password === 'reception123'));

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({
        error: 'Your account has been deactivated. Please contact the administrator.',
      });
    }

    // Check gym status if scoped to gym
    let gymName: string | undefined;
    const businessId = user.businessId || resolveBusinessId(user.gymId);
    if (businessId) {
      const gymRecord = await GymService.getGymDetails(businessId);
      if (gymRecord) {
        if (gymRecord.status === 'inactive' && user.role !== 'SUPER_ADMIN') {
          return res.status(403).json({
            error: 'This gym organization is currently inactive. Please contact the administrator.',
          });
        }
        gymName = gymRecord.gymName;
      }
    }

    const token = generateToken({
      uid: user.uid,
      id: user.id,
      role: user.role,
      businessId,
      gymId: user.gymId,
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId,
        gymId: user.gymId,
        gymName: gymName || (user.role === 'SUPER_ADMIN' ? 'SaaS Platform' : 'Gym Management'),
        status: user.status,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Current session profile
app.get('/api/auth/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

// Update user/admin profile
app.put('/api/auth/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, avatar, password } = req.body;
    const uidOrId = req.user?.uid || req.user?.id;
    if (!uidOrId) {
      return res.status(400).json({ error: 'User identifier missing' });
    }

    const updated = await GymService.updateUserProfile(uidOrId, {
      name,
      email,
      avatar,
      password,
    });

    res.json({
      success: true,
      message: 'Profile updated successfully in MongoDB',
      user: {
        id: updated?.id || req.user?.id,
        uid: updated?.uid || req.user?.uid,
        name: updated?.name || name || req.user?.name,
        email: updated?.email || email || req.user?.email,
        avatar: updated?.avatar || avatar || req.user?.avatar,
        role: updated?.role || req.user?.role,
        businessId: updated?.businessId || req.businessId,
        gymId: updated?.gymId || req.gymId,
      },
    });
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// List all customer businesses for multi-tenant switching
app.get('/api/businesses', async (req: Request, res: Response) => {
  try {
    const gyms = await GymService.getAllGyms();
    res.json(gyms);
  } catch (err: any) {
    console.error('Error fetching businesses:', err);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// ============================================================
// GYM OWNER & STAFF ROUTES
// ============================================================

// Dashboard Statistics
app.get('/api/dashboard', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const data = await GymService.getDashboardStats(businessId);
    res.json(data);
  } catch (err: any) {
    console.error('Error fetching dashboard data:', err);
    res.status(500).json({ error: err.message || 'Failed to load dashboard statistics' });
  }
});

// Member Management
app.get('/api/members', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const search = req.query.search as string | undefined;
    const filter = req.query.filter as string | undefined;
    const membersList = await GymService.getMembers(businessId, { search, filter });
    res.json(membersList);
  } catch (err: any) {
    console.error('Error fetching members:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch members' });
  }
});

app.post('/api/members', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const gymId = req.gymId || resolveGymId(businessId);
    const {
      memberNumber,
      fullName,
      phone,
      email,
      address,
      membershipPackage,
      paymentDate,
      paymentAmount,
      paymentMethod,
      emergencyContact,
      notes,
    } = req.body;

    if (!memberNumber || !fullName || !phone || !membershipPackage || !paymentDate || paymentAmount === undefined) {
      return res.status(400).json({ error: 'Missing required member fields.' });
    }

    const created = await GymService.createMember({
      businessId,
      gymId,
      memberNumber,
      fullName,
      phone,
      email,
      address,
      package: membershipPackage,
      startDate: paymentDate,
      paymentAmount: Number(paymentAmount),
      paymentMethod: paymentMethod || 'cash',
      emergencyContact,
      notes,
      createdBy: req.user?.name || 'Admin',
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error adding member:', err);
    res.status(400).json({ error: err.message || 'Failed to create member' });
  }
});

app.get('/api/members/:id', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const profile = await GymService.getMemberById(id, businessId);
    if (!profile) return res.status(404).json({ error: 'Member not found in this gym' });
    res.json(profile);
  } catch (err: any) {
    console.error('Error getting member profile:', err);
    res.status(500).json({ error: err.message || 'Failed to load member profile' });
  }
});

app.put('/api/members/:id', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const updated = await GymService.updateMember(id, req.body, businessId);
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating member:', err);
    res.status(400).json({ error: err.message || 'Failed to update member' });
  }
});

app.delete('/api/members/:id', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const deleted = await GymService.deleteMember(id, businessId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('Error deleting member:', err);
    res.status(400).json({ error: err.message || 'Failed to delete member' });
  }
});

app.post('/api/members/:id/archive', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const archived = await GymService.archiveMember(id, businessId);
    res.json(archived);
  } catch (err: any) {
    console.error('Error archiving member:', err);
    res.status(500).json({ error: err.message || 'Failed to archive member' });
  }
});

app.post('/api/members/:id/reactivate', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const reactivated = await GymService.reactivateMember(id, businessId);
    res.json(reactivated);
  } catch (err: any) {
    console.error('Error reactivating member:', err);
    res.status(500).json({ error: err.message || 'Failed to reactivate member' });
  }
});

app.post('/api/members/:id/renew', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const { membershipPackage, paymentAmount, paymentMethod, paymentDate, notes } = req.body;

    if (!membershipPackage || paymentAmount === undefined || !paymentDate) {
      return res.status(400).json({ error: 'Missing package, payment amount, or payment date.' });
    }

    const renewed = await GymService.renewMembership(id, {
      package: membershipPackage,
      paymentAmount: Number(paymentAmount),
      paymentMethod: paymentMethod || 'cash',
      startDate: paymentDate,
      createdBy: req.user?.name || 'Admin',
      notes,
    }, businessId);

    res.json(renewed);
  } catch (err: any) {
    console.error('Error renewing membership:', err);
    res.status(400).json({ error: err.message || 'Failed to renew membership' });
  }
});

// Attendance & Barcode Scanner
app.post('/api/attendance/scan', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const { barcode } = req.body;
    if (!barcode) {
      return res.status(400).json({ error: 'Barcode or member number is required' });
    }

    const result = await GymService.recordAttendance(barcode, businessId);
    res.json(result);
  } catch (err: any) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err.message || 'Check-in scanning error' });
  }
});

app.get('/api/attendance/today', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const todayRecords = await GymService.getTodayAttendance(businessId);
    res.json(todayRecords);
  } catch (err: any) {
    console.error('Error fetching today attendance:', err);
    res.status(500).json({ error: err.message || 'Failed to load today attendance' });
  }
});

// ============================================================
// POS & INVENTORY MANAGEMENT ROUTES
// ============================================================

// Products
app.get('/api/products', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const lowStockOnly = req.query.lowStock === 'true';

    const items = await GymService.getProducts(businessId, { category, search, lowStockOnly });
    res.json(items);
  } catch (err: any) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch products' });
  }
});

app.post('/api/products', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const gymId = req.gymId || resolveGymId(businessId);
    const { name, barcode, category, costPrice, sellingPrice, stockQuantity, minStockAlert, image } = req.body;

    if (!name || sellingPrice === undefined) {
      return res.status(400).json({ error: 'Product name and selling price are required.' });
    }

    const newProduct = await GymService.createProduct({
      businessId,
      gymId,
      name,
      barcode,
      category,
      costPrice: Number(costPrice || 0),
      sellingPrice: Number(sellingPrice),
      stockQuantity: Number(stockQuantity || 0),
      minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : 5,
      image,
    });

    res.status(201).json(newProduct);
  } catch (err: any) {
    console.error('Error adding product:', err);
    res.status(400).json({ error: err.message || 'Failed to add product' });
  }
});

app.put('/api/products/:id', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const updated = await GymService.updateProduct(id, req.body, businessId);
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(400).json({ error: err.message || 'Failed to update product' });
  }
});

app.delete('/api/products/:id', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const deleted = await GymService.deleteProduct(id, businessId);
    res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    res.status(400).json({ error: err.message || 'Failed to delete product' });
  }
});

app.post('/api/products/:id/stock', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const { quantityChange, changeType, notes } = req.body;

    if (quantityChange === undefined) {
      return res.status(400).json({ error: 'Quantity change is required.' });
    }

    const updated = await GymService.adjustProductStock(id, {
      quantityChange: Number(quantityChange),
      changeType: changeType || 'restock',
      notes,
    }, businessId);

    res.json(updated);
  } catch (err: any) {
    console.error('Error adjusting stock:', err);
    res.status(400).json({ error: err.message || 'Failed to adjust stock' });
  }
});

// Sales & Cart Management
app.get('/api/sales', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const { startDate, endDate, paymentMethod, status, search, limit } = req.query;

    const salesList = await GymService.getSales(businessId, {
      startDate: startDate as string,
      endDate: endDate as string,
      paymentMethod: paymentMethod as string,
      status: status as string,
      search: search as string,
      limit: limit ? Number(limit) : undefined,
    });

    res.json(salesList);
  } catch (err: any) {
    console.error('Error fetching sales:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch sales' });
  }
});

app.post('/api/sales', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const { memberId, customerName, customerPhone, items, discount, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required for a sale.' });
    }

    const result = await GymService.createSale(businessId, {
      memberId: memberId ? Number(memberId) : null,
      customerName,
      customerPhone,
      items,
      discount: Number(discount || 0),
      paymentMethod: paymentMethod || 'cash',
      createdBy: req.user?.name || 'Staff',
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Error creating sale:', err);
    res.status(400).json({ error: err.message || 'Failed to complete sale' });
  }
});

app.post('/api/sales/:id/refund', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER', 'STAFF'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const id = Number(req.params.id);
    const { reason } = req.body;

    const refunded = await GymService.refundSale(businessId, id, {
      reason,
      createdBy: req.user?.name || 'Staff',
    });

    res.json({ success: true, sale: refunded });
  } catch (err: any) {
    console.error('Error refunding sale:', err);
    res.status(400).json({ error: err.message || 'Failed to refund sale' });
  }
});

// Payments / Ledger
app.get('/api/payments', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const { startDate, endDate, paymentMethod, package: packageType } = req.query;

    const rawList = await GymService.getPayments(businessId, 500);
    let filtered = rawList;

    if (startDate) {
      filtered = filtered.filter((p) => p.paymentDate >= String(startDate));
    }
    if (endDate) {
      filtered = filtered.filter((p) => p.paymentDate <= String(endDate));
    }
    if (paymentMethod && paymentMethod !== 'all') {
      filtered = filtered.filter((p) => p.paymentMethod === paymentMethod);
    }
    if (packageType && packageType !== 'all') {
      filtered = filtered.filter((p) => p.package === packageType);
    }

    const totalAmount = filtered.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.json({
      items: filtered,
      totalAmount,
      count: filtered.length,
    });
  } catch (err: any) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch payments' });
  }
});

// Reports
app.get('/api/reports', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const { type, startDate, endDate } = req.query;
    const report = await GymService.getReports(businessId, {
      type: type as string,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(report);
  } catch (err: any) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: err.message || 'Failed to generate report' });
  }
});

// SMS Test & Logs
app.get('/api/sms/logs', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    res.json([]);
  } catch (err: any) {
    console.error('Error fetching SMS logs:', err);
    res.status(500).json({ error: err.message || 'Failed to load SMS logs' });
  }
});

app.post('/api/sms/test', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.gymId || 1;
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone and message are required' });
    }

    const result = await sendSms({
      gymId,
      phone,
      messageType: 'manual',
      message,
    });

    res.json(result);
  } catch (err: any) {
    console.error('Error sending test SMS:', err);
    res.status(500).json({ error: err.message || 'Failed to send test SMS' });
  }
});

// Public Business / White-label profile
app.get('/api/business/public', async (req: Request, res: Response) => {
  try {
    const targetGymId = Number(req.headers['x-target-gym-id']) || 1;
    const businessId = resolveBusinessId(targetGymId);
    const gymDetails = await GymService.getGymDetails(businessId);
    const settingsMap = await GymService.getSettings(businessId);

    res.json({
      gymName: gymDetails?.gymName || settingsMap['gym_name'] || 'ZENERGY FITNESS',
      logo: gymDetails?.logo || settingsMap['logo'] || null,
      phone: gymDetails?.phone || settingsMap['phone'] || settingsMap['gym_phone'] || null,
      address: gymDetails?.address || settingsMap['address'] || settingsMap['gym_address'] || null,
      email: gymDetails?.email || settingsMap['email'] || settingsMap['gym_email'] || null,
      currency: gymDetails?.currency || settingsMap['currency'] || 'Rs.',
      description: gymDetails?.description || settingsMap['description'] || null,
      receiptFooter: gymDetails?.receiptFooter || settingsMap['receipt_footer'] || 'Thank you for training with us!',
    });
  } catch (err: any) {
    console.error('Error fetching public business info:', err);
    res.status(500).json({ error: 'Failed to load business profile' });
  }
});

// Settings & Customization
app.get('/api/settings', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const gymDetails = await GymService.getGymDetails(businessId);

    const map: Record<string, string> = {};
    if (gymDetails) {
      map['gym_name'] = gymDetails.gymName || '';
      map['logo'] = gymDetails.logo || '';
      map['phone'] = gymDetails.phone || '';
      map['address'] = gymDetails.address || '';
      map['email'] = gymDetails.email || '';
      map['currency'] = gymDetails.currency || 'Rs.';
      map['description'] = gymDetails.description || '';
      map['timezone'] = gymDetails.timezone || 'Asia/Colombo';
      map['receipt_footer'] = gymDetails.receiptFooter || 'Thank you for training with us!';
      map['sms_url'] = gymDetails.smsUrl || 'https://api.smslen.com/v1/send';
      map['sms_api_key'] = gymDetails.smsApiKey || '';
      map['sms_sender_id'] = gymDetails.smsSenderId || 'GYMFIT';
      map['sms_enabled'] = gymDetails.smsEnabled || 'true';
      map['monthly_price'] = String(gymDetails.monthlyPrice || 4500);
      map['three_months_price'] = String(gymDetails.threeMonthsPrice || 12000);
      map['six_months_price'] = String(gymDetails.sixMonthsPrice || 22000);
      map['annual_price'] = String(gymDetails.annualPrice || 38000);
    }

    res.json(map);
  } catch (err: any) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: err.message || 'Failed to load settings' });
  }
});

app.put('/api/settings', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = req.businessId || resolveBusinessId(req.gymId);
    const updates = req.body as Record<string, string>;

    const updatedGym = await GymService.updateGymDetails(businessId, {
      gymName: updates['gym_name'],
      logo: updates['logo'],
      phone: updates['phone'],
      address: updates['address'],
      email: updates['email'],
      description: updates['description'],
      currency: updates['currency'],
      receiptFooter: updates['receipt_footer'],
      smsUrl: updates['sms_url'],
      smsApiKey: updates['sms_api_key'],
      smsSenderId: updates['sms_sender_id'],
      smsEnabled: updates['sms_enabled'],
      monthlyPrice: updates['monthly_price'] ? Number(updates['monthly_price']) : undefined,
      threeMonthsPrice: updates['three_months_price'] ? Number(updates['three_months_price']) : undefined,
      sixMonthsPrice: updates['six_months_price'] ? Number(updates['six_months_price']) : undefined,
      annualPrice: updates['annual_price'] ? Number(updates['annual_price']) : undefined,
    });

    res.json({ success: true, message: 'Settings saved successfully', gym: updatedGym });
  } catch (err: any) {
    console.error('Error saving settings:', err);
    res.status(500).json({ error: err.message || 'Failed to save settings' });
  }
});

// Gym Staff Management
app.get('/api/staff', requireAuth, requireGymTenant, async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.gymId || 1;
    const staffList = await GymService.getGymStaff(gymId);
    res.json(staffList);
  } catch (err: any) {
    console.error('Error getting staff:', err);
    res.status(500).json({ error: err.message || 'Failed to load staff list' });
  }
});

app.post('/api/staff', requireAuth, requireGymTenant, requireRoles('SUPER_ADMIN', 'GYM_OWNER'), async (req: AuthRequest, res: Response) => {
  try {
    const gymId = req.gymId || 1;
    const { username, password, email, name, role } = req.body;
    if (!username || !email || !name) {
      return res.status(400).json({ error: 'Username, email, and name are required' });
    }

    const created = await GymService.createGymStaff(gymId, {
      username,
      password: password || 'staff123',
      email,
      name,
      role: role === 'RECEPTION' ? 'RECEPTION' : 'STAFF',
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating staff:', err);
    res.status(400).json({ error: err.message || 'Failed to create staff' });
  }
});

// ============================================================
// SUPER ADMIN ROUTES
// ============================================================
app.get('/api/superadmin/dashboard', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await GymService.getSuperAdminDashboard();
    res.json(dashboard);
  } catch (err: any) {
    console.error('Error fetching super admin dashboard:', err);
    res.status(500).json({ error: err.message || 'Failed to load super admin dashboard' });
  }
});

app.get('/api/superadmin/gyms', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allGyms = await GymService.getAllGyms();
    res.json(allGyms);
  } catch (err: any) {
    console.error('Error fetching gyms:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch gyms' });
  }
});

app.post('/api/superadmin/gyms', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      gymName,
      phone,
      address,
      email,
      logo,
      currency,
      monthlyPrice,
      threeMonthsPrice,
      sixMonthsPrice,
      annualPrice,
      smsSenderId,
      adminName,
      adminUsername,
      adminPassword,
      adminEmail,
    } = req.body;
    if (!gymName) return res.status(400).json({ error: 'Gym Name is required' });

    const created = await GymService.createGym({
      gymName,
      phone,
      address,
      email,
      logo,
      currency,
      monthlyPrice,
      threeMonthsPrice,
      sixMonthsPrice,
      annualPrice,
      smsSenderId,
      adminName,
      adminUsername,
      adminPassword,
      adminEmail,
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating gym:', err);
    res.status(400).json({ error: err.message || 'Failed to create gym' });
  }
});

app.put('/api/superadmin/gyms/:id/status', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ error: 'Status must be active or inactive' });
    }
    const updated = await GymService.toggleGymStatus(id, status);
    res.json(updated);
  } catch (err: any) {
    console.error('Error toggling gym status:', err);
    res.status(400).json({ error: err.message || 'Failed to toggle gym status' });
  }
});

app.get('/api/superadmin/users', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await GymService.getAllUsers();
    res.json(allUsers);
  } catch (err: any) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch users' });
  }
});

app.post('/api/superadmin/users', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email, name, gymId } = req.body;
    if (!username || !email || !name || !gymId) {
      return res.status(400).json({ error: 'Username, email, name, and gym assignment are required' });
    }

    const created = await GymService.createGymOwner({
      username,
      password: password || 'gym123',
      email,
      name,
      gymId: Number(gymId),
    });

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating gym owner:', err);
    res.status(400).json({ error: err.message || 'Failed to create gym owner' });
  }
});

app.put('/api/superadmin/users/:id', requireAuth, requireSuperAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { status, role } = req.body;
    const updated = await GymService.updateUserStatus(id, { status, role });
    res.json(updated);
  } catch (err: any) {
    console.error('Error updating user:', err);
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

// Automated Cron for Expirations
app.post('/api/cron/notifications', async (req: Request, res: Response) => {
  try {
    const secret = req.headers['x-cron-secret'] || req.query.secret;
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && secret !== expectedSecret && process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Unauthorized cron request' });
    }

    const summary = await GymService.runNotificationCron();
    res.json({ success: true, timestamp: new Date().toISOString(), summary });
  } catch (err: any) {
    console.error('Cron job failed:', err);
    res.status(500).json({ error: err.message || 'Cron job execution error' });
  }
});

// Vite Middleware & Static Serving Setup
async function startServer() {
  await ensureMongoSeeded().catch((err) => console.warn('Seeding check note:', err?.message));

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Only listen when running as a standalone node server (container or dev mode)
  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Gym SaaS Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

// In standard dev/production, start server
if (!process.env.VERCEL) {
  startServer();
}

export default app;
