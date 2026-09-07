import { getMongoDb, setupMongoIndexes } from './mongodb.ts';
import { ensureMongoSeeded } from './gym-service-mongo.ts';

/**
 * Initialize MongoDB Atlas collections, indexes, and seed data.
 * If legacy DATABASE_URL is provided and 'pg' is installed, optionally imports legacy records.
 * Run using: npm run migrate:mongo
 */
export async function migratePostgresToMongo() {
  console.log('--- Initializing WOW POS Multi-Tenant MongoDB Atlas ---');

  const mongoDb = await getMongoDb();
  if (!mongoDb) {
    console.error('ERROR: MONGODB_URI is not configured. Please set MONGODB_URI in .env or environment.');
    return;
  }

  await setupMongoIndexes(mongoDb);
  await ensureMongoSeeded();

  console.log('Multi-tenant indexes and seed data initialized successfully in MongoDB Atlas.');

  // Optional: If DATABASE_URL is set, attempt optional extraction
  const pgUrl = process.env.DATABASE_URL;
  if (!pgUrl) {
    console.log('No legacy DATABASE_URL detected. MongoDB Atlas is fully primed and ready.');
    return;
  }

  try {
    // Dynamic import to avoid static dependency on 'pg'
    // @ts-ignore
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: pgUrl });
    const pgClient = await pool.connect();
    console.log('Connected to legacy PostgreSQL database. Checking for records to migrate...');

    try {
      const gymsRes = await pgClient.query('SELECT * FROM gyms');
      for (const g of gymsRes.rows) {
        const businessId = `biz_${g.id}`;
        await mongoDb.collection('businesses').updateOne(
          { businessId },
          {
            $set: {
              id: g.id,
              businessId,
              gymName: g.gym_name,
              logo: g.logo,
              phone: g.phone,
              address: g.address,
              email: g.email,
              status: g.status || 'active',
              monthlyPrice: g.monthly_price || 4500,
              threeMonthsPrice: g.three_months_price || 12000,
              sixMonthsPrice: g.six_months_price || 22000,
              annualPrice: g.annual_price || 38000,
              currency: g.currency || 'Rs.',
              timezone: g.timezone || 'Asia/Colombo',
              receiptFooter: g.receipt_footer || 'Thank you for training with us!',
              createdAt: g.created_at || new Date(),
              updatedAt: g.updated_at || new Date(),
            },
          },
          { upsert: true }
        );
      }
      console.log(`Migrated ${gymsRes.rows.length} gyms.`);
    } catch (gymErr: any) {
      console.warn('Could not query gyms table:', gymErr.message);
    } finally {
      pgClient.release();
      await pool.end();
    }
  } catch (err: any) {
    console.log('Legacy PostgreSQL extraction skipped:', err.message);
  }
}

// Auto-run if executed directly via tsx
if (process.argv[1]?.endsWith('migrate-pg-to-mongo.ts')) {
  migratePostgresToMongo()
    .then(() => {
      console.log('Migration task completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration task failed:', err);
      process.exit(1);
    });
}
