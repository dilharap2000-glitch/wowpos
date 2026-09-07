import { MongoClient, Db, Collection, Document } from 'mongodb';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'gym_pos_db';

let cachedDb: Db | null = null;

/**
 * Connect to MongoDB with caching for serverless environments (Vercel)
 */
export async function getMongoDb(): Promise<Db | null> {
  if (!MONGODB_URI) {
    return null;
  }

  if (cachedDb) {
    return cachedDb;
  }

  try {
    if (!global._mongoClientPromise) {
      const client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      global._mongoClientPromise = client.connect();
    }

    const client = await global._mongoClientPromise;
    const db = client.db(DB_NAME);
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB Atlas:', error);
    return null;
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
