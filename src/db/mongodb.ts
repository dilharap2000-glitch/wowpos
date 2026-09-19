import { MongoClient, type Db } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export function getMongoUri(): string {
  const raw = process.env.MONGODB_URI || '';
  return raw.trim().replace(/^["']|["']$/g, '');
}

export function extractDbFromUri(uri: string): string | null {
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    const pathname = parsed.pathname.replace(/^\//, '').split('?')[0].trim();
    return pathname || null;
  } catch {
    return null;
  }
}

export function getMongoDbName(): string {
  const raw = process.env.MONGODB_DB_NAME || '';
  const cleaned = raw.trim().replace(/^["']|["']$/g, '');
  if (cleaned) return cleaned;
  const uri = getMongoUri();
  const fromUri = extractDbFromUri(uri);
  if (fromUri) return fromUri;
  return 'gym_pos_db';
}

declare global {
  var _cachedDb: Db | undefined;
}

/**
 * Connect to MongoDB with caching for serverless environments (Vercel)
 */
export async function getMongoDb(): Promise<Db | null> {
  const uri = getMongoUri();
  if (!uri) {
    return null;
  }

  if (global._cachedDb) {
    return global._cachedDb;
  }

  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
      });
      global._mongoClientPromise = client.connect().catch((connectErr) => {
        global._mongoClientPromise = undefined;
        throw connectErr;
      });
    }

    const client = await global._mongoClientPromise;
    const dbName = getMongoDbName();
    const db = client.db(dbName);
    global._cachedDb = db;
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error);
    global._mongoClientPromise = undefined;
    global._cachedDb = undefined;
    return null;
  }
}

/**
 * Actively checks MongoDB connectivity and returns detailed health info
 */
export async function checkMongoHealth(): Promise<{
  connected: boolean;
  type: 'mongodb_atlas' | 'memory_fallback';
  database?: string;
  error?: string;
}> {
  const uri = getMongoUri();
  if (!uri) {
    return {
      connected: false,
      type: 'memory_fallback',
      error: 'MONGODB_URI not configured, running on in-memory storage fallback',
    };
  }

  try {
    const db = await getMongoDb();
    if (!db) {
      return {
        connected: false,
        type: 'mongodb_atlas',
        error: 'Unable to establish MongoDB connection pool',
      };
    }
    // Ping the active database
    await db.command({ ping: 1 });
    return {
      connected: true,
      type: 'mongodb_atlas',
      database: db.databaseName,
    };
  } catch (err: any) {
    return {
      connected: false,
      type: 'mongodb_atlas',
      error: err.message || 'Database ping command failed',
    };
  }
}

/**
 * Initialize indexes on collections
 */
export async function setupMongoIndexes(db: Db) {
  try {
    // Businesses
    await db.collection('businesses').createIndex({ businessId: 1 }, { unique: true });

    // Users
    await db.collection('users').createIndex({ businessId: 1, username: 1 });
    await db.collection('users').createIndex({ uid: 1 }, { unique: true });

    // Members
    await db.collection('members').createIndex({ businessId: 1, memberNumber: 1 });
    await db.collection('members').createIndex({ businessId: 1, status: 1 });
    await db.collection('members').createIndex({ barcode: 1 });

    // Memberships
    await db.collection('memberships').createIndex({ businessId: 1, memberId: 1 });
    await db.collection('memberships').createIndex({ businessId: 1, expiryDate: 1 });
    await db.collection('memberships').createIndex({ businessId: 1, status: 1 });

    // Payments
    await db.collection('payments').createIndex({ businessId: 1, memberId: 1 });
    await db.collection('payments').createIndex({ businessId: 1, paymentDate: 1 });

    // Attendance
    await db.collection('attendance').createIndex({ businessId: 1, memberId: 1 });
    await db.collection('attendance').createIndex({ businessId: 1, attendanceDate: 1 });

    // Products
    await db.collection('products').createIndex({ businessId: 1, name: 1 });
    await db.collection('products').createIndex({ businessId: 1, category: 1 });
    await db.collection('products').createIndex({ barcode: 1 });

    // Sales & SaleItems
    await db.collection('sales').createIndex({ businessId: 1, receiptNumber: 1 });
    await db.collection('sales').createIndex({ businessId: 1, createdAt: 1 });
    await db.collection('saleItems').createIndex({ businessId: 1, saleId: 1 });
    await db.collection('saleItems').createIndex({ businessId: 1, productId: 1 });

    // Settings
    await db.collection('settings').createIndex({ businessId: 1, key: 1 });

    console.log('MongoDB indexes ensured successfully.');
  } catch (err) {
    console.warn('Index creation warning:', err);
  }
}
