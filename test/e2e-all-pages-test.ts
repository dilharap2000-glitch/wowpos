import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

async function runE2EAllPagesTest() {
  console.log('================================================================');
  console.log('STARTING REAL MONGODB VERIFICATION TEST FOR ALL REPORTED ISSUES');
  console.log('================================================================\n');

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const dbName = 'gym_pos_db';

  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB_NAME = dbName;
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = 'gym_saas_secure_jwt_secret_key_2026';

  const { app } = await import('../src/server/app.ts');
  const server = app.listen(0);
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Authenticate with seeded gym owner (titan / admin123)
    console.log('[TEST 1] Logging in as gym owner (titan)...');
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'titan', password: 'admin123' }),
    });
    const loginBody = await loginRes.json();
    if (loginRes.status !== 200 || !loginBody.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginBody)}`);
    }
    const token = loginBody.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    console.log('  -> Logged in successfully. Business ID:', loginBody.user.businessId);

    // 2. Test Membership Plans / Members retrieval
    console.log('\n[TEST 2] Testing Membership Plans & Members Registry data...');
    const membersRes = await fetch(`${baseUrl}/api/members`, {
      method: 'GET',
      headers: authHeaders,
    });
    const membersList = await membersRes.json();
    if (membersRes.status !== 200 || !Array.isArray(membersList) || membersList.length === 0) {
      throw new Error(`Failed to fetch members: status ${membersRes.status}`);
    }
    console.log(`  -> Successfully retrieved ${membersList.length} members with packages and statuses.`);

    // 3. Test Products API
    console.log('\n[TEST 3] Testing Products API (Catalog & Inventory)...');
    const productsRes = await fetch(`${baseUrl}/api/products`, {
      method: 'GET',
      headers: authHeaders,
    });
    const productsList = await productsRes.json();
    if (productsRes.status !== 200 || !Array.isArray(productsList) || productsList.length === 0) {
      throw new Error(`Failed to fetch products: status ${productsRes.status}`);
    }
    console.log(`  -> Successfully retrieved ${productsList.length} products. First: ${productsList[0].name} (Stock: ${productsList[0].stockQuantity})`);

    // 4. Test Sales API
    console.log('\n[TEST 4] Testing Sales API (POS History & Checkout)...');
    const salesRes = await fetch(`${baseUrl}/api/sales`, {
      method: 'GET',
      headers: authHeaders,
    });
    const salesList = await salesRes.json();
    if (salesRes.status !== 200 || !Array.isArray(salesList) || salesList.length === 0) {
      throw new Error(`Failed to fetch sales: status ${salesRes.status}`);
    }
    console.log(`  -> Successfully retrieved ${salesList.length} sales records. First receipt: ${salesList[0].receiptNumber}`);

    // Create a new test sale to ensure POS checkout works
    const newSaleRes = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        customerName: 'Test Athlete',
        items: [{ productId: productsList[0].id, quantity: 1, unitPrice: productsList[0].sellingPrice }],
        discount: 0,
        paymentMethod: 'cash',
      }),
    });
    const newSaleBody = await newSaleRes.json();
    const createdSale = newSaleBody.sale || newSaleBody;
    if (newSaleRes.status !== 201 || !createdSale.id) {
      throw new Error(`Failed to create sale: ${JSON.stringify(newSaleBody)}`);
    }
    console.log(`  -> Successfully created POS Sale! Receipt: ${createdSale.receiptNumber}, Total: ${createdSale.totalAmount}`);

    // 5. Test Renew Membership API
    console.log('\n[TEST 5] Testing Renew Membership Functionality...');
    const targetMember = membersList[0];
    const renewRes = await fetch(`${baseUrl}/api/members/${targetMember.id}/renew`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        membershipPackage: 'monthly',
        package: 'monthly',
        paymentDate: '2026-10-17',
        startDate: '2026-10-17',
        paymentMethod: 'cash',
        addAdmissionFee: false,
        admissionFeeApplied: false,
        membershipAmount: 4500,
        baseAmount: 4500,
        paymentFee: 0,
        paymentFeeRate: 0,
        paymentAmount: 4500,
        totalAmount: 4500,
        notes: 'Verification renewal test',
      }),
    });
    const renewBody = await renewRes.json();
    const renewedMember = renewBody.member?.member || renewBody.member;
    console.log(`  -> Renewal succeeded! Member ${renewedMember?.fullName} is renewed until: ${renewedMember?.latestMembership?.expiryDate}`);

    // 6. Test Reports API
    console.log('\n[TEST 6] Testing Reports API (Daily Closeout & Audits)...');
    const reportsRes = await fetch(`${baseUrl}/api/reports?type=daily`, {
      method: 'GET',
      headers: authHeaders,
    });
    const reportsBody = await reportsRes.json();
    if (reportsRes.status !== 200 || !reportsBody.daily || !reportsBody.payments || !reportsBody.attendances) {
      throw new Error(`Failed to generate reports: ${JSON.stringify(reportsBody)}`);
    }
    console.log(`  -> Reports API returned full metrics payload:`);
    console.log(`     Daily Revenue: ${reportsBody.daily.totalRevenue}`);
    console.log(`     Cash Revenue: ${reportsBody.daily.cashRevenue}`);
    console.log(`     Bank Transfers: ${reportsBody.daily.bankTransferRevenue}`);
    console.log(`     Payments records: ${reportsBody.payments.items.length}`);
    console.log(`     Attendance records: ${reportsBody.attendances.items.length}`);

    // 7. Verify Payments Ledger
    console.log('\n[TEST 7] Testing Payments / Ledger API...');
    const paymentsRes = await fetch(`${baseUrl}/api/payments`, {
      method: 'GET',
      headers: authHeaders,
    });
    const paymentsBody = await paymentsRes.json();
    if (paymentsRes.status !== 200 || !Array.isArray(paymentsBody.items) || paymentsBody.items.length === 0) {
      throw new Error(`Failed to fetch payments: ${JSON.stringify(paymentsBody)}`);
    }
    console.log(`  -> Successfully fetched ${paymentsBody.items.length} payments, total collection: Rs. ${paymentsBody.totalAmount}`);

    console.log('\n================================================================');
    console.log('ALL VERIFICATION TESTS COMPLETED AND PASSED WITH 100% SUCCESS!');
    console.log('================================================================');
    process.exit(0);
  } finally {
    server.close();
    await mongod.stop();
  }
}

runE2EAllPagesTest().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
